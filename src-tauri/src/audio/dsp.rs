use std::collections::VecDeque;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use rodio::{ChannelCount, SampleRate, Source};

pub const EQ_BANDS: usize = 10;
pub const EQ_FREQUENCIES: [f32; EQ_BANDS] = [
    31.25, 62.5, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EqKind {
    Peaking,
    LowShelf,
    HighShelf,
    LowPass,
    HighPass,
    Notch,
    BandPass,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EqBand {
    pub id: u32,
    pub enabled: bool,
    pub kind: EqKind,
    pub freq: f32,
    pub gain_db: f32,
    pub q: f32,
}

impl EqBand {
    pub fn peaking(id: u32, freq: f32) -> Self {
        Self {
            id,
            enabled: true,
            kind: EqKind::Peaking,
            freq,
            gain_db: 0.0,
            q: 1.414,
        }
    }

    fn normalized(mut self) -> Self {
        self.freq = self.freq.clamp(20.0, 20_000.0);
        self.gain_db = self.gain_db.clamp(-18.0, 18.0);
        self.q = self.q.clamp(0.1, 10.0);
        self
    }
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EqSettings {
    pub enabled: bool,
    pub preamp_db: f32,
    pub bands: Vec<EqBand>,
}

impl Default for EqSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            preamp_db: 0.0,
            bands: EQ_FREQUENCIES
                .iter()
                .enumerate()
                .map(|(index, freq)| EqBand::peaking(index as u32 + 1, *freq))
                .collect(),
        }
    }
}

impl EqSettings {
    pub fn normalized(mut self) -> Self {
        self.preamp_db = self.preamp_db.clamp(-12.0, 6.0);
        self.bands.truncate(24);
        self.bands = self.bands.into_iter().map(EqBand::normalized).collect();
        self
    }
}

