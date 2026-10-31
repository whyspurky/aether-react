// измерение громкости по ITU-R BS.1770-4: K-weighting, гейтинг 400 мс блоками
// и true peak через 4x oversampling

use serde::{Deserialize, Serialize};

// версия схемы: если меняем формулы, старые замеры в sidecar пересчитываются
pub const LOUDNESS_VERSION: u8 = 1;

pub const DEFAULT_TARGET_LUFS: f32 = -14.0;
pub const TRUE_PEAK_CEILING_DBTP: f32 = -2.0;
pub const MAX_GAIN_DB: f32 = 12.0;
pub const MIN_TARGET_LUFS: f32 = -18.0;
pub const MAX_TARGET_LUFS: f32 = -9.0;

// 400 мс окно из блоков по 100 мс
const STEP_MS: usize = 100;
const WINDOW_BLOCKS: usize = 4;
const ABS_GATE_LUFS: f64 = -70.0;
// относительный гейт: на 10 LU ниже незагейченного среднего
const REL_GATE_LU: f64 = 10.0;
// поправка из стандарта
const LUFS_OFFSET: f64 = -0.691;

// true peak: 4x oversampling, полифазный windowed-sinc
const TP_OVERSAMPLE: usize = 4;
const TP_TAPS: usize = 17;
// блок с пиком ниже этого значения не может упереться в потолок даже с максимальным бустом
const TP_CANDIDATE_DB: f32 = TRUE_PEAK_CEILING_DBTP - MAX_GAIN_DB - 1.5;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Loudness {
    pub lufs: f32,
    pub true_peak_dbtp: f32,
    #[serde(default)]
    pub version: u8,
}

impl Loudness {
    pub fn gain_db(&self, target_lufs: f32, ceiling_dbtp: f32) -> f32 {
        gain_db(self.lufs, self.true_peak_dbtp, target_lufs, ceiling_dbtp)
    }
}

// усиление по громкости, но не выше потолка true peak
pub fn gain_db(lufs: f32, true_peak_dbtp: f32, target_lufs: f32, ceiling_dbtp: f32) -> f32 {
    if !lufs.is_finite() || !true_peak_dbtp.is_finite() {
        return 0.0;
    }
    let loudness_gain = target_lufs - lufs;
    let peak_gain = ceiling_dbtp - true_peak_dbtp;
    loudness_gain.min(peak_gain).clamp(-MAX_GAIN_DB, MAX_GAIN_DB)
}

pub fn db_to_milli(db: f32) -> u32 {
    let gain = 10f32.powf(db.clamp(-60.0, 24.0) / 20.0);
    (gain * 1000.0).round().clamp(0.0, u32::MAX as f32) as u32
}

