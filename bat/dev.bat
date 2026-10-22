@echo off
taskkill /f /im aether-desktop.exe >nul 2>&1
timeout /t 2 /nobreak >nul
rem webview2 profile pinned to repo, localappdata fails
set "WEBVIEW2_USER_DATA_FOLDER=%~dp0..\.dev-webview"
start cmd /k "npm run tauri dev"