#[derive(Clone, Copy, Debug)]
struct Biquad {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl Biquad {
    fn identity() -> Self {
        Self {
            b0: 1.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    // нулевая полоса не должна крутиться в аудио-колбэке
    fn is_identity(&self) -> bool {
        self.b0 == 1.0 && self.b1 == 0.0 && self.b2 == 0.0 && self.a1 == 0.0 && self.a2 == 0.0
    }

    fn for_band(sample_rate: f32, band: &EqBand) -> Self {
        if !band.enabled || sample_rate <= 0.0 {
            return Self::identity();
        }
        let freq = band.freq.clamp(20.0, sample_rate * 0.49);
        let w0 = 2.0 * std::f32::consts::PI * (freq / sample_rate).clamp(0.0001, 0.49);
        let cos = w0.cos();
        let sin = w0.sin();
        let q = band.q.max(0.1);
        let alpha = sin / (2.0 * q);
        let a = 10f32.powf(band.gain_db / 40.0);
        let gain = band.gain_db.abs() > 0.01;

        let (b0, b1, b2, a0, a1, a2) = match band.kind {
            EqKind::Peaking if gain => (
                1.0 + alpha * a,
                -2.0 * cos,
                1.0 - alpha * a,
                1.0 + alpha / a,
                -2.0 * cos,
                1.0 - alpha / a,
            ),
            EqKind::LowShelf if gain => {
                let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;
                (
                    a * ((a + 1.0) - (a - 1.0) * cos + two_sqrt_a_alpha),
                    2.0 * a * ((a - 1.0) - (a + 1.0) * cos),
                    a * ((a + 1.0) - (a - 1.0) * cos - two_sqrt_a_alpha),
                    (a + 1.0) + (a - 1.0) * cos + two_sqrt_a_alpha,
                    -2.0 * ((a - 1.0) + (a + 1.0) * cos),
                    (a + 1.0) + (a - 1.0) * cos - two_sqrt_a_alpha,
                )
            }
            EqKind::HighShelf if gain => {
                let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;
                (
                    a * ((a + 1.0) + (a - 1.0) * cos + two_sqrt_a_alpha),
                    -2.0 * a * ((a - 1.0) + (a + 1.0) * cos),
                    a * ((a + 1.0) + (a - 1.0) * cos - two_sqrt_a_alpha),
                    (a + 1.0) - (a - 1.0) * cos + two_sqrt_a_alpha,
                    2.0 * ((a - 1.0) - (a + 1.0) * cos),
                    (a + 1.0) - (a - 1.0) * cos - two_sqrt_a_alpha,
                )
            }
            EqKind::LowPass => (
                (1.0 - cos) / 2.0,
                1.0 - cos,
                (1.0 - cos) / 2.0,
                1.0 + alpha,
                -2.0 * cos,
                1.0 - alpha,
            ),
            EqKind::HighPass => (
                (1.0 + cos) / 2.0,
                -(1.0 + cos),
                (1.0 + cos) / 2.0,
                1.0 + alpha,
                -2.0 * cos,
                1.0 - alpha,
            ),
            EqKind::Notch => (1.0, -2.0 * cos, 1.0, 1.0 + alpha, -2.0 * cos, 1.0 - alpha),
            EqKind::BandPass => (alpha, 0.0, -alpha, 1.0 + alpha, -2.0 * cos, 1.0 - alpha),
            _ => return Self::identity(),
        };

        if a0.abs() < f32::EPSILON {
            return Self::identity();
        }
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    fn process(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2
            - self.a1 * self.y1
            - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

pub struct EqSource<S> {
    inner: S,
    settings: Arc<Mutex<EqSettings>>,
    current: EqSettings,
    filters: Vec<[Biquad; 2]>,
    channels: usize,
    channel: usize,
    counter: usize,
    sample_rate: f32,
    preamp: f32,
}

impl<S> EqSource<S>
where
    S: Source,
{
    pub fn new(inner: S, settings: Arc<Mutex<EqSettings>>) -> Self {
        let current = settings.lock().map(|s| s.clone()).unwrap_or_default().normalized();
        let channels = inner.channels().get() as usize;
        let sample_rate = inner.sample_rate().get() as f32;
        let mut source = Self {
            inner,
            settings,
            current: EqSettings::default(),
            filters: Vec::new(),
            channels: channels.max(1),
            channel: 0,
            counter: 0,
            sample_rate,
            preamp: 1.0,
        };
        source.current = current;
        source.rebuild_filters();
        source
    }

    fn rebuild_filters(&mut self) {
        // preamp считаем один раз на изменение настроек, а не на каждый сэмпл
        self.preamp = 10f32.powf(self.current.preamp_db / 20.0);
        self.filters = self
            .current
            .bands
            .iter()
            .map(|band| Biquad::for_band(self.sample_rate, band))
            .filter(|coeff| !coeff.is_identity())
            .map(|coeff| [coeff, coeff])
            .collect();
    }

    fn refresh_if_needed(&mut self) {
        self.counter += 1;
        if self.counter < 1024 {
            return;
        }
        self.counter = 0;
        let next = {
            let Ok(settings) = self.settings.lock() else {
                return;
            };
            settings.clone().normalized()
        };
        if next == self.current {
            return;
        }
        self.current = next;
        self.rebuild_filters();
    }
}

impl<S> Iterator for EqSource<S>
where
    S: Source,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.inner.next()?;
        self.refresh_if_needed();

        let channel = self.channel.min(self.channels.saturating_sub(1));
        self.channel = (self.channel + 1) % self.channels;

        if !self.current.enabled {
            return Some(sample.clamp(-1.0, 1.0));
        }

        let preamp = self.preamp;
        let mut value = sample * preamp;
        for filter in &mut self.filters {
            value = filter[channel].process(value);
        }
        Some(value.clamp(-1.0, 1.0))
    }
}

impl<S> Source for EqSource<S>
where
    S: Source,
{
    fn current_span_len(&self) -> Option<usize> {
        self.inner.current_span_len()
    }

    fn channels(&self) -> ChannelCount {
        self.inner.channels()
    }

    fn sample_rate(&self) -> SampleRate {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        self.inner.total_duration()
    }

    fn try_seek(&mut self, pos: Duration) -> Result<(), rodio::source::SeekError> {
        self.inner.try_seek(pos)?;
        self.rebuild_filters();
        self.channel = 0;
        Ok(())
    }
}

pub struct GainSource<S> {
    inner: S,
    gain: f32,
}

impl<S> GainSource<S> {
    pub fn new(inner: S, gain: f32) -> Self {
        Self {
            inner,
            gain: gain.clamp(0.0, 16.0),
        }
    }
}

impl<S> Iterator for GainSource<S>
where
    S: Source,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        self.inner
            .next()
            .map(|sample| (sample * self.gain).clamp(-1.0, 1.0))
    }
}

impl<S> Source for GainSource<S>
where
    S: Source,
{
    fn current_span_len(&self) -> Option<usize> {
        self.inner.current_span_len()
    }

    fn channels(&self) -> ChannelCount {
        self.inner.channels()
    }

    fn sample_rate(&self) -> SampleRate {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        self.inner.total_duration()
    }

    fn try_seek(&mut self, pos: Duration) -> Result<(), rodio::source::SeekError> {
        self.inner.try_seek(pos)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::num::NonZero;

    fn settings(enabled: bool) -> Arc<Mutex<EqSettings>> {
        Arc::new(Mutex::new(EqSettings {
            enabled,
            preamp_db: 0.0,
            bands: EQ_FREQUENCIES
                .iter()
                .enumerate()
                .map(|(index, freq)| EqBand::peaking(index as u32 + 1, *freq))
                .collect(),
        }))
    }

    fn source(data: Vec<f32>) -> rodio::buffer::SamplesBuffer {
        rodio::buffer::SamplesBuffer::new(
            NonZero::new(2).unwrap(),
            NonZero::new(48_000).unwrap(),
            data,
        )
    }

    fn speed_source(speed: f32) -> Arc<AtomicU32> {
        Arc::new(AtomicU32::new((speed * 1000.0) as u32))
    }

    fn pitch_source(ratio: f32) -> Arc<AtomicU32> {
        Arc::new(AtomicU32::new((ratio * 1000.0) as u32))
    }

    #[test]
    fn resample_doubles_pitch_and_halves_length() {
        let rate = 48_000.0f32;
        let data: Vec<f32> = (0..48_000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / rate).sin() * 0.5)
            .collect();
        let mut source = ResampleSource::new(source(data), pitch_source(2.0));
        let out: Vec<f32> = source.by_ref().collect();
        let crossings = out
            .windows(2)
            .filter(|pair| (pair[0] >= 0.0) != (pair[1] >= 0.0))
            .count();
        let seconds = out.len() as f32 / rate;
        assert!(seconds > 0.45 && seconds < 0.55, "seconds={seconds}");
        assert!(crossings > 780 && crossings < 980, "crossings={crossings}");
    }

    #[test]
    fn resample_halves_pitch_and_doubles_length() {
        let rate = 48_000.0f32;
        let data: Vec<f32> = (0..48_000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / rate).sin() * 0.5)
            .collect();
        let mut source = ResampleSource::new(source(data), pitch_source(0.5));
        let out: Vec<f32> = source.by_ref().collect();
        let crossings = out
            .windows(2)
            .filter(|pair| (pair[0] >= 0.0) != (pair[1] >= 0.0))
            .count();
        let seconds = out.len() as f32 / rate;
        assert!(seconds > 1.9 && seconds < 2.1, "seconds={seconds}");
        assert!(crossings > 780 && crossings < 980, "crossings={crossings}");
    }

