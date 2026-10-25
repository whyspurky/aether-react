use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use bytes::Bytes;
use cpal::traits::{DeviceTrait, HostTrait};
use tauri::async_runtime::JoinHandle;

use crate::audio::analyser::AnalyserBuffer;
use crate::audio::dsp::EqSettings;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputDeviceInfo {
    pub id: String,
    pub name: String,
    pub detail: String,
    pub is_default: bool,
}

#[derive(Clone)]
pub enum PlaybackSource {
    File(PathBuf),
    Bytes(Bytes),
}

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransitionMode {
    Off,
    Gapless,
    Crossfade,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub normalization: bool,
    pub speed: f32,
    #[serde(default)]
    pub pitch_semitones: f32,
    #[serde(default = "default_linked")]
    pub linked: bool,
    pub transition: TransitionMode,
    pub crossfade_secs: f32,
}

fn default_linked() -> bool {
    true
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            normalization: false,
            speed: 1.0,
            pitch_semitones: 0.0,
            linked: true,
            transition: TransitionMode::Off,
            crossfade_secs: 4.0,
        }
    }
}

impl AudioSettings {
    pub fn normalized(mut self) -> Self {
        self.speed = self.speed.clamp(0.5, 2.0);
        self.pitch_semitones = self.pitch_semitones.clamp(-12.0, 12.0);
        self.crossfade_secs = self.crossfade_secs.clamp(0.0, 12.0);
        self
    }
}

#[derive(Clone)]
pub struct QueuedTrack {
    pub track_id: u64,
    pub duration_ms: u32,
    pub source: PlaybackSource,
    pub gain: f32,
}

pub struct TransitionRun {
    pub length: f32,
    pub elapsed: f32,
    pub in_gain: f32,
    pub out_gain: f32,
}

pub struct Playback {
    pub is_playing: bool,
    pub is_muted: bool,
    pub volume: f32,
    pub volume_ui: u32,
    pub duration_ms: u32,
    pub source: Option<PlaybackSource>,
    // пропуск tick'ов после seek (3 = 300ms), чтобы rodio успел перемотать
    pub seek_skip_tick: u32,
    pub current_track_id: u64,
    pub gain: f32,
    pub speed: f32,
    // источник и выход в секундах: source = src_anchor + (output - out_anchor) * speed
    pub src_anchor: f64,
    pub out_anchor: f64,
}

impl Playback {
    pub fn new() -> Self {
        Self {
            is_playing: false,
            is_muted: false,
            volume: 0.8,
            volume_ui: 80,
            duration_ms: 0,
            source: None,
            seek_skip_tick: 0,
            current_track_id: 0,
            gain: 1.0,
            speed: 1.0,
            src_anchor: 0.0,
            out_anchor: 0.0,
        }
    }

    pub fn position_at(&self, output_secs: f64) -> Duration {
        let pos = self.src_anchor + (output_secs - self.out_anchor) * self.speed as f64;
        let pos = pos.max(0.0);
        let max = self.duration_ms as f64 / 1000.0;
        let seconds = if max > 0.0 { pos.min(max) } else { pos };
        Duration::from_secs_f64(seconds)
    }

    pub fn start(&mut self, source: PlaybackSource, track_id: u64, gain: f32, speed: f32) {
        self.source = Some(source);
        self.current_track_id = track_id;
        self.is_playing = true;
        self.is_muted = false;
        self.duration_ms = 0;
        self.gain = gain;
        self.speed = speed.clamp(0.5, 2.0);
        self.src_anchor = 0.0;
        self.out_anchor = 0.0;
    }

    pub fn set_speed_at(&mut self, speed: f32, output_secs: f64) {
        let speed = speed.clamp(0.5, 2.0);
        self.src_anchor = self.position_at(output_secs).as_secs_f64();
        self.out_anchor = output_secs;
        self.speed = speed;
    }

    pub fn pause(&mut self) {
        self.is_playing = false;
    }

    pub fn resume(&mut self) {
        self.is_playing = true;
        self.is_muted = false;
    }

    pub fn seek(&mut self, target: Duration) -> Duration {
        let max = Duration::from_millis(self.duration_ms as u64);
        let actual = if max.is_zero() { target } else { target.min(max) };

        self.src_anchor = actual.as_secs_f64();
        self.out_anchor = 0.0;
        self.seek_skip_tick = 3;
        actual
    }

    pub fn stop(&mut self) {
        self.source = None;
        self.is_playing = false;
        self.duration_ms = 0;
        self.src_anchor = 0.0;
        self.out_anchor = 0.0;
    }

    pub fn set_volume(&mut self, v: u32) -> f32 {
        let clamped = (v as f32 / 100.0).clamp(0.0, 1.0);
        self.volume = clamped;
        self.volume_ui = v;
        if self.is_muted { 0.0 } else { clamped }
    }

    pub fn mute(&mut self) {
        self.is_muted = true;
    }

    pub fn unmute(&mut self) {
        self.is_muted = false;
    }
}

