use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek};
use std::path::{Path, PathBuf};
use std::time::Duration;

use bytes::Bytes;
use rodio::Source;
use tauri::{Emitter, State};

use crate::audio::state::{AppState, PlaybackSource};

trait ReadSeek: Read + Seek + Send + Sync {}
impl<T: Read + Seek + Send + Sync> ReadSeek for T {}
type BoxedSource = Box<dyn ReadSeek>;

fn detect_hint_prefix(head: &[u8]) -> &'static str {
    if head.len() >= 3 && &head[..3] == b"ID3" {
        return "mp3";
    }
    if head.len() >= 8 && &head[4..8] == b"ftyp" {
        return "aac";
    }
    if head.len() >= 4 && &head[..4] == b"OggS" {
        return "ogg";
    }
    if head.len() >= 4 && &head[..4] == b"fLaC" {
        return "flac";
    }
    if head.len() >= 4 && &head[..4] == b"RIFF" {
        return "wav";
    }
    if head.len() >= 2 && head[0] == 0xff && (head[1] & 0xe0) == 0xe0 {
        // adts aac не имеет layer bits, mp3 имеет
        return if head[1] & 0x06 == 0 { "aac" } else { "mp3" };
    }
    "mp3"
}

fn detect_hint(path: &Path) -> &'static str {
    let mut buf = [0u8; 16];
    let Ok(mut file) = File::open(path) else {
        return "mp3";
    };
    let Ok(n) = file.read(&mut buf) else {
        return "mp3";
    };
    detect_hint_prefix(&buf[..n])
}

fn build_decoder(source: PlaybackSource) -> Result<rodio::Decoder<BoxedSource>, String> {
    let (data, hint): (BoxedSource, &'static str) = match source {
        PlaybackSource::File(path) => {
            let file = File::open(&path).map_err(|e| format!("open audio file: {e}"))?;
            (Box::new(BufReader::new(file)), detect_hint(&path))
        }
        PlaybackSource::Bytes(bytes) => {
            let hint = detect_hint_prefix(&bytes[..bytes.len().min(16)]);
            (Box::new(Cursor::new(bytes)), hint)
        }
    };

    rodio::Decoder::builder()
        .with_data(data)
        .with_hint(hint)
        .with_gapless(true)
        .build()
        .map_err(|e| format!("decoding error: {e}"))
}

fn emit_state(state: &AppState, name: &str, real_offset_ms: u64) {
    let pos = state.playback.lock().unwrap().position().as_secs_f64();
    if let Some(app) = state.app_handle.lock().unwrap().as_ref() {
        let _ = app.emit(
            "playback:state",
            serde_json::json!({
                "state": name,
                "position": pos,
                "real_offset_ms": real_offset_ms,
            }),
        );
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

    let handle = tauri::async_runtime::spawn(async move {
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

            let (track_id, is_still_playing) = {
                let pb = playback.lock().unwrap();
                (pb.current_track_id, pb.is_playing)
            };

            if !is_still_playing {
                continue;
            }

            let app_opt = {
                let guard = app_handle.lock().unwrap();
                guard.as_ref().cloned()
            };

            if let Some(app) = app_opt {
                let _ = app.emit(
                    "position-tick",
                    serde_json::json!({
                        "position": pos,
                        "track_id": track_id,
                    }),
                );
            }
        }
    });

    *tick = Some(handle);
}

fn start_source(
    source: PlaybackSource,
    track_id: u64,
    state: State<'_, AppState>,
) -> Result<PlaybackSync, String> {
    let decoder = build_decoder(source.clone())?;

    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    let started = std::time::Instant::now();
    {
        let player = state.player.lock().unwrap();
        player.stop();
        player.clear();
        player.append(decoder);
        player.set_volume(vol);
        player.play();
    }

    state.playback.lock().unwrap().start(source, track_id);

    let real_offset_ms = started.elapsed().as_millis() as u64;
    let position_sec = state.playback.lock().unwrap().position().as_secs_f64();

    ensure_tick_running(&state);
    emit_state(&state, "playing", real_offset_ms);

    Ok(PlaybackSync {
        position_sec,
        real_offset_ms,
    })
}

pub fn play_file(
    path: PathBuf,
    track_id: u64,
    state: State<'_, AppState>,
) -> Result<PlaybackSync, String> {
    start_source(PlaybackSource::File(path), track_id, state)
}

pub fn play_bytes(
    bytes: Bytes,
    track_id: u64,
    state: State<'_, AppState>,
) -> Result<PlaybackSync, String> {
    start_source(PlaybackSource::Bytes(bytes), track_id, state)
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
    Ok(PlaybackSync {
        position_sec,
        real_offset_ms,
    })
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
    state.playback.lock().unwrap().mute();
    state.player.lock().unwrap().set_volume(0.0);
    Ok(())
}

pub fn unmute_audio(state: State<AppState>) -> Result<(), String> {
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
    let (source, max_sec) = {
        let pb = state.playback.lock().unwrap();
        let source = pb
            .source
            .clone()
            .ok_or("no track loaded cannot seek")?;
        let max = (pb.duration_ms as f64) / 1000.0;
        (source, max)
    };

    if max_sec <= 0.0 {
        return Err("duration unknown".into());
    }

    let target = seconds.clamp(0.0, max_sec);
    let mut decoder = build_decoder(source)?;

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
