use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use bytes::Bytes;
use rodio::Source;
use tauri::{Emitter, Manager, State};

use crate::api::quality::AudioQuality;
use crate::audio::analyser::{AnalyserBuffer, AnalyserSource};
use crate::audio::dsp::{EqSettings, EqSource, GainSource, ResampleSource, TempoSource};
use crate::audio::loudness::{self, TRUE_PEAK_CEILING_DBTP};
use crate::audio::state::{
    AppState, AudioSettings, GainSlot, PlaybackSource, QueuedTrack, TransitionMode, TransitionRun,
};
use crate::track_cache::state::{CacheRequest, Priority};
use crate::track_cache::TrackCacheState;

trait ReadSeek: Read + Seek + Send + Sync {}
impl<T: Read + Seek + Send + Sync> ReadSeek for T {}
type BoxedSource = Box<dyn ReadSeek>;
type PlaybackSourceBox = Box<dyn Source<Item = f32> + Send>;

const GAPLESS_FADE_SECS: f32 = 0.04;
const TRANSITION_TICK_MS: u64 = 20;
const IDLE_TICK_MS: u64 = 50;
const STOPPED_TICK_MS: u64 = 200;
// ближе к концу трека начинаем следить за очередью
const QUEUE_LOOKAHEAD_SECS: f64 = 30.0;
// пауза перед фоновым замером, чтобы не мешать первым секундам воспроизведения
const LOUDNESS_DELAY_MS: u64 = 1200;
// старый запрос play не должен перебивать новый
const STALE_PLAY: &str = "stale playback request";

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

fn build_playback_source(
    source: PlaybackSource,
    gain_milli: Arc<AtomicU32>,
    eq: Arc<Mutex<EqSettings>>,
    pitch_milli: Arc<std::sync::atomic::AtomicU32>,
    tempo_milli: Arc<std::sync::atomic::AtomicU32>,
    analyser: Arc<AnalyserBuffer>,
) -> Result<(PlaybackSourceBox, Option<Duration>), String> {
    let decoder = build_decoder(source)?;
    // длительность из файла: страховка, когда метаданные sc врут или пустые
    let detected = decoder.total_duration();
    let gain = GainSource::new(decoder, gain_milli);
    let pitch = ResampleSource::new(gain, pitch_milli);
    let tempo = TempoSource::new(pitch, tempo_milli);
    let eq = EqSource::new(tempo, eq);
    Ok((Box::new(AnalyserSource::new(eq, analyser)), detected))
}

// ключ замера: трек плюс размер файла, чтобы смена качества не подхватила чужой замер
fn loudness_key(source: &PlaybackSource, track_id: u64) -> String {
    let size = match source {
        PlaybackSource::File(path) => std::fs::metadata(path).map(|m| m.len()).unwrap_or(0),
        PlaybackSource::Bytes(bytes) => bytes.len() as u64,
    };
    format!("{track_id}:{size}")
}

fn settings_snapshot(state: &AppState) -> AudioSettings {
    state.settings.lock().unwrap().clone()
}

// усиление в тысячных по готовому замеру, 1000 значит без усиления
fn gain_milli_for(state: &AppState, key: &str, settings: &AudioSettings) -> u32 {
    if !settings.normalization {
        return 1000;
    }
    match state.loudness.get(key) {
        Some(measured) => loudness::db_to_milli(measured.gain_db(
            settings.normalization_target_lufs,
            TRUE_PEAK_CEILING_DBTP,
        )),
        None => 1000,
    }
}

