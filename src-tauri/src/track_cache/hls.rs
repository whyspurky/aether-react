use bytes::{Bytes, BytesMut};
use futures::StreamExt;
use url::Url;
use reqwest::Client;

const HLS_PREFETCH_SEGMENTS: usize = 3;

pub async fn download_progressive(
    client: &Client,
    url: &str,
    progress: &(dyn Fn(f64) + Send + Sync),
) -> Result<Bytes, String> {
    let resp = send_ok(client, url).await?;
    let total = resp.content_length().unwrap_or(0);
    let mut buf = BytesMut::with_capacity(total as usize);
    let mut body = resp.bytes_stream();
    while let Some(chunk) = body.next().await {
        buf.extend_from_slice(&chunk.map_err(|e| format!("body: {e}"))?);
        if total > 0 {
            progress(buf.len() as f64 / total as f64);
        }
    }
    if buf.is_empty() {
        return Err("progressive download returned empty body".into());
    }
    // оборванное соединение без этой проверки навсегда оседает в кэше как целый трек
    if total > 0 && buf.len() as u64 != total {
        return Err(format!("progressive download обрезан: {}/{total}", buf.len()));
    }
    Ok(buf.freeze())
}

pub async fn download_hls_full(
    client: &Client,
    m3u8_url: &str,
    progress: &(dyn Fn(f64) + Send + Sync),
) -> Result<Bytes, String> {
    let text = fetch_text(client, m3u8_url).await?;
    if text.contains("#EXT-X-KEY") {
        return Err("encrypted hls is not supported".into());
    }
    let (init_url, segment_urls) = media_playlist(client, &text, m3u8_url).await?;

    if segment_urls.is_empty() {
        return Err("no segments found in m3u8".into());
    }

    let mut buf = BytesMut::new();

    if let Some(init) = init_url {
        let data = fetch_bytes(client, &init).await?;
        if data.windows(4).any(|w| w == b"enca") {
            return Err("encrypted hls is not supported".into());
        }
        buf.extend_from_slice(&data);
    }

    let mut inflight: Vec<tokio::task::JoinHandle<Result<Bytes, String>>> = Vec::new();
    let mut next = 0usize;
    let mut fetched = 0usize;

    let fill = |inflight: &mut Vec<tokio::task::JoinHandle<Result<Bytes, String>>>,
                next: &mut usize| {
        while *next < segment_urls.len() && inflight.len() < HLS_PREFETCH_SEGMENTS {
            let c = client.clone();
            let u = segment_urls[*next].clone();
            inflight.push(tokio::spawn(async move { fetch_bytes(&c, &u).await }));
            *next += 1;
        }
    };

    fill(&mut inflight, &mut next);

    while !inflight.is_empty() {
        let handle = inflight.remove(0);
        match handle.await {
            Ok(Ok(chunk)) => {
                buf.extend_from_slice(&chunk);
                fetched += 1;
                progress(fetched as f64 / segment_urls.len() as f64);
            }
            Ok(Err(e)) => {
                // остальные сегменты продолжают качаться, если их не остановить
                for task in inflight.drain(..) {
                    task.abort();
                }
                return Err(format!("segment download: {e}"));
            }
            Err(e) => {
                for task in inflight.drain(..) {
                    task.abort();
                }
                return Err(format!("segment task panic: {e}"));
            }
        }
        fill(&mut inflight, &mut next);
    }

    Ok(buf.freeze())
}

async fn media_playlist(
    client: &Client,
    text: &str,
    base_url: &str,
) -> Result<(Option<String>, Vec<String>), String> {
    if !text.contains("#EXT-X-STREAM-INF") {
        let (init, segments) = parse_m3u8(text, base_url);
        return Ok((init, segments));
    }

    let Some(variant) = best_variant(text, base_url) else {
        return Err("master playlist without variants".into());
    };
    let media = fetch_text(client, &variant).await?;
    if media.contains("#EXT-X-KEY") {
        return Err("encrypted hls is not supported".into());
    }
    let (init, segments) = parse_m3u8(&media, &variant);
    Ok((init, segments))
}

async fn fetch_text(client: &Client, url: &str) -> Result<String, String> {
    let resp = send_ok(client, url).await?;
    resp.text().await.map_err(|e| format!("body: {e}"))
}

async fn fetch_bytes(client: &Client, url: &str) -> Result<Bytes, String> {
    let resp = send_ok(client, url).await?;
    resp.bytes().await.map_err(|e| format!("body: {e}"))
}

async fn send_ok(client: &Client, url: &str) -> Result<reqwest::Response, String> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("request: {e}"))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("HTTP {status}"));
    }
    Ok(resp)
}

fn best_variant(playlist: &str, base: &str) -> Option<String> {
    let mut best: Option<(u64, String)> = None;
    let mut pending_bw: Option<u64> = None;

    for line in playlist.lines().map(str::trim) {
        if let Some(rest) = line.strip_prefix("#EXT-X-STREAM-INF:") {
            let bw = rest
                .split(',')
                .find_map(|p| p.trim().strip_prefix("BANDWIDTH="))
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(0);
            pending_bw = Some(bw);
        } else if !line.is_empty() && !line.starts_with('#') {
            let url = resolve_url(line, base);
            let bw = pending_bw.take().unwrap_or(0);
            if best.as_ref().is_none_or(|(b, _)| bw > *b) {
                best = Some((bw, url));
            }
        }
    }

    best.map(|(_, u)| u)
}

fn parse_m3u8(content: &str, base_url: &str) -> (Option<String>, Vec<String>) {
    let base = Url::parse(base_url).unwrap_or_else(|_| Url::parse("https://localhost").unwrap());
    let mut init_url = None;
    let mut segments = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if let Some(start) = line.find("#EXT-X-MAP:URI=\"") {
            let rest = &line[start + 16..];
            if let Some(end) = rest.find('"') {
                init_url = Some(resolve_url(&rest[..end], base.as_str()));
            }
            continue;
        }
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        segments.push(resolve_url(line, base.as_str()));
    }

    (init_url, segments)
}

fn resolve_url(url: &str, base: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        return url.to_string();
    }
    Url::parse(base)
        .and_then(|b| b.join(url))
        .map(|u| u.to_string())
        .unwrap_or_else(|_| url.to_string())
}
