pub mod client;
pub mod hls;
pub mod soundcloud;
pub mod stream;

pub use client::{http};
pub use stream::{download_hls_track};

pub const CLIENT_ID: &str = "Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo";
pub const BASE_URL: &str = "https://api-v2.soundcloud.com";
pub const MIN_TRACK_MS: u64 = 30_000;
pub const MAX_TRACK_MS: u64 = 600_000;

#[derive(Debug)]
pub enum ApiError {
    NotFound,
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
            ApiError::RateLimited => write!(f, "429"),
            ApiError::Server(s) => write!(f, "сервер {}", s),
            ApiError::Network(e) => write!(f, "сеть {}", e),
            ApiError::Parse(e) => write!(f, "json {}", e),
            ApiError::Other(e) => write!(f, "{}", e),
        }
    }
}