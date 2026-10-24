use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use bytes::Bytes;
use cpal::traits::{DeviceTrait, HostTrait};
use tauri::async_runtime::JoinHandle;

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

pub struct Playback {
    pub is_playing: bool,
    pub is_muted: bool,
    pub volume: f32,
    pub volume_ui: u32,
    pub base_offset: Duration,
    pub play_start: Option<Instant>,
    pub duration_ms: u32,
    pub source: Option<PlaybackSource>,
    // пропуск tick'ов после seek (3 = 300ms), чтобы rodio успел перемотать
    pub seek_skip_tick: u32,
    pub current_track_id: u64,
}

impl Playback {
    pub fn new() -> Self {
        Self {
            is_playing: false,
            is_muted: false,
            volume: 0.8,
            volume_ui: 80,
            base_offset: Duration::ZERO,
            play_start: None,
            duration_ms: 0,
            source: None,
            seek_skip_tick: 0,
            current_track_id: 0,
        }
    }

    pub fn position(&self) -> Duration {
        let elapsed = match (self.is_playing, self.play_start) {
            (true, Some(t)) => t.elapsed(),
            _ => Duration::ZERO,
        };
        let pos = self.base_offset + elapsed;
        let max = Duration::from_millis(self.duration_ms as u64);
        if max.is_zero() { pos } else { pos.min(max) }
    }

    pub fn start(&mut self, source: PlaybackSource, track_id: u64) {
        self.source = Some(source);
        self.current_track_id = track_id;
        self.base_offset = Duration::ZERO;
        self.play_start = Some(Instant::now());
        self.is_playing = true;
        self.is_muted = false;
        self.duration_ms = 0;
    }

    pub fn pause(&mut self) {
        if self.is_playing {
            self.base_offset = self.position();
            self.play_start = None;
            self.is_playing = false;
        }
    }

    pub fn resume(&mut self) {
        if !self.is_playing {
            self.play_start = Some(Instant::now());
            self.is_playing = true;
            self.is_muted = false;
        }
    }

    pub fn seek(&mut self, target: Duration) -> Duration {
        let max = Duration::from_millis(self.duration_ms as u64);
        let actual = if max.is_zero() { target } else { target.min(max) };

        self.base_offset = actual;
        self.play_start = if self.is_playing { Some(Instant::now()) } else { None };
        self.seek_skip_tick = 3;
        actual
    }

    pub fn stop(&mut self) {
        self.source = None;
        self.base_offset = Duration::ZERO;
        self.play_start = None;
        self.is_playing = false;
        self.duration_ms = 0;
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

impl AppState {
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

