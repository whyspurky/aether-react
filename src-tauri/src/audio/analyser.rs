use std::collections::VecDeque;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use rodio::{ChannelCount, SampleRate, Source};
use tauri::{AppHandle, Emitter};

const FFT_SIZE: usize = 1024;
const BINS: usize = 64;
const MAX_SAMPLES: usize = 8192;

pub struct AnalyserBuffer {
    samples: Mutex<VecDeque<f32>>,
    sample_rate: AtomicU32,
}

impl AnalyserBuffer {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            samples: Mutex::new(VecDeque::with_capacity(MAX_SAMPLES)),
            sample_rate: AtomicU32::new(48_000),
        })
    }

    fn push(&self, sample: f32) {
        if let Ok(mut samples) = self.samples.try_lock() {
            if samples.len() >= MAX_SAMPLES {
                samples.pop_front();
            }
            samples.push_back(sample);
        }
    }

    fn set_rate(&self, rate: u32) {
        self.sample_rate.store(rate, Ordering::Relaxed);
    }

    fn snapshot(&self) -> (Vec<f32>, u32) {
        let rate = self.sample_rate.load(Ordering::Relaxed).max(1);
        let Ok(samples) = self.samples.lock() else {
            return (vec![0.0; FFT_SIZE], rate);
        };
        let start = samples.len().saturating_sub(FFT_SIZE);
        let mut out = vec![0.0; FFT_SIZE];
        for (index, sample) in samples.iter().skip(start).enumerate() {
            out[index] = *sample;
        }
        (out, rate)
    }
}

pub struct AnalyserSource<S> {
    inner: S,
    buffer: Arc<AnalyserBuffer>,
    channels: usize,
    channel: usize,
    sum: f32,
}

impl<S> AnalyserSource<S>
where
    S: Source,
{
    pub fn new(inner: S, buffer: Arc<AnalyserBuffer>) -> Self {
        let channels = inner.channels().get() as usize;
        buffer.set_rate(inner.sample_rate().get());
        Self {
            inner,
            buffer,
            channels: channels.max(1),
            channel: 0,
            sum: 0.0,
        }
    }
}

impl<S> Iterator for AnalyserSource<S>
where
    S: Source,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.inner.next()?;
        self.sum += sample;
        self.channel += 1;
        if self.channel >= self.channels {
            self.buffer.push(self.sum / self.channels as f32);
            self.channel = 0;
            self.sum = 0.0;
        }
        Some(sample)
    }
}

impl<S> Source for AnalyserSource<S>
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

fn goertzel(samples: &[f32], rate: u32, frequency: f32) -> f32 {
    let n = samples.len() as f32;
    let omega = 2.0 * std::f32::consts::PI * frequency / rate as f32;
    let coeff = 2.0 * omega.cos();
    let mut s1 = 0.0f32;
    let mut s2 = 0.0f32;
    for sample in samples {
        let s0 = *sample + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
    }
    let power = (s1 * s1 + s2 * s2 - coeff * s1 * s2).max(0.0);
    (power.sqrt() * 2.0 / n).max(0.0)
}

fn compute_bins(samples: &[f32], rate: u32) -> Vec<f32> {
    let mut windowed = vec![0.0f32; samples.len()];
    let last = (samples.len() - 1).max(1) as f32;
    for (index, sample) in samples.iter().enumerate() {
        let window = 0.5 - 0.5 * (2.0 * std::f32::consts::PI * index as f32 / last).cos();
        windowed[index] = *sample * window;
    }

    let mut bins = vec![0.0f32; BINS];
    let min_freq = 20.0f32;
    let max_freq = 20_000.0f32.min(rate as f32 * 0.45);
    for (index, bin) in bins.iter_mut().enumerate() {
        let t = index as f32 / (BINS - 1) as f32;
        let frequency = min_freq * (max_freq / min_freq).powf(t);
        let magnitude = goertzel(&windowed, rate, frequency);
        let db = 20.0 * magnitude.max(1e-7).log10();
        *bin = ((db + 60.0) / 60.0).clamp(0.0, 1.0);
    }
    bins
}

pub async fn run(app: AppHandle, buffer: Arc<AnalyserBuffer>) {
    let mut interval = tokio::time::interval(Duration::from_millis(33));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    let mut smoothed = vec![0.0f32; BINS];
    let mut level = 0.0f32;
    let mut peak = 0.0f32;

    loop {
        interval.tick().await;
        let (samples, rate) = buffer.snapshot();
        let bins = compute_bins(&samples, rate);

        let mut sum = 0.0f64;
        let mut peak_value = 0.0f32;
        for sample in &samples {
            sum += (*sample as f64) * (*sample as f64);
            peak_value = peak_value.max(sample.abs());
        }
        let rms = (sum / samples.len().max(1) as f64).sqrt() as f32;
        let to_norm = |value: f32| {
            if value <= 1e-6 {
                0.0
            } else {
                ((20.0 * value.log10() + 60.0) / 60.0).clamp(0.0, 1.0)
            }
        };
        let next_level = to_norm(rms);
        let next_peak = to_norm(peak_value);
        level = if next_level > level {
            level * 0.35 + next_level * 0.65
        } else {
            level * 0.8 + next_level * 0.2
        };
        peak = if next_peak > peak {
            next_peak
        } else {
            (peak - 0.012).max(0.0)
        };

        for (value, previous) in bins.iter().zip(smoothed.iter_mut()) {
            *previous = if *value > *previous {
                *previous * 0.35 + *value * 0.65
            } else {
                *previous * 0.82 + *value * 0.18
            };
        }
        let _ = app.emit(
            "audio:spectrum",
            serde_json::json!({
                "bins": smoothed,
                "level": level,
                "peak": peak,
            }),
        );
    }
}


#[cfg(test)]
mod tests {
    use super::compute_bins;

    #[test]
    fn sine_peak_lands_in_the_right_log_bin() {
        let rate = 48_000u32;
        let samples: Vec<f32> = (0..1024)
            .map(|index| {
                (2.0 * std::f32::consts::PI * 1000.0 * index as f32 / rate as f32).sin() * 0.8
            })
            .collect();
        let bins = compute_bins(&samples, rate);
        let peak = bins
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(index, _)| index)
            .unwrap();
        assert!(peak > 30 && peak < 45, "peak={peak}");
    }

    #[test]
    fn silence_stays_zero() {
        let bins = compute_bins(&[0.0; 1024], 48_000);
        assert!(bins.iter().all(|value| *value < 0.001));
    }
}
