use tauri::State;

use crate::api::quality::AudioQuality;
use crate::track_cache::state::{
    BulkStatus, BulkTrack, CacheSizes, EnsureCachedResult, PreloadTrack, TrackCacheEntry,
    TrackCacheState,
};

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
pub fn track_remove_cached(
    track_id: u64,
    offline_only: Option<bool>,
    state: State<'_, TrackCacheState>,
) -> bool {
    state.remove_cached(track_id, offline_only.unwrap_or(false))
}

#[tauri::command]
pub fn track_cache_info(
    track_id: u64,
    state: State<'_, TrackCacheState>,
) -> Option<TrackCacheEntry> {
    state.get_cache_entry(track_id)
}

#[tauri::command]
pub fn track_is_cached(track_id: u64, state: State<'_, TrackCacheState>) -> bool {
    state.is_cached(track_id)
}

#[tauri::command]
pub fn track_cache_size(state: State<'_, TrackCacheState>) -> CacheSizes {
    state.sizes()
}

#[tauri::command]
pub fn track_clear_cache(scope: Option<String>, state: State<'_, TrackCacheState>) {
    state.clear_cache(scope.as_deref().unwrap_or("all"));
}

#[tauri::command]
pub fn track_enforce_cache_limit(limit_mb: u64, state: State<'_, TrackCacheState>) {
    state.enforce_limit(limit_mb);
}

#[tauri::command]
pub fn track_cache_inventory(
    scope: Option<String>,
    state: State<'_, TrackCacheState>,
) -> Vec<TrackCacheEntry> {
    state.cache_inventory(scope.as_deref().unwrap_or("all"))
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
pub fn track_mark_played(track_id: u64, state: State<'_, TrackCacheState>) {
    state.mark_played(track_id);
}