pub struct AppState {
    pub player: Arc<Mutex<rodio::Player>>,
    pub playback: Arc<Mutex<Playback>>,
    // underscore: важно держать sink живым, иначе звук отваливается
    pub _sink_handle: Arc<Mutex<rodio::MixerDeviceSink>>,
    pub app_handle: Arc<Mutex<Option<tauri::AppHandle>>>,
    pub tick_task: Arc<Mutex<Option<JoinHandle<()>>>>,
    pub volume_channel: Arc<Mutex<Option<tauri::ipc::Channel<u32>>>>,
    pub settings: Arc<Mutex<AudioSettings>>,
    pub eq: Arc<Mutex<EqSettings>>,
    pub gain_cache: Arc<Mutex<HashMap<u64, f32>>>,
    pub queued_next: Arc<Mutex<Option<QueuedTrack>>>,
    pub transition: Arc<Mutex<Option<TransitionRun>>>,
    pub outgoing: Arc<Mutex<Option<rodio::Player>>>,
    pub transition_gen: Arc<AtomicU64>,
    pub speed_milli: Arc<AtomicU32>,
    pub pitch_milli: Arc<AtomicU32>,
    pub tempo_milli: Arc<AtomicU32>,
    pub analyser: Arc<AnalyserBuffer>,
    pub analyser_task: Arc<Mutex<Option<JoinHandle<()>>>>,
    // частота position-tick, настраивается из вкладки производительности
    pub position_tick_ms: Arc<AtomicU64>,
}

fn device_label(
    device: &cpal::Device,
    index: usize,
    default_id: &Option<cpal::DeviceId>,
    seen: &mut HashMap<String, usize>,
) -> OutputDeviceInfo {
    let desc = device.description().ok();
    let raw_name = desc
        .as_ref()
        .map(|d| d.name().to_string())
        .unwrap_or_else(|| format!("Устройство {}", index + 1));
    let driver = desc
        .as_ref()
        .and_then(|d| d.driver())
        .unwrap_or("")
        .to_string();

    let base = if raw_name.contains('(') || driver.is_empty() {
        raw_name
    } else {
        format!("{raw_name} ({driver})")
    };
    let count = seen.entry(base.clone()).or_insert(0);
    *count += 1;
    let name = if *count > 1 {
        format!("{base} #{}", *count)
    } else {
        base
    };
    let detail = "Устройство вывода".to_string();

    OutputDeviceInfo {
        id: format!("{index}|{name}"),
        name,
        detail,
        is_default: device.id().ok() == *default_id,
    }
}

fn collect_devices() -> Result<Vec<(cpal::Device, OutputDeviceInfo)>, String> {
    let host = cpal::default_host();
    let default_id = host
        .default_output_device()
        .and_then(|device| device.id().ok());
    let devices = host
        .output_devices()
        .map_err(|e| format!("output devices: {e}"))?;
    let mut seen = HashMap::new();
    Ok(devices
        .enumerate()
        .map(|(index, device)| {
            let info = device_label(&device, index, &default_id, &mut seen);
            (device, info)
        })
        .collect())
}

pub fn output_devices() -> Result<Vec<OutputDeviceInfo>, String> {
    Ok(collect_devices()?
        .into_iter()
        .map(|(_, info)| info)
        .collect())
}

fn transport_ratios(speed: f32, pitch_semitones: f32, linked: bool) -> (f32, f32) {
    let speed = speed.clamp(0.5, 2.0);
    let pitch = if linked {
        speed
    } else {
        2f32.powf(pitch_semitones.clamp(-12.0, 12.0) / 12.0)
    };
    let tempo = if linked { 1.0 } else { speed / pitch };
    (pitch, tempo)
}

impl AppState {
    pub fn set_transport(&self, speed: f32, pitch_semitones: f32, linked: bool) {
        let (pitch, tempo) = transport_ratios(speed, pitch_semitones, linked);
        self.speed_milli
            .store((speed.clamp(0.5, 2.0) * 1000.0).round() as u32, Ordering::Relaxed);
        self.pitch_milli
            .store((pitch * 1000.0).round() as u32, Ordering::Relaxed);
        self.tempo_milli.store(
            (tempo * 1000.0).round() as u32,
            Ordering::Relaxed,
        );
    }

    pub fn set_output_device(&self, id: Option<&str>) -> Result<String, String> {
        let wanted = id.unwrap_or("").trim();
        let (sink, label) = if wanted.is_empty() || wanted == "default" {
            let sink = rodio::DeviceSinkBuilder::open_default_sink()
                .map_err(|e| format!("default output: {e}"))?;
            (sink, "default".to_string())
        } else {
            let devices = collect_devices()?;
            let chosen = devices
                .iter()
                .find(|(_, info)| info.id == wanted)
                .or_else(|| {
                    let wanted_label = wanted
                        .split_once('|')
                        .map(|(_, label)| label)
                        .unwrap_or(wanted);
                    devices.iter().find(|(_, info)| {
                        info.name == wanted_label
                            || info.id.ends_with(&format!("|{wanted_label}"))
                    })
                })
                .ok_or_else(|| format!("устройство вывода не найдено: {wanted}"))?;

            let label = chosen.1.name.clone();
            let sink = rodio::DeviceSinkBuilder::from_device(chosen.0.clone())
                .map_err(|e| format!("device config: {e}"))?
                .open_stream()
                .map_err(|e| format!("device open: {e}"))?;
            (sink, label)
        };

        let player = rodio::Player::connect_new(sink.mixer());
        let mut sink_guard = self._sink_handle.lock().unwrap();
        let mut player_guard = self.player.lock().unwrap();
        player_guard.stop();
        *player_guard = player;
        *sink_guard = sink;
        player_guard.set_speed(1.0);
        self.queued_next.lock().unwrap().take();
        self.transition.lock().unwrap().take();
        if let Some(old) = self.outgoing.lock().unwrap().take() {
            old.stop();
        }
        self.transition_gen.fetch_add(1, Ordering::Relaxed);
        self.playback.lock().unwrap().stop();
        Ok(label)
    }