// замер в фоне: старт трека не ждет декода, усиление подъезжает плавно
fn spawn_loudness_analysis(
    state: &AppState,
    source: PlaybackSource,
    key: String,
    slot: Arc<AtomicU32>,
    gen: u64,
) {
    let store = state.loudness.clone();
    let settings = state.settings.clone();
    let generation = state.loudness_gen.clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(Duration::from_millis(LOUDNESS_DELAY_MS));
        let Ok(decoder) = build_decoder(source) else {
            return;
        };
        let channels = decoder.channels().get() as usize;
        let sample_rate = decoder.sample_rate().get();
        let Some(measured) = loudness::analyze(decoder, channels, sample_rate) else {
            return;
        };
        // замер полезен в любом случае, даже если трек уже сменился
        store.put(&key, measured);
        if generation.load(Ordering::Relaxed) != gen {
            return;
        }
        let settings = settings.lock().unwrap().clone();
        if settings.normalization {
            let value = loudness::db_to_milli(measured.gain_db(
                settings.normalization_target_lufs,
                TRUE_PEAK_CEILING_DBTP,
            ));
            slot.store(value, Ordering::Relaxed);
        }
    });
}

// пересчитать усиление текущего трека после смены настроек нормализации
fn refresh_gain(state: &AppState, settings: &AudioSettings) {
    let current = match state.gain_slot.lock().unwrap().clone() {
        Some(slot) => slot,
        None => return,
    };
    let value = match (settings.normalization, state.loudness.get(&current.key)) {
        (false, _) => 1000,
        (true, Some(measured)) => loudness::db_to_milli(measured.gain_db(
            settings.normalization_target_lufs,
            TRUE_PEAK_CEILING_DBTP,
        )),
        (true, None) => {
            // включали без готового замера: считаем в фоне, пока играем без усиления
            let source = state.playback.lock().unwrap().source.clone();
            if let Some(source) = source {
                spawn_loudness_analysis(
                    state,
                    source,
                    current.key.clone(),
                    current.slot.clone(),
                    current.gen,
                );
            }
            1000
        }
    };
    current.slot.store(value, Ordering::Relaxed);
}
fn emit_state(state: &AppState, name: &str, real_offset_ms: u64) {
    let pos = output_position(state);
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
    // длительность, известная движку: фронт берет ее, если метаданные sc пустые
    pub duration_ms: u64,
}

fn current_duration_ms(state: &AppState) -> u64 {
    state.playback.lock().unwrap().duration_ms as u64
}

fn output_position(state: &AppState) -> f64 {
    let output = state.player.lock().unwrap().get_pos().as_secs_f64();
    state.playback.lock().unwrap().position_at(output).as_secs_f64()
}

fn main_volume(state: &AppState) -> f32 {
    let pb = state.playback.lock().unwrap();
    if pb.is_muted { 0.0 } else { pb.volume }
}

fn finish_transition(state: &AppState, clear_queue: bool) {
    let had_queue = state.queued_next.lock().unwrap().take().is_some();
    let had_transition = state.transition.lock().unwrap().take().is_some();
    let outgoing = state.outgoing.lock().unwrap().take();
    let had_outgoing = outgoing.is_some();
    if let Some(old) = outgoing {
        old.stop();
    }

    state.transition_gen.fetch_add(1, Ordering::Relaxed);
    state.transition_starting.store(false, Ordering::Relaxed);
    if had_queue || had_transition || had_outgoing {
        let app = state.app_handle.lock().unwrap().as_ref().cloned();
        if let Some(app) = app {
            let _ = app.emit("track:auto-advance-cancelled", serde_json::json!({}));
        }
    }

    if clear_queue {
        state.queued_next.lock().unwrap().take();
    }
    // громкость читаем до лока player: порядок локов playback -> player
    let volume = main_volume(state);
    state.player.lock().unwrap().set_volume(volume);
}

// новый источник в свежий плеер: clear() на старом может ждать аудиопоток
fn install_source(
    state: &AppState,
    source: PlaybackSourceBox,
    volume: f32,
    playing: bool,
) {
    let next = {
        let sink = state._sink_handle.lock().unwrap();
        ensure_analyser_running(state);
        let player = rodio::Player::connect_new(sink.mixer());
        player.append(source);
        player.set_volume(volume);
        player.set_speed(1.0);
        if playing {
            player.play();
        } else {
            player.pause();
        }
        player
    };
    let old = std::mem::replace(&mut *state.player.lock().unwrap(), next);
    old.stop();
}

