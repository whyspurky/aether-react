use std::collections::{HashMap, HashSet, VecDeque};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use bytes::Bytes;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::fs::File;
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::sync::{Mutex, Notify, Semaphore};

use crate::api::quality::AudioQuality;
use crate::api::stream::{resolve_track_stream, StreamInfo};
use crate::track_cache::anon::AnonClient;
use crate::track_cache::hls;
use crate::track_cache::http;

const MIN_AUDIO_SIZE: u64 = 8192;
const AUDIO_SNIFF_LEN: usize = 16;
const STREAM_WRITE_BUFFER_SIZE: usize = 256 * 1024;
const MAX_TEMP_TRACKS: usize = 12;
const MAX_PARALLEL_PRELOADS: usize = 1;
const MAX_PARALLEL_BULK: usize = 2;
// сколько трек защищен от вытеснения после последнего использования
const RECENT_TTL_SECS: u64 = 120;
const RECENT_MAX: usize = 16;
const WAIT_DOWNLOAD_SECS: u64 = 90;
const STREAM_MEMO_MAX_BYTES: usize = 96 * 1024 * 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Priority {
    Playback,
    Background,
    Bulk,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreloadTrack {
    pub track_id: u64,
    #[serde(default)]
    pub duration_ms: Option<u64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkTrack {
    pub track_id: u64,
    #[serde(default)]
    pub duration_ms: Option<u64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkStatus {
    pub scope: String,
    pub phase: String,
    pub total: u32,
    pub done: u32,
    pub failed: u32,
    pub skipped: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackCacheEntry {
    pub track_id: u64,
    pub path: String,
    pub quality: String,
    pub preset: String,
    pub bitrate: Option<u32>,
    pub source: String,
    pub offline: bool,
    pub size: u64,
    pub duration_ms: Option<u64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnsureCachedResult {
    pub entry: TrackCacheEntry,
    pub stream: Option<StreamInfo>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheSizes {
    pub temp: u64,
    pub offline: u64,
}

#[derive(Clone, Serialize, Deserialize)]
struct TrackCacheMetadata {
    quality: String,
    preset: String,
    #[serde(default)]
    bitrate: Option<u32>,
    #[serde(default)]
    source: String,
    #[serde(default)]
    expected_duration_ms: Option<u64>,
}

struct ActiveDownload {
    notify: Arc<Notify>,
    result: Arc<Mutex<Option<Result<EnsureCachedResult, String>>>>,
}

pub struct CacheRequest {
    pub track_id: u64,
    pub quality: AudioQuality,
    pub expected_duration_ms: Option<u64>,
    pub offline: bool,
    pub priority: Priority,
}

struct DownloadedAudio {
    data: Bytes,
    stream: Option<StreamInfo>,
    preset: String,
    bitrate: Option<u32>,
    source: String,
}

struct StreamMemoEntry {
    track_id: u64,
    quality: String,
    data: Bytes,
    stream: Option<StreamInfo>,
}

#[derive(Clone)]
pub struct TrackCacheState {
    pub temp_dir: PathBuf,
    pub offline_dir: PathBuf,
    http: Arc<http::CacheHttp>,
    anon: Arc<AnonClient>,
    active: Arc<Mutex<HashMap<String, ActiveDownload>>>,
    // id активных загрузок без async-лока, чтобы eviction не зависел от него
    active_ids: Arc<StdMutex<HashSet<u64>>>,
    // недавно отданные плееру треки: их нельзя вытеснять
    recent: Arc<StdMutex<Vec<(u64, std::time::Instant)>>>,
    offline_locks: Arc<Mutex<HashMap<u64, Arc<Mutex<()>>>>>,
    // режим без кэша: последние треки в памяти, чтобы повтор не качался заново
    stream_memo: Arc<StdMutex<VecDeque<StreamMemoEntry>>>,
    preload_limiter: Arc<Semaphore>,
    bulk_limiter: Arc<Semaphore>,
    app_handle: Arc<StdMutex<Option<AppHandle>>>,
    bulk_status: Arc<StdMutex<Option<BulkStatus>>>,
    bulk_cancel: Arc<AtomicBool>,
    temp_max_tracks: Arc<AtomicU64>,
}

impl TrackCacheState {
    pub fn init(cache_root: PathBuf, offline_dir: PathBuf) -> Result<Self, String> {
        let temp_dir = cache_root.join("temp");
        std::fs::create_dir_all(&temp_dir).map_err(|e| format!("create temp cache: {e}"))?;
        std::fs::create_dir_all(&offline_dir).map_err(|e| format!("create offline cache: {e}"))?;

        // temp это кэш текущего проигрывания, после перезапуска он не нужен
        clear_dir(&temp_dir, &HashSet::new());

        let http = http::shared();
        let anon = Arc::new(AnonClient::new(http.clone()));

        Ok(Self {
            temp_dir,
            offline_dir,
            http,
            anon,
            active: Arc::new(Mutex::new(HashMap::new())),
            active_ids: Arc::new(StdMutex::new(HashSet::new())),
            recent: Arc::new(StdMutex::new(Vec::new())),
            offline_locks: Arc::new(Mutex::new(HashMap::new())),
            stream_memo: Arc::new(StdMutex::new(VecDeque::new())),
            preload_limiter: Arc::new(Semaphore::new(MAX_PARALLEL_PRELOADS)),
            bulk_limiter: Arc::new(Semaphore::new(MAX_PARALLEL_BULK)),
            app_handle: Arc::new(StdMutex::new(None)),
            bulk_status: Arc::new(StdMutex::new(None)),
            bulk_cancel: Arc::new(AtomicBool::new(false)),
            temp_max_tracks: Arc::new(AtomicU64::new(MAX_TEMP_TRACKS as u64)),
        })
    }

    // помечаем трек как используемый: вытеснение и очистка его не тронут
    pub fn touch(&self, track_id: u64) {
        if track_id == 0 {
            return;
        }
        let Ok(mut recent) = self.recent.lock() else {
            return;
        };
        let now = std::time::Instant::now();
        recent.retain(|(id, at)| {
            *id != track_id && now.duration_since(*at).as_secs() < RECENT_TTL_SECS
        });
        recent.push((track_id, now));
        if recent.len() > RECENT_MAX {
            let drop_count = recent.len() - RECENT_MAX;
            recent.drain(0..drop_count);
        }
    }

    fn is_recent(&self, track_id: u64) -> bool {
        let Ok(mut recent) = self.recent.lock() else {
            return false;
        };
        let now = std::time::Instant::now();
        recent.retain(|(_, at)| now.duration_since(*at).as_secs() < RECENT_TTL_SECS);
        recent.iter().any(|(id, _)| *id == track_id)
    }

    fn is_active(&self, track_id: u64) -> bool {
        self.active_ids
            .lock()
            .map(|ids| ids.contains(&track_id))
            .unwrap_or(false)
    }

    fn mark_active(&self, track_id: u64, active: bool) {
        if let Ok(mut ids) = self.active_ids.lock() {
            if active {
                ids.insert(track_id);
            } else {
                ids.remove(&track_id);
            }
        }
    }

    async fn offline_lock(&self, track_id: u64) -> Arc<Mutex<()>> {
        self.offline_locks
            .lock()
            .await
            .entry(track_id)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }

    pub fn set_app_handle(&mut self, handle: AppHandle) {
        *self.app_handle.lock().unwrap() = Some(handle);
    }

    fn emit(&self, event: &str, payload: serde_json::Value) {
        if let Some(app) = self.app_handle.lock().ok().and_then(|g| g.clone()) {
            let _ = app.emit(event, payload);
        }
    }

    fn announce_changed(&self, track_id: u64, offline: bool) {
        self.emit(
            "track:cache-changed",
            serde_json::json!({
                "trackId": track_id,
                "offline": offline,
            }),
        );
    }

    fn progress_emitter(
        &self,
        track_id: u64,
        source: &'static str,
    ) -> impl Fn(f64) + Send + Sync {
        let app = self.app_handle.lock().ok().and_then(|g| g.clone());
        let last = Arc::new(AtomicU32::new(0));
        move |progress| {
            let Some(app) = app.as_ref() else {
                return;
            };
            let percent = (progress.clamp(0.0, 1.0) * 100.0) as u32;
            if last.fetch_max(percent, Ordering::Relaxed) >= percent {
                return;
            }
            let _ = app.emit(
                "track:download-progress",
                serde_json::json!({
                    "trackId": track_id,
                    "progress": progress,
                    "source": source,
                }),
            );
        }
    }

    pub fn get_cache_path(&self, track_id: u64) -> Option<String> {
        self.get_entry(track_id).map(|e| e.path)
    }

    pub fn get_cache_entry(&self, track_id: u64) -> Option<TrackCacheEntry> {
        self.get_entry(track_id)
    }

    pub fn is_cached(&self, track_id: u64) -> bool {
        self.get_entry(track_id).is_some()
    }

    fn get_entry(&self, track_id: u64) -> Option<TrackCacheEntry> {
        let name = file_name(track_id);
        let offline = self.offline_dir.join(&name);
        if is_valid_file(&offline) {
            return Some(self.entry_at(track_id, &offline, true));
        }
        let temp = self.temp_dir.join(&name);
        if is_valid_file(&temp) {
            return Some(self.entry_at(track_id, &temp, false));
        }
        None
    }

    fn entry_at(&self, track_id: u64, path: &Path, offline: bool) -> TrackCacheEntry {
        let meta = read_metadata(path);
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        TrackCacheEntry {
            track_id,
            path: path.to_string_lossy().into_owned(),
            quality: meta
                .as_ref()
                .map(|m| m.quality.clone())
                .unwrap_or_else(|| AudioQuality::Best.label().to_string()),
            preset: meta.as_ref().map(|m| m.preset.clone()).unwrap_or_default(),
            bitrate: meta.as_ref().and_then(|m| m.bitrate),
            source: meta
                .as_ref()
                .map(|m| m.source.clone())
                .unwrap_or_default(),
            offline,
            size,
            duration_ms: meta.and_then(|m| m.expected_duration_ms),
        }
    }

    pub async fn ensure_cached(
        &self,
        req: CacheRequest,
    ) -> Result<EnsureCachedResult, String> {
        let track_id = req.track_id;
        let urn = urn(track_id);

        if let Some(entry) = self.get_entry(track_id) {
            if cached_satisfies(&entry, req.quality) {
                if req.offline && !entry.offline {
                    let entry = self.move_to_offline(track_id).await?;
                    return Ok(EnsureCachedResult {
                        entry,
                        stream: None,
                    });
                }
                self.mark_played(track_id);
                self.touch(track_id);
                return Ok(EnsureCachedResult {
                    entry,
                    stream: None,
                });
            }
        }

        // одинаковые запросы на один трек склеиваем
        let mut active = self.active.lock().await;
        if let Some(existing) = active.get(&urn) {
            let notify = existing.notify.clone();
            let result_slot = existing.result.clone();
            drop(active);
            let notified = notify.notified();
            tokio::pin!(notified);
            notified.as_mut().enable();
            let mut result = result_slot.lock().await.clone();
            if result.is_none() {
                // лидер мог зависнуть на сети, ждем не бесконечно
                if tokio::time::timeout(Duration::from_secs(WAIT_DOWNLOAD_SECS), notified)
                    .await
                    .is_err()
                {
                    return self.existing_or_err(track_id, "ожидание загрузки истекло");
                }
                result = result_slot.lock().await.clone();
            }
            let Some(mut result) = result else {
                return self.existing_or_err(track_id, "download finished without result");
            };
            if let Ok(ready) = &result {
                if req.offline && !ready.entry.offline {
                    if let Ok(entry) = self.move_to_offline(track_id).await {
                        result = Ok(EnsureCachedResult { entry, stream: None });
                    }
                }
            }
            return result;
        }

        let notify = Arc::new(Notify::new());
        let result_slot: Arc<Mutex<Option<Result<EnsureCachedResult, String>>>> =
            Arc::new(Mutex::new(None));
        active.insert(
            urn.clone(),
            ActiveDownload {
                notify: notify.clone(),
                result: result_slot.clone(),
            },
        );
        drop(active);
        self.mark_active(track_id, true);

        let result = self.download_and_store(&req).await;

        {
            let mut slot = result_slot.lock().await;
            *slot = Some(result.clone());
        }
        notify.notify_waiters();
        self.active.lock().await.remove(&urn);
        self.mark_active(track_id, false);

        result
    }

    // если скачать не вышло, но файл уже есть, играем его вместо ошибки
    fn existing_or_err(
        &self,
        track_id: u64,
        err: &str,
    ) -> Result<EnsureCachedResult, String> {
        match self.get_entry(track_id) {
            Some(entry) => Ok(EnsureCachedResult {
                entry,
                stream: None,
            }),
            None => Err(format!("{err} (трек {track_id})")),
        }
    }

    async fn download_and_store(
        &self,
        req: &CacheRequest,
    ) -> Result<EnsureCachedResult, String> {
        let downloaded = match self.fetch_audio(req.track_id, req.quality).await {
            Ok(downloaded) => downloaded,
            Err(err) => {
                // локальная копия лучше ошибки: сеть могла отвалиться
                if let Some(entry) = self.get_entry(req.track_id) {
                    if cached_playable(&entry) {
                        println!("[cache] {} fetch failed, играем из кэша", req.track_id);
                        return Ok(EnsureCachedResult {
                            entry,
                            stream: None,
                        });
                    }
                }
                return Err(err);
            }
        };

        // если копия уже лежит в offline, обновляем ее же: иначе апгрейд качества
        // каждый раз качал бы трек заново поверх более старой offline версии
        let existing_offline = is_valid_file(&self.offline_dir.join(file_name(req.track_id)));
        let offline = req.offline || existing_offline;
        let entry = self
            .store(
                req.track_id,
                &downloaded,
                req.quality,
                req.expected_duration_ms,
                offline,
            )
            .await?;

        // трек только что появился: до вызова play_cached его нельзя вытеснять
        self.touch(req.track_id);
        self.evict_temp();

        self.announce_changed(req.track_id, offline);
        println!(
            "[cache] {} {} {} kbps via {} prio {:?}",
            if offline { "offline" } else { "temp" },
            req.track_id,
            downloaded.bitrate.map_or(0, |b| b),
            downloaded.source,
            req.priority
        );

        Ok(EnsureCachedResult {
            entry,
            stream: downloaded.stream,
        })
    }

    async fn fetch_audio(
        &self,
        track_id: u64,
        quality: AudioQuality,
    ) -> Result<DownloadedAudio, String> {
        let primary = match resolve_track_stream(track_id, quality).await {
            Ok(info) => {
                let client = self.http.client();
                let progress = self.progress_emitter(track_id, "api");
                let data = if info.protocol == "progressive" {
                    hls::download_progressive(&client, &info.url, &progress).await
                } else {
                    hls::download_hls_full(&client, &info.url, &progress).await
                };

                match data {
                    Ok(data) => {
                        return Ok(DownloadedAudio {
                            data,
                            stream: Some(info.clone()),
                            preset: info.preset,
                            bitrate: info.bitrate,
                            source: "api".into(),
                        })
                    }
                    Err(err) => format!("api download: {err}"),
                }
            }
            Err(err) => err,
        };

        println!("[cache] primary failed for {track_id}: {primary}, trying anon");
        let progress = self.progress_emitter(track_id, "anon");
        match self
            .anon
            .get_stream(&track_id.to_string(), quality, &progress)
            .await
        {
            Ok(Some(stream)) => Ok(DownloadedAudio {
                data: stream.data,
                stream: None,
                preset: stream.preset,
                bitrate: stream.bitrate,
                source: "anon".into(),
            }),
            Ok(None) => Err(format!("{primary}; anon: нет доступного потока")),
            Err(err) => Err(format!("{primary}; anon: {err}")),
        }
    }

    async fn store(
        &self,
        track_id: u64,
        downloaded: &DownloadedAudio,
        quality: AudioQuality,
        expected_duration_ms: Option<u64>,
        offline: bool,
    ) -> Result<TrackCacheEntry, String> {
        let total_size = downloaded.data.len() as u64;
        let sniff_len = AUDIO_SNIFF_LEN.min(downloaded.data.len());
        if !is_valid_audio(&downloaded.data[..sniff_len], total_size) {
            return Err("скачанный файл не похож на аудио".into());
        }

        let dir = if offline {
            &self.offline_dir
        } else {
            &self.temp_dir
        };
        let final_path = dir.join(file_name(track_id));
        let temp_path = dir.join(format!("{}.part", file_name(track_id)));

        let file = File::create(&temp_path)
            .await
            .map_err(|e| format!("cache create: {e}"))?;
        let mut writer = BufWriter::with_capacity(STREAM_WRITE_BUFFER_SIZE, file);
        let write_result = async {
            writer
                .write_all(&downloaded.data)
                .await
                .map_err(|e| format!("cache write: {e}"))?;
            writer
                .flush()
                .await
                .map_err(|e| format!("cache flush: {e}"))
        }
        .await;
        drop(writer);
        if let Err(err) = write_result {
            // недописанный part иначе останется на диске навсегда
            let _ = tokio::fs::remove_file(&temp_path).await;
            return Err(err);
        }

        if let Err(err) = replace_file(&temp_path, &final_path).await {
            let _ = tokio::fs::remove_file(&temp_path).await;
            // файл занят плеером: играем то, что уже есть, вместо ошибки
            if is_valid_file(&final_path) {
                println!("[cache] {track_id} занят плеером, оставляем старый файл");
                return Ok(self.entry_at(track_id, &final_path, offline));
            }
            return Err(format!("cache rename: {err}"));
        }

        let meta = TrackCacheMetadata {
            quality: quality.label().to_string(),
            preset: downloaded.preset.clone(),
            bitrate: downloaded.bitrate,
            source: downloaded.source.clone(),
            expected_duration_ms,
        };
        write_metadata(&final_path, &meta);

        Ok(self.entry_at(track_id, &final_path, offline))
    }

    pub async fn move_to_offline(&self, track_id: u64) -> Result<TrackCacheEntry, String> {
        let name = file_name(track_id);
        let temp = self.temp_dir.join(&name);
        let offline = self.offline_dir.join(&name);

        // два одновременных запроса не должны копировать в один путь
        let lock = self.offline_lock(track_id).await;
        let _guard = lock.lock().await;

        if is_valid_file(&offline) {
            return Ok(self.entry_at(track_id, &offline, true));
        }
        if !is_valid_file(&temp) {
            return Err("трека нет в temp".into());
        }

        tokio::fs::create_dir_all(&self.offline_dir)
            .await
            .map_err(|e| e.to_string())?;
        let meta = read_metadata(&temp);
        // копируем в part, чтобы плеер не открыл недописанный offline файл
        let part = self.offline_dir.join(format!("{}.part", name));
        let copied = tokio::fs::copy(&temp, &part)
            .await
            .map_err(|e| format!("copy offline: {e}"));
        let copy_result = match copied {
            Ok(_) => replace_file(&part, &offline).await,
            Err(err) => {
                let _ = tokio::fs::remove_file(&part).await;
                return Err(err);
            }
        };
        if let Err(err) = copy_result {
            let _ = tokio::fs::remove_file(&part).await;
            return Err(format!("rename offline: {err}"));
        }
        if let Some(meta) = meta {
            write_metadata(&offline, &meta);
        }
        // temp больше не нужен, но удалим его только если плеер не держит файл
        if !self.is_recent(track_id) {
            remove_file_and_meta(&temp);
        }

        self.announce_changed(track_id, true);
        Ok(self.entry_at(track_id, &offline, true))
    }

    // режим только воспроизведения: тянем байты в память и не трогаем диск
    pub async fn stream_audio(
        &self,
        track_id: u64,
        quality: AudioQuality,
    ) -> Result<(Bytes, Option<StreamInfo>), String> {
        let label = quality.label().to_string();
        if let Some(hit) = self.stream_memo_get(track_id, &label) {
            return Ok(hit);
        }
        let downloaded = self.fetch_audio(track_id, quality).await?;
        let total_size = downloaded.data.len() as u64;
        let sniff_len = AUDIO_SNIFF_LEN.min(downloaded.data.len());
        if !is_valid_audio(&downloaded.data[..sniff_len], total_size) {
            return Err("поток не похож на аудио".into());
        }
        self.stream_memo_put(track_id, label, downloaded.data.clone(), downloaded.stream.clone());
        Ok((downloaded.data, downloaded.stream))
    }

    fn stream_memo_get(&self, track_id: u64, quality: &str) -> Option<(Bytes, Option<StreamInfo>)> {
        let Ok(mut memo) = self.stream_memo.lock() else {
            return None;
        };
        let pos = memo
            .iter()
            .position(|e| e.track_id == track_id && e.quality == quality)?;
        let entry = memo.remove(pos)?;
        let out = (entry.data.clone(), entry.stream.clone());
        memo.push_front(entry);
        Some(out)
    }

    fn stream_memo_put(
        &self,
        track_id: u64,
        quality: String,
        data: Bytes,
        stream: Option<StreamInfo>,
    ) {
        let Ok(mut memo) = self.stream_memo.lock() else {
            return;
        };
        memo.retain(|e| !(e.track_id == track_id && e.quality == quality));
        memo.push_front(StreamMemoEntry {
            track_id,
            quality,
            data,
            stream,
        });
        let mut total: usize = memo.iter().map(|e| e.data.len()).sum();
        while memo.len() > 3 || (total > STREAM_MEMO_MAX_BYTES && memo.len() > 1) {
            let Some(dropped) = memo.pop_back() else {
                break;
            };
            total = total.saturating_sub(dropped.data.len());
        }
    }

    pub fn preload(&self, tracks: Vec<PreloadTrack>, quality: AudioQuality) {
        for track in tracks {
            if self.is_cached(track.track_id) {
                continue;
            }
            let Ok(permit) = self.preload_limiter.clone().try_acquire_owned() else {
                continue;
            };
            let state = self.clone();
            tauri::async_runtime::spawn(async move {
                let _permit = permit;
                let _ = state
                    .ensure_cached(CacheRequest {
                        track_id: track.track_id,
                        quality,
                        expected_duration_ms: track.duration_ms,
                        offline: false,
                        priority: Priority::Background,
                    })
                    .await;
            });
        }
    }

    pub fn remove_cached(&self, track_id: u64, offline_only: bool) -> bool {
        // играемый трек не удаляем, иначе seek и повторное включение сломаются
        if self.is_recent(track_id) || self.is_active(track_id) {
            return false;
        }
        let mut removed = false;
        let offline = self.offline_dir.join(file_name(track_id));
        if offline.exists() && remove_file_and_meta(&offline) {
            removed = true;
        }
        if !offline_only {
            let temp = self.temp_dir.join(file_name(track_id));
            if temp.exists() && remove_file_and_meta(&temp) {
                removed = true;
            }
        }
        if removed {
            self.announce_changed(track_id, false);
        }
        removed
    }

    pub fn mark_played(&self, track_id: u64) {
        let path = if is_valid_file(&self.offline_dir.join(file_name(track_id))) {
            self.offline_dir.join(file_name(track_id))
        } else {
            self.temp_dir.join(file_name(track_id))
        };
        if let Ok(file) = std::fs::OpenOptions::new().write(true).open(path) {
            let _ = file.set_modified(SystemTime::now());
        }
    }

    pub fn temp_size(&self) -> u64 {
        dir_size(&self.temp_dir)
    }

    pub fn offline_size(&self) -> u64 {
        dir_size(&self.offline_dir)
    }

    pub fn sizes(&self) -> CacheSizes {
        CacheSizes {
            temp: self.temp_size(),
            offline: self.offline_size(),
        }
    }

    pub fn clear_cache(&self, scope: &str) {
        let keep = self.recent_ids();
        match scope {
            "temp" => clear_dir(&self.temp_dir, &keep),
            "offline" => clear_dir(&self.offline_dir, &keep),
            _ => {
                clear_dir(&self.temp_dir, &keep);
                clear_dir(&self.offline_dir, &keep);
            }
        }
        self.emit("track:cache-cleared", serde_json::json!({ "scope": scope }));
    }

    fn recent_ids(&self) -> HashSet<u64> {
        let mut out = HashSet::new();
        let Ok(mut recent) = self.recent.lock() else {
            return out;
        };
        let now = std::time::Instant::now();
        recent.retain(|(_, at)| now.duration_since(*at).as_secs() < RECENT_TTL_SECS);
        for (id, _) in recent.iter() {
            out.insert(*id);
        }
        out
    }

    pub fn enforce_limit(&self, limit_mb: u64) {
        if limit_mb == 0 {
            return;
        }
        let limit = limit_mb.saturating_mul(1024 * 1024);
        let mut files = audio_files(&self.temp_dir);
        let mut total: u64 = files.iter().map(|(_, size, _)| *size).sum();
        if total <= limit {
            return;
        }
        files.sort_by_key(|(_, _, used)| *used);
        for (path, size, _) in files {
            if total <= limit {
                break;
            }
            let track_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(track_id_from_name);
            // играемый трек не трогаем даже под лимитом
            if let Some(id) = track_id {
                if self.is_recent(id) || self.is_active(id) {
                    continue;
                }
            }
            if std::fs::remove_file(&path).is_ok() {
                remove_metadata(&path);
                total = total.saturating_sub(size);
                if let Some(id) = track_id {
                    self.announce_changed(id, false);
                }
            }
        }
    }

    fn evict_temp(&self) {
        let max = self.temp_max_tracks.load(Ordering::Relaxed) as usize;
        let mut files: Vec<(PathBuf, u64, SystemTime, u64)> = audio_files(&self.temp_dir)
            .into_iter()
            .filter_map(|(path, size, used)| {
                let track_id = track_id_from_name(path.file_name()?.to_str()?)?;
                if self.is_active(track_id) || self.is_recent(track_id) {
                    return None;
                }
                Some((path, size, used, track_id))
            })
            .collect();

        if files.len() <= max {
            return;
        }
        files.sort_by_key(|(_, _, used, _)| *used);
        let remove_count = files.len().saturating_sub(max);
        for (path, _, _, track_id) in files.into_iter().take(remove_count) {
            if remove_file_and_meta(&path) {
                self.announce_changed(track_id, false);
            }
        }
    }

    pub fn cache_inventory(&self, scope: &str) -> Vec<TrackCacheEntry> {
        let mut out = Vec::new();
        if scope == "temp" || scope == "all" {
            out.extend(self.inventory_dir(&self.temp_dir, false));
        }
        if scope == "offline" || scope == "all" {
            out.extend(self.inventory_dir(&self.offline_dir, true));
        }
        out.sort_by_key(|e| e.track_id);
        out
    }

    fn inventory_dir(&self, dir: &Path, offline: bool) -> Vec<TrackCacheEntry> {
        let mut out = Vec::new();
        let Ok(entries) = std::fs::read_dir(dir) else {
            return out;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("audio") {
                continue;
            }
            let Some(track_id) = path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(track_id_from_name)
            else {
                continue;
            };
            if is_valid_file(&path) {
                out.push(self.entry_at(track_id, &path, offline));
            }
        }
        out
    }

    pub fn begin_bulk(&self, scope: String, total: u32) -> Result<(), String> {
        let mut slot = self
            .bulk_status
            .lock()
            .map_err(|_| "bulk state poisoned".to_string())?;
        if let Some(current) = slot.as_ref() {
            if current.phase == "running" {
                return Err(format!("уже качается {}", current.scope));
            }
        }
        *slot = Some(BulkStatus {
            scope,
            phase: "running".into(),
            total,
            done: 0,
            failed: 0,
            skipped: 0,
        });
        self.bulk_cancel.store(false, Ordering::Relaxed);
        Ok(())
    }

    pub fn bulk_status(&self) -> Option<BulkStatus> {
        self.bulk_status
            .lock()
            .ok()
            .and_then(|s| s.clone())
    }

    pub fn cancel_bulk(&self) {
        self.bulk_cancel.store(true, Ordering::Relaxed);
    }

    pub fn run_bulk(self, tracks: Vec<BulkTrack>, quality: AudioQuality) {
        tauri::async_runtime::spawn(async move {
            let mut handles = Vec::new();
            for track in tracks {
                if self.bulk_cancel.load(Ordering::Relaxed) {
                    break;
                }
                if self
                    .get_entry(track.track_id)
                    .is_some_and(|e| e.offline)
                {
                    self.record_bulk(BulkOutcome::Skipped);
                    continue;
                }
                let Ok(permit) = self.bulk_limiter.clone().acquire_owned().await else {
                    break;
                };
                let state = self.clone();
                handles.push(tokio::spawn(async move {
                    let _permit = permit;
                    if state.bulk_cancel.load(Ordering::Relaxed) {
                        return;
                    }
                    let result = state
                        .ensure_cached(CacheRequest {
                            track_id: track.track_id,
                            quality,
                            expected_duration_ms: track.duration_ms,
                            offline: true,
                            priority: Priority::Bulk,
                        })
                        .await;
                    state.record_bulk(if result.is_ok() {
                        BulkOutcome::Cached
                    } else {
                        BulkOutcome::Failed
                    });
                }));
            }
            for handle in handles {
                let _ = handle.await;
            }
            let cancelled = self.bulk_cancel.swap(false, Ordering::Relaxed);
            if let Ok(mut slot) = self.bulk_status.lock() {
                if let Some(status) = slot.as_mut() {
                    status.phase = if cancelled { "cancelled" } else { "done" }.into();
                }
            }
            self.emit_bulk("finished");
        });
    }

    fn record_bulk(&self, outcome: BulkOutcome) {
        if let Ok(mut slot) = self.bulk_status.lock() {
            if let Some(status) = slot.as_mut() {
                status.done += 1;
                match outcome {
                    BulkOutcome::Cached => {}
                    BulkOutcome::Skipped => status.skipped += 1,
                    BulkOutcome::Failed => status.failed += 1,
                }
            }
        }
        self.emit_bulk("progress");
    }

    fn emit_bulk(&self, phase: &str) {
        let Some(status) = self.bulk_status() else {
            return;
        };
        self.emit(
            "track:bulk-cache-progress",
            serde_json::json!({
                "phase": phase,
                "scope": status.scope,
                "status": status.phase,
                "total": status.total,
                "done": status.done,
                "failed": status.failed,
                "skipped": status.skipped,
            }),
        );
    }
}

enum BulkOutcome {
    Cached,
    Skipped,
    Failed,
}

fn cached_satisfies(entry: &TrackCacheEntry, quality: AudioQuality) -> bool {
    // сравниваем запрошенное качество при загрузке, а не фактический битрейт,
    // иначе при отсутствии точного пресета трек будет перекачиваться каждый раз
    AudioQuality::from_label(Some(&entry.quality)).rank() >= quality.rank()
}

fn urn(track_id: u64) -> String {
    format!("soundcloud:tracks:{track_id}")
}

fn file_name(track_id: u64) -> String {
    format!("soundcloud_tracks_{track_id}.audio")
}

fn track_id_from_name(name: &str) -> Option<u64> {
    name.strip_prefix("soundcloud_tracks_")?
        .strip_suffix(".audio")?
        .parse()
        .ok()
}

fn metadata_path(path: &Path) -> PathBuf {
    PathBuf::from(format!("{}.meta.json", path.display()))
}

fn read_metadata(path: &Path) -> Option<TrackCacheMetadata> {
    let raw = std::fs::read_to_string(metadata_path(path)).ok()?;
    serde_json::from_str(&raw).ok()
}

fn write_metadata(path: &Path, meta: &TrackCacheMetadata) {
    let Ok(raw) = serde_json::to_vec(meta) else {
        return;
    };
    let final_path = metadata_path(path);
    let temp = PathBuf::from(format!("{}.tmp", final_path.display()));
    if std::fs::write(&temp, raw).is_ok() {
        if std::fs::rename(&temp, &final_path).is_err() {
            // на windows rename поверх существующего файла не работает
            let _ = std::fs::remove_file(&final_path);
            if std::fs::rename(&temp, &final_path).is_err() {
                let _ = std::fs::remove_file(&temp);
            }
        }
    }
}

fn remove_metadata(path: &Path) {
    let _ = std::fs::remove_file(metadata_path(path));
}

// true только если аудиофайл реально удален: иначе metadata останется без файла
fn remove_file_and_meta(path: &Path) -> bool {
    let removed = std::fs::remove_file(path).is_ok();
    if removed {
        remove_metadata(path);
    }
    removed
}

async fn replace_file(temp: &Path, final_path: &Path) -> Result<(), String> {
    match tokio::fs::rename(temp, final_path).await {
        Ok(()) => Ok(()),
        Err(_) => {
            tokio::fs::remove_file(final_path).await.ok();
            tokio::fs::rename(temp, final_path)
                .await
                .map_err(|e| e.to_string())
        }
    }
}

fn is_valid_file(path: &Path) -> bool {
    let Ok(meta) = std::fs::metadata(path) else {
        return false;
    };
    if meta.len() < MIN_AUDIO_SIZE {
        return false;
    }
    // заголовок отсекает html страницу прокси, сохраненную как .audio
    let mut head = [0u8; AUDIO_SNIFF_LEN];
    let Ok(mut file) = std::fs::File::open(path) else {
        return false;
    };
    let Ok(n) = file.read(&mut head) else {
        return false;
    };
    is_valid_audio(&head[..n], meta.len())
}

fn cached_playable(entry: &TrackCacheEntry) -> bool {
    entry.size >= MIN_AUDIO_SIZE
}

fn is_audio_file(path: &Path) -> bool {
    path.extension().and_then(|e| e.to_str()) == Some("audio")
}

fn is_valid_audio(prefix: &[u8], total_size: u64) -> bool {
    if total_size < MIN_AUDIO_SIZE {
        return false;
    }
    if prefix.len() >= 3 && &prefix[..3] == b"ID3" {
        return true;
    }
    if prefix.len() >= 2 && prefix[0] == 0xff && (prefix[1] & 0xe0) == 0xe0 {
        return true;
    }
    if prefix.len() >= 8 && &prefix[4..8] == b"ftyp" {
        return true;
    }
    if prefix.len() >= 4 && (&prefix[..4] == b"OggS" || &prefix[..4] == b"fLaC" || &prefix[..4] == b"RIFF") {
        return true;
    }
    false
}

fn audio_files(dir: &Path) -> Vec<(PathBuf, u64, SystemTime)> {
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return out;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_audio_file(&path) {
            continue;
        }
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        // accessed на windows не обновляется, порядок вытеснения только по mtime
        let used = meta.modified().unwrap_or(UNIX_EPOCH);
        out.push((path, meta.len(), used));
    }
    out
}

fn dir_size(dir: &Path) -> u64 {
    audio_files(dir).iter().map(|(_, size, _)| *size).sum()
}

fn clear_dir(dir: &Path, keep: &HashSet<u64>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if let Some(track_id) = track_id_from_name(name) {
            if keep.contains(&track_id) {
                continue;
            }
        }
        if is_audio_file(&path)
            || name.ends_with(".meta.json")
            || name.ends_with(".tmp")
            || name.contains(".part")
        {
            let _ = std::fs::remove_file(&path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{cached_satisfies, file_name, is_valid_audio, track_id_from_name, TrackCacheEntry};
    use crate::api::quality::AudioQuality;

    fn entry(track_id: u64, bitrate: Option<u32>, quality: &str) -> TrackCacheEntry {
        TrackCacheEntry {
            track_id,
            path: String::new(),
            quality: quality.into(),
            preset: String::new(),
            bitrate,
            source: "test".into(),
            offline: false,
            size: 0,
            duration_ms: None,
        }
    }

    #[test]
    fn files_are_valid_only_with_a_known_audio_header() {
        assert!(is_valid_audio(b"ID3\x04\x00\x00", 8192));
        assert!(is_valid_audio(b"\x00\x00\x00\x20ftypM4A ", 8192));
        assert!(is_valid_audio(b"OggS\x00\x02", 8192));
        assert!(!is_valid_audio(b"<html>", 8192));
        assert!(!is_valid_audio(b"ID3", 100));
    }

    #[test]
    fn file_names_round_trip() {
        assert_eq!(track_id_from_name(&file_name(42)), Some(42));
        assert_eq!(track_id_from_name("soundcloud_tracks_042.audio"), Some(42));
        assert_eq!(track_id_from_name("soundcloud_tracks_42.mp3"), None);
    }

    #[test]
    fn cache_quality_accepts_what_is_close_enough() {
        let best = entry(1, Some(128), "best");
        assert!(cached_satisfies(&best, AudioQuality::Best));
        assert!(cached_satisfies(&best, AudioQuality::High));
        assert!(cached_satisfies(&best, AudioQuality::Medium));

        let high = entry(2, Some(160), "high");
        assert!(cached_satisfies(&high, AudioQuality::High));
        assert!(cached_satisfies(&high, AudioQuality::Medium));
        assert!(!cached_satisfies(&high, AudioQuality::Best));

        let low = entry(3, None, "low");
        assert!(cached_satisfies(&low, AudioQuality::Low));
        assert!(!cached_satisfies(&low, AudioQuality::High));
    }

}
