// src-tauri/src/audio/state.rs

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use bytes::Bytes;

pub struct Playback {
    pub is_playing: bool,
    pub is_muted: bool,
    pub volume: f32,
    pub base_offset: Duration,
    pub play_start: Option<Instant>,
    pub duration_ms: u32,
    pub bytes: Option<Bytes>,
}

impl Playback {
    pub fn new() -> Self {
        Self {
            is_playing: false,
            is_muted: false,
            volume: 0.8,
            base_offset: Duration::ZERO,
            play_start: None,
            duration_ms: 0,
            bytes: None,
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

    // duration придет позже через set_track_duration
    pub fn start(&mut self, bytes: Bytes) {
        self.bytes = Some(bytes);
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

    // возвращает реально примененную позицию
    pub fn seek(&mut self, target: Duration) -> Duration {
        let max = Duration::from_millis(self.duration_ms as u64);
        let actual = if max.is_zero() { target } else { target.min(max) };

        self.base_offset = actual;
        self.play_start = if self.is_playing { Some(Instant::now()) } else { None };
        actual
    }

    pub fn stop(&mut self) {
        self.bytes = None;
        self.base_offset = Duration::ZERO;
        self.play_start = None;
        self.is_playing = false;
        self.duration_ms = 0;
    }

    pub fn set_volume(&mut self, v: u32) -> f32 {
        let clamped = (v as f32 / 100.0).clamp(0.0, 1.0);
        self.volume = clamped;
        if self.is_muted { 0.0 } else { clamped }
    }

    pub fn mute(&mut self) {
        self.is_muted = true;
    }

    pub fn unmute(&mut self) {
        self.is_muted = false;
    }
}

// порядок локов всегда: playback -> player
// не бери player раньше playback
pub struct AppState {
    pub player: Arc<Mutex<rodio::Player>>,
    pub playback: Arc<Mutex<Playback>>,
    pub _sink_handle: Arc<Mutex<rodio::MixerDeviceSink>>,
}

impl AppState {
    pub fn new() -> Self {
        let sink_handle = rodio::DeviceSinkBuilder::open_default_sink()
            .expect("failed to open default audio sink");
        let player = rodio::Player::connect_new(sink_handle.mixer());
        Self {
            _sink_handle: Arc::new(Mutex::new(sink_handle)),
            player: Arc::new(Mutex::new(player)),
            playback: Arc::new(Mutex::new(Playback::new())),
        }
    }
}