    #[test]
    fn tempo_source_keeps_pitch_at_double_speed() {
        let rate = 48_000.0f32;
        let data: Vec<f32> = (0..48_000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / rate).sin() * 0.5)
            .collect();
        let mut source = TempoSource::new(source(data), speed_source(2.0));
        let out: Vec<f32> = source.by_ref().collect();
        let crossings = out
            .windows(2)
            .filter(|pair| (pair[0] >= 0.0) != (pair[1] >= 0.0))
            .count();
        // 440 Hz ?? 0.5 ??????? ??? ???????? 440 ????????? ????? ????
        assert!(crossings > 360 && crossings < 520, "crossings={crossings}");
    }

    #[test]
    fn tempo_source_keeps_length_at_normal_speed() {
        let data = vec![0.1f32; 48_000];
        let mut source = TempoSource::new(source(data), speed_source(1.0));
        let out: Vec<f32> = source.by_ref().collect();
        let seconds = out.len() as f32 / 48_000.0;
        assert!(seconds > 0.95 && seconds < 1.1, "seconds={seconds}");
    }

    #[test]
    fn tempo_source_halves_length_at_double_speed() {
        let data = vec![0.1f32; 48_000];
        let mut source = TempoSource::new(source(data), speed_source(2.0));
        let out: Vec<f32> = source.by_ref().collect();
        let seconds = out.len() as f32 / 48_000.0;
        assert!(seconds > 0.4 && seconds < 0.6, "seconds={seconds}");
    }

