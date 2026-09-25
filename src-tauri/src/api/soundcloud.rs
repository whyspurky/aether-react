use std::collections::HashSet;
use std::time::Duration;
use futures::stream::{self, StreamExt};
use serde_json::{json, Value};

use super::CLIENT_ID;
use super::BASE_URL;
use super::MIN_TRACK_MS;
use super::MAX_TRACK_MS;
use super::client::{http, apply_proxy, get_proxy_status, ProxyConfig, fetch_retry};

fn add_client_id(url: &str) -> String {
    if url.contains("client_id=") {
        url.to_string()
    } else {
        let sep = if url.contains('?') { '&' } else { '?' };
        format!("{}{}client_id={}", url, sep, CLIENT_ID)
    }
}

async fn fetch_paginated(start_url: &str) -> Result<Vec<Value>, String> {
    let mut all = vec![];
    let mut seen = HashSet::new();
    let mut next = Some(start_url.to_string());

    while let Some(url) = next.take() {
        if !seen.insert(url.clone()) {
            break;
        }
        if seen.len() > 20 {
            break;
        }

        let data = fetch_retry(&url).await.map_err(|e| e.to_string())?;
        if let Some(arr) = data["collection"].as_array() {
            all.extend(arr.iter().cloned());
        }

        next = data.get("next_href").and_then(|h| h.as_str()).map(add_client_id);
    }

    Ok(all)
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
    Ok(get_proxy_status())
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
        Ok(Ok(r)) => (true, r.status().as_u16(), None),
        Ok(Err(e)) => (false, 0, Some(e.to_string())),
        Err(_) => (false, 0, Some("timeout".into())),
    };

    Ok(ApiTestResult { ok, status, time_ms: start.elapsed().as_millis() as u64, error })
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

    Ok(CdnTestResult { ok, status, time_ms: start.elapsed().as_millis() as u64, error })
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
    let url = format!(
        "{}/users/{}/tracks?client_id={}&limit=50&representation=&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID
    );
    let all = fetch_paginated(&url).await?;
    Ok(json!({ "collection": all }))
}

#[tauri::command]
pub async fn get_user_popular_tracks(user_id: String) -> Result<Value, String> {
    let url = format!(
        "{}/users/{}/toptracks?client_id={}&limit=20&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID
    );
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_related_artists(user_id: String) -> Result<Value, String> {
    let url = format!("{}/users/{}/related-artists?client_id={}&limit=20", BASE_URL, user_id, CLIENT_ID);
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user(user_id: String) -> Result<Value, String> {
    let url = format!("{}/users/{}?client_id={}", BASE_URL, user_id, CLIENT_ID);
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user_reposts(user_id: String) -> Result<Value, String> {
    let url = format!(
        "{}/stream/users/{}/reposts?client_id={}&limit=50&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID
    );
    let all = fetch_paginated(&url).await?;
    Ok(json!({ "collection": all }))
}

#[tauri::command]
pub async fn get_playlist(url_or_id: String) -> Result<Value, String> {
    let id = url_or_id.split('/').last()
        .map(|s| s.split('?').next().unwrap_or(s))
        .unwrap_or(&url_or_id);

    let url = format!("{}/playlists/{}?client_id={}", BASE_URL, id, CLIENT_ID);
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_playlist_tracks(url_or_id: String) -> Result<Value, String> {
    let id = url_or_id.split('/').last()
        .map(|s| s.split('?').next().unwrap_or(s))
        .unwrap_or(&url_or_id);

    let pl_url = format!("{}/playlists/{}?client_id={}", BASE_URL, id, CLIENT_ID);
    let pl_data = fetch_retry(&pl_url).await.map_err(|e| e.to_string())?;

    let ids: Vec<u64> = pl_data["tracks"]
        .as_array()
        .ok_or("нет треков в плейлисте")?
        .iter()
        .filter_map(|t| t["id"].as_u64())
        .collect();

    if ids.is_empty() {
        return Ok(json!({ "collection": [] }));
    }

    let mut all = vec![];
    let mut seen = HashSet::new();

    for chunk in ids.chunks(50) {
        let ids_str = chunk.iter().map(|i| i.to_string()).collect::<Vec<_>>().join(",");
        let url = format!("{}/tracks?ids={}&client_id={}", BASE_URL, ids_str, CLIENT_ID);

        if let Ok(data) = fetch_retry(&url).await {
            if let Some(arr) = data.as_array() {
                for t in arr {
                    if let Some(tid) = t["id"].as_u64() {
                        if seen.insert(tid) {
                            all.push(t.clone());
                        }
                    }
                }
            }
        }
    }

    Ok(json!({ "collection": all }))
}

#[tauri::command]
pub async fn get_user_playlists(user_id: String) -> Result<Value, String> {
    let url = format!(
        "{}/users/{}/playlists?client_id={}&limit=50&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID
    );
    let all = fetch_paginated(&url).await?;
    Ok(json!({ "collection": all }))
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