fn stop_tick(state: &AppState) {
    let handle = state.tick_task.lock().unwrap().take();
    if let Some(handle) = handle {
        handle.abort();
    }
}

fn stop_all(state: &AppState) {
    stop_tick(state);
    state.player.lock().unwrap().stop();
    state.playback.lock().unwrap().stop();
}

fn apply_volumes(state: &AppState, volume: f32) {
    let gains = {
        let guard = state.transition.lock().unwrap();
        guard.as_ref().map(|run| (run.in_gain, run.out_gain))
    };
    let (in_gain, out_gain) = gains.unwrap_or((1.0, 0.0));
    state.player.lock().unwrap().set_volume(volume * in_gain);
    if let Some(old) = state.outgoing.lock().unwrap().as_ref() {
        old.set_volume(volume * out_gain);
    }
}

fn transition_gains(progress: f32) -> (f32, f32) {
    let angle = progress.clamp(0.0, 1.0) * std::f32::consts::FRAC_PI_2;
    (angle.cos(), angle.sin())
}

fn start_transition(
    state: &AppState,
    next: QueuedTrack,
    length: f32,
) -> Result<(), String> {
    let settings = settings_snapshot(state);
    let key = loudness_key(&next.source, next.track_id);
    let measured = state.loudness.get(&key);
    // замер мог досчитаться, пока играл предыдущий трек: берем самое свежее значение
    let gain_db = match (settings.normalization, measured) {
        (true, Some(measured)) => measured.gain_db(
            settings.normalization_target_lufs,
            TRUE_PEAK_CEILING_DBTP,
        ),
        _ => next.gain_db,
    };
    let gen = state.loudness_gen.fetch_add(1, Ordering::SeqCst) + 1;
    let slot = Arc::new(AtomicU32::new(loudness::db_to_milli(gain_db)));
    *state.gain_slot.lock().unwrap() = Some(GainSlot {
        slot: slot.clone(),
        key: key.clone(),
        gen,
    });

    let (source, _) = build_playback_source(
        next.source.clone(),
        slot.clone(),
        state.eq.clone(),
        state.pitch_milli.clone(),
        state.tempo_milli.clone(),
        state.analyser.clone(),
    )?;

    let next_player = {
        let sink = state._sink_handle.lock().unwrap();
        ensure_analyser_running(state);
        let player = rodio::Player::connect_new(sink.mixer());
        player.append(source);
        player.set_volume(0.0);
        player.set_speed(1.0);
        player.play();
        player
    };

    let volume = main_volume(state);
    let old = {
        let mut current = state.player.lock().unwrap();
        std::mem::replace(&mut *current, next_player)
    };
    old.set_volume(volume);
    *state.outgoing.lock().unwrap() = Some(old);

    let speed = {
        let pb = state.playback.lock().unwrap();
        pb.speed
    };
    {
        let mut pb = state.playback.lock().unwrap();
        pb.start(next.source.clone(), next.track_id, Some(slot.clone()), speed);
        pb.duration_ms = next.duration_ms;
    }

    *state.transition.lock().unwrap() = Some(TransitionRun {
        length: length.max(0.001),
        elapsed: 0.0,
        in_gain: 0.0,
        out_gain: 1.0,
    });
    state.transition_gen.fetch_add(1, Ordering::Relaxed);
    // маркер перехода уже стоит, резерв больше не нужен
    state.transition_starting.store(false, Ordering::Relaxed);

    // если замер не успел, досчитаем уже во время перехода
    if settings.normalization && measured.is_none() {
        spawn_loudness_analysis(state, next.source.clone(), key, slot, gen);
    }

    if let Some(app) = state.app_handle.lock().unwrap().as_ref() {
        let _ = app.emit(
            "track:auto-advanced",
            serde_json::json!({
                "track_id": next.track_id,
                "duration_ms": next.duration_ms,
                "position": 0.0,
            }),
        );
    }
    Ok(())
}