    #[test]
    fn eq_disabled_keeps_samples() {
        let data = vec![0.1, -0.2, 0.3, -0.4, 0.5, -0.6];
        let mut eq = EqSource::new(source(data.clone()), settings(false));
        let out: Vec<f32> = eq.by_ref().collect();
        assert_eq!(out, data);
    }

    #[test]
    fn eq_settings_deserialize_from_frontend() {
        let value = serde_json::json!({
            "enabled": true,
            "preampDb": -3.0,
            "bands": [{
                "id": 1,
                "enabled": true,
                "kind": "peaking",
                "freq": 1000.0,
                "gainDb": 4.5,
                "q": 1.414
            }]
        });
        let settings: EqSettings = serde_json::from_value(value).unwrap();
        assert!(settings.enabled);
        assert_eq!(settings.preamp_db, -3.0);
        assert_eq!(settings.bands[0].gain_db, 4.5);
    }

    #[test]
    fn eq_zero_gains_keeps_samples() {
        let data = vec![0.1, -0.2, 0.3, -0.4, 0.5, -0.6];
        let mut eq = EqSource::new(source(data.clone()), settings(true));
        let out: Vec<f32> = eq.by_ref().collect();
        for (a, b) in out.iter().zip(data.iter()) {
            assert!((a - b).abs() < 1e-6);
        }
    }

    #[test]
    fn resample_passthrough_at_normal_pitch() {
        let data = vec![0.1, -0.2, 0.3, -0.4, 0.5, -0.6];
        let mut resample = ResampleSource::new(source(data.clone()), pitch_source(1.0));
        let out: Vec<f32> = resample.by_ref().collect();
        assert_eq!(out, data);
    }
}


pub struct TempoSource<S> {
    inner: S,
    speed_milli: Arc<AtomicU32>,
    channels: usize,
    grain: usize,
    hop: usize,
    input: VecDeque<f32>,
    buffer_frame: u64,
    read_frame: u64,
    end_frame: Option<u64>,
    input_ended: bool,
    accum: Vec<f32>,
    window_sum: Vec<f32>,
    out: VecDeque<f32>,
    ended: bool,
    prev_tail: Vec<f32>,
    has_prev: bool,
    tempo_cache: f32,
    tempo_counter: u32,
}

