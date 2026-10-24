use std::future::Future;
use std::sync::atomic::{AtomicU64, AtomicU8, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use bytes::Bytes;
use regex::Regex;
use tokio::sync::{Mutex, RwLock};

use crate::api::quality::{bitrate_from_preset, AudioQuality};
use crate::track_cache::hls::{download_hls_full, download_progressive};
use crate::track_cache::http::CacheHttp;

const SC_BASE_URL: &str = "https://soundcloud.com";
const SC_API_V2: &str = "https://api-v2.soundcloud.com";
const FAIL_THRESHOLD: u8 = 3;
const COOLDOWN_SECS: u64 = 300;
const CLIENT_ID_MIN_REFRESH: Duration = Duration::from_secs(30);
const RESOLVE_BUDGET: Duration = Duration::from_secs(15);

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct TranscodingFormat {
    pub protocol: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct Transcoding {
    pub url: String,
    pub preset: Option<String>,
    pub snipped: Option<bool>,
    pub format: Option<TranscodingFormat>,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct TrackMedia {
    pub transcodings: Option<Vec<Transcoding>>,
}

#[derive(Debug, serde::Deserialize)]
pub struct ResolvedTrack {
    pub media: Option<TrackMedia>,
    pub track_authorization: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
struct TranscodingResolveResponse {
    url: String,
}

pub struct AnonStream {
    pub data: Bytes,
    pub preset: String,
    pub bitrate: Option<u32>,
}

struct ResolveBudget {
    left: Duration,
}

impl ResolveBudget {
    fn new() -> Self {
        Self { left: RESOLVE_BUDGET }
    }

    fn is_spent(&self) -> bool {
        self.left.is_zero()
    }

    async fn spend<T>(
        &mut self,
        step: impl Future<Output = Result<T, String>>,
    ) -> Result<T, String> {
        let spent = || format!("resolve took over {}s", RESOLVE_BUDGET.as_secs());
        if self.is_spent() {
            return Err(spent());
        }
        let started = Instant::now();
        match tokio::time::timeout(self.left, step).await {
            Ok(result) => {
                self.left = self.left.saturating_sub(started.elapsed());
                result
            }
            Err(_) => {
                self.left = Duration::ZERO;
                Err(spent())
            }
        }
    }
}

pub struct AnonClient {
    http: Arc<CacheHttp>,
    client_id: Arc<RwLock<Option<String>>>,
    refresh_gate: Mutex<Option<Instant>>,
    fail_count: AtomicU8,
    cooldown_until: AtomicU64,
}

impl AnonClient {
    pub fn new(http: Arc<CacheHttp>) -> Self {
        Self {
            http,
            client_id: Arc::new(RwLock::new(None)),
            refresh_gate: Mutex::new(None),
            fail_count: AtomicU8::new(0),
            cooldown_until: AtomicU64::new(0),
        }
    }

    fn log(&self, level: &str, message: impl AsRef<str>) {
        let line = format!("[SCAnon] {}", message.as_ref());
        match level {
            "ERROR" | "WARN" => eprintln!("{line}"),
            _ => println!("{line}"),
        }
    }

    fn in_cooldown(&self) -> bool {
        self.cooldown_until.load(Ordering::Relaxed) > now_secs()
    }

    fn note_success(&self) {
        self.fail_count.store(0, Ordering::Relaxed);
        self.cooldown_until.store(0, Ordering::Relaxed);
    }

    fn note_failure(&self) {
        let count = self.fail_count.fetch_add(1, Ordering::Relaxed) + 1;
        if count >= FAIL_THRESHOLD {
            self.cooldown_until
                .store(now_secs() + COOLDOWN_SECS, Ordering::Relaxed);
            self.fail_count.store(0, Ordering::Relaxed);
            self.log("WARN", format!("circuit open, skipping anon for {COOLDOWN_SECS}s"));
        }
    }

    pub async fn get_stream(
        &self,
        track_id: &str,
        quality: AudioQuality,
        progress: &(dyn Fn(f64) + Send + Sync),
    ) -> Result<Option<AnonStream>, String> {
        if self.in_cooldown() {
            return Ok(None);
        }
        let result = self.do_get_stream(track_id, quality, progress).await;
        match &result {
            Ok(Some(_)) => self.note_success(),
            Err(_) => self.note_failure(),
            Ok(None) => {}
        }
        result
    }

    async fn do_get_stream(
        &self,
        track_id: &str,
        quality: AudioQuality,
        progress: &(dyn Fn(f64) + Send + Sync),
    ) -> Result<Option<AnonStream>, String> {
        let mut budget = ResolveBudget::new();
        let track = match budget.spend(self.get_track_by_id(track_id)).await {
            Ok(t) => t,
            Err(e) => {
                self.log("WARN", format!("get track failed: {e}"));
                return Err(e);
            }
        };

        let mut track_auth = track.track_authorization.clone();
        let mut transcodings = track
            .media
            .as_ref()
            .and_then(|m| m.transcodings.as_ref())
            .cloned()
            .unwrap_or_default();

        if transcodings.is_empty() {
            budget.spend(self.invalidate_and_refresh()).await?;
            let retry = budget.spend(self.get_track_by_id(track_id)).await?;
            track_auth = retry.track_authorization.clone();
            transcodings = retry
                .media
                .and_then(|m| m.transcodings)
                .unwrap_or_default();
            if transcodings.is_empty() {
                return Ok(None);
            }
        }

        match self
            .stream_from_transcodings(&transcodings, track_auth.as_deref(), quality, &mut budget, progress)
            .await
        {
            Ok(Some(r)) => Ok(Some(r)),
            Ok(None) => Ok(None),
            Err(e) => {
                self.log("WARN", format!("stream failed, refreshing client_id: {e}"));
                budget.spend(self.invalidate_and_refresh()).await?;
                let retry = budget.spend(self.get_track_by_id(track_id)).await?;
                let retry_auth = retry.track_authorization.clone();
                let retry_transcodings = retry
                    .media
                    .and_then(|m| m.transcodings)
                    .unwrap_or_default();
                if retry_transcodings.is_empty() {
                    return Ok(None);
                }
                self.stream_from_transcodings(
                    &retry_transcodings,
                    retry_auth.as_deref(),
                    quality,
                    &mut budget,
                    progress,
                )
                .await
            }
        }
    }

    async fn stream_from_transcodings(
        &self,
        transcodings: &[Transcoding],
        track_auth: Option<&str>,
        quality: AudioQuality,
        budget: &mut ResolveBudget,
        progress: &(dyn Fn(f64) + Send + Sync),
    ) -> Result<Option<AnonStream>, String> {
        let ranked = ranked_transcodings(transcodings, quality);
        if ranked.is_empty() {
            return Ok(None);
        }

        let mut last_err: Option<String> = None;
        let mut only_resource_gone = true;
        for t in ranked {
            let is_progressive = t
                .format
                .as_ref()
                .and_then(|f| f.protocol.as_deref())
                == Some("progressive");
            let preset = t.preset.clone().unwrap_or_else(|| "?".into());
            let bitrate = bitrate_from_preset(&preset);

            let resolve = self.resolve_transcoding_url(&t.url, track_auth);
            let media_url = match budget.spend(resolve).await {
                Ok(u) => u,
                Err(e) => {
                    if !looks_like_resource_gone(&e) {
                        only_resource_gone = false;
                    }
                    last_err = Some(format!("resolve {preset} failed: {e}"));
                    if budget.is_spent() {
                        break;
                    }
                    continue;
                }
            };

            let client = self.http.anon();
            let result = if is_progressive {
                download_progressive(&client, &media_url, progress).await
            } else {
                download_hls_full(&client, &media_url, progress).await
            };

            match result {
                Ok(data) => {
                    return Ok(Some(AnonStream {
                        data,
                        preset,
                        bitrate,
                    }))
                }
                Err(e) => {
                    if !looks_like_resource_gone(&e) {
                        only_resource_gone = false;
                    }
                    last_err = Some(format!("{preset} failed: {e}"));
                }
            }
        }

        if only_resource_gone {
            return Ok(None);
        }
        Err(last_err.unwrap_or_else(|| "all anon transcodings failed".into()))
    }

    async fn get_client_id(&self) -> Result<String, String> {
        {
            let cached = self.client_id.read().await;
            if let Some(ref id) = *cached {
                return Ok(id.clone());
            }
        }
        self.coalesced_refresh().await
    }

    async fn invalidate_and_refresh(&self) -> Result<String, String> {
        self.coalesced_refresh().await
    }

    async fn coalesced_refresh(&self) -> Result<String, String> {
        let mut gate = self.refresh_gate.lock().await;
        if let Some(last) = *gate {
            if last.elapsed() < CLIENT_ID_MIN_REFRESH {
                return self
                    .client_id
                    .read()
                    .await
                    .clone()
                    .ok_or_else(|| "client_id refresh failed recently".to_string());
            }
        }

        *gate = Some(Instant::now());
        let client_id = self.fetch_client_id().await?;
        *self.client_id.write().await = Some(client_id.clone());
        self.log("INFO", "refreshed public client_id");
        Ok(client_id)
    }

    async fn fetch_client_id(&self) -> Result<String, String> {
        let html = self
            .http
            .anon()
            .get(SC_BASE_URL)
            .send()
            .await
            .map_err(|e| format!("fetch sc home: {e}"))?
            .text()
            .await
            .map_err(|e| format!("read sc home body: {e}"))?;
        extract_client_id_from_hydration(&html)
            .ok_or_else(|| "failed to extract SoundCloud client_id".to_string())
    }

    async fn get_track_by_id(&self, track_id: &str) -> Result<ResolvedTrack, String> {
        let client_id = self.get_client_id().await?;
        let target = format!("{SC_API_V2}/tracks/{track_id}?client_id={client_id}");
        match self.fetch_json::<ResolvedTrack>(&target).await {
            Ok(t) => Ok(t),
            Err(_) => {
                let new_id = self.invalidate_and_refresh().await?;
                let retry = format!("{SC_API_V2}/tracks/{track_id}?client_id={new_id}");
                self.fetch_json(&retry).await
            }
        }
    }

    async fn resolve_transcoding_url(
        &self,
        transcoding_url: &str,
        track_authorization: Option<&str>,
    ) -> Result<String, String> {
        let client_id = self.get_client_id().await?;
        let target = build_transcoding_target(transcoding_url, &client_id, track_authorization);
        match self.fetch_json::<TranscodingResolveResponse>(&target).await {
            Ok(r) => Ok(r.url),
            Err(_) => {
                let new_id = self.invalidate_and_refresh().await?;
                let retry = build_transcoding_target(transcoding_url, &new_id, track_authorization);
                let response: TranscodingResolveResponse = self.fetch_json(&retry).await?;
                Ok(response.url)
            }
        }
    }

    async fn fetch_json<T: serde::de::DeserializeOwned>(&self, url: &str) -> Result<T, String> {
        let resp = self
            .http
            .anon()
            .get(url)
            .send()
            .await
            .map_err(|e| format!("request: {e}"))?;
        let status = resp.status();
        if !status.is_success() {
            return Err(format!("HTTP {status}"));
        }
        resp.json::<T>().await.map_err(|e| format!("decode: {e}"))
    }
}

fn ranked_transcodings(transcodings: &[Transcoding], quality: AudioQuality) -> Vec<&Transcoding> {
    let mut candidates: Vec<&Transcoding> = transcodings
        .iter()
        .filter(|t| {
            let protocol = t
                .format
                .as_ref()
                .and_then(|f| f.protocol.as_deref())
                .unwrap_or("");
            let mime = t
                .format
                .as_ref()
                .and_then(|f| f.mime_type.as_deref())
                .unwrap_or("");
            !protocol.contains("encrypted")
                && (mime.is_empty() || mime.starts_with("audio/"))
                && !t.snipped.unwrap_or(false)
                && !t.url.contains("/preview")
        })
        .collect();

    if candidates.is_empty() {
        return Vec::new();
    }

    candidates.sort_by(|a, b| {
        let ba = a.preset.as_deref().and_then(bitrate_from_preset);
        let bb = b.preset.as_deref().and_then(bitrate_from_preset);
        let pa = protocol_rank(a, quality);
        let pb = protocol_rank(b, quality);
        match quality {
            AudioQuality::Best => bb.cmp(&ba).then(pa.cmp(&pb)),
            AudioQuality::Low => pa.cmp(&pb).then(ba.cmp(&bb)),
            _ => quality
                .distance(ba)
                .cmp(&quality.distance(bb))
                .then(pa.cmp(&pb)),
        }
    });
    candidates
}

fn protocol_rank(t: &Transcoding, quality: AudioQuality) -> u8 {
    let protocol = t
        .format
        .as_ref()
        .and_then(|f| f.protocol.as_deref())
        .unwrap_or("");
    match (quality, protocol) {
        (AudioQuality::Low, "progressive") => 0,
        (AudioQuality::Low, "hls") => 1,
        (_, "hls") => 0,
        (_, "progressive") => 1,
        _ => 2,
    }
}

fn extract_client_id_from_hydration(html: &str) -> Option<String> {
    let pattern = r#""hydratable"\s*:\s*"apiClient"\s*,\s*"data"\s*:\s*\{\s*"id"\s*:\s*"([^"]+)""#;
    let re = Regex::new(pattern).ok()?;
    re.captures(html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
}

fn looks_like_resource_gone(err: &str) -> bool {
    err.contains("404")
}

fn build_transcoding_target(
    transcoding_url: &str,
    client_id: &str,
    track_authorization: Option<&str>,
) -> String {
    let sep = if transcoding_url.contains('?') { "&" } else { "?" };
    let mut target = format!("{transcoding_url}{sep}client_id={client_id}");
    if let Some(auth) = track_authorization.filter(|a| !a.is_empty()) {
        target.push_str("&track_authorization=");
        target.push_str(&urlencoding::encode(auth));
    }
    target
}