fn ensure_tick_running(state: &AppState) {
    let mut tick = state.tick_task.lock().unwrap();
    if tick.is_some() {
        return;
    }

    let playback = state.playback.clone();
    let app_handle = state.app_handle.clone();
    let player = state.player.clone();
    let outgoing = state.outgoing.clone();
    let settings = state.settings.clone();
    let queued_next = state.queued_next.clone();
    let transition = state.transition.clone();
    let transition_starting = state.transition_starting.clone();
    let position_tick = state.position_tick_ms.clone();

    let handle = tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(TRANSITION_TICK_MS));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let mut was_playing = false;
        let mut last_emit = Instant::now();

        loop {
            interval.tick().await;
            // без перехода точность 20 мс не нужна, хватает 50
            let idle = settings
                .lock()
                .map(|s| s.transition == TransitionMode::Off)
                .unwrap_or(true);
            let step = if idle {
                IDLE_TICK_MS
            } else {
                TRANSITION_TICK_MS
            };
            // на паузе тик не нужен, но если цикл жив - спим долго
            interval.reset_after(Duration::from_millis(if was_playing {
                step
            } else {
                STOPPED_TICK_MS
            }));

            let (output, is_empty) = {
                let p = player.lock().unwrap();
                (p.get_pos().as_secs_f64(), p.empty())
            };
            let (is_playing, pos, skip, duration_ms, has_source) = {
                let mut pb = playback.lock().unwrap();
                let skip = pb.seek_skip_tick;
                if skip > 0 {
                    pb.seek_skip_tick = skip - 1;
                }
                (
                    pb.is_playing,
                    pb.position_at(output).as_secs_f64(),
                    skip > 0,
                    pb.duration_ms,
                    pb.source.is_some(),
                )
            };

            was_playing = is_playing;
            if !is_playing || skip {
                continue;
            }

            // плеер опустел: файл кончился раньше метаданных sc, шлем конец один раз
            if is_empty && has_source {
                was_playing = false;
                let already = {
                    let mut pb = playback.lock().unwrap();
                    let already = pb.ended_reported;
                    pb.ended_reported = true;
                    already
                };
                if !already {
                    if let Some(app) = app_handle.lock().unwrap().as_ref() {
                        let _ = app.emit(
                            "playback:state",
                            serde_json::json!({
                                "state": "ended",
                                "position": if duration_ms > 0 {
                                    duration_ms as f64 / 1000.0
                                } else {
                                    pos
                                },
                                "real_offset_ms": 0,
                            }),
                        );
                    }
                }
                continue;
            }

            let has_transition = transition.lock().unwrap().is_some();

            if has_transition {
                let volume = main_volume_value(&playback);
                let speed = {
                    let pb = playback.lock().unwrap();
                    pb.speed.max(0.1)
                };
                // прогресс перехода считаем по аудио-клоку входящего трека,
                // иначе при задержке тика исходящий обрывается на полной громкости
                let incoming_pos = player.lock().unwrap().get_pos().as_secs_f32();
                let (in_gain, out_gain, done) = {
                    let mut guard = transition.lock().unwrap();
                    let Some(run) = guard.as_mut() else {
                        continue;
                    };
                    let media_len = (run.length * speed).max(0.001);
                    let progress = (incoming_pos / media_len).clamp(0.0, 1.0);
                    run.elapsed = progress * run.length;
                    let (out, incoming) = transition_gains(progress);
                    run.in_gain = incoming;
                    run.out_gain = out;
                    (incoming, out, progress >= 1.0)
                };

                player.lock().unwrap().set_volume(volume * in_gain);
                if let Some(old) = outgoing.lock().unwrap().as_ref() {
                    old.set_volume(volume * out_gain);
                }

                if done {
                    transition.lock().unwrap().take();
                    if let Some(old) = outgoing.lock().unwrap().take() {
                        old.stop();
                    }
                    player.lock().unwrap().set_volume(volume);
                }
            } else {
                // настройки и очередь клонируем только у конца трека, а не каждый тик
                let near_end = duration_ms > 0
                    && (duration_ms as f64 - pos) <= QUEUE_LOOKAHEAD_SECS;
                let has_next = if near_end {
                    queued_next.lock().unwrap().is_some()
                } else {
                    false
                };
                if has_next {
                    let settings_now = settings.lock().unwrap().clone();
                    if settings_now.transition != TransitionMode::Off && duration_ms > 0 {
                        let speed = playback.lock().unwrap().speed.max(0.1) as f64;
                        let duration = duration_ms as f64 / 1000.0;
                        let fade_wall = match settings_now.transition {
                            TransitionMode::Gapless => GAPLESS_FADE_SECS as f64,
                            TransitionMode::Crossfade => settings_now.crossfade_secs as f64,
                            TransitionMode::Off => 0.0,
                        };
                        let wanted_fade_media = fade_wall * speed;
                        let remaining = (duration - pos).max(0.0);
                        let fade_media = wanted_fade_media.min(remaining);
                        let at_end = pos >= duration - 0.002;

                        if at_end || pos >= duration - wanted_fade_media {
                            // очередь забираем и помечаем переход одной секцией,
                            // иначе queue_next_track успевает влезть в окно
                            let claimed = {
                                let mut queue = queued_next.lock().unwrap();
                                if queue.is_some() && !transition_starting.swap(true, Ordering::SeqCst)
                                {
                                    queue.take()
                                } else {
                                    None
                                }
                            };
                            if let Some(next) = claimed {
                                let fade = if at_end {
                                    GAPLESS_FADE_SECS
                                } else {
                                    (fade_media / speed) as f32
                                };
                                let app = app_handle.lock().unwrap().as_ref().cloned();
                                if let Some(app) = app {
                                    let state = app.state::<AppState>();
                                    if let Err(err) = start_transition(&state, next, fade) {
                                        eprintln!("[transition] {err}");
                                        state.transition_starting.store(false, Ordering::Relaxed);
                                        let _ = app.emit(
                                            "track:auto-advance-cancelled",
                                            serde_json::json!({}),
                                        );
                                    }
                                } else {
                                    transition_starting.store(false, Ordering::Relaxed);
                                }
                                continue;
                            }
                        }
                    }
                }
            }

            let emit_every =
                Duration::from_millis(position_tick.load(Ordering::Relaxed).clamp(50, 1000));
            if last_emit.elapsed() >= emit_every {
                last_emit = Instant::now();
                let (track_id, is_still_playing) = {
                    let pb = playback.lock().unwrap();
                    (pb.current_track_id, pb.is_playing)
                };
                if !is_still_playing {
                    continue;
                }
                if let Some(app) = app_handle.lock().unwrap().as_ref() {
                    let _ = app.emit(
                        "position-tick",
                        serde_json::json!({
                            "position": pos,
                            "track_id": track_id,
                        }),
                    );
                }
            }
        }
    });

    *tick = Some(handle);
}

