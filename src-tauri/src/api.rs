// api.rs
use std::time::Duration;
use std::sync::{OnceLock, RwLock};
use std::collections::HashSet;
use futures::stream::{self, StreamExt, TryStreamExt};
use serde_json::{json, Value};
use url::Url;

const CLIENT_ID: &str = "Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo";
const BASE_URL: &str = "https://api-v2.soundcloud.com";
const MIN_TRACK_MS: u64 = 30_000;
const MAX_TRACK_MS: u64 = 600_000;
const MAX_HLS_BYTES: usize = 200 * 1024 * 1024;

#[derive(Debug)]
enum ApiError {
    NotFound,
    RateLimited,
    Server(u16),
    Network(String),
    Parse(String),
    Other(String),
}

impl ApiError {
    fn is_retryable(&self) -> bool {
        matches!(self, ApiError::RateLimited | ApiError::Server(_) | ApiError::Network(_))
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ApiError::NotFound => write!(f, "не найдено"),
            ApiError::RateLimited => write!(f, "429"),
            ApiError::Server(s) => write!(f, "сервер {}", s),
            ApiError::Network(e) => write!(f, "сеть {}", e),
            ApiError::Parse(e) => write!(f, "json {}", e),
            ApiError::Other(e) => write!(f, "{}", e),
        }
    }
}


#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProxyConfig {
    #[serde(rename = "type")]
    pub kind: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

static CLIENT: OnceLock<RwLock<reqwest::Client>> = OnceLock::new();
static PROXY: OnceLock<RwLock<Option<ProxyConfig>>> = OnceLock::new();

fn build_client(proxy: Option<&ProxyConfig>) -> reqwest::Client {
    let mut builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(10))
        .gzip(true)
        .pool_max_idle_per_host(20);

    if let Some(p) = proxy {
        if !p.host.is_empty() && p.port > 0 {
            let scheme = match p.kind.as_str() {
                "socks5" => "socks5h",
                "http" => "http",
                "https" => "https",
                _ => "socks5h",
            };
            let url = if p.username.is_empty() {
                format!("{}://{}:{}", scheme, p.host, p.port)
            } else {
                format!("{}://{}:{}@{}:{}", scheme, p.username, p.password, p.host, p.port)
            };
            if let Ok(proxy) = reqwest::Proxy::all(&url) {
                println!("[proxy] применяю {}", url);
                builder = builder.proxy(proxy);
            }
        }
    }

    builder.build().unwrap()
}

pub fn http() -> reqwest::Client {
    let lock = CLIENT.get_or_init(|| RwLock::new(build_client(None)));
    lock.read().unwrap().clone()
}

pub fn apply_proxy(proxy: Option<ProxyConfig>) -> Result<(), String> {
    if let Some(p) = &proxy {
        if p.host.contains(':') {
            return Err("хост не должен содержать ':' — введи порт отдельно".into());
        }
        if p.host.is_empty() {
            return Err("хост пустой".into());
        }
        if p.port == 0 {
            return Err("порт не указан".into());
        }
        if !matches!(p.kind.as_str(), "socks5" | "http" | "https") {
            return Err(format!("неизвестный тип прокси: {}", p.kind));
        }
    }

    let client = build_client(proxy.as_ref());
    let lock = CLIENT.get_or_init(|| RwLock::new(build_client(None)));
    *lock.write().unwrap() = client;

    let proxy_lock = PROXY.get_or_init(|| RwLock::new(None));
    *proxy_lock.write().unwrap() = proxy;
    Ok(())
}

#[tauri::command]
pub async fn proxy_set_custom(
    kind: String,
    host: String,
    port: u16,
    username: String,
    password: String,
) -> Result<(), String> {
    apply_proxy(Some(ProxyConfig { kind, host, port, username, password }))
}

#[tauri::command]
pub async fn proxy_clear() -> Result<(), String> {
    apply_proxy(None)
}

#[tauri::command]
pub async fn proxy_get_status() -> Result<Option<ProxyConfig>, String> {
    let lock = PROXY.get_or_init(|| RwLock::new(None));
    Ok(lock.read().unwrap().clone())
}


fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max { return s; }
    let mut end = max;
    while end > 0 && !s.is_char_boundary(end) { end -= 1; }
    &s[..end]
}

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


