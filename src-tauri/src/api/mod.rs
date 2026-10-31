pub mod client;
mod dns;
mod sys_proxy;
pub mod hls;
pub mod quality;
pub mod soundcloud;
pub mod stream;

pub use client::http;

pub const BASE_URL: &str = "https://api-v2.soundcloud.com";
pub const MIN_TRACK_MS: u64 = 30_000;
pub const MAX_TRACK_MS: u64 = 600_000;

const DEFAULT_CLIENT_ID: &str = "dkevB9EsY4jIoSm8RfddPNUKyn6hurXF";

static CLIENT_ID: std::sync::OnceLock<std::sync::RwLock<Option<String>>> = std::sync::OnceLock::new();

// свой client_id из настроек важнее встроенного: при отзыве дефолтного это единственный путь
pub fn client_id() -> String {
    let lock = CLIENT_ID.get_or_init(|| std::sync::RwLock::new(None));
    lock.read()
        .ok()
        .and_then(|id| id.clone())
        .unwrap_or_else(|| DEFAULT_CLIENT_ID.to_string())
}

pub fn set_client_id(id: Option<String>) {
    let lock = CLIENT_ID.get_or_init(|| std::sync::RwLock::new(None));
    let value = id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    if let Ok(mut guard) = lock.write() {
        *guard = value;
    }
}

pub fn add_client_id(url: &str) -> String {
    if url.contains("client_id=") {
        url.to_string()
    } else {
        let sep = if url.contains('?') { '&' } else { '?' };
        format!("{}{}client_id={}", url, sep, client_id())
    }
}

#[derive(Debug)]
pub enum ApiError {
    NotFound,
    Unauthorized,
    Forbidden,
    RateLimited,
    Server(u16),
    Network(String),
    Parse(String),
    Other(String),
}

impl ApiError {
    pub fn is_retryable(&self) -> bool {
        matches!(self, ApiError::RateLimited | ApiError::Server(_) | ApiError::Network(_))
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ApiError::NotFound => write!(f, "не найдено"),
            ApiError::Unauthorized => write!(f, "unauthorized"),
            ApiError::Forbidden => write!(f, "403"),
            ApiError::RateLimited => write!(f, "429"),
            ApiError::Server(s) => write!(f, "сервер {}", s),
            ApiError::Network(e) => write!(f, "сеть {}", e),
            ApiError::Parse(e) => write!(f, "json {}", e),
            ApiError::Other(e) => write!(f, "{}", e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_client_id_wins_over_builtin() {
        set_client_id(Some("  abc123  ".into()));
        assert_eq!(client_id(), "abc123");
        assert!(add_client_id("https://api/tracks").ends_with("client_id=abc123"));
        assert!(add_client_id("https://api/tracks?q=1").ends_with("&client_id=abc123"));
        // уже подставленный ключ второй раз не добавляем
        assert_eq!(add_client_id("https://api/tracks?client_id=x"), "https://api/tracks?client_id=x");

        set_client_id(Some("   ".into()));
        assert_eq!(client_id(), DEFAULT_CLIENT_ID);

        set_client_id(None);
        assert_eq!(client_id(), DEFAULT_CLIENT_ID);
    }
}