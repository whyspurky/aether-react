// sidecar с замерами громкости: чтобы повтор и рестарт не декодировали трек заново

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::audio::loudness::{Loudness, LOUDNESS_VERSION};

// больше этого числа записей хранить смысла нет, старые вытесняем
const MAX_ENTRIES: usize = 20_000;
const PRUNE_TO: usize = 16_000;
const SAVE_DEBOUNCE_MS: u64 = 1500;

#[derive(Default, Serialize, Deserialize)]
struct LoudnessFile {
    version: u8,
    #[serde(default)]
    entries: HashMap<String, StoredLoudness>,
}

#[derive(Clone, Copy, Serialize, Deserialize)]
struct StoredLoudness {
    lufs: f32,
    true_peak_dbtp: f32,
    #[serde(default)]
    version: u8,
    // когда замер последний раз использовался: для вытеснения старых записей
    #[serde(default)]
    seen: u64,
}

pub struct LoudnessStore {
    path: StdMutex<Option<PathBuf>>,
    entries: Arc<StdMutex<HashMap<String, StoredLoudness>>>,
    dirty: Arc<AtomicBool>,
}

impl LoudnessStore {
    pub fn new() -> Self {
        Self {
            path: StdMutex::new(None),
            entries: Arc::new(StdMutex::new(HashMap::new())),
            dirty: Arc::new(AtomicBool::new(false)),
        }
    }

    // вызывается один раз при старте приложения
    pub fn attach(&self, path: PathBuf) {
        if let Ok(raw) = std::fs::read_to_string(&path) {
            if let Ok(file) = serde_json::from_str::<LoudnessFile>(&raw) {
                if file.version == LOUDNESS_VERSION {
                    if let Ok(mut entries) = self.entries.lock() {
                        *entries = file.entries;
                    }
                }
            }
        }
        if let Ok(mut slot) = self.path.lock() {
            *slot = Some(path);
        }
    }

    pub fn get(&self, key: &str) -> Option<Loudness> {
        let mut entries = self.entries.lock().ok()?;
        let stored = entries.get_mut(key)?;
        if stored.version != LOUDNESS_VERSION {
            return None;
        }
        stored.seen = now_secs();
        Some(Loudness {
            lufs: stored.lufs,
            true_peak_dbtp: stored.true_peak_dbtp,
            version: stored.version,
        })
    }

    pub fn put(&self, key: &str, loudness: Loudness) {
        let Ok(mut entries) = self.entries.lock() else {
            return;
        };
        entries.insert(
            key.to_string(),
            StoredLoudness {
                lufs: loudness.lufs,
                true_peak_dbtp: loudness.true_peak_dbtp,
                version: LOUDNESS_VERSION,
                seen: now_secs(),
            },
        );
        if entries.len() > MAX_ENTRIES {
            prune(&mut entries);
        }
        drop(entries);
        self.save_async();
    }

    fn save_async(&self) {
        // одна запись в полете: следующий put только поднимет флаг
        if self.dirty.swap(true, Ordering::SeqCst) {
            return;
        }
        let path = self.path.lock().ok().and_then(|p| p.clone());
        let Some(path) = path else {
            self.dirty.store(false, Ordering::SeqCst);
            return;
        };
        let entries = self.entries.clone();
        let dirty = self.dirty.clone();
        tauri::async_runtime::spawn_blocking(move || {
            std::thread::sleep(std::time::Duration::from_millis(SAVE_DEBOUNCE_MS));
            let snapshot = entries.lock().map(|e| (*e).clone()).unwrap_or_default();
            dirty.store(false, Ordering::SeqCst);
            let file = LoudnessFile {
                version: LOUDNESS_VERSION,
                entries: snapshot,
            };
            if let Ok(raw) = serde_json::to_vec(&file) {
                write_atomic(&path, &raw);
            }
        });
    }
}

fn prune(entries: &mut HashMap<String, StoredLoudness>) {
    let mut keys: Vec<(String, u64)> = entries
        .iter()
        .map(|(key, value)| (key.clone(), value.seen))
        .collect();
    keys.sort_by_key(|(_, seen)| *seen);
    let remove = entries.len().saturating_sub(PRUNE_TO);
    for (key, _) in keys.into_iter().take(remove) {
        entries.remove(&key);
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn write_atomic(path: &Path, raw: &[u8]) {
    let tmp = PathBuf::from(format!("{}.tmp", path.display()));
    if std::fs::write(&tmp, raw).is_err() {
        let _ = std::fs::remove_file(&tmp);
        return;
    }
    if std::fs::rename(&tmp, path).is_err() {
        // на windows rename поверх существующего файла не работает
        let _ = std::fs::remove_file(path);
        if std::fs::rename(&tmp, path).is_err() {
            let _ = std::fs::remove_file(&tmp);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stores_and_reads_measurements() {
        let store = LoudnessStore::new();
        let value = Loudness {
            lufs: -13.2,
            true_peak_dbtp: -1.4,
            version: LOUDNESS_VERSION,
        };
        store.put("1:12345", value);
        let back = store.get("1:12345").expect("value");
        assert!((back.lufs - value.lufs).abs() < 1e-6);
        assert!((back.true_peak_dbtp - value.true_peak_dbtp).abs() < 1e-6);
        assert!(store.get("2:999").is_none());
    }

    #[test]
    fn old_schema_is_ignored() {
        let store = LoudnessStore::new();
        {
            let mut entries = store.entries.lock().unwrap();
            entries.insert(
                "1:1".into(),
                StoredLoudness {
                    lufs: -20.0,
                    true_peak_dbtp: -3.0,
                    version: LOUDNESS_VERSION + 1,
                    seen: 1,
                },
            );
        }
        assert!(store.get("1:1").is_none());
    }

    #[test]
    fn prune_keeps_the_newest() {
        let mut entries = HashMap::new();
        for index in 0..(MAX_ENTRIES + 10) {
            entries.insert(
                format!("{index}:1"),
                StoredLoudness {
                    lufs: -14.0,
                    true_peak_dbtp: -2.0,
                    version: LOUDNESS_VERSION,
                    seen: index as u64,
                },
            );
        }
        prune(&mut entries);
        assert_eq!(entries.len(), PRUNE_TO);
        assert!(entries.contains_key(&format!("{}:1", MAX_ENTRIES + 9)));
        assert!(!entries.contains_key("0:1"));
    }
}
