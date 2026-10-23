@echo off
set "WEBVIEW2_USER_DATA_FOLDER=%~dp0..\.dev-webview"
start cmd /k "npm run tauri dev"