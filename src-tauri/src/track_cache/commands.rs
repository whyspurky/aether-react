use tauri::State;

use crate::api::quality::AudioQuality;
use crate::track_cache::state::{
    BulkStatus, BulkTrack, CacheSizes, EnsureCachedResult, PreloadTrack, TrackCacheEntry,
    TrackCacheState,
};

// обход каталогов и чтение metadata уводим с главного потока: иначе ui замирает
async fn blocking<T, F>(cache: TrackCacheState, work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(TrackCacheState) -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || work(cache))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn track_ensure_cached(
    track_id: u64,
    quality: Option<String>,
    duration_ms: Option<u64>,
    offline: Option<bool>,
    state: State<'_, TrackCacheState>,
) -> Result<EnsureCachedResult, String> {
    state
        .ensure_cached(crate::track_cache::state::CacheRequest {
            track_id,
            quality: AudioQuality::from_label(quality.as_deref()),
            expected_duration_ms: duration_ms.filter(|&ms| ms > 0),
            offline: offline.unwrap_or(false),
            priority: crate::track_cache::state::Priority::Playback,
        })
        .await
}

#[tauri::command]
pub fn track_preload(
    tracks: Vec<PreloadTrack>,
    quality: Option<String>,
    state: State<'_, TrackCacheState>,
) {
    state.preload(
        tracks,
        AudioQuality::from_label(quality.as_deref()),
    );
}

#[tauri::command]
pub async fn track_remove_cached(
    track_id: u64,
    offline_only: Option<bool>,
    state: State<'_, TrackCacheState>,
) -> Result<bool, String> {
    let offline_only = offline_only.unwrap_or(false);
    blocking(state.inner().clone(), move |cache| {
        cache.remove_cached(track_id, offline_only)
    })
    .await
}

#[tauri::command]
pub async fn track_cache_info(
    track_id: u64,
    state: State<'_, TrackCacheState>,
) -> Result<Option<TrackCacheEntry>, String> {
    blocking(state.inner().clone(), move |cache| {
        cache.get_cache_entry(track_id)
    })
    .await
}

#[tauri::command]
pub async fn track_is_cached(
    track_id: u64,
    state: State<'_, TrackCacheState>,
) -> Result<bool, String> {
    blocking(state.inner().clone(), move |cache| cache.is_cached(track_id)).await
}

#[tauri::command]
pub async fn track_cache_size(
    state: State<'_, TrackCacheState>,
) -> Result<CacheSizes, String> {
    blocking(state.inner().clone(), |cache| cache.sizes()).await
}

#[tauri::command]
pub async fn track_clear_cache(
    scope: Option<String>,
    state: State<'_, TrackCacheState>,
) -> Result<(), String> {
    let scope = scope.as_deref().unwrap_or("all").to_string();
    blocking(state.inner().clone(), move |cache| {
        cache.clear_cache(&scope)
    })
    .await
}

#[tauri::command]
pub async fn track_enforce_cache_limit(
    limit_mb: u64,
    state: State<'_, TrackCacheState>,
) -> Result<(), String> {
    blocking(state.inner().clone(), move |cache| {
        cache.enforce_limit(limit_mb)
    })
    .await
}

#[tauri::command]
pub async fn track_cache_inventory(
    scope: Option<String>,
    state: State<'_, TrackCacheState>,
) -> Result<Vec<TrackCacheEntry>, String> {
    let scope = scope.as_deref().unwrap_or("all").to_string();
    blocking(state.inner().clone(), move |cache| {
        cache.cache_inventory(&scope)
    })
    .await
}

#[tauri::command]
pub fn track_bulk_cache_start(
    scope: String,
    tracks: Vec<BulkTrack>,
    quality: Option<String>,
    state: State<'_, TrackCacheState>,
) -> Result<(), String> {
    state
        .begin_bulk(scope, tracks.len() as u32)
        .map_err(|e| e.to_string())?;
    state
        .inner()
        .clone()
        .run_bulk(tracks, AudioQuality::from_label(quality.as_deref()));
    Ok(())
}

#[tauri::command]
pub fn track_bulk_cache_status(state: State<'_, TrackCacheState>) -> Option<BulkStatus> {
    state.bulk_status()
}

#[tauri::command]
pub fn track_bulk_cache_cancel(state: State<'_, TrackCacheState>) {
    state.cancel_bulk();
}

#[tauri::command]
pub async fn track_mark_played(
    track_id: u64,
    state: State<'_, TrackCacheState>,
) -> Result<(), String> {
    blocking(state.inner().clone(), move |cache| {
        cache.mark_played(track_id)
    })
    .await
}
