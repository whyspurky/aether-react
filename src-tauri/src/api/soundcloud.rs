use std::collections::HashSet;
use std::time::Duration;
use futures::stream::{self, StreamExt};
use serde_json::{json, Value};

use super::{BASE_URL, CLIENT_ID, MIN_TRACK_MS, MAX_TRACK_MS};
use super::client::{http, apply_all, get_proxy_status, ProxyConfig, fetch_retry};

const TRACKS_CHUNK_SIZE: usize = 50;
const ARTIST_PAGE_LIMIT: u32 = 30;
const ARTIST_SECTION_LIMIT: u32 = 12;
const POPULAR_ROUNDS: usize = 3;
const POPULAR_BATCH_SIZE: usize = 5;
const POPULAR_ARTISTS: &[&str] = &[
    "shadowraze", "zxcursed", "CUPSIZE",
    "sorrow", "whitek3d", "AQUAKEY", "tewiq", "vohley",
    "ONDA ANDAR", "FORTUNA 812", "auratoshi", "madk1d", "dope17",
    "akkiemi", "3umph", "СЕРЕГА ПИРАТ", "голодный", "тёмный принц", "murasame", "Full Smena",
];
const MY_WAVE_TARGET: usize = 50;
const MY_WAVE_PER_ARTIST: usize = 10;

// у api-v2 offset в next_href это курсор вида "<created_at>,tracks,<id>", а не число
fn cursor_from(next_href: &str) -> Option<String> {
    let query = next_href.split_once('?')?.1;
    for pair in query.split('&') {
        let Some((key, value)) = pair.split_once('=') else {
            continue;
        };
        if key != "offset" {
            continue;
        }
        let decoded = urlencoding::decode(value).ok()?.into_owned();
        if !decoded.is_empty() {
            return Some(decoded);
        }
    }
    None
}

// одна страница списка: без добивания всех next_href, чтобы не ловить 429
fn page_from(data: Value, limit: u32) -> Value {
    let collection = data.get("collection").cloned().unwrap_or_else(|| json!([]));
    let raw_len = collection.as_array().map_or(0, |items| items.len());
    let next_href = data.get("next_href").and_then(|h| h.as_str());
    // some endpoints не отдают next_href, но полная страница значит что может быть ещё
    let has_more = next_href.is_some() || (raw_len > 0 && raw_len >= limit as usize);
    let next_cursor = next_href.and_then(cursor_from);
    json!({ "collection": collection, "has_more": has_more, "count": raw_len, "next_cursor": next_cursor })
}

async fn fetch_page(url: &str, limit: u32) -> Result<Value, String> {
    let data = fetch_retry(url).await.map_err(|e| e.to_string())?;
    Ok(page_from(data, limit))
}

#[tauri::command]
pub async fn proxy_set_custom(
    kind: String,
    host: String,
    port: u16,
    username: String,
    password: String,
) -> Result<(), String> {
    let config = ProxyConfig { kind, host, port, username, password };
    apply_all(Some(config))
}