impl<S> TempoSource<S>
where
    S: Source,
{
    pub fn new(inner: S, speed_milli: Arc<AtomicU32>) -> Self {
        let channels = inner.channels().get() as usize;
        let sample_rate = inner.sample_rate().get();
        let grain = ((sample_rate as usize / 24).clamp(512, 4096) / 4) * 4;
        let hop = (grain / 4).max(1);
        Self {
            inner,
            speed_milli,
            channels: channels.max(1),
            grain,
            hop,
            input: VecDeque::new(),
            buffer_frame: 0,
            read_frame: 0,
            end_frame: None,
            input_ended: false,
            accum: vec![0.0; grain * channels.max(1)],
            window_sum: vec![0.0; grain],
            out: VecDeque::new(),
            ended: false,
            prev_tail: Vec::new(),
            has_prev: false,
            tempo_cache: 1.0,
            tempo_counter: 0,
        }
    }

    // скорость меняется редко, атомик читаем раз в 256 сэмплов
    fn tempo_cached(&mut self) -> f32 {
        if self.tempo_counter == 0 {
            self.tempo_cache =
                (self.speed_milli.load(Ordering::Relaxed) as f32 / 1000.0).clamp(0.5, 2.0);
        }
        self.tempo_counter = (self.tempo_counter + 1) & 0xff;
        self.tempo_cache
    }

    fn frames_in_buffer(&self) -> u64 {
        (self.input.len() / self.channels) as u64
    }

    fn ensure_input(&mut self, need_frame: u64) {
        while self.buffer_frame + self.frames_in_buffer() < need_frame {
            match self.inner.next() {
                Some(sample) => self.input.push_back(sample),
                None => {
                    if self.end_frame.is_none() {
                        self.end_frame = Some(self.buffer_frame + self.frames_in_buffer());
                    }
                    self.input_ended = true;
                    break;
                }
            }
        }
    }

    fn add_grain(&mut self, start_frame: u64) {
        let start_frame = start_frame.max(self.buffer_frame);
        let offset = ((start_frame - self.buffer_frame) as usize) * self.channels;
        let needed = offset + self.grain * self.channels;
        if self.input.len() < needed {
            if self.end_frame.is_none() {
                self.end_frame = Some(self.buffer_frame + self.frames_in_buffer());
            }
            self.input_ended = true;
            self.input.resize(needed, 0.0);
        }

        for frame in 0..self.grain {
            let window =
                0.5 - 0.5 * (2.0 * std::f32::consts::PI * frame as f32 / self.grain as f32).cos();
            self.window_sum[frame] += window;
            for channel in 0..self.channels {
                let index = offset + frame * self.channels + channel;
                self.accum[frame * self.channels + channel] += self.input[index] * window;
            }
        }

        let overlap = self.grain - self.hop;
        let tail_start = offset + self.hop * self.channels;
        let tail_len = overlap * self.channels;
        if self.input.len() >= tail_start + tail_len {
            self.prev_tail = self
                .input
                .iter()
                .skip(tail_start)
                .take(tail_len)
                .copied()
                .collect();
            self.has_prev = true;
        }

        let drop_frames = ((self.read_frame - self.buffer_frame) as usize).min(self.input.len() / self.channels);
        if drop_frames > 0 {
            self.input.drain(0..drop_frames * self.channels);
            self.buffer_frame += drop_frames as u64;
        }
    }

    fn best_start(&self, nominal: u64, search: u64) -> u64 {
        if !self.has_prev || search == 0 {
            return nominal;
        }
        let overlap = self.grain - self.hop;
        let tail_len = overlap * self.channels;
        if self.prev_tail.len() < tail_len {
            return nominal;
        }
        let tail_energy: f32 = self.prev_tail.iter().map(|v| v * v).sum();
        if tail_energy <= 1e-9 {
            return nominal;
        }
        let mut best = nominal;
        let mut best_score = f32::NEG_INFINITY;
        let mut candidate = nominal;
        while candidate <= nominal + search {
            let offset = ((candidate - self.buffer_frame) as usize) * self.channels;
            if offset + tail_len > self.input.len() {
                break;
            }
            let mut dot = 0.0f32;
            let mut energy = 0.0f32;
            for index in 0..tail_len {
                let value = self.input[offset + index];
                dot += value * self.prev_tail[index];
                energy += value * value;
            }
            if energy > 1e-9 {
                let score = dot / (energy.sqrt() * tail_energy.sqrt());
                if score > best_score {
                    best_score = score;
                    best = candidate;
                }
            }
            candidate += 2;
        }
        best
    }

    fn generate(&mut self) {
        let speed = (self.speed_milli.load(Ordering::Relaxed) as f32 / 1000.0).clamp(0.5, 2.0);
        let input_hop = ((self.hop as f32 * speed).round() as u64).max(1);

        let nominal = self.read_frame;
        let search = (self.hop / 2).max(1) as u64;
        self.ensure_input(nominal + self.grain as u64 + search);
        if self.input_ended
            && self
                .end_frame
                .map(|end| nominal >= end + self.grain as u64)
                .unwrap_or(false)
        {
            self.ended = true;
            return;
        }

        let start = self.best_start(nominal, search);
        self.add_grain(start);
        self.read_frame = nominal + input_hop;

        for frame in 0..self.hop {
            let sum = self.window_sum[frame];
            for channel in 0..self.channels {
                let value = if sum > 1e-4 {
                    self.accum[frame * self.channels + channel] / sum
                } else {
                    0.0
                };
                self.out.push_back(value.clamp(-1.0, 1.0));
            }
        }

        self.accum.copy_within(self.hop * self.channels.., 0);
        let tail = self.accum.len() - self.hop * self.channels;
        self.accum[tail..].fill(0.0);

        self.window_sum.copy_within(self.hop.., 0);
        let win_tail = self.window_sum.len() - self.hop;
        self.window_sum[win_tail..].fill(0.0);

        if self.input_ended
            && self
                .end_frame
                .map(|end| self.read_frame >= end + self.grain as u64)
                .unwrap_or(false)
        {
            self.ended = true;
        }
    }
}

