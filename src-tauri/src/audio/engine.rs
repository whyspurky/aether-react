use std::time::Duration;
use tauri::State;
use bytes::Bytes;
use crate::audio::state::AppState;
use crate::api::http;
use rodio::Source;
use tauri::Emitter;

fn emit_state(state: &AppState, name: &str, real_offset_ms: u64) {
    let pos = state.playback.lock().unwrap().position().as_secs_f64();
    if let Some(app) = state.app_handle.lock().unwrap().as_ref() {
        let _ = app.emit("playback:state", serde_json::json!({
            "state": name,
            "position": pos,
            "real_offset_ms": real_offset_ms,
        }));
    }
}

#[derive(serde::Serialize)]
pub struct PlaybackSync {
    pub position_sec: f64,
    pub real_offset_ms: u64,
}

fn ensure_tick_running(state: &AppState) {
    let mut tick = state.tick_task.lock().unwrap();
    if tick.is_some() {
        return;
    }

    let playback = state.playback.clone();
    let app_handle = state.app_handle.clone();

    let handle = tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(100));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            interval.tick().await;

            let (is_playing, pos, skip) = {
                let mut pb = playback.lock().unwrap();
                let skip = pb.seek_skip_tick;
                if skip > 0 {
                    pb.seek_skip_tick = skip - 1;
                }
                (pb.is_playing, pb.position().as_secs_f64(), skip > 0)
            };

            if !is_playing || skip {
                continue;
            }

            let guard = app_handle.lock().unwrap();
if let Some(app) = guard.as_ref() {
    let track_id = playback.lock().unwrap().current_track_id;
    let _ = app.emit("position-tick", serde_json::json!({
        "position": pos,
        "track_id": track_id,
    }));
}
        }
    });

    *tick = Some(handle);
}

pub async fn play_async(url: String, track_id: u64, state: State<'_, AppState>) -> Result<PlaybackSync, String> {
    println!("[engine] play_async START url={}", &url[..url.len().min(120)]);

    let cached = {
        let mut slot = state.prefetch_slot.lock().unwrap();
        match slot.as_ref() {
            Some((cached_id, _)) if *cached_id == track_id => {
                println!("[engine] используем prefetched трек {}", track_id);
                slot.take().map(|(_, bytes)| bytes)
            }
            Some((cached_id, _)) => {
                println!("[engine] слот содержит чужой трек {} (нужен {}), очищаем", cached_id, track_id);
                slot.take();
                None
            }
            None => None,
        }
    };

    let bytes = if let Some(bytes) = cached {
        bytes
    } else if url.contains(".m3u8") || url.contains("/hls/") {
        println!("[engine] качаем hls полностью");
        let start = std::time::Instant::now();
        let r = Bytes::from(crate::api::download_hls_track(&url).await?);
        println!("[engine] hls готово {} байт за {:?}", r.len(), start.elapsed());
        let secs = state.playback.lock().unwrap().duration_ms as f64 / 1000.0;
        if secs > 0.0 {
            let kbps = (r.len() as f64 * 8.0) / secs / 1000.0;
            println!("[engine] >>> HLS bitrate ≈ {:.0} kbps ({} KB за {:.1} сек)", kbps, r.len() / 1024, secs);
        }
        r
    } else {
        println!("[engine] качаем progressive");
        let start = std::time::Instant::now();

        let resp = http().get(&url).send().await
            .map_err(|e| {
                println!("[engine] http error: {} ({:?})", e, start.elapsed());
                format!("http error {}", e)
            })?;

        println!("[engine] status={} ({:?})", resp.status(), start.elapsed());

        if !resp.status().is_success() {
            return Err(format!("http {}", resp.status()));
        }

        let bytes = resp.bytes().await
            .map_err(|e| {
                println!("[engine] bytes error: {} ({:?})", e, start.elapsed());
                format!("failed to get bytes {}", e)
            })?;

        println!("[engine] получено {} байт за {:?}", bytes.len(), start.elapsed());
        bytes
    };

    println!("[engine] создаём decoder");
    let cursor = std::io::Cursor::new(bytes.clone());
    let hint = if url.contains(".m3u8") || url.contains("/hls/") { "aac" } else { "mp3" };
    let source = rodio::Decoder::builder()
        .with_data(cursor)
        .with_hint(hint)
        .with_gapless(true)
        .build()
        .map_err(|e| format!("decoding error {}", e))?;

    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    let started = std::time::Instant::now();
    {
        let player = state.player.lock().unwrap();
        player.stop();
        player.clear();
        player.append(source);
        player.set_volume(vol);
        player.play();
    }

    state.playback.lock().unwrap().start(bytes, track_id);
    
    let real_offset_ms = started.elapsed().as_millis() as u64;
    let position_sec = state.playback.lock().unwrap().position().as_secs_f64();

    ensure_tick_running(&state);
    emit_state(&state, "playing", real_offset_ms);
    println!("[engine] play_async OK offset={}ms", real_offset_ms);

    Ok(PlaybackSync { position_sec, real_offset_ms })
}


pub fn pause(state: State<AppState>) -> Result<(), String> {
    let player = state.player.lock().unwrap();
    player.pause();
    state.playback.lock().unwrap().pause();
    drop(player);
    emit_state(&state, "paused", 0);
    Ok(())
}

