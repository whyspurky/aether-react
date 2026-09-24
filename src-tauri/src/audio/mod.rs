// src-tauri/src/audio/mod.rs

mod state;
mod engine;

pub use state::AppState;
use tauri::State;


#[tauri::command]
pub async fn play_audio(url: String, track_id: u64, state: State<'_, AppState>) -> Result<(), String> {
    engine::play_async(url, track_id, state).await
}

#[tauri::command]
pub fn pause_audio(state: State<AppState>) -> Result<(), String> {
    engine::pause(state)
}

#[tauri::command]
pub fn resume_audio(state: State<AppState>) -> Result<(), String> {
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
pub fn seek_audio(seconds: f64, state: State<AppState>) -> Result<(), String> {
    engine::seek(seconds, state)
}

#[tauri::command]
pub async fn prefetch_audio(track_id: u64, url: String, state: State<'_, AppState>) -> Result<(), String> {
    engine::prefetch_track(track_id, url, state).await
}