fn main_volume_value(playback: &Arc<Mutex<crate::audio::state::Playback>>) -> f32 {
    let pb = playback.lock().unwrap();
    if pb.is_muted { 0.0 } else { pb.volume }
}

fn ensure_analyser_running(state: &AppState) {
    let mut task = state.analyser_task.lock().unwrap();
    if task.is_some() {
        return;
    }
    let app = state.app_handle.lock().unwrap().as_ref().cloned();
    let Some(app) = app else {
        return;
    };
    let buffer = state.analyser.clone();
    let playback = state.playback.clone();
    let handle = tauri::async_runtime::spawn(async move {
        crate::audio::analyser::run(app, buffer, playback).await;
    });
    *task = Some(handle);
}

fn start_source(
    source: PlaybackSource,
    track_id: u64,
    play_seq: Option<u64>,
    state: State<'_, AppState>,
) -> Result<PlaybackSync, String> {
    // фронт мог уйти вперед, пока этот запрос ждал кэш: старый трек не стартуем
    let stale = match play_seq {
        Some(seq) => {
            let latest = state
                .play_seq
                .fetch_max(seq, std::sync::atomic::Ordering::SeqCst);
            seq < latest
        }
        None => false,
    };
    if stale {
        return Err(STALE_PLAY.into());
    }

    finish_transition(&state, true);
    let settings = settings_snapshot(&state);
    let key = loudness_key(&source, track_id);
    let gen = state.loudness_gen.fetch_add(1, Ordering::SeqCst) + 1;
    let slot = Arc::new(AtomicU32::new(gain_milli_for(&state, &key, &settings)));
    *state.gain_slot.lock().unwrap() = Some(GainSlot {
        slot: slot.clone(),
        key: key.clone(),
        gen,
    });
    let known = !settings.normalization || state.loudness.get(&key).is_some();
    state.set_transport(settings.speed, settings.pitch_semitones, settings.linked);
    let (playback_source, detected) = match build_playback_source(
        source.clone(),
        slot.clone(),
        state.eq.clone(),
        state.pitch_milli.clone(),
        state.tempo_milli.clone(),
        state.analyser.clone(),
    ) {
        Ok(built) => built,
        Err(err) => {
            // иначе в колонках продолжает играть предыдущий трек
            stop_all(&state);
            emit_state(&state, "stopped", 0);
            return Err(err);
        }
    };

    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    let started = Instant::now();
    install_source(&state, playback_source, vol, true);

    {
        let mut pb = state.playback.lock().unwrap();
        pb.start(source.clone(), track_id, Some(slot.clone()), settings.speed);
        // метаданные sc бывают пустыми: берем длительность из самого файла
        if let Some(total) = detected {
            pb.duration_ms = total.as_millis().min(u32::MAX as u128) as u32;
        }
    }

    // громкость не знаем: считаем в фоне, трек уже играет без задержки
    if !known {
        spawn_loudness_analysis(&state, source, key, slot, gen);
    }

    let real_offset_ms = started.elapsed().as_millis() as u64;
    let position_sec = 0.0;

    ensure_analyser_running(&state);
    ensure_tick_running(&state);
    emit_state(&state, "playing", real_offset_ms);

    Ok(PlaybackSync {
        position_sec,
        real_offset_ms,
        duration_ms: current_duration_ms(&state),
    })
}

