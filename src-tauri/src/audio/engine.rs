// src-tauri/src/audio/engine.rs

use std::time::Duration;
use tauri::State;
use bytes::Bytes;
use crate::audio::state::AppState;
use crate::api::http;
use rodio::Source;


pub async fn play_async(url: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("[engine] play_async START url={}", &url[..url.len().min(120)]);

    let bytes = if url.contains(".m3u8") || url.contains("/hls/") {
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
    let source = rodio::Decoder::new(cursor)
        .map_err(|e| format!("decoding error {}", e))?;

    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    {
        let player = state.player.lock().unwrap();
        player.stop();
        player.clear();
        player.append(source);
        player.set_volume(vol);
        player.play();
    }

    state.playback.lock().unwrap().start(bytes);
    println!("[engine] play_async OK");

    Ok(())
}


pub fn pause(state: State<AppState>) -> Result<(), String> {
    let player = state.player.lock().unwrap();
    player.pause();
    state.playback.lock().unwrap().pause();
    Ok(())
}

pub fn resume(state: State<AppState>) -> Result<(), String> {
    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    let player = state.player.lock().unwrap();
    player.set_volume(vol);
    player.play();

    state.playback.lock().unwrap().resume();
    Ok(())
}

pub fn stop(state: State<AppState>) -> Result<(), String> {
    {
        let player = state.player.lock().unwrap();
        player.stop();
        player.clear();
    }
    state.playback.lock().unwrap().stop();
    Ok(())
}


pub fn get_position(state: State<AppState>) -> Result<f64, String> {
    let pb = state.playback.lock().unwrap();
    Ok(pb.position().as_secs_f64())
}


pub fn set_volume(volume: u32, state: State<AppState>) -> Result<(), String> {
    let effective = state.playback.lock().unwrap().set_volume(volume);
    state.player.lock().unwrap().set_volume(effective);
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


pub fn seek(seconds: f64, state: State<AppState>) -> Result<(), String> {
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
    let mut decoder = rodio::Decoder::new(cursor)
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

    Ok(())
}