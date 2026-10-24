use serde::{Deserialize, Serialize};

// порядок качества, чем больше rank тем выше требование
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioQuality {
    Best,
    High,
    Medium,
    Low,
}

impl Default for AudioQuality {
    fn default() -> Self {
        Self::Best
    }
}

impl AudioQuality {
    pub fn from_label(label: Option<&str>) -> Self {
        match label.unwrap_or("best").to_ascii_lowercase().as_str() {
            "high" => Self::High,
            "medium" => Self::Medium,
            "low" => Self::Low,
            _ => Self::Best,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Best => "best",
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
        }
    }

    // rank нужен для сравнения уже сохраненного файла с новым запросом
    pub fn rank(self) -> u8 {
        match self {
            Self::Low => 0,
            Self::Medium => 1,
            Self::High => 2,
            Self::Best => 3,
        }
    }

    // целевой битрейт для high/medium/low, best берет максимальный
    pub fn target_bitrate(self) -> Option<u32> {
        match self {
            Self::Best => None,
            Self::High => Some(160),
            Self::Medium => Some(128),
            Self::Low => Some(64),
        }
    }

    pub fn distance(self, bitrate: Option<u32>) -> u32 {
        match (self.target_bitrate(), bitrate) {
            (None, _) => 0,
            (Some(_), None) => 999,
            (Some(target), Some(actual)) => target.abs_diff(actual),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedStream {
    pub url: String,
    pub preset: String,
    pub protocol: String,
    pub bitrate: Option<u32>,
    pub quality: AudioQuality,
}

// soundcloud пишет битрейт в preset как aac_160k, aac_256k, mp3_1_0
pub fn bitrate_from_preset(preset: &str) -> Option<u32> {
    let k = preset.find('k')?;
    let digits: String = preset[..k]
        .chars()
        .rev()
        .take_while(|c| c.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::{bitrate_from_preset, AudioQuality};

    #[test]
    fn preset_bitrate_is_read_from_the_k_suffix() {
        assert_eq!(bitrate_from_preset("aac_160k"), Some(160));
        assert_eq!(bitrate_from_preset("aac_256k"), Some(256));
        assert_eq!(bitrate_from_preset("opus_0_0"), None);
        assert_eq!(bitrate_from_preset("mp3_1_0"), None);
    }

    #[test]
    fn quality_ranks_are_ordered() {
        assert!(AudioQuality::Best.rank() > AudioQuality::High.rank());
        assert!(AudioQuality::High.rank() > AudioQuality::Medium.rank());
        assert!(AudioQuality::Medium.rank() > AudioQuality::Low.rank());
    }

    #[test]
    fn quality_picks_the_nearest_bitrate() {
        assert_eq!(AudioQuality::High.distance(Some(160)), 0);
        assert!(AudioQuality::High.distance(Some(160)) < AudioQuality::High.distance(Some(256)));
        assert!(AudioQuality::Medium.distance(Some(128)) < AudioQuality::Medium.distance(Some(160)));
    }
}
