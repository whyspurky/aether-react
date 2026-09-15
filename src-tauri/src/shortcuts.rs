//shortcuts.rs
use tauri::{App, Emitter};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn setup(app: &App) -> Result<(), String> {
    let sc = app.global_shortcut();

    for (key, event) in [
        ("MediaPlayPause", "shortcut-playpause"),
        ("MediaNextTrack", "shortcut-next"),
        ("MediaPreviousTrack", "shortcut-prev"),
    ] {
        sc.register(key).map_err(|e| e.to_string())?;
        let h = app.handle().clone();
        sc.on_shortcut(key, move |_, _, _| {
            let _ = h.emit(event, ());
        }).map_err(|e| e.to_string())?;
    }

    Ok(())
}