async fn fetch_json_inner(url: &str, validate_ct: bool) -> Result<Value, ApiError> {
    let resp = http().get(url)
        .header("Accept", "application/json")
        .send().await
        .map_err(|e| ApiError::Network(e.to_string()))?;

    match resp.status().as_u16() {
        404 => return Err(ApiError::NotFound),
        429 => return Err(ApiError::RateLimited),
        s if s >= 500 => return Err(ApiError::Server(s)),
        s if s >= 400 => {
            let body = resp.text().await.unwrap_or_default();
            return Err(ApiError::Other(format!("http {} {}", s, truncate(&body, 200))));
        }
        _ => {}
    }

    if validate_ct {
        let ct = resp.headers().get("content-type")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");
        if !ct.contains("application/json") && !ct.contains("application/vnd.api+json") {
            let text = resp.text().await.unwrap_or_default();
            return Err(ApiError::Other(format!("не json: {}", truncate(&text, 200))));
        }
    }

    resp.json::<Value>().await.map_err(|e| ApiError::Parse(e.to_string()))
}

async fn retry<F, Fut>(f: F) -> Result<Value, ApiError>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<Value, ApiError>>,
{
    let mut delay = Duration::from_millis(500);
    let mut last: Option<ApiError> = None;

    for attempt in 0..3 {
        match f().await {
            Ok(v) => return Ok(v),
            Err(e) if e.is_retryable() && attempt < 2 => {
                last = Some(e);
                tokio::time::sleep(delay).await;
                delay *= 2;
            }
            Err(e) => return Err(e),
        }
    }

    Err(last.unwrap_or_else(|| ApiError::Other("retry exhausted".into())))
}

async fn fetch_retry(url: &str) -> Result<Value, ApiError> {
    retry(|| fetch_json_inner(url, true)).await
}

async fn fetch_json_retry(url: &str) -> Result<Value, ApiError> {
    retry(|| fetch_json_inner(url, false)).await
}

async fn get_track(track_id: &str) -> Result<Value, ApiError> {
    let url = format!("{}/tracks/{}?client_id={}", BASE_URL, track_id, CLIENT_ID);
    fetch_retry(&url).await
}

async fn resolve_stream(data: &Value) -> Result<String, ApiError> {
    let media = data.get("media").ok_or_else(|| ApiError::Other("трек недоступен".into()))?;
    let transcodings = media.get("transcodings")
        .and_then(|t| t.as_array())
        .ok_or_else(|| ApiError::Other("нет форматов".into()))?;

    let auth = data.get("track_authorization").and_then(|t| t.as_str()).unwrap_or("");

    let mut progressive: Vec<&Value> = vec![];
    let mut hls: Vec<&Value> = vec![];

    for t in transcodings {
        let f = t.get("format");
        let p = f.and_then(|f| f.get("protocol")).and_then(|p| p.as_str()).unwrap_or("");
        let m = f.and_then(|f| f.get("mime_type")).and_then(|m| m.as_str()).unwrap_or("");

        if p == "progressive" && (m == "audio/mpeg" || m == "audio/mp4") {
            progressive.push(t);
        } else if (p == "hls" || p.contains("encrypted-hls")) && m == "audio/mpeg" {
            hls.push(t);
        }
    }

    for t in progressive {
        let u = match t.get("url").and_then(|u| u.as_str()) {
            Some(u) => u,
            None => continue,
        };
        let url_with_auth = with_auth(u, auth);
        let s = match tokio::time::timeout(
            Duration::from_secs(8),
            fetch_json_retry(&url_with_auth),
        ).await {
            Ok(Ok(s)) => s,
            Ok(Err(_)) => continue,
            Err(_) => continue,
        };

        if let Some(su) = s.get("url").and_then(|u| u.as_str()) {
            if !su.contains(".m3u8") {
                return Ok(su.to_string());
            }
        }
    }

    for t in hls {
        let u = match t.get("url").and_then(|u| u.as_str()) {
            Some(u) => u,
            None => continue,
        };
        let url_with_auth = with_auth(u, auth);
        let info = match tokio::time::timeout(
            Duration::from_secs(8),
            fetch_json_retry(&url_with_auth),
        ).await {
            Ok(Ok(i)) => i,
            Ok(Err(_)) => continue,
            Err(_) => continue,
        };

        let pl = info.get("url")
            .or_else(|| info.get("data").and_then(|d| d.get("url")))
            .or_else(|| info.get("urls").and_then(|a| a.get(0)).and_then(|u| u.get("url")))
            .and_then(|u| u.as_str());

        if let Some(pl) = pl {
            return Ok(pl.to_string());
        }
    }

    Err(ApiError::Other("нет форматов для трека".into()))
}


fn is_master_playlist(text: &str) -> bool {
    text.contains("#EXT-X-STREAM-INF")
}

