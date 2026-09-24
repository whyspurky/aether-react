use std::time::Duration;
use serde_json::Value;

use super::ApiError;
use super::client::{fetch_retry, fetch_json_retry};
use super::CLIENT_ID;
use super::BASE_URL;
use super::hls::download_hls;

fn with_auth(url: &str, auth: &str) -> String {
    let mut u = if url.contains("client_id=") {
        url.to_string()
    } else {
        let sep = if url.contains('?') { '&' } else { '?' };
        format!("{}{}client_id={}", url, sep, CLIENT_ID)
    };
    if !auth.is_empty() && !u.contains("track_authorization=") {
        u.push_str("&track_authorization=");
        u.push_str(&urlencoding::encode(auth));
    }
    u
}

async fn get_track(track_id: &str) -> Result<Value, ApiError> {
    let url = format!("{}/tracks/{}?client_id={}", BASE_URL, track_id, CLIENT_ID);
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

async fn resolve_stream(data: &Value) -> Result<String, ApiError> {
    let media = data.get("media").ok_or_else(|| ApiError::Other("трек недоступен".into()))?;
    let transcodings = media.get("transcodings")
        .and_then(|t| t.as_array())
        .ok_or_else(|| ApiError::Other("нет форматов".into()))?;

    let auth = data.get("track_authorization").and_then(|t| t.as_str()).unwrap_or("");

    let mut progressive: Vec<&Value> = vec![];
    let mut hls_aac_160: Vec<&Value> = vec![];
    let mut hls_aac_other: Vec<&Value> = vec![];
    let mut hls_mp3: Vec<&Value> = vec![];

    for t in transcodings {
        let f = t.get("format");
        let p = f.and_then(|f| f.get("protocol")).and_then(|p| p.as_str()).unwrap_or("");
        let m = f.and_then(|f| f.get("mime_type")).and_then(|m| m.as_str()).unwrap_or("");
        let preset = t.get("preset").and_then(|v| v.as_str()).unwrap_or("");

        if p == "progressive" && (m.starts_with("audio/mpeg") || m.starts_with("audio/mp4")) {
            progressive.push(t);
        } else if p == "hls" || p.contains("encrypted-hls") {
            if m.starts_with("audio/mp4") {
                if preset == "aac_160k" {
                    hls_aac_160.push(t);
                } else {
                    hls_aac_other.push(t);
                }
            } else if m.starts_with("audio/mpeg") {
                hls_mp3.push(t);
            }
        }
    }

    for t in &progressive {
        if let Some(url) = resolve_progressive_variant(t, auth).await {
            println!("[stream] выбран: progressive MP3 (стабильный)");
            return Ok(url);
        }
    }

    for t in hls_aac_160 {
        if let Some(url) = resolve_hls_variant(t, auth).await {
            println!("[stream] выбран: AAC 160 kbps (HLS)");
            return Ok(url);
        }
    }

    for t in hls_aac_other {
        if let Some(url) = resolve_hls_variant(t, auth).await {
            let preset = t.get("preset").and_then(|v| v.as_str()).unwrap_or("?");
            println!("[stream] выбран: AAC {} (HLS)", preset);
            return Ok(url);
        }
    }

    for t in hls_mp3 {
        if let Some(url) = resolve_hls_variant(t, auth).await {
            println!("[stream] выбран: MP3 (HLS)");
            return Ok(url);
        }
    }

    for t in progressive {
        if let Some(url) = resolve_progressive_variant(t, auth).await {
            println!("[stream] выбран: progressive (fallback)");
            return Ok(url);
        }
    }

    Err(ApiError::Other("нет форматов для трека".into()))
}

#[tauri::command]
pub async fn get_stream_url(track_id: String) -> Result<String, String> {
    let data = get_track(&track_id).await.map_err(|e| e.to_string())?;

    if let Some(first) = data.get("errors").and_then(|e| e.as_array()).and_then(|a| a.first()) {
        let msg = first.get("error_message")
            .or_else(|| first.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("неизвестная ошибка");
        return Err(format!("ск {}", msg));
    }

    resolve_stream(&data).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_hls_track(playlist_url: &str) -> Result<Vec<u8>, String> {
    download_hls(playlist_url).await.map_err(|e| e.to_string())
}