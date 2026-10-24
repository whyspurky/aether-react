mod anon;
mod commands;
mod hls;
pub mod http;
pub mod state;

pub use commands::*;
pub use state::TrackCacheState;

pub fn init(
    cache_root: std::path::PathBuf,
    offline_dir: std::path::PathBuf,
) -> Result<TrackCacheState, String> {
    TrackCacheState::init(cache_root, offline_dir)
}
