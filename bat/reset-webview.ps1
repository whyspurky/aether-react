# сбрасывает права на профиль aether и чистит webview2
# запускать можно обычным пользователем, сам попросит uac

param(
    [string]$LocalAppData = $env:LOCALAPPDATA,
    [string]$RoamingAppData = $env:APPDATA,
    [switch]$NoPause
)

$ErrorActionPreference = 'Continue'
$log = Join-Path $env:TEMP 'aether-reset-webview.log'

function Write-Step([string]$text) {
    Write-Host $text
    Add-Content -Path $log -Value $text -ErrorAction SilentlyContinue
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'нужны права администратора, сейчас будет uac'
    $args = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$PSCommandPath`"",
        '-LocalAppData', "`"$LocalAppData`"",
        '-RoamingAppData', "`"$RoamingAppData`"",
        '-NoPause'
    )
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $args
    exit
}

Set-Content -Path $log -Value "reset webview $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ErrorAction SilentlyContinue

$localDir = Join-Path $LocalAppData 'com.aether.desktop'
$roamingDir = Join-Path $RoamingAppData 'com.aether.desktop'
$profile = Join-Path $localDir 'EBWebView'

Write-Step '=== 1. останавливаю процессы ==='
Get-Process aether-desktop, msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
$left = @(Get-Process aether-desktop, msedgewebview2 -ErrorAction SilentlyContinue)
Write-Step ("осталось процессов: " + $left.Count)
if ($left.Count -gt 0) {
    $left | ForEach-Object { Write-Step ("  висит " + $_.Name + " pid=" + $_.Id) }
    Write-Step 'закрой их вручную и запусти скрипт снова'
    if (-not $NoPause) { Read-Host 'enter чтобы выйти' }
    exit 1
}

Write-Step '=== 2. снимаю переменную WEBVIEW2_USER_DATA_FOLDER ==='
foreach ($scope in 'Machine', 'User') {
    $value = [Environment]::GetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', $scope)
    if ($value) {
        [Environment]::SetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', $null, $scope)
        Write-Step ("снял " + $scope + ": " + $value)
    }
}
[Environment]::SetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', $null, 'Process')
Write-Step 'готово'

Write-Step '=== 3. бэкап стора ==='
$store = Join-Path $roamingDir 'aether-storage.json'
if (Test-Path $store) {
    $bak = $store + '.bak-' + (Get-Date -Format 'yyyyMMdd-HHmm')
    Copy-Item $store $bak -Force -ErrorAction SilentlyContinue
    Write-Step ("стор сохранен: " + $bak)
} else {
    Write-Step 'стора нет, пропускаю'
}

Write-Step '=== 4. возвращаю владельца и права ==='
foreach ($dir in @($localDir, $roamingDir)) {
    if (-not (Test-Path $dir)) { Write-Step ("нет папки " + $dir); continue }
    $user = "$env:USERDOMAIN\$env:USERNAME"
    & takeown.exe /f "$dir" /r /d y 2>&1 | Out-Null
    & icacls.exe "$dir" /reset /t /c /q 2>&1 | Out-Null
    & icacls.exe "$dir" /grant "$($user):(OI)(CI)F" /t /c /q 2>&1 | Out-Null
    $acl = Get-Acl $dir
    Write-Step ("права обновлены " + $dir + " owner=" + $acl.Owner)
}

Write-Step '=== 5. удаляю профиль webview2 ==='
if (Test-Path $profile) {
    Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
    Write-Step ("удален " + $profile)
} else {
    Write-Step 'профиля и так нет'
}

Write-Step '=== 6. чищу старые профили от прошлых попыток ==='
foreach ($name in 'aether-webview-dat', 'aether-webview-data') {
    $p = Join-Path $LocalAppData $name
    if (Test-Path $p) {
        Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Step ("удален " + $p)
    }
}

Write-Step '=== 7. проверка ==='
Write-Step ("рантайм: " + (Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue).pv)
Write-Step ("профиль удален: " + (-not (Test-Path $profile)))
Write-Step ("стор на месте: " + (Test-Path $store))
Write-Step ("переменная machine: [" + [Environment]::GetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', 'Machine') + "]")

Write-Step ''
Write-Step 'готово. закрой все консоли и запусти npm run tauri dev обычным пользователем, без админа'
if (-not $NoPause) { Read-Host 'enter чтобы закрыть' }