pub fn play_file(
    path: PathBuf,
    track_id: u64,
    play_seq: Option<u64>,
    state: State<'_, AppState>,
) -> Result<PlaybackSync, String> {
    start_source(PlaybackSource::File(path), track_id, play_seq, state)
}

pub fn play_bytes(
    bytes: Bytes,
    track_id: u64,
    play_seq: Option<u64>,
    state: State<'_, AppState>,
) -> Result<PlaybackSync, String> {
    start_source(PlaybackSource::Bytes(bytes), track_id, play_seq, state)
}

pub fn pause(state: State<AppState>) -> Result<(), String> {
    state.player.lock().unwrap().pause();
    if let Some(old) = state.outgoing.lock().unwrap().as_ref() {
        old.pause();
    }
    state.playback.lock().unwrap().pause();
    // на паузе тик не нужен: он просыпается зря и дергает локи
    stop_tick(&state);
    emit_state(&state, "paused", 0);
    Ok(())
}

pub fn resume(state: State<AppState>) -> Result<PlaybackSync, String> {
    let vol = {
        let pb = state.playback.lock().unwrap();
        if pb.is_muted { 0.0 } else { pb.volume }
    };

    let started = Instant::now();
    {
        state.player.lock().unwrap().play();
        if let Some(old) = state.outgoing.lock().unwrap().as_ref() {
            old.play();
        }
    }
    apply_volumes(&state, vol);

    state.playback.lock().unwrap().resume();
    let real_offset_ms = started.elapsed().as_millis() as u64;
    let position_sec = output_position(&state);

    ensure_tick_running(&state);
    emit_state(&state, "playing", real_offset_ms);
    Ok(PlaybackSync {
        position_sec,
        real_offset_ms,
        duration_ms: current_duration_ms(&state),
    })
}

