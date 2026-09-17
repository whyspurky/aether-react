// src-tauri/src/lib.rs

mod api;
mod audio;
mod shortcuts;

use audio::AppState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            app.manage(AppState::new());

            if let Err(e) = shortcuts::setup(app) {
                eprintln!("shortcuts: {e}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::search_tracks, api::search_playlists, api::get_user_tracks,
            api::get_playlist_tracks, api::get_popular, api::get_my_wave,
            api::fetch_url, api::get_stream_url, api::download_hls_track,
            audio::play_audio, audio::pause_audio, audio::resume_audio,
            audio::stop_audio, audio::mute_audio, audio::unmute_audio,
            audio::set_volume, audio::set_track_duration, audio::get_position,
            audio::seek_audio,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}