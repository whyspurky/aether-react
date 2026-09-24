
use std::time::Duration;
use std::sync::{OnceLock, RwLock};
use serde_json::Value;

use super::ApiError;

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
            return Err("хост не должен содержать ':' - введи порт отдельно".into());
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

pub fn get_proxy_status() -> Option<ProxyConfig> {
    let lock = PROXY.get_or_init(|| RwLock::new(None));
    lock.read().unwrap().clone()
}

fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max { return s; }
    let mut end = max;
    while end > 0 && !s.is_char_boundary(end) { end -= 1; }
    &s[..end]
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

pub async fn fetch_retry(url: &str) -> Result<Value, ApiError> {
    retry(|| fetch_json_inner(url, true)).await
}

pub async fn fetch_json_retry(url: &str) -> Result<Value, ApiError> {
    retry(|| fetch_json_inner(url, false)).await
}