pub fn stop(state: State<AppState>) -> Result<(), String> {
    finish_transition(&state, true);
    stop_all(&state);
    emit_state(&state, "stopped", 0);
    Ok(())
}

pub fn get_position(state: State<AppState>) -> Result<f64, String> {
    Ok(output_position(&state))
}

pub fn set_volume(volume: u32, state: State<AppState>) -> Result<(), String> {
    let effective = state.playback.lock().unwrap().set_volume(volume);
    apply_volumes(&state, effective);

    if let Some(ch) = state.volume_channel.lock().unwrap().as_ref() {
        let _ = ch.send(volume);
    }

    Ok(())
}

pub fn mute_audio(state: State<AppState>) -> Result<(), String> {
    state.playback.lock().unwrap().mute();
    apply_volumes(&state, 0.0);
    Ok(())
}

pub fn unmute_audio(state: State<AppState>) -> Result<(), String> {
    let vol = {
        let mut pb = state.playback.lock().unwrap();
        pb.unmute();
        pb.volume
    };
    apply_volumes(&state, vol);
    Ok(())
}

pub fn set_track_duration(duration_ms: u32, state: State<AppState>) -> Result<(), String> {
    let mut pb = state.playback.lock().unwrap();
    // 0 значит неизвестно: не затираем длительность, взятую из самого файла
    if duration_ms > 0 || pb.duration_ms == 0 {
        pb.duration_ms = duration_ms;
    }
    Ok(())
}

pub fn seek(seconds: f64, state: State<AppState>) -> Result<PlaybackSync, String> {
    let (source, max_sec, gain_slot) = {
        let pb = state.playback.lock().unwrap();
        let source = pb
            .source
            .clone()
            .ok_or("no track loaded cannot seek")?;
        let max = (pb.duration_ms as f64) / 1000.0;
        (source, max, pb.gain_slot.clone())
    };

    if max_sec <= 0.0 {
        return Err("duration unknown".into());
    }

    finish_transition(&state, true);
    let target = seconds.clamp(0.0, max_sec);
    // слот усиления переиспользуем: иначе после seek нормализация слетит
    let gain_slot = gain_slot.unwrap_or_else(|| Arc::new(AtomicU32::new(1000)));
    let (mut source, _) = build_playback_source(
        source,
        gain_slot,
        state.eq.clone(),
        state.pitch_milli.clone(),
        state.tempo_milli.clone(),
        state.analyser.clone(),
    )?;

    let mut actual = Duration::ZERO;
    if target > 0.05 {
        let d = Duration::from_secs_f64(target);
        // тихий откат в начало хуже ошибки: фронт покажет реальную позицию
        match source.try_seek(d) {
            Ok(()) => actual = d,
            Err(err) => return Err(format!("seek not supported: {err}")),
        }
    }

    let (vol, was_playing) = {
        let pb = state.playback.lock().unwrap();
        (if pb.is_muted { 0.0 } else { pb.volume }, pb.is_playing)
    };

    let started = Instant::now();
    install_source(&state, source, vol, was_playing);

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
        duration_ms: current_duration_ms(&state),
    })
}

pub fn set_audio_settings(settings: AudioSettings, state: State<AppState>) -> Result<(), String> {
    let settings = settings.normalized();
    let normalization_changed = {
        let mut current = state.settings.lock().unwrap();
        let changed = current.normalization != settings.normalization
            || (current.normalization_target_lufs - settings.normalization_target_lufs).abs() > 0.001;
        *current = settings.clone();
        changed
    };
    state.set_transport(settings.speed, settings.pitch_semitones, settings.linked);
    let speed_changed = {
        let pb = state.playback.lock().unwrap();
        (pb.speed - settings.speed).abs() > 0.001
    };
    if speed_changed {
        let output = state.player.lock().unwrap().get_pos().as_secs_f64();
        state.playback.lock().unwrap().set_speed_at(settings.speed, output);
    }
    if normalization_changed {
        // включали или меняли цель: подтягиваем усиление текущего трека
        refresh_gain(&state, &settings);
    }
    if settings.transition == TransitionMode::Off {
        finish_transition(&state, true);
    }
    Ok(())
}

