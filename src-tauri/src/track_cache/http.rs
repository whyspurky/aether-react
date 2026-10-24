use std::sync::{OnceLock, RwLock};
use std::time::Duration;

use reqwest::redirect::Policy;
use reqwest::Client;

use crate::api::client::ProxyConfig;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CONNECT_TIMEOUT_MS: u64 = 5_000;
const MEDIA_TIMEOUT_SECS: u64 = 130;
const ANON_TIMEOUT_SECS: u64 = 20;

pub struct CacheHttp {
    client: RwLock<Client>,
    anon: RwLock<Client>,
}

impl CacheHttp {
    fn new() -> Self {
        Self {
            client: RwLock::new(build_client(false, None)),
            anon: RwLock::new(build_client(true, None)),
        }
    }

    pub fn client(&self) -> Client {
        self.client.read().unwrap().clone()
    }

    pub fn anon(&self) -> Client {
        self.anon.read().unwrap().clone()
    }

    pub fn apply_proxy(&self, proxy: Option<&ProxyConfig>) -> Result<(), String> {
        let client = build_client(false, proxy);
        let anon = build_client(true, proxy);
        *self.client.write().unwrap() = client;
        *self.anon.write().unwrap() = anon;
        Ok(())
    }
}

fn build_client(anon: bool, proxy: Option<&ProxyConfig>) -> Client {
    let mut builder = Client::builder()
        .user_agent(USER_AGENT)
        .redirect(Policy::limited(10))
        .tcp_nodelay(true)
        .pool_max_idle_per_host(if anon { 8 } else { 16 })
        .connect_timeout(Duration::from_millis(CONNECT_TIMEOUT_MS));

    // у медиа ограничиваем простой чтения, иначе большой трек оборвется по общему таймауту
    builder = if anon {
        builder.timeout(Duration::from_secs(ANON_TIMEOUT_SECS))
    } else {
        builder.read_timeout(Duration::from_secs(MEDIA_TIMEOUT_SECS))
    };

    // прокси берем тот же, что и у остального клиента aether
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
                format!(
                    "{}://{}:{}@{}:{}",
                    scheme, p.username, p.password, p.host, p.port
                )
            };
            if let Ok(proxy) = reqwest::Proxy::all(&url) {
                builder = builder.proxy(proxy);
            }
        }
    }

    builder.build().unwrap_or_else(|_| Client::new())
}

static HTTP: OnceLock<std::sync::Arc<CacheHttp>> = OnceLock::new();

pub fn shared() -> std::sync::Arc<CacheHttp> {
    HTTP.get_or_init(|| std::sync::Arc::new(CacheHttp::new())).clone()
}

pub fn apply_proxy(proxy: Option<ProxyConfig>) -> Result<(), String> {
    shared().apply_proxy(proxy.as_ref())
}