#[derive(Clone, Copy, Default)]
struct BiquadState {
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadState {
    fn process(&mut self, coeffs: &Biquad, x: f32) -> f32 {
        let y = coeffs.b[0] * x + coeffs.b[1] * self.x1 + coeffs.b[2] * self.x2
            - coeffs.a[1] * self.y1
            - coeffs.a[2] * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

#[derive(Clone, Copy)]
struct Biquad {
    b: [f32; 3],
    a: [f32; 3],
}

// коэффициенты K-weighting по формулам из BS.1770 (на 48 кГц совпадают с табличными)
fn k_weighting(sample_rate: f32) -> (Biquad, Biquad) {
    let fs = sample_rate.max(8000.0) as f64;

    // ступень 1: high shelf, 1681 Гц, +4 дБ
    let f0 = 1681.974450955533;
    let gain_db = 3.999843853973347;
    let q = 0.7071752369554196;
    let k = (std::f64::consts::PI * f0 / fs).tan();
    let vh = 10f64.powf(gain_db / 20.0);
    let vb = vh.powf(0.4996667741545416);
    let a0 = 1.0 + k / q + k * k;
    let shelf = Biquad {
        b: [
            ((vh + vb * k / q + k * k) / a0) as f32,
            (2.0 * (k * k - vh) / a0) as f32,
            ((vh - vb * k / q + k * k) / a0) as f32,
        ],
        a: [
            1.0,
            (2.0 * (k * k - 1.0) / a0) as f32,
            ((1.0 - k / q + k * k) / a0) as f32,
        ],
    };

    // ступень 2: RLB high-pass, 38 Гц
    let f0 = 38.13547087602444;
    let q = 0.5003270373238773;
    let k = (std::f64::consts::PI * f0 / fs).tan();
    let a0 = 1.0 + k / q + k * k;
    let highpass = Biquad {
        b: [1.0, -2.0, 1.0],
        a: [
            1.0,
            (2.0 * (k * k - 1.0) / a0) as f32,
            ((1.0 - k / q + k * k) / a0) as f32,
        ],
    };

    (shelf, highpass)
}

struct KWeighting {
    shelf: Biquad,
    highpass: Biquad,
    states: Vec<(BiquadState, BiquadState)>,
}

impl KWeighting {
    fn new(channels: usize, sample_rate: f32) -> Self {
        let (shelf, highpass) = k_weighting(sample_rate);
        Self {
            shelf,
            highpass,
            states: vec![(BiquadState::default(), BiquadState::default()); channels],
        }
    }

    fn process(&mut self, channel: usize, sample: f32) -> f32 {
        let (shelf, highpass) = &mut self.states[channel];
        let y = shelf.process(&self.shelf, sample);
        highpass.process(&self.highpass, y)
    }
}

// потоковый 4x oversampling: считаем максимум между сэмплами
struct TruePeak {
    phases: Vec<Vec<f32>>,
    // хвост прошлого блока, чтобы окно фильтра было непрерывным
    tails: Vec<Vec<f32>>,
    // буфер блока с хвостом, переиспользуется чтобы не аллоцировать
    scratch: Vec<Vec<f32>>,
    // сколько сэмплов уже прошло: до заполнения окна интерполяция врет на краю
    fed: Vec<usize>,
    peak: f32,
}

impl TruePeak {
    fn new(channels: usize) -> Self {
        Self {
            phases: build_phases(),
            tails: vec![vec![0.0; TP_TAPS]; channels],
            scratch: vec![Vec::with_capacity(TP_TAPS + 4096); channels],
            fed: vec![0; channels],
            peak: 0.0,
        }
    }

    // интерполяция только там, где пик блока близко к потолку
    fn feed_block(&mut self, channel: usize, samples: &[f32], interpolate: bool) {
        let fed = self.fed[channel];
        self.fed[channel] = fed.saturating_add(samples.len());

        let mut peak = self.peak;
        for &sample in samples {
            let value = sample.abs();
            if value > peak {
                peak = value;
            }
        }

        if interpolate {
            let mut buffer = std::mem::take(&mut self.scratch[channel]);
            buffer.clear();
            buffer.extend_from_slice(&self.tails[channel]);
            buffer.extend_from_slice(samples);

            // окно фильтра должно целиком лежать в реальных сэмплах
            let skip = TP_TAPS.saturating_sub(fed);
            let start = TP_TAPS + skip;
            let [p0, p1, p2, p3] = &self.phases[..4] else {
                unreachable!()
            };
            for position in start..buffer.len() {
                let mut a0 = 0.0f32;
                let mut a1 = 0.0f32;
                let mut a2 = 0.0f32;
                let mut a3 = 0.0f32;
                // четыре фазы за один проход: одна загрузка сэмпла на четыре умножения
                for k in 0..TP_TAPS {
                    let value = buffer[position - k];
                    a0 += p0[k] * value;
                    a1 += p1[k] * value;
                    a2 += p2[k] * value;
                    a3 += p3[k] * value;
                }
                for value in [a0, a1, a2, a3] {
                    let magnitude = value.abs();
                    if magnitude > peak {
                        peak = magnitude;
                    }
                }
            }
            self.scratch[channel] = buffer;
        }

        self.peak = peak;
        if samples.len() >= TP_TAPS {
            let tail = &mut self.tails[channel];
            tail.copy_from_slice(&samples[samples.len() - TP_TAPS..]);
        } else {
            let tail = &mut self.tails[channel];
            tail.rotate_left(samples.len());
            tail[TP_TAPS - samples.len()..].copy_from_slice(samples);
        }
    }

    fn dbtp(&self) -> f32 {
        20.0 * self.peak.max(1e-7).log10()
    }
}

fn sinc(x: f32) -> f32 {
    if x.abs() < 1e-6 {
        1.0
    } else {
        let px = std::f32::consts::PI * x;
        px.sin() / px
    }
}

fn build_phases() -> Vec<Vec<f32>> {
    let center = (TP_TAPS - 1) as f32 / 2.0;
    let mut phases = Vec::with_capacity(TP_OVERSAMPLE);
    for phase in 0..TP_OVERSAMPLE {
        let offset = phase as f32 / TP_OVERSAMPLE as f32;
        let mut taps = Vec::with_capacity(TP_TAPS);
        let mut sum = 0.0f32;
        for tap in 0..TP_TAPS {
            let x = tap as f32 - center + offset;
            let n = tap as f32;
            let window = 0.42
                - 0.5 * (2.0 * std::f32::consts::PI * n / (TP_TAPS - 1) as f32).cos()
                + 0.08 * (4.0 * std::f32::consts::PI * n / (TP_TAPS - 1) as f32).cos();
            let value = sinc(x) * window;
            taps.push(value);
            sum += value;
        }
        let _ = sum;
        phases.push(taps);
    }
    phases
}

// samples это чередование каналов, как отдаёт декодер
pub fn analyze<I: Iterator<Item = f32>>(
    samples: I,
    channels: usize,
    sample_rate: u32,
) -> Option<Loudness> {
    let channels = channels.clamp(1, 8);
    if sample_rate < 8000 {
        return None;
    }

    let block_frames = (sample_rate as usize * STEP_MS / 1000).max(1);
    let candidate_gain = 10f32.powf(TP_CANDIDATE_DB / 20.0);

    let mut k_weighting = KWeighting::new(channels, sample_rate as f32);
    let mut true_peak = TruePeak::new(channels);

    let mut sums = vec![0f64; channels];
    let mut block_samples: Vec<Vec<f32>> = vec![Vec::with_capacity(block_frames); channels];
    let mut frames_in_block = 0usize;
    let mut block_peak = 0.0f32;

    let mut ring = vec![0f64; WINDOW_BLOCKS];
    let mut ring_filled = 0usize;
    let mut block_energies: Vec<f64> = Vec::new();

    let mut frame_channel = 0usize;
    for sample in samples {
        if !sample.is_finite() {
            continue;
        }
        let value = k_weighting.process(frame_channel, sample);
        sums[frame_channel] += (value as f64) * (value as f64);
        block_samples[frame_channel].push(sample);
        block_peak = block_peak.max(sample.abs());

        frame_channel += 1;
        if frame_channel < channels {
            continue;
        }
        frame_channel = 0;
        frames_in_block += 1;

        if frames_in_block < block_frames {
            continue;
        }

        // закрываем блок 100 мс
        let interpolate = block_peak >= candidate_gain;
        for (channel, samples) in block_samples.iter().enumerate() {
            true_peak.feed_block(channel, samples, interpolate);
        }

        let mean = sums.iter().map(|s| s / frames_in_block as f64).sum::<f64>();
        ring[ring_filled % WINDOW_BLOCKS] = mean;
        ring_filled += 1;
        if ring_filled >= WINDOW_BLOCKS {
            let energy = ring.iter().sum::<f64>() / WINDOW_BLOCKS as f64;
            block_energies.push(energy);
        }

        for slot in sums.iter_mut() {
            *slot = 0.0;
        }
        for buffer in block_samples.iter_mut() {
            buffer.clear();
        }
        block_peak = 0.0;
        frames_in_block = 0;
    }

    if block_energies.is_empty() {
        return None;
    }

    // гейтинг: абсолютный -70 LUFS, затем относительный -10 LU от незагейченного среднего
    let loudness_of = |energy: f64| LUFS_OFFSET + 10.0 * energy.max(1e-12).log10();
    let above_abs: Vec<f64> = block_energies
        .iter()
        .copied()
        .filter(|energy| loudness_of(*energy) > ABS_GATE_LUFS)
        .collect();
    if above_abs.is_empty() {
        return None;
    }
    let abs_mean = above_abs.iter().sum::<f64>() / above_abs.len() as f64;
    let relative_gate = loudness_of(abs_mean) - REL_GATE_LU;
    let gated: Vec<f64> = above_abs
        .into_iter()
        .filter(|energy| loudness_of(*energy) > relative_gate)
        .collect();
    if gated.is_empty() {
        return None;
    }
    let gated_mean = gated.iter().sum::<f64>() / gated.len() as f64;
    let lufs = loudness_of(gated_mean) as f32;

    Some(Loudness {
        lufs,
        true_peak_dbtp: true_peak.dbtp(),
        version: LOUDNESS_VERSION,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: u32 = 48_000;

    fn sine(amplitude: f32, frequency: f32, seconds: f32, channels: usize) -> Vec<f32> {
        let frames = (SR as f32 * seconds) as usize;
        let mut out = Vec::with_capacity(frames * channels);
        for frame in 0..frames {
            let phase = 2.0 * std::f32::consts::PI * frequency * frame as f32 / SR as f32;
            let value = amplitude * phase.sin();
            for _ in 0..channels {
                out.push(value);
            }
        }
        out
    }

    #[test]
    fn stereo_sine_reads_its_lufs() {
        // 997 гц, -23 dBFS на канал, стерео: эталон BS.1770 дает -23 LUFS
        let amplitude = 10f32.powf(-23.0 / 20.0);
        let samples = sine(amplitude, 997.0, 8.0, 2);
        let measured = analyze(samples.into_iter(), 2, SR).expect("measure");
        assert!(
            (measured.lufs + 23.0).abs() < 0.15,
            "lufs={}",
            measured.lufs
        );
    }

    #[test]
    fn mono_sine_reads_three_lu_lower() {
        // моно на -23 dBFS это -26 LUFS по сумме каналов
        let amplitude = 10f32.powf(-23.0 / 20.0);
        let samples = sine(amplitude, 997.0, 8.0, 1);
        let measured = analyze(samples.into_iter(), 1, SR).expect("measure");
        assert!(
            (measured.lufs + 26.0).abs() < 0.15,
            "lufs={}",
            measured.lufs
        );
    }

    #[test]
    fn silence_and_gaps_do_not_skew_loudness() {
        let amplitude = 10f32.powf(-23.0 / 20.0);
        let sine_part = sine(amplitude, 997.0, 20.0, 2);
        let silence: Vec<f32> = vec![0.0; SR as usize * 2 * 4];
        let mut both = silence.clone();
        both.extend(sine_part.iter().copied());
        both.extend(silence);
        let measured = analyze(both.into_iter(), 2, SR).expect("measure");
        let reference = analyze(sine_part.into_iter(), 2, SR).expect("measure");
        assert!(
            (measured.lufs - reference.lufs).abs() < 0.1,
            "{} vs {}",
            measured.lufs,
            reference.lufs
        );
    }

    #[test]
    fn short_signal_has_no_loudness() {
        let samples = sine(0.1, 997.0, 0.2, 2);
        assert!(analyze(samples.into_iter(), 2, SR).is_none());
    }

    #[test]
    fn true_peak_sees_inter_sample_peaks() {
        // косинус fs/4 со сдвигом 45 градусов: сэмплы по 0.707, реальный пик 1.0
        let mut samples = Vec::new();
        for frame in 0..SR as usize {
            let phase = std::f32::consts::FRAC_PI_2 * frame as f32 + std::f32::consts::FRAC_PI_4;
            let value = phase.cos();
            samples.push(value);
            samples.push(value);
        }
        let measured = analyze(samples.into_iter(), 2, SR).expect("measure");
        assert!(
            measured.true_peak_dbtp.abs() < 0.2,
            "dbtp={}",
            measured.true_peak_dbtp
        );
    }

    #[test]
    fn true_peak_of_plain_sine_matches_sample_peak() {
        let samples = sine(0.5, 1000.0, 2.0, 2);
        let measured = analyze(samples.into_iter(), 2, SR).expect("measure");
        let expected = 20.0 * 0.5f32.log10();
        assert!(
            (measured.true_peak_dbtp - expected).abs() < 0.2,
            "dbtp={} expected={}",
            measured.true_peak_dbtp,
            expected
        );
    }

    #[test]
    fn loudness_gain_respects_peak_ceiling() {
        // громкий по lufs, но пик уже у потолка: усиления быть не должно
        let gain = gain_db(-20.0, -2.0, -14.0, -2.0);
        assert!((gain - 0.0).abs() < 1e-6, "gain={gain}");

        // обычный трек: усиление по громкости
        let gain = gain_db(-20.0, -12.0, -14.0, -2.0);
        assert!((gain - 6.0).abs() < 1e-6, "gain={gain}");

        // очень тихий упирается в clamp
        let gain = gain_db(-40.0, -30.0, -14.0, -2.0);
        assert!((gain - MAX_GAIN_DB).abs() < 1e-6, "gain={gain}");
    }

    #[test]
    fn milli_round_trip() {
        for db in [-12.0f32, -6.0, 0.0, 3.0, 12.0] {
            let milli = db_to_milli(db);
            let back = 20.0 * (milli as f32 / 1000.0).log10();
            assert!((back - db).abs() < 0.01, "{db} -> {back}");
        }
    }

    #[test]
    fn k_weighting_coefficients_match_the_standard_at_48k() {
        let (shelf, highpass) = k_weighting(48_000.0);
        assert!((shelf.b[0] - 1.5351249).abs() < 1e-5, "{:?}", shelf.b);
        assert!((shelf.b[1] + 2.6916962).abs() < 1e-5, "{:?}", shelf.b);
        assert!((shelf.b[2] - 1.1983928).abs() < 1e-5, "{:?}", shelf.b);
        assert!((shelf.a[1] + 1.6906593).abs() < 1e-5, "{:?}", shelf.a);
        assert!((shelf.a[2] - 0.7324808).abs() < 1e-5, "{:?}", shelf.a);
        assert!((highpass.a[1] + 1.9900475).abs() < 1e-5, "{:?}", highpass.a);
        assert!((highpass.a[2] - 0.9900723).abs() < 1e-5, "{:?}", highpass.a);
    }



}