    pub fn new() -> Self {
        let sink_handle = rodio::DeviceSinkBuilder::open_default_sink()
            .expect("failed to open default audio sink");
        let player = rodio::Player::connect_new(sink_handle.mixer());
        Self {
            _sink_handle: Arc::new(Mutex::new(sink_handle)),
            player: Arc::new(Mutex::new(player)),
            playback: Arc::new(Mutex::new(Playback::new())),
            app_handle: Arc::new(Mutex::new(None)),
            tick_task: Arc::new(Mutex::new(None)),
            volume_channel: Arc::new(Mutex::new(None)),
            settings: Arc::new(Mutex::new(AudioSettings::default())),
            eq: Arc::new(Mutex::new(EqSettings::default())),
            gain_cache: Arc::new(Mutex::new(HashMap::new())),
            queued_next: Arc::new(Mutex::new(None)),
            transition: Arc::new(Mutex::new(None)),
            outgoing: Arc::new(Mutex::new(None)),
            transition_gen: Arc::new(AtomicU64::new(0)),
            speed_milli: Arc::new(AtomicU32::new(1000)),
            pitch_milli: Arc::new(AtomicU32::new(1000)),
            tempo_milli: Arc::new(AtomicU32::new(1000)),
            analyser: AnalyserBuffer::new(),
            analyser_task: Arc::new(Mutex::new(None)),
            position_tick_ms: Arc::new(AtomicU64::new(100)),
        }
    }
}

#[cfg(test)]
mod device_tests {
    use std::collections::HashSet;

    #[test]
    fn every_output_device_has_a_distinct_label() {
        let Ok(devices) = super::output_devices() else {
            return;
        };
        let labels: Vec<_> = devices.iter().map(|device| device.name.as_str()).collect();
        println!("output devices: {labels:?}");
        assert!(labels.iter().all(|label| !label.is_empty()));
        let unique: HashSet<_> = labels.iter().collect();
        assert_eq!(unique.len(), labels.len());
    }
}

#[cfg(test)]
mod settings_tests {
    use super::*;

    #[test]
    fn audio_settings_deserialize_from_frontend() {
        let value = serde_json::json!({
            "normalization": true,
            "speed": 1.25,
            "pitchSemitones": 3.0,
            "linked": false,
            "transition": "crossfade",
            "crossfadeSecs": 6.0
        });
        let settings: AudioSettings = serde_json::from_value(value).unwrap();
        assert!(settings.normalization);
        assert_eq!(settings.speed, 1.25);
        assert_eq!(settings.pitch_semitones, 3.0);
        assert!(!settings.linked);
        assert_eq!(settings.transition, TransitionMode::Crossfade);
        assert_eq!(settings.crossfade_secs, 6.0);
    }

    #[test]
    fn speed_multiplies_output_position() {
        let mut playback = Playback::new();
        playback.duration_ms = 100_000;
        playback.speed = 2.0;
        playback.src_anchor = 10.0;
        playback.out_anchor = 0.0;
        playback.is_playing = true;
        let pos = playback.position_at(1.0).as_secs_f64();
        assert!((pos - 12.0).abs() < 1e-6, "pos={pos}");
    }

    #[test]
    fn linked_mode_uses_vinyl_ratios() {
        let (pitch, tempo) = transport_ratios(1.3, 0.0, true);
        assert!((pitch - 1.3).abs() < 1e-6);
        assert!((tempo - 1.0).abs() < 1e-6);
    }

    #[test]
    fn independent_mode_keeps_tempo_and_pitch_separate() {
        let (pitch, tempo) = transport_ratios(1.3, 4.5, false);
        assert!((pitch - 2f32.powf(4.5 / 12.0)).abs() < 1e-6);
        assert!((pitch * tempo - 1.3).abs() < 1e-6);
    }

    #[test]
    fn audio_settings_clamp_out_of_range_values() {
        let settings = AudioSettings {
            normalization: false,
            speed: 5.0,
            pitch_semitones: 20.0,
            linked: false,
            transition: TransitionMode::Gapless,
            crossfade_secs: 60.0,
        }
        .normalized();
        assert_eq!(settings.speed, 2.0);
        assert_eq!(settings.pitch_semitones, 12.0);
        assert_eq!(settings.crossfade_secs, 12.0);
    }
}
