use std::time::Duration;
use serde_json::Value;

use super::quality::{bitrate_from_preset, AudioQuality, SelectedStream};
use super::ApiError;
use super::client::{fetch_retry, fetch_json_retry};
use super::{add_client_id, client_id, BASE_URL};
use super::hls::download_hls;

fn with_auth(url: &str, auth: &str) -> String {
    let mut u = add_client_id(url);
    if !auth.is_empty() && !u.contains("track_authorization=") {
        u.push_str("&track_authorization=");
        u.push_str(&urlencoding::encode(auth));
    }
    u
}

async fn get_track(track_id: &str) -> Result<Value, ApiError> {
    let url = format!("{}/tracks/{}?client_id={}", BASE_URL, track_id, client_id());
    fetch_retry(&url).await
}

async fn resolve_hls_variant(t: &Value, auth: &str) -> Option<String> {
    let u = t.get("url").and_then(|u| u.as_str())?;
    let url_with_auth = with_auth(u, auth);

    let info = tokio::time::timeout(
        Duration::from_secs(8),
        fetch_json_retry(&url_with_auth),
    ).await.ok()?.ok()?;

    let pl = info.get("url")
        .or_else(|| info.get("data").and_then(|d| d.get("url")))
        .or_else(|| info.get("urls").and_then(|a| a.get(0)).and_then(|u| u.get("url")))
        .and_then(|u| u.as_str())?;

    Some(pl.to_string())
}

async fn resolve_progressive_variant(t: &Value, auth: &str) -> Option<String> {
    let u = t.get("url").and_then(|u| u.as_str())?;
    let url_with_auth = with_auth(u, auth);

    let s = tokio::time::timeout(
        Duration::from_secs(8),
        fetch_json_retry(&url_with_auth),
    ).await.ok()?.ok()?;

    let su = s.get("url").and_then(|u| u.as_str())?;
    if su.contains(".m3u8") {
        return None;
    }
    Some(su.to_string())
}

struct Candidate {
    raw: Value,
    preset: String,
    protocol: String,
    bitrate: Option<u32>,
    encrypted: bool,
}

fn candidates(data: &Value) -> Vec<Candidate> {
    let Some(transcodings) = data
        .get("media")
        .and_then(|m| m.get("transcodings"))
        .and_then(|t| t.as_array())
    else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for t in transcodings {
        let Some(url) = t.get("url").and_then(|u| u.as_str()) else {
            continue;
        };
        let format = t.get("format");
        let protocol = format
            .and_then(|f| f.get("protocol"))
            .and_then(|p| p.as_str())
            .unwrap_or("");
        let mime = format
            .and_then(|f| f.get("mime_type"))
            .and_then(|m| m.as_str())
            .unwrap_or("");
        let preset = t.get("preset").and_then(|v| v.as_str()).unwrap_or("");
        let snipped = t.get("snipped").and_then(|v| v.as_bool()).unwrap_or(false);

        if snipped || url.contains("/preview") {
            continue;
        }
        if !mime.starts_with("audio/") {
            continue;
        }

        let encrypted = protocol.contains("encrypted");
        let is_progressive = protocol == "progressive";
        let is_hls = protocol == "hls" || protocol.starts_with("hls");
        if !is_progressive && !is_hls && !encrypted {
            continue;
        }

        out.push(Candidate {
            raw: t.clone(),
            preset: preset.to_string(),
            protocol: if is_progressive {
                "progressive".into()
            } else if encrypted {
                "encrypted-hls".into()
            } else {
                "hls".into()
            },
            bitrate: bitrate_from_preset(preset),
            encrypted,
        });
    }
    out
}

fn sort_for_quality(candidates: &mut Vec<Candidate>, quality: AudioQuality) {
    candidates.sort_by(|a, b| {
        let protocol_order = protocol_rank(a, quality).cmp(&protocol_rank(b, quality));
        match quality {
            AudioQuality::Best => b.bitrate.cmp(&a.bitrate).then(protocol_order),
            AudioQuality::Low => protocol_order.then(a.bitrate.cmp(&b.bitrate)),
            _ => quality
                .distance(a.bitrate)
                .cmp(&quality.distance(b.bitrate))
                .then(protocol_order),
        }
    });
}

