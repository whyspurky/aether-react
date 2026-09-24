use std::time::Duration;
use futures::stream::{self, StreamExt, TryStreamExt};
use url::Url;

use super::ApiError;
use super::client::http;

const MAX_HLS_BYTES: usize = 200 * 1024 * 1024;

fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max { return s; }
    let mut end = max;
    while end > 0 && !s.is_char_boundary(end) { end -= 1; }
    &s[..end]
}

pub fn is_master_playlist(text: &str) -> bool {
    text.contains("#EXT-X-STREAM-INF")
}

pub fn join_url(base: &str, line: &str) -> String {
    if line.starts_with("http://") || line.starts_with("https://") {
        return line.to_string();
    }
    match Url::parse(base).and_then(|b| b.join(line)) {
        Ok(u) => u.to_string(),
        Err(_) => format!("{}/{}", base.trim_end_matches('/'), line.trim_start_matches('/')),
    }
}

pub fn parse_segments(playlist: &str, base: &str) -> Vec<String> {
    playlist.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .map(|l| join_url(base, l))
        .collect()
}

pub fn parse_init_map(playlist: &str, base: &str) -> Option<String> {
    for line in playlist.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("#EXT-X-MAP:") {
            if let Some(start) = rest.find("URI=\"") {
                let after = &rest[start + 5..];
                if let Some(end) = after.find('"') {
                    let uri = &after[..end];
                    return Some(join_url(base, uri));
                }
            }
        }
    }
    None
}

pub fn best_variant(playlist: &str, base: &str) -> Option<String> {
    let mut best: Option<(u64, String)> = None;
    let mut pending_bw: Option<u64> = None;

    for line in playlist.lines().map(str::trim) {
        if let Some(rest) = line.strip_prefix("#EXT-X-STREAM-INF:") {
            let bw = rest.split(',')
                .find_map(|p| p.trim().strip_prefix("BANDWIDTH="))
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(0);
            pending_bw = Some(bw);
        } else if !line.is_empty() && !line.starts_with('#') {
            let url = join_url(base, line);
            let bw = pending_bw.take().unwrap_or(0);
            if best.as_ref().map_or(true, |(b, _)| bw > *b) {
                best = Some((bw, url));
            }
        }
    }

    best.map(|(_, u)| u)
}

async fn fetch_segment(url: &str, idx: usize) -> Result<bytes::Bytes, ApiError> {
    let mut delay = Duration::from_millis(300);

    for attempt in 0..3 {
        let req_fut = http().get(url).send();
        let resp = match tokio::time::timeout(Duration::from_secs(15), req_fut).await {
            Ok(Ok(r)) => r,
            Ok(Err(e)) => {
                if attempt < 2 {
                    tokio::time::sleep(delay).await;
                    delay *= 2;
                    continue;
                }
                return Err(ApiError::Network(format!("сегмент {} {}", idx, e)));
            }
            Err(_) => {
                if attempt < 2 {
                    tokio::time::sleep(delay).await;
                    delay *= 2;
                    continue;
                }
                return Err(ApiError::Network(format!("сегмент {} timeout", idx)));
            }
        };

        let status = resp.status().as_u16();
        if (status == 429 || status >= 500) && attempt < 2 {
            tokio::time::sleep(delay).await;
            delay *= 2;
            continue;
        }

        if !resp.status().is_success() {
            return Err(ApiError::Other(format!("сегмент {} http {}", idx, status)));
        }

        let ct = resp.headers().get("content-type")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");

        let ok = ct.is_empty()
            || ct.contains("video/")
            || ct.contains("audio/")
            || ct.contains("octet-stream")
            || ct.contains("application/binary");

        if !ok {
            return Err(ApiError::Other(format!("сегмент {} не аудио: {}", idx, ct)));
        }

        let bytes_fut = resp.bytes();
        return match tokio::time::timeout(Duration::from_secs(15), bytes_fut).await {
            Ok(Ok(b)) => Ok(b),
            Ok(Err(e)) => Err(ApiError::Network(format!("сегмент {} {}", idx, e))),
            Err(_) => Err(ApiError::Network(format!("сегмент {} read timeout", idx))),
        };
    }

    Err(ApiError::Other(format!("сегмент {} не скачался", idx)))
}

pub async fn download_hls(playlist_url: &str) -> Result<Vec<u8>, ApiError> {
    let mut url = playlist_url.to_string();
    let mut depth = 0;
    let playlist = loop {
        if depth > 5 {
            return Err(ApiError::Other("master слишком глубоко".into()));
        }

        let resp = http().get(&url).send().await
            .map_err(|e| ApiError::Network(e.to_string()))?;

        match resp.status().as_u16() {
            404 => return Err(ApiError::NotFound),
            429 => return Err(ApiError::RateLimited),
            s if s >= 500 => return Err(ApiError::Server(s)),
            s if s >= 400 => return Err(ApiError::Other(format!("плейлист http {}", s))),
            _ => {}
        }

        let text = resp.text().await
            .map_err(|e| ApiError::Network(e.to_string()))?;

        if !text.starts_with("#EXTM3U") && !text.trim_start().starts_with("#EXTM3U") {
            let preview = truncate(&text, 100);
            return Err(ApiError::Other(format!("не hls плейлист: {}", preview)));
        }

        if is_master_playlist(&text) {
            let base = url.rsplit_once('/').map(|(b, _)| b).unwrap_or("");
            url = best_variant(&text, base)
                .ok_or_else(|| ApiError::Other("master без вариантов".into()))?;
            depth += 1;
            continue;
        }
        break text;
    };

    let base = url.rsplit_once('/').map(|(b, _)| b).unwrap_or("");
    let segments = parse_segments(&playlist, base);

    if segments.is_empty() {
        return Err(ApiError::Other("нет сегментов в hls".into()));
    }

    let init_url = parse_init_map(&playlist, base);
    if let Some(ref u) = init_url {
        println!("[hls] найден init segment: {}", u);
    } else {
        println!("[hls] init segment не найден");
    }

    let estimate = (segments.len() * 32 * 1024).min(MAX_HLS_BYTES);
    let mut buf = Vec::with_capacity(estimate);

    if let Some(u) = init_url {
        match http().get(&u).send().await {
            Ok(resp) if resp.status().is_success() => {
                match resp.bytes().await {
                    Ok(b) => {
                        println!("[hls] init получен {} байт", b.len());
                        buf.extend_from_slice(&b);
                    }
                    Err(e) => println!("[hls] init bytes error: {}", e),
                }
            }
            Ok(resp) => println!("[hls] init http {}", resp.status()),
            Err(e) => println!("[hls] init network error: {}", e),
        }
    }

    let mut stream = stream::iter(segments.into_iter().enumerate())
        .map(|(i, u)| async move { fetch_segment(&u, i).await })
        .buffered(6);

    while let Some(chunk) = stream.try_next().await? {
        if buf.len() + chunk.len() > MAX_HLS_BYTES {
            return Err(ApiError::Other(format!("hls превысил {} байт", MAX_HLS_BYTES)));
        }
        buf.extend_from_slice(&chunk);
    }

    Ok(buf)
}