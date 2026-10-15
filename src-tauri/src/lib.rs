mod api;
mod audio;
mod zapret;
mod global_binds;
use audio::AppState;
use tauri::Manager;

use tauri_plugin_store::StoreExt;

#[tauri::command]
async fn save_store(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let store = app.store("aether-storage.json").map_err(|e| e.to_string())?;
    store.set(key, serde_json::json!(value));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_store(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let store = app.store("aether-storage.json").map_err(|e| e.to_string())?;
    Ok(store.get(key).and_then(|v| v.as_str().map(String::from)))
}

#[tauri::command]
async fn clear_store(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("aether-storage.json").map_err(|e| e.to_string())?;
    store.clear();
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(prevent_default())
        .setup(|app| {
            let state = AppState::new();
            *state.app_handle.lock().unwrap() = Some(app.handle().clone());
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // store
            save_store,
            load_store,
            clear_store,

            // soundcloud api
            api::soundcloud::search_tracks,
            api::soundcloud::search_users,
            api::soundcloud::search_playlists,
            api::soundcloud::search_suggestions,
            api::soundcloud::get_user,
            api::soundcloud::get_user_tracks,
            api::soundcloud::get_user_popular_tracks,
            api::soundcloud::get_user_reposts,
            api::soundcloud::get_user_playlists,
            api::soundcloud::get_related_artists,
            api::soundcloud::get_playlist,
            api::soundcloud::get_playlist_tracks,
            api::soundcloud::get_popular,
            api::soundcloud::get_my_wave,
            api::soundcloud::fetch_url,

            // binds
            global_binds::register_global_binds,
            global_binds::unregister_global_binds,

            // stream
            api::stream::get_stream_url,
            api::stream::download_hls_track,

            // proxy
            api::soundcloud::proxy_set_custom,
            api::soundcloud::proxy_clear,
            api::soundcloud::proxy_get_status,
            api::soundcloud::proxy_test_api,
            api::soundcloud::proxy_test_cdn,

            // audio
            audio::play_audio,
            audio::pause_audio,
            audio::resume_audio,
            audio::stop_audio,
            audio::mute_audio,
            audio::unmute_audio,
            audio::set_volume,
            audio::set_track_duration,
            audio::get_position,
            audio::seek_audio,
            audio::prefetch_audio,
            audio::start_volume_stream,

            // zapret
            zapret::zapret_status,
            zapret::zapret_start,
            zapret::zapret_stop,
            zapret::zapret_run_bat,
            zapret::zapret_process_running,
            zapret::zapret_open_folder,
            zapret::zapret_open_file,
            zapret::zapret_scan_strategies,
            zapret::zapret_check_lists,
            zapret::zapret_add_soundcloud_domains,
            zapret::zapret_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
 
#[cfg(debug_assertions)]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_prevent_default::Builder::new()
        .with_flags(tauri_plugin_prevent_default::Flags::empty())
        .build()
}

#[cfg(not(debug_assertions))]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_prevent_default::Builder::new()
        .platform(
            tauri_plugin_prevent_default::PlatformOptions::new()
                .browser_accelerator_keys(false)
                .default_context_menus(false)
                .default_script_dialogs(false)
                .general_autofill(true)
                .password_autosave(false),
        )
        .build()
}