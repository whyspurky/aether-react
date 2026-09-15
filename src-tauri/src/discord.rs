// src-tauri/src/discord.rs
pub fn init_discord() {}

#[tauri::command]
pub fn update_discord_rpc(
    _title: String,
    _artist: String,
    _playing: bool,
    _duration: u64,
    _position: u64,
    _artwork_url: String,
    _track_url: String,
) {
}