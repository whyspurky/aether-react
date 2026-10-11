use tauri::{App, Emitter};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn setup(app: &App) -> Result<(), String> {
    let sc = app.global_shortcut();

    for (key, event) in [
        ("MediaPlayPause", "shortcut-playpause"),
        ("MediaTrackNext", "shortcut-next"),
        ("MediaTrackPrevious", "shortcut-prev"),
    ] {
        if let Err(e) = sc.register(key) {
            eprintln!("[shortcuts] не удалось зарегистрировать {}: {}", key, e);
            continue;
        }

        let h = app.handle().clone();
        if let Err(e) = sc.on_shortcut(key, move |_, _, _| {
            let _ = h.emit(event, ());
        }) {
            eprintln!("[shortcuts] не удалось подписаться на {}: {}", key, e);
        }
    }

    Ok(())
}