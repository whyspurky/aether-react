use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
pub async fn register_global_binds(
    app: AppHandle,
    binds: HashMap<String, String>,
) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    // какие клавиши сейчас зажаты
    let pressed: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));

    for (action, key_str) in binds {
        if key_str.is_empty() {
            continue;
        }

        let shortcut = match parse_shortcut(&key_str) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[global-binds] {}: {}", key_str, e);
                continue;
            }
        };

        let action_clone = action.clone();
        let app_clone = app.clone();
        let pressed_clone = pressed.clone();

        if let Err(e) = gs.on_shortcut(shortcut, move |_app, _shortcut, event| {
            match event.state() {
                ShortcutState::Pressed => {
                    let mut set = pressed_clone.lock().unwrap();
                    let was = set.contains(&action_clone);
                    println!("[global-binds] Pressed {} was_pressed={}", action_clone, was);
                    if was {
                        return;
                    }
                    set.insert(action_clone.clone());
                    drop(set);

                    // fallback: сбрасываем через 500ms если Released не пришёл
                    let set_clone = pressed_clone.clone();
                    let action_reset = action_clone.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        let mut set = set_clone.lock().unwrap();
                        set.remove(&action_reset);
                    });

                    println!("[global-binds] emit {}", action_clone);
                    let _ = app_clone.emit("global-bind", action_clone.clone());
                }
                ShortcutState::Released => {
                    println!("[global-binds] Released {}", action_clone);
                    let mut set = pressed_clone.lock().unwrap();
                    set.remove(&action_clone);
                }
            }
        }) {
            eprintln!("[global-binds] {}: {}", key_str, e);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn unregister_global_binds(app: AppHandle) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    Ok(())
}

fn parse_shortcut(s: &str) -> Result<Shortcut, String> {
    let parts: Vec<&str> = s.split('+').collect();
    let key_part = *parts.last().ok_or("пустой shortcut")?;

    let mut mods = Modifiers::empty();
    for m in &parts[..parts.len().saturating_sub(1)] {
        match m.to_lowercase().as_str() {
            "ctrl" | "control" | "commandorcontrol" => mods |= Modifiers::CONTROL,
            "shift" => mods |= Modifiers::SHIFT,
            "alt" => mods |= Modifiers::ALT,
            "meta" | "command" | "super" => mods |= Modifiers::META,
            _ => {}
        }
    }

    let code = match key_part {
        "MediaPlayPause" => Code::MediaPlayPause,
        "MediaTrackNext" => Code::MediaTrackNext,
        "MediaTrackPrevious" => Code::MediaTrackPrevious,
        "MediaStop" => Code::MediaStop,
        _ => key_part.parse::<Code>().map_err(|e| format!("{}", e))?,
    };

    let modifiers = if mods.is_empty() { None } else { Some(mods) };
    Ok(Shortcut::new(modifiers, code))
}