impl<S> Iterator for TempoSource<S>
where
    S: Source,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        let tempo = self.tempo_cached();
        if (tempo - 1.0).abs() < 0.001 {
            if let Some(sample) = self.out.pop_front() {
                return Some(sample);
            }
            return self.inner.next().map(|sample| sample.clamp(-1.0, 1.0));
        }

        if self.out.is_empty() && !self.ended {
            self.generate();
        }
        if let Some(sample) = self.out.pop_front() {
            return Some(sample);
        }
        None
    }
}

impl<S> Source for TempoSource<S>
where
    S: Source,
{
    fn current_span_len(&self) -> Option<usize> {
        Some(self.hop * self.channels)
    }

    fn channels(&self) -> ChannelCount {
        self.inner.channels()
    }

    fn sample_rate(&self) -> SampleRate {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        let speed = (self.speed_milli.load(Ordering::Relaxed) as f32 / 1000.0).clamp(0.5, 2.0);
        self.inner
            .total_duration()
            .map(|duration| Duration::from_secs_f64(duration.as_secs_f64() / speed as f64))
    }

    fn try_seek(&mut self, pos: Duration) -> Result<(), rodio::source::SeekError> {
        self.inner.try_seek(pos)?;
        self.input.clear();
        self.accum.fill(0.0);
        self.window_sum.fill(0.0);
        self.out.clear();
        self.buffer_frame = 0;
        self.read_frame = 0;
        self.end_frame = None;
        self.input_ended = false;
        self.ended = false;
        self.tempo_counter = 0;
        Ok(())
    }
}


pub struct ResampleSource<S> {
    inner: S,
    pitch_milli: Arc<AtomicU32>,
    channels: usize,
    // фиксированные буферы: кадр не аллоцируется на каждую итерацию
    prev: Vec<f32>,
    next: Vec<f32>,
    scratch: Vec<f32>,
    frac: f64,
    channel: usize,
    initialized: bool,
    ended: bool,
    ratio_cache: f64,
    ratio_counter: u32,
}

