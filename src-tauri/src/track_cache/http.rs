use std::sync::{OnceLock, RwLock};
use std::time::Duration;

use wreq::redirect::Policy;
use wreq::Client;
use wreq_util::Profile;

use crate::api::client::{emulate, ProxyConfig};

const CONNECT_TIMEOUT_MS: u64 = 5_000;
const MEDIA_TIMEOUT_SECS: u64 = 130;
const ANON_READ_TIMEOUT_SECS: u64 = 20;
const ANON_TOTAL_TIMEOUT_SECS: u64 = 180;

pub struct CacheHttp {
    client: RwLock<Client>,
    anon: RwLock<Client>,
    alt: RwLock<Client>,
    anon_alt: RwLock<Client>,
}

impl CacheHttp {
    fn new() -> Self {
        Self {
            client: RwLock::new(build_client(false, None, Profile::Chrome149)),
            anon: RwLock::new(build_client(true, None, Profile::Chrome149)),
            alt: RwLock::new(build_client(false, None, Profile::Firefox151)),
            anon_alt: RwLock::new(build_client(true, None, Profile::Firefox151)),
        }
    }

    pub fn client(&self) -> Client {
        self.client.read().unwrap().clone()
    }

    pub fn anon(&self) -> Client {
        self.anon.read().unwrap().clone()
    }

    // 403 на sndcdn это чаще отпечаток, чем прокси: второй профиль браузера обходит проверку
    pub fn alt(&self) -> Client {
        self.alt.read().unwrap().clone()
    }

    pub fn anon_alt(&self) -> Client {
        self.anon_alt.read().unwrap().clone()
    }

    pub fn apply_proxy(&self, proxy: Option<&ProxyConfig>) -> Result<(), String> {
        let client = build_client(false, proxy, Profile::Chrome149);
        let anon = build_client(true, proxy, Profile::Chrome149);
        let alt = build_client(false, proxy, Profile::Firefox151);
        let anon_alt = build_client(true, proxy, Profile::Firefox151);
        *self.client.write().unwrap() = client;
        *self.anon.write().unwrap() = anon;
        *self.alt.write().unwrap() = alt;
        *self.anon_alt.write().unwrap() = anon_alt;
        Ok(())
    }
}

fn build_client(anon: bool, proxy: Option<&ProxyConfig>, profile: Profile) -> Client {
    let mut builder = Client::builder()
        .emulation(emulate(profile))
        .redirect(Policy::limited(10))
        .tcp_nodelay(true)
        .pool_max_idle_per_host(if anon { 8 } else { 16 })
        .connect_timeout(Duration::from_millis(CONNECT_TIMEOUT_MS));

    // у медиа ограничиваем простой чтения, иначе большой трек оборвется по общему таймауту
    builder = if anon {
        // общий таймаут на весь трек, а не на чтение: иначе медленный прокси рвет загрузку
        builder
            .timeout(Duration::from_secs(ANON_TOTAL_TIMEOUT_SECS))
            .read_timeout(Duration::from_secs(ANON_READ_TIMEOUT_SECS))
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
            if let Ok(proxy) = wreq::Proxy::all(&url) {
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
