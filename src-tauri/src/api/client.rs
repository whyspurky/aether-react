
use std::time::Duration;
use std::sync::{OnceLock, RwLock};
use serde_json::Value;
use wreq::Client;
use wreq_util::{Emulation, Platform, Profile};

use super::dns;
use super::sys_proxy;
use super::ApiError;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ProxyConfig {
    #[serde(rename = "type")]
    pub kind: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

static CLIENT: OnceLock<RwLock<Client>> = OnceLock::new();
static CLIENT_ALT: OnceLock<RwLock<Client>> = OnceLock::new();
static PROXY: OnceLock<RwLock<Option<ProxyConfig>>> = OnceLock::new();

// звук облака отличает клиента по отпечатку tls и h2, подмена ua на rustls не помогает
// alt профиль нужен на 403: смена отпечатка обходит проверку, смена прокси не нужна
pub(crate) fn emulate(profile: Profile) -> Emulation {
    Emulation::builder()
        .profile(profile)
        .platform(Platform::Windows)
        .build()
}

// doh нужен обоим пулам, иначе первый же запрос уйдет через подмененный системный dns
pub(crate) fn with_dns(builder: wreq::ClientBuilder) -> wreq::ClientBuilder {
    match dns::shared() {
        Some(resolver) => builder.dns_resolver(resolver),
        None => builder,
    }
}

fn build_client(proxy: Option<&ProxyConfig>, profile: Profile) -> Client {
    let mut builder = with_dns(
        Client::builder()
            .emulation(emulate(profile))
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(10))
            .pool_max_idle_per_host(20),
    );

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
            if let Ok(proxy) = wreq::Proxy::all(&url) {
                println!("[proxy] применяю {}", url);
                builder = builder.proxy(proxy);
            }
        }
    }

    builder.build().unwrap()
}

fn primary_profile() -> Profile {
    Profile::Chrome149
}

fn alt_profile() -> Profile {
    Profile::Firefox151
}

pub fn http() -> Client {
    let lock = CLIENT.get_or_init(|| RwLock::new(build_client(None, primary_profile())));
    lock.read().unwrap().clone()
}

// второй отпечаток для запросов, которые уперлись в 403
pub fn http_alt() -> Client {
    let lock = CLIENT_ALT.get_or_init(|| RwLock::new(build_client(None, alt_profile())));
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

    // явный прокси из настроек важнее системного, системный важнее прямого
    let effective = proxy.clone().or_else(sys_proxy::detect);
    if proxy.is_none() {
        if let Some(p) = &effective {
            println!("[proxy] системный прокси {}:{}", p.host, p.port);
        }
    }

    let client = build_client(effective.as_ref(), primary_profile());
    let alt = build_client(effective.as_ref(), alt_profile());
    let lock = CLIENT.get_or_init(|| RwLock::new(build_client(None, primary_profile())));
    *lock.write().unwrap() = client;
    let alt_lock = CLIENT_ALT.get_or_init(|| RwLock::new(build_client(None, alt_profile())));
    *alt_lock.write().unwrap() = alt;

    let proxy_lock = PROXY.get_or_init(|| RwLock::new(None));
    *proxy_lock.write().unwrap() = proxy;
    Ok(())
}

// действующий прокси: явный из настроек, иначе системный
pub fn effective_proxy() -> Option<ProxyConfig> {
    get_proxy_status().or_else(sys_proxy::detect)
}

// применяет прокси ко всем пулам сразу: api и медиа живут в разных модулях
pub fn apply_all(explicit: Option<ProxyConfig>) -> Result<(), String> {
    apply_proxy(explicit)?;
    crate::track_cache::http::apply_proxy(effective_proxy())
}

pub fn get_proxy_status() -> Option<ProxyConfig> {
    let lock = PROXY.get_or_init(|| RwLock::new(None));
    lock.read().unwrap().clone()
}

pub(crate) fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max { return s; }
    let mut end = max;
    while end > 0 && !s.is_char_boundary(end) { end -= 1; }
    &s[..end]
}

// браузер дергает json как fetch, не как переход по ссылке: проверки cdn смотрят на sec-fetch
fn json_request(client: &Client, url: &str) -> wreq::RequestBuilder {
    client
        .get(url)
        .header("Accept", "application/json")
        .header("Referer", "https://soundcloud.com/")
        .header("sec-fetch-site", "same-site")
        .header("sec-fetch-dest", "empty")
        .header("sec-fetch-mode", "cors")
}

async fn fetch_json_with(client: Client, url: &str, validate_ct: bool) -> Result<Value, ApiError> {
    let resp = json_request(&client, url)
        .send().await
        .map_err(|e| ApiError::Network(e.to_string()))?;

    match resp.status().as_u16() {
        401 => return Err(ApiError::Unauthorized),
        403 => return Err(ApiError::Forbidden),
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

async fn fetch_json_inner(url: &str, validate_ct: bool) -> Result<Value, ApiError> {
    match fetch_json_with(http(), url, validate_ct).await {
        Err(ApiError::Forbidden) => {
            println!("[http] 403 на {}, пробую профиль firefox", truncate(url, 80));
            fetch_json_with(http_alt(), url, validate_ct).await
        }
        other => other,
    }
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