impl<S> ResampleSource<S>
where
    S: Source,
{
    pub fn new(inner: S, pitch_milli: Arc<AtomicU32>) -> Self {
        let channels = (inner.channels().get() as usize).max(1);
        Self {
            inner,
            pitch_milli,
            channels,
            prev: vec![0.0; channels],
            next: vec![0.0; channels],
            scratch: vec![0.0; channels],
            frac: 0.0,
            channel: 0,
            initialized: false,
            ended: false,
            ratio_cache: 1.0,
            ratio_counter: 0,
        }
    }

    fn ratio(&self) -> f64 {
        (self.pitch_milli.load(Ordering::Relaxed) as f64 / 1000.0).clamp(0.25, 4.0)
    }

    // атомик читаем раз в 256 сэмплов, а не на каждый
    fn ratio_cached(&mut self) -> f64 {
        if self.ratio_counter == 0 {
            self.ratio_cache = self.ratio();
        }
        self.ratio_counter = (self.ratio_counter + 1) & 0xff;
        self.ratio_cache
    }

    fn read_frame(&mut self) -> bool {
        for index in 0..self.channels {
            match self.inner.next() {
                Some(sample) => self.scratch[index] = sample,
                None => return false,
            }
        }
        true
    }

    fn init(&mut self) -> bool {
        if self.initialized {
            return true;
        }
        if !self.read_frame() {
            self.ended = true;
            return false;
        }
        self.prev.copy_from_slice(&self.scratch);
        if !self.read_frame() {
            self.next.copy_from_slice(&self.prev);
            self.ended = true;
            self.initialized = true;
            return true;
        }
        self.next.copy_from_slice(&self.scratch);
        self.initialized = true;
        true
    }

    fn reset_interp(&mut self) {
        self.frac = 0.0;
        self.channel = 0;
        self.initialized = false;
    }
}

impl<S> Iterator for ResampleSource<S>
where
    S: Source,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.ended {
            return None;
        }

        let ratio = self.ratio_cached();
        // 1 к 1 не требует интерполяции
        if (ratio - 1.0).abs() < 0.001 {
            if self.initialized {
                self.reset_interp();
            }
            return self.inner.next();
        }

        if !self.init() {
            return None;
        }

        let channel = self.channel.min(self.channels.saturating_sub(1));
        let frac = self.frac as f32;
        let sample = self.prev[channel] * (1.0 - frac) + self.next[channel] * frac;

        self.channel += 1;
        if self.channel >= self.channels {
            self.channel = 0;
            self.frac += ratio;
            while self.frac >= 1.0 {
                self.prev.copy_from_slice(&self.next);
                if self.read_frame() {
                    self.next.copy_from_slice(&self.scratch);
                } else {
                    self.ended = true;
                    self.frac = 0.0;
                    break;
                }
                self.frac -= 1.0;
            }
        }

        Some(sample)
    }
}

impl<S> Source for ResampleSource<S>
where
    S: Source,
{
    fn current_span_len(&self) -> Option<usize> {
        Some(self.channels)
    }

    fn channels(&self) -> ChannelCount {
        self.inner.channels()
    }

    fn sample_rate(&self) -> SampleRate {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        let ratio = self.ratio();
        self.inner
            .total_duration()
            .map(|duration| Duration::from_secs_f64(duration.as_secs_f64() / ratio))
    }

    fn try_seek(&mut self, pos: Duration) -> Result<(), rodio::source::SeekError> {
        self.inner.try_seek(pos)?;
        self.prev.fill(0.0);
        self.next.fill(0.0);
        self.scratch.fill(0.0);
        self.frac = 0.0;
        self.channel = 0;
        self.initialized = false;
        self.ended = false;
        self.ratio_counter = 0;
        Ok(())
    }
}