pub fn set_eq(settings: EqSettings, state: State<AppState>) -> Result<(), String> {
    let settings = settings.normalized();
    *state.eq.lock().unwrap() = settings;
    Ok(())
}

pub async fn queue_next_track(
    track_id: u64,
    duration_ms: u32,
    quality: Option<String>,
    cache: State<'_, TrackCacheState>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let settings = state.settings.lock().unwrap().clone();
    if settings.transition == TransitionMode::Off || duration_ms == 0 {
        return Ok(false);
    }
    if state.queued_next.lock().unwrap().is_some()
        || state.transition.lock().unwrap().is_some()
        || state.transition_starting.load(Ordering::SeqCst)
    {
        return Ok(false);
    }
    let (gen, current_id) = {
        let pb = state.playback.lock().unwrap();
        if pb.source.is_none() {
            return Ok(false);
        }
        (state.transition_gen.load(Ordering::Relaxed), pb.current_track_id)
    };

    let quality = AudioQuality::from_label(quality.as_deref());
    let result = cache
        .ensure_cached(CacheRequest {
            track_id,
            quality,
            expected_duration_ms: Some(duration_ms as u64),
            offline: false,
            priority: Priority::Playback,
        })
        .await?;

    let settings = state.settings.lock().unwrap().clone();
    if settings.transition == TransitionMode::Off
        || state.transition_gen.load(Ordering::Relaxed) != gen
    {
        return Ok(false);
    }
    {
        let pb = state.playback.lock().unwrap();
        if pb.current_track_id != current_id {
            return Ok(false);
        }
    }
    if state.queued_next.lock().unwrap().is_some()
        || state.transition.lock().unwrap().is_some()
        || state.transition_starting.load(Ordering::SeqCst)
    {
        return Ok(false);
    }

    // трек вот-вот начнется: вытеснение кэша не должно его забрать
    cache.touch(track_id);
    let source = PlaybackSource::File(PathBuf::from(result.entry.path));
    let key = loudness_key(&source, track_id);
    let measured = state.loudness.get(&key);
    let gain_db = match (settings.normalization, measured) {
        (true, Some(measured)) => measured.gain_db(
            settings.normalization_target_lufs,
            TRUE_PEAK_CEILING_DBTP,
        ),
        _ => 0.0,
    };
    // мерить следующий трек лучше сейчас, пока играет текущий
    if settings.normalization && measured.is_none() {
        let slot = Arc::new(AtomicU32::new(loudness::db_to_milli(gain_db)));
        let gen = state.loudness_gen.load(Ordering::Relaxed);
        spawn_loudness_analysis(&state, source.clone(), key, slot, gen);
    }
    let queued = QueuedTrack {
        track_id,
        duration_ms,
        source: source.clone(),
        gain_db,
    };

    *state.queued_next.lock().unwrap() = Some(queued);
    Ok(true)
}


#[cfg(test)]
mod transition_tests {
    use super::transition_gains;

    #[test]
    fn crossfade_is_equal_power() {
        for step in 0..=20 {
            let (out, incoming) = transition_gains(step as f32 / 20.0);
            assert!((out * out + incoming * incoming - 1.0).abs() < 1e-5);
        }
    }

    #[test]
    fn crossfade_starts_on_outgoing_and_ends_on_incoming() {
        let (out, incoming) = transition_gains(0.0);
        assert!((out - 1.0).abs() < 1e-6);
        assert!(incoming.abs() < 1e-6);
        let (out, incoming) = transition_gains(1.0);
        assert!(out.abs() < 1e-6);
        assert!((incoming - 1.0).abs() < 1e-6);
    }
}