fn join_url(base: &str, line: &str) -> String {
    if line.starts_with("http://") || line.starts_with("https://") {
        return line.to_string();
    }
    match Url::parse(base).and_then(|b| b.join(line)) {
        Ok(u) => u.to_string(),
        Err(_) => format!("{}/{}", base.trim_end_matches('/'), line.trim_start_matches('/')),
    }
}

fn parse_segments(playlist: &str, base: &str) -> Vec<String> {
    playlist.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .map(|l| join_url(base, l))
        .collect()
}

fn best_variant(playlist: &str, base: &str) -> Option<String> {
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

async fn download_hls(playlist_url: &str) -> Result<Vec<u8>, ApiError> {
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

    let estimate = (segments.len() * 32 * 1024).min(MAX_HLS_BYTES);
    let mut buf = Vec::with_capacity(estimate);

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


#[tauri::command]
pub async fn search_tracks(query: String, limit: u32, offset: u32) -> Result<Value, String> {
    let url = format!(
        "{}/search/tracks?client_id={}&q={}&limit={}&offset={}",
        BASE_URL, CLIENT_ID, urlencoding::encode(&query), limit, offset
    );

    match fetch_retry(&url).await {
        Ok(data) => {
            if data.get("collection").map(|c| c.is_array()).unwrap_or(false) {
                return Ok(data);
            }
            Ok(json!({ "collection": [], "total_results": 0 }))
        }
        Err(e) => {
            eprintln!("[RUST] поиск упал {}", e);
            Ok(json!({ "success": false, "collection": [], "total_results": 0, "error": e.to_string() }))
        }
    }
}

#[tauri::command]
pub async fn search_playlists(query: String, limit: u32, offset: u32) -> Result<Value, String> {
    let url = format!(
        "{}/search/playlists?client_id={}&q={}&limit={}&offset={}",
        BASE_URL, CLIENT_ID, urlencoding::encode(&query), limit, offset
    );
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user_tracks(user_id: String) -> Result<Value, String> {
    let url = format!("{}/users/{}/tracks?client_id={}&limit=50", BASE_URL, user_id, CLIENT_ID);
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_playlist_tracks(url_or_id: String) -> Result<Value, String> {
    let id = url_or_id.split('/').last()
        .map(|s| s.split('?').next().unwrap_or(s))
        .unwrap_or(&url_or_id);

    let mut all = vec![];
    let mut seen_urls = HashSet::new();
    let mut next = Some(format!("{}/playlists/{}?client_id={}", BASE_URL, id, CLIENT_ID));

    while let Some(url) = next.take() {
        if !seen_urls.insert(url.clone()) {
            break;
        }
        if seen_urls.len() > 100 {
            break;
        }

        let data = fetch_retry(&url).await.map_err(|e| e.to_string())?;
        if let Some(tracks) = data["tracks"].as_array() {
            all.extend(tracks.iter().cloned());
        }
        next = data.get("next_href").and_then(|h| h.as_str()).map(|s| s.to_string());
    }

    Ok(json!({ "tracks": all }))
}

#[tauri::command]
pub async fn get_popular(limit: Option<usize>, offset: Option<usize>) -> Result<Value, String> {
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);
    let mut tracks = vec![];
    let mut seen = HashSet::new();

    let artists = [
        "shadowraze", "zxcursed", "CUPSIZE",
        "sorrow", "whitek3d", "AQUAKEY", "tewiq", "vohley",
        "ONDA ANDAR", "FORTUNA 812", "auratoshi", "madk1d", "dope17",
        "akkiemi", "3umph", "СЕРЕГА ПИРАТ", "голодный", "тёмный принц", "murasame", "Full Smena"
    ];

    let n = artists.len();
    let mut cursor = offset % n;
    let mut round = 0;

    while tracks.len() < limit && round < 3 {
        let remaining = limit - tracks.len();
        let inner_offset = (offset / n + round) * 5;

        let batch: Vec<String> = (0..remaining).map(|_| {
            let idx = cursor % n;
            cursor += 1;
            format!(
                "{}/search/tracks?client_id={}&q={}&limit=5&offset={}",
                BASE_URL, CLIENT_ID, urlencoding::encode(artists[idx]), inner_offset
            )
        }).collect();

        let results: Vec<_> = stream::iter(batch)
            .map(|url| async move { fetch_retry(&url).await })
            .buffered(5)
            .collect()
            .await;

        for data in results.into_iter().flatten() {
            let collection = match data["collection"].as_array() {
                Some(c) => c,
                None => continue,
            };

            for t in collection {
                let id = match t["id"].as_u64() {
                    Some(i) => i,
                    None => continue,
                };
                let dur = t["duration"].as_u64().unwrap_or(0);
                if (MIN_TRACK_MS..MAX_TRACK_MS).contains(&dur) && seen.insert(id) {
                    tracks.push(t.clone());
                    break;
                }
            }

            if tracks.len() >= limit { break; }
        }

        round += 1;
    }

    Ok(json!({ "collection": tracks }))
}

#[tauri::command]
pub async fn get_my_wave(history_artists: Vec<String>) -> Result<Value, String> {
    use std::collections::VecDeque;

    const TARGET: usize = 50;
    const PER_ARTIST: usize = 10;

    let mut seen = HashSet::new();

    let urls: Vec<String> = history_artists.iter().take(10).map(|artist| {
        format!(
            "{}/search/tracks?client_id={}&q={}&limit={}&offset=0",
            BASE_URL, CLIENT_ID, urlencoding::encode(artist), PER_ARTIST
        )
    }).collect();

    let results: Vec<_> = stream::iter(urls)
        .map(|url| async move { fetch_retry(&url).await })
        .buffered(5)
        .collect()
        .await;

    let mut buckets: Vec<VecDeque<Value>> = results.into_iter()
        .filter_map(|r| r.ok())
        .filter_map(|data| data["collection"].as_array().cloned())
        .map(|v| v.into_iter().collect())
        .collect();

    let mut tracks = Vec::with_capacity(TARGET);
    'outer: loop {
        let mut progressed = false;
        for bucket in buckets.iter_mut() {
            while let Some(t) = bucket.pop_front() {
                let id = match t["id"].as_u64() {
                    Some(i) => i,
                    None => continue,
                };
                if seen.insert(id) {
                    tracks.push(t);
                    progressed = true;
                    break;
                }
            }
            if tracks.len() >= TARGET { break 'outer; }
        }
        if !progressed { break; }
    }

    if tracks.is_empty() {
        let url = format!("{}/search/tracks?client_id={}&q=new&limit=30&offset=0", BASE_URL, CLIENT_ID);
        if let Ok(data) = fetch_retry(&url).await {
            if let Some(c) = data["collection"].as_array() {
                for t in c {
                    if let Some(id) = t["id"].as_u64() {
                        if seen.insert(id) {
                            tracks.push(t.clone());
                            if tracks.len() >= 30 { break; }
                        }
                    }
                }
            }
        }
    }

    Ok(json!({ "collection": tracks }))
}

#[tauri::command]
pub async fn fetch_url(url: String) -> Result<Value, String> {
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_hls_track(playlist_url: &str) -> Result<Vec<u8>, String> {
    download_hls(playlist_url).await.map_err(|e| e.to_string())
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

#[derive(serde::Serialize)]
pub struct ApiTestResult {
    pub ok: bool,
    pub status: u16,
    pub time_ms: u64,
    pub error: Option<String>,
}

#[derive(serde::Serialize)]
pub struct CdnTestResult {
    pub ok: bool,
    pub status: u16,
    pub time_ms: u64,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn proxy_test_api() -> Result<ApiTestResult, String> {
    let start = std::time::Instant::now();

    let result = tokio::time::timeout(
        Duration::from_secs(5),
        http().get("https://api-v2.soundcloud.com").send(),
    ).await;

    let (ok, status, error) = match result {
        Ok(Ok(r)) => {
            let st = r.status().as_u16();
            (true, st, None)
        }
        Ok(Err(e)) => (false, 0, Some(e.to_string())),
        Err(_) => (false, 0, Some("timeout".into())),
    };

    Ok(ApiTestResult {
        ok,
        status,
        time_ms: start.elapsed().as_millis() as u64,
        error,
    })
}

#[tauri::command]
pub async fn proxy_test_cdn() -> Result<CdnTestResult, String> {
    let start = std::time::Instant::now();

    let result = tokio::time::timeout(
        Duration::from_secs(5),
        http().head("https://cf-media.sndcdn.com").send(),
    ).await;

    let (ok, status, error) = match result {
        Ok(Ok(r)) => {
            let st = r.status().as_u16();
            let ok = st == 403 || st == 200 || st == 404;
            (ok, st, None)
        }
        Ok(Err(e)) => (false, 0, Some(e.to_string())),
        Err(_) => (false, 0, Some("timeout".into())),
    };

    Ok(CdnTestResult {
        ok,
        status,
        time_ms: start.elapsed().as_millis() as u64,
        error,
    })
}