#[tauri::command]
pub async fn proxy_clear() -> Result<(), String> {
    // без своего прокси остается системный, если он включен в windows
    apply_all(None)
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
pub async fn search_users(query: String, limit: u32, offset: u32) -> Result<Value, String> {
    let url = format!(
        "{}/search/users?client_id={}&q={}&limit={}&offset={}&linked_partitioning=1",
        BASE_URL, CLIENT_ID, urlencoding::encode(&query), limit, offset
    );
    fetch_retry(&url).await.map_err(|e| e.to_string())
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
        Err(e) => Ok(json!({ "collection": [], "total_results": 0, "error": e.to_string() })),
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

fn clamp_limit(limit: Option<u32>, fallback: u32, max: u32) -> u32 {
    limit.unwrap_or(fallback).clamp(1, max)
}

#[tauri::command]
pub async fn get_user_tracks(
    user_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
    cursor: Option<String>,
    sort: Option<String>,
) -> Result<Value, String> {
    let limit = clamp_limit(limit, ARTIST_PAGE_LIMIT, 100);
    let offset = offset.unwrap_or(0);
    // popular это toptracks, new это обычный список, soundcloud отдаёт его от новых
    let path = if sort.as_deref() == Some("popular") { "toptracks" } else { "tracks" };
    // у новых треков offset это курсор из next_href, у toptracks число
    let offset_param = match cursor {
        Some(value) if !value.trim().is_empty() => urlencoding::encode(value.trim()).into_owned(),
        _ => offset.to_string(),
    };
    let url = format!(
        "{}/users/{}/{}?client_id={}&limit={}&offset={}&linked_partitioning=1",
        BASE_URL, user_id, path, CLIENT_ID, limit, offset_param
    );
    fetch_page(&url, limit).await
}

#[tauri::command]
pub async fn get_user_popular_tracks(
    user_id: String,
    limit: Option<u32>,
) -> Result<Value, String> {
    let limit = clamp_limit(limit, ARTIST_SECTION_LIMIT, 50);
    let url = format!(
        "{}/users/{}/toptracks?client_id={}&limit={}&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID, limit
    );
    fetch_page(&url, limit).await
}

#[tauri::command]
pub async fn get_related_artists(
    user_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Value, String> {
    let limit = clamp_limit(limit, ARTIST_SECTION_LIMIT, 50);
    let offset = offset.unwrap_or(0);
    // на soundcloud это fans also like, порядок это релевантность
    let url = format!(
        "{}/users/{}/related?client_id={}&limit={}&offset={}&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID, limit, offset
    );
    let page = match fetch_page(&url, limit).await {
        Ok(data) => data,
        // старый вариант на случай, если related выпилят
        Err(_) => {
            let fallback = format!(
                "{}/users/{}/related-artists?client_id={}&limit={}&offset={}&linked_partitioning=1",
                BASE_URL, user_id, CLIENT_ID, limit, offset
            );
            fetch_page(&fallback, limit).await?
        }
    };

    // чистим страницу: без id и имени строку не нарисовать, себя и дубли тоже убираем
    let raw = page["collection"].as_array().cloned().unwrap_or_default();
    let raw_len = raw.len();
    let mut seen = HashSet::new();
    let mut items = Vec::with_capacity(raw_len);

    for user in raw {
        let Some(id) = user["id"].as_u64() else { continue };
        if id.to_string() == user_id {
            continue;
        }
        let has_name = user["username"].as_str().map_or(false, |name| !name.is_empty());
        if !has_name || !seen.insert(id) {
            continue;
        }
        items.push(user);
    }

    let has_more = page["has_more"].as_bool().unwrap_or(false) && raw_len > 0;
    // count это длина сырой страницы, по ней двигаем offset
    Ok(json!({ "collection": items, "has_more": has_more, "count": raw_len }))
}

#[tauri::command]
pub async fn get_user(user_id: String) -> Result<Value, String> {
    let url = format!("{}/users/{}?client_id={}", BASE_URL, user_id, CLIENT_ID);
    fetch_retry(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user_reposts(
    user_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Value, String> {
    let limit = clamp_limit(limit, ARTIST_PAGE_LIMIT, 100);
    let offset = offset.unwrap_or(0);
    let url = format!(
        "{}/stream/users/{}/reposts?client_id={}&limit={}&offset={}&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID, limit, offset
    );
    fetch_page(&url, limit).await
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

    for chunk in ids.chunks(TRACKS_CHUNK_SIZE) {
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
pub async fn get_user_playlists(
    user_id: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Value, String> {
    let limit = clamp_limit(limit, ARTIST_PAGE_LIMIT, 100);
    let offset = offset.unwrap_or(0);
    let url = format!(
        "{}/users/{}/playlists?client_id={}&limit={}&offset={}&linked_partitioning=1",
        BASE_URL, user_id, CLIENT_ID, limit, offset
    );
    fetch_page(&url, limit).await
}

#[tauri::command]
pub async fn get_popular(limit: Option<usize>, offset: Option<usize>) -> Result<Value, String> {
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);
    let mut tracks = vec![];
    let mut seen = HashSet::new();

    let n = POPULAR_ARTISTS.len();
    let mut cursor = offset % n;
    let mut round = 0;

    while tracks.len() < limit && round < POPULAR_ROUNDS {
        let remaining = limit - tracks.len();
        let inner_offset = (offset / n + round) * POPULAR_BATCH_SIZE;

        let batch: Vec<String> = (0..remaining).map(|_| {
            let idx = cursor % n;
            cursor += 1;
            format!(
                "{}/search/tracks?client_id={}&q={}&limit={}&offset={}",
                BASE_URL, CLIENT_ID, urlencoding::encode(POPULAR_ARTISTS[idx]), POPULAR_BATCH_SIZE, inner_offset
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

    let mut seen = HashSet::new();

    let urls: Vec<String> = history_artists.iter().take(10).map(|artist| {
        format!(
            "{}/search/tracks?client_id={}&q={}&limit={}&offset=0",
            BASE_URL, CLIENT_ID, urlencoding::encode(artist), MY_WAVE_PER_ARTIST
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

    let mut tracks = Vec::with_capacity(MY_WAVE_TARGET);
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
            if tracks.len() >= MY_WAVE_TARGET { break 'outer; }
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
pub async fn search_suggestions(query: String, limit: u32) -> Result<Value, String> {
    let url = format!(
        "{}/search/queries?client_id={}&q={}&limit={}",
        BASE_URL, CLIENT_ID, urlencoding::encode(&query), limit
    );
    fetch_retry(&url).await.map_err(|e| e.to_string())
}