fn protocol_rank(c: &Candidate, quality: AudioQuality) -> u8 {
    match (quality, c.protocol.as_str()) {
        (AudioQuality::Low, "progressive") => 0,
        (AudioQuality::Low, "hls") => 1,
        (_, "hls") => 0,
        (_, "progressive") => 1,
        _ => 2,
    }
}

async fn resolve_stream_for(
    data: &Value,
    quality: AudioQuality,
) -> Result<SelectedStream, ApiError> {
    let auth = data
        .get("track_authorization")
        .and_then(|t| t.as_str())
        .unwrap_or("");

    let mut all = candidates(data);
    if all.is_empty() {
        return Err(ApiError::Other("нет форматов для трека".into()));
    }

    let encrypted_count = all.iter().filter(|c| c.encrypted).count();
    all.retain(|c| !c.encrypted);

    if all.is_empty() {
        return Err(ApiError::Other(
            "только go+ encrypted hls, локальный decrypt пока не поддержан".into(),
        ));
    }

    sort_for_quality(&mut all, quality);
    let pool = all;

    for candidate in pool {
        let url = if candidate.protocol == "hls" {
            resolve_hls_variant(&candidate.raw, auth).await
        } else {
            resolve_progressive_variant(&candidate.raw, auth).await
        };
        let Some(url) = url else {
            continue;
        };

        println!(
            "[stream] выбран {} {} ({} kbps)",
            candidate.protocol,
            candidate.preset,
            candidate.bitrate.map_or(0, |b| b)
        );

        return Ok(SelectedStream {
            url,
            preset: candidate.preset,
            protocol: candidate.protocol,
            bitrate: candidate.bitrate,
            quality,
        });
    }

    if encrypted_count > 0 {
        return Err(ApiError::Other(
            "доступен только go+ encrypted hls, локальный decrypt пока не поддержан".into(),
        ));
    }

    Err(ApiError::Other("нет форматов для трека".into()))
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct StreamInfo {
    pub url: String,
    pub genre: Option<String>,
    pub playback_count: Option<u64>,
    pub preset: String,
    pub protocol: String,
    pub bitrate: Option<u32>,
    pub quality: AudioQuality,
}

pub async fn resolve_track_stream(
    track_id: u64,
    quality: AudioQuality,
) -> Result<StreamInfo, String> {
    let data = get_track(&track_id.to_string())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(first) = data
        .get("errors")
        .and_then(|e| e.as_array())
        .and_then(|a| a.first())
    {
        let msg = first
            .get("error_message")
            .or_else(|| first.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("неизвестная ошибка");
        return Err(format!("ск {}", msg));
    }

    let selected = resolve_stream_for(&data, quality)
        .await
        .map_err(|e| e.to_string())?;

    let genre = data
        .get("genre")
        .and_then(|g| g.as_str())
        .filter(|s| !s.is_empty())
        .map(String::from);
    let playback_count = data.get("playback_count").and_then(|p| p.as_u64());

    Ok(StreamInfo {
        url: selected.url,
        genre,
        playback_count,
        preset: selected.preset,
        protocol: selected.protocol,
        bitrate: selected.bitrate,
        quality: selected.quality,
    })
}

#[tauri::command]
pub async fn get_stream_url(
    track_id: String,
    quality: Option<String>,
) -> Result<StreamInfo, String> {
    let id = track_id
        .parse::<u64>()
        .map_err(|_| format!("неверный track id: {track_id}"))?;
    resolve_track_stream(id, AudioQuality::from_label(quality.as_deref())).await
}

#[tauri::command]
pub async fn download_hls_track(playlist_url: &str) -> Result<Vec<u8>, String> {
    download_hls(playlist_url).await.map_err(|e| e.to_string())
}