pub fn resume(state: State<AppState>) -> Result<PlaybackSync, String> {
    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    let started = std::time::Instant::now();
    {
        let player = state.player.lock().unwrap();
        player.set_volume(vol);
        player.play();
    }

    state.playback.lock().unwrap().resume();
    let real_offset_ms = started.elapsed().as_millis() as u64;
    let position_sec = state.playback.lock().unwrap().position().as_secs_f64();

    ensure_tick_running(&state);
    emit_state(&state, "playing", real_offset_ms);
    Ok(PlaybackSync { position_sec, real_offset_ms })
}

pub fn stop(state: State<AppState>) -> Result<(), String> {
    {
        let player = state.player.lock().unwrap();
        player.stop();
        player.clear();
    }
    state.playback.lock().unwrap().stop();
    emit_state(&state, "stopped", 0);
    Ok(())
}


pub fn get_position(state: State<AppState>) -> Result<f64, String> {
    let pb = state.playback.lock().unwrap();
    Ok(pb.position().as_secs_f64())
}


pub fn set_volume(volume: u32, state: State<AppState>) -> Result<(), String> {
    let effective = state.playback.lock().unwrap().set_volume(volume);
    state.player.lock().unwrap().set_volume(effective);

    if let Some(ch) = state.volume_channel.lock().unwrap().as_ref() {
        let _ = ch.send(volume);
    }

    Ok(())
}

pub fn mute_audio(state: State<AppState>) -> Result<(), String> {
    println!("[engine] muting audio");
    state.playback.lock().unwrap().mute();
    state.player.lock().unwrap().set_volume(0.0);
    Ok(())
}

pub fn unmute_audio(state: State<AppState>) -> Result<(), String> {
    println!("[engine] unmuting audio");
    let vol = {
        let mut pb = state.playback.lock().unwrap();
        pb.unmute();
        pb.volume
    };
    state.player.lock().unwrap().set_volume(vol);
    Ok(())
}

pub fn set_track_duration(duration_ms: u32, state: State<AppState>) -> Result<(), String> {
    state.playback.lock().unwrap().duration_ms = duration_ms;
    Ok(())
}


pub fn seek(seconds: f64, state: State<AppState>) -> Result<PlaybackSync, String> {
    let (bytes, max_sec) = {
        let pb = state.playback.lock().unwrap();
        let b = pb.bytes.clone().ok_or("no track loaded cannot seek")?;
        let max = (pb.duration_ms as f64) / 1000.0;
        (b, max)
    };

    if max_sec <= 0.0 {
        return Err("duration unknown".into());
    }

    let target = seconds.clamp(0.0, max_sec);

    let cursor = std::io::Cursor::new(bytes);
    let mut decoder = rodio::Decoder::builder()
        .with_data(cursor)
        .with_hint("aac")
        .with_gapless(true)
        .build()
        .map_err(|e| format!("decoder error {}", e))?;

    let mut actual = Duration::ZERO;
    if target > 0.05 {
        let d = Duration::from_secs_f64(target);
        if decoder.try_seek(d).is_ok() {
            actual = d;
        } else {
            eprintln!("[seek] try_seek failed, начнем с начала");
        }
    }

    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };
    let was_playing = state.playback.lock().unwrap().is_playing;

    let started = std::time::Instant::now();
    {
        let player = state.player.lock().unwrap();
        player.stop();
        player.clear();
        player.append(decoder);
        player.set_volume(vol);
        if was_playing {
            player.play();
        } else {
            player.pause();
        }
    }

    state.playback.lock().unwrap().seek(actual);
    let real_offset_ms = started.elapsed().as_millis() as u64;

    ensure_tick_running(&state);
    if was_playing {
        emit_state(&state, "playing", real_offset_ms);
    } else {
        emit_state(&state, "paused", 0);
    }

    Ok(PlaybackSync {
        position_sec: actual.as_secs_f64(),
        real_offset_ms,
    })
}

pub async fn prefetch_track(track_id: u64, url: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("[prefetch] вызван prefetch_track track_id={}", track_id);

    if let Some(h) = state.prefetch_task.lock().unwrap().take() {
        h.abort();
    }

    let slot = state.prefetch_slot.clone();
    let task_slot = state.prefetch_task.clone();
    let url_clone = url.clone();

    let handle = tokio::spawn(async move {
        println!("[prefetch] старт {}", &url_clone[..url_clone.len().min(80)]);
        let start = std::time::Instant::now();

        let result = if url_clone.contains(".m3u8") || url_clone.contains("/hls/") {
            crate::api::download_hls_track(&url_clone).await.map(Bytes::from)
        } else {
            match http().get(&url_clone).send().await {
                Ok(r) if r.status().is_success() => {
                    r.bytes().await.map_err(|e| e.to_string())
                }
                Ok(r) => Err(format!("http {}", r.status())),
                Err(e) => Err(e.to_string()),
            }
        };

        match result {
            Ok(bytes) => {
                println!("[prefetch] готово {} байт за {:?}", bytes.len(), start.elapsed());
                println!("[prefetch] сохраняю в слот track_id={}", track_id);
                *slot.lock().unwrap() = Some((track_id, bytes));
            }
            Err(e) => {
                println!("[prefetch] ошибка: {}", e);
            }
        }

        *task_slot.lock().unwrap() = None;
    });

    *state.prefetch_task.lock().unwrap() = Some(handle);
    Ok(())
}