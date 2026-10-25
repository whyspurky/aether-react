mod state;
mod engine;
mod dsp;
mod analyser;

pub use state::{AppState, OutputDeviceInfo};
use crate::api::quality::AudioQuality;
use crate::api::stream::StreamInfo;
use crate::track_cache::TrackCacheState;
use tauri::State;

// играем только из кэша, путь резолвит rust, а не фронт
#[tauri::command]
pub fn play_cached(
    track_id: u64,
    cache: State<'_, TrackCacheState>,
    state: State<'_, AppState>,
) -> Result<engine::PlaybackSync, String> {
    let path = cache
        .get_cache_path(track_id)
        .ok_or_else(|| "трек не найден в кэше".to_string())?;
    engine::play_file(std::path::PathBuf::from(path), track_id, state)
}

#[derive(serde::Serialize)]
pub struct StreamPlayback {
    pub sync: engine::PlaybackSync,
    pub stream: Option<StreamInfo>,
}

// режим только воспроизведения: байты живут в памяти, диск не трогаем
#[tauri::command]
pub async fn play_stream(
    track_id: u64,
    quality: Option<String>,
    cache: State<'_, TrackCacheState>,
    state: State<'_, AppState>,
) -> Result<StreamPlayback, String> {
    let quality = AudioQuality::from_label(quality.as_deref());
    let (bytes, stream) = cache.stream_audio(track_id, quality).await?;
    let sync = engine::play_bytes(bytes, track_id, state)?;
    Ok(StreamPlayback { sync, stream })
}

#[tauri::command]
pub fn list_output_devices() -> Result<Vec<OutputDeviceInfo>, String> {
    state::output_devices()
}

#[tauri::command]
pub fn set_output_device(
    id: Option<String>,
    state: State<AppState>,
) -> Result<String, String> {
    state.set_output_device(id.as_deref())
}

#[tauri::command]
pub fn pause_audio(state: State<AppState>) -> Result<(), String> {
    engine::pause(state)
}

#[tauri::command]
pub fn resume_audio(state: State<AppState>) -> Result<engine::PlaybackSync, String> {
    engine::resume(state)
}

#[tauri::command]
pub fn stop_audio(state: State<AppState>) -> Result<(), String> {
    engine::stop(state)
}

#[tauri::command]
pub fn mute_audio(state: State<AppState>) -> Result<(), String> {
    engine::mute_audio(state)
}

#[tauri::command]
pub fn unmute_audio(state: State<AppState>) -> Result<(), String> {
    engine::unmute_audio(state)
}

#[tauri::command]
pub fn set_volume(volume: u32, state: State<AppState>) -> Result<(), String> {
    engine::set_volume(volume, state)
}

#[tauri::command]
pub fn set_track_duration(duration_ms: u32, state: State<AppState>) -> Result<(), String> {
    engine::set_track_duration(duration_ms, state)
}

#[tauri::command]
pub fn get_position(state: State<AppState>) -> Result<f64, String> {
    engine::get_position(state)
}

#[tauri::command]
pub fn seek_audio(seconds: f64, state: State<AppState>) -> Result<engine::PlaybackSync, String> {
    engine::seek(seconds, state)
}

#[tauri::command]
pub async fn queue_next_track(
    track_id: u64,
    duration_ms: u32,
    quality: Option<String>,
    cache: State<'_, TrackCacheState>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    engine::queue_next_track(track_id, duration_ms, quality, cache, state).await
}

#[tauri::command]
pub fn set_audio_settings(
    settings: state::AudioSettings,
    state: State<AppState>,
) -> Result<(), String> {
    engine::set_audio_settings(settings, state)
}

#[tauri::command]
pub fn set_eq(settings: dsp::EqSettings, state: State<AppState>) -> Result<(), String> {
    engine::set_eq(settings, state)
}

// спектр нужен только пока на экране визуализатор
#[tauri::command]
pub fn set_spectrum_active(active: bool, state: State<AppState>) {
    state.analyser.set_active(active);
}

// настройки производительности с фронта
#[tauri::command]
pub fn set_perf_flags(position_tick_ms: Option<u64>, state: State<AppState>) {
    if let Some(ms) = position_tick_ms {
        state
            .position_tick_ms
            .store(ms.clamp(50, 1000), std::sync::atomic::Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn start_volume_stream(
    on_volume: tauri::ipc::Channel<u32>,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let current = state.playback.lock().unwrap().volume_ui;
    on_volume.send(current).map_err(|e| e.to_string())?;

    *state.volume_channel.lock().unwrap() = Some(on_volume);
    Ok(())
}
