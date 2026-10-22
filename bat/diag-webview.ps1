# Diagnostic for the WebView2 startup panic.
# Run as a normal user, NOT elevated, from the repo root or from bat\.
# Produces a folder with logs; nothing outside the folder is modified except
# stale aether-desktop / msedgewebview2 processes that are stopped first.

param(
    [int]$WaitSeconds = 25,
    [switch]$NoPause
)

$ErrorActionPreference = 'Continue'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $PSScriptRoot "logs\diag-$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$report = Join-Path $outDir 'report.txt'

function Add-Block([string]$title) {
    Add-Content -Path $report -Value ""
    Add-Content -Path $report -Value ("===== " + $title + " =====")
}
function Add-Line([string]$text) {
    Add-Content -Path $report -Value $text
}

Set-Content -Path $report -Value "aether webview2 diagnostic $stamp" -Encoding UTF8

Add-Block 'system'
Add-Line ("os: " + [Environment]::OSVersion.VersionString)
Add-Line ("windows build: " + (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction SilentlyContinue).CurrentBuildNumber)
Add-Line ("user: " + [Environment]::UserName + " domain: " + [Environment]::UserDomainName)
Add-Line ("powershell: " + $PSVersionTable.PSVersion)
Add-Line ("is admin: " + ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
Add-Line ("localappdata: " + $env:LOCALAPPDATA)
Add-Line ("appdata: " + $env:APPDATA)
Add-Line ("temp: " + $env:TEMP)
Add-Line ("cwd: " + (Get-Location).Path)

Add-Block 'webview2 env vars'
foreach ($scope in 'Process', 'User', 'Machine') {
    $vars = [Environment]::GetEnvironmentVariables($scope)
    $found = $false
    foreach ($key in $vars.Keys) {
        if ($key -match 'WEBVIEW2|EDGE|CHROME') {
            Add-Line ("$scope $key = " + $vars[$key])
            $found = $true
        }
    }
    if (-not $found) { Add-Line ("${scope}: none") }
}

Add-Block 'webview2 runtime'
$clientKey = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$clientKey32 = 'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$clientKeyUser = 'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
foreach ($k in @($clientKey, $clientKey32, $clientKeyUser)) {
    if (Test-Path $k) {
        $pv = (Get-ItemProperty $k -ErrorAction SilentlyContinue).pv
        Add-Line ("$k pv=" + $pv)
    }
}
foreach ($base in @('C:\Program Files (x86)\Microsoft\EdgeWebView\Application', (Join-Path $env:LOCALAPPDATA 'Microsoft\EdgeWebView\Application'))) {
    Add-Line ("folder " + $base + " exists=" + (Test-Path $base))
    Get-ChildItem $base -ErrorAction SilentlyContinue | ForEach-Object {
        $exe = Join-Path $_.FullName 'msedgewebview2.exe'
        $ver = if (Test-Path $exe) { (Get-Item $exe).VersionInfo.FileVersion } else { 'missing' }
        Add-Line ("  version " + $_.Name + " exe=" + $ver)
    }
}
Add-Line ("edge stable: " + (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'))

Add-Block 'processes before cleanup'
$procs = @(Get-Process aether-desktop, msedgewebview2 -ErrorAction SilentlyContinue)
if ($procs.Count -eq 0) { Add-Line 'none' }
$procs | ForEach-Object { Add-Line ("pid=" + $_.Id + " name=" + $_.Name + " start=" + $_.StartTime + " path=" + $_.Path) }

Add-Block 'cleanup'
$procs | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$left = @(Get-Process aether-desktop, msedgewebview2 -ErrorAction SilentlyContinue)
Add-Line ("left after cleanup: " + $left.Count)
$left | ForEach-Object { Add-Line ("  pid=" + $_.Id + " name=" + $_.Name + " start=" + $_.StartTime + " elevated=" + $_.Path) }

Add-Block 'profile state before run'
$localDir = Join-Path $env:LOCALAPPDATA 'com.aether.desktop'
$profileDir = Join-Path $localDir 'EBWebView'
Add-Line ("dir " + $localDir + " exists=" + (Test-Path $localDir))
Add-Line ("profile " + $profileDir + " exists=" + (Test-Path $profileDir))
if (Test-Path $profileDir) {
    $acl = Get-Acl $profileDir
    Add-Line ("owner: " + $acl.Owner)
    $acl.Access | ForEach-Object { Add-Line ("  " + $_.IdentityReference + " | " + $_.FileSystemRights + " | " + $_.AccessControlType) }
    $files = @(Get-ChildItem $profileDir -Recurse -File -Force -ErrorAction SilentlyContinue)
    Add-Line ("files: " + $files.Count)
} else {
    $acl = Get-Acl $localDir
    Add-Line ("owner of parent dir: " + $acl.Owner)
}

Add-Block 'launch'
$exe = Join-Path $PSScriptRoot '..\src-tauri\target\debug\aether-desktop.exe'
$exe = [IO.Path]::GetFullPath($exe)
Add-Line ("exe: " + $exe + " exists=" + (Test-Path $exe))
if (Test-Path $exe) {
    Add-Line ("exe timestamp: " + (Get-Item $exe).LastWriteTime)
}
$stdout = Join-Path $outDir 'app.out.log'
$stderr = Join-Path $outDir 'app.err.log'
$env:RUST_BACKTRACE = 'full'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = '--enable-logging --v=1'
$env:WEBVIEW2_USER_DATA_FOLDER = $null
Add-Line ("env RUST_BACKTRACE=" + $env:RUST_BACKTRACE)
Add-Line ("env WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=" + $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS)
$started = Get-Date
try {
    $p = Start-Process -FilePath $exe -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr -ErrorAction Stop
    Add-Line ("started pid=" + $p.Id)
} catch {
    Add-Line ("launch failed: " + $_.Exception.Message)
    $p = $null
}

if ($p -ne $null) {
    for ($i = 1; $i -le $WaitSeconds; $i++) {
        Start-Sleep -Seconds 1
        if ($p.HasExited) { break }
    }
    $alive = -not $p.HasExited
    Add-Line ("alive after wait: " + $alive)
    if ($alive) {
        $wv = @(Get-Process msedgewebview2 -ErrorAction SilentlyContinue)
        Add-Line ("webview2 processes: " + $wv.Count)
        $p.Kill()
    } else {
        $p.Refresh()
        Add-Line ("exit code: " + $p.ExitCode)
    }
}

Add-Block 'profile state after run'
Add-Line ("profile exists: " + (Test-Path $profileDir))
if (Test-Path $profileDir) {
    $files = @(Get-ChildItem $profileDir -Recurse -File -Force -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    Add-Line ("files: " + $files.Count)
    $files | Select-Object -First 8 | ForEach-Object { Add-Line ("  " + $_.LastWriteTime + " " + $_.FullName) }
    foreach ($logName in 'chrome_debug.log', 'debug.log') {
        $logFile = Join-Path $profileDir $logName
        if (Test-Path $logFile) {
            $dst = Join-Path $outDir ("profile-" + $logName)
            Copy-Item $logFile $dst -Force -ErrorAction SilentlyContinue
            Add-Line ("copied " + $dst)
        }
    }
}

Add-Block 'token privileges'
$privs = & whoami.exe /priv 2>&1
$privs | ForEach-Object { $t = ('' + $_).Trim(); if ($t) { Add-Line $t } }

Add-Block 'profile write test'
$probeDir = Join-Path $localDir 'EBWebView'
$writeOk = $false
try {
    New-Item -ItemType Directory -Force -Path $probeDir -ErrorAction Stop | Out-Null
    $writeOk = $true
} catch {
    Add-Line ("mkdir failed: " + $_.Exception.Message)
}
Add-Line ("mkdir " + $probeDir + " ok=" + $writeOk)
if ($writeOk) {
    try {
        Set-Content -Path (Join-Path $probeDir 'probe.txt') -Value 'x' -ErrorAction Stop
        Add-Line 'write file ok'
    } catch {
        Add-Line ("write file failed: " + $_.Exception.Message)
    }
    Remove-Item $probeDir -Recurse -Force -ErrorAction SilentlyContinue
}

Add-Block 'profile matrix'
function Invoke-MatrixRun([string]$profilePath, [string]$tag, [int]$seconds) {
    Get-Process aether-desktop, msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    if ($profilePath) {
        Remove-Item $profilePath -Recurse -Force -ErrorAction SilentlyContinue
        $env:WEBVIEW2_USER_DATA_FOLDER = $profilePath
    } else {
        $env:WEBVIEW2_USER_DATA_FOLDER = $null
    }
    $outFile = Join-Path $outDir ("matrix-" + $tag + ".out.log")
    $errFile = Join-Path $outDir ("matrix-" + $tag + ".err.log")
    $proc = Start-Process -FilePath $exe -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile -ErrorAction SilentlyContinue
    $wvCount = 0
    for ($i = 0; $i -lt $seconds; $i++) {
        Start-Sleep -Seconds 1
        if ($proc.HasExited) { break }
        $wvCount = @(Get-Process msedgewebview2 -ErrorAction SilentlyContinue).Count
    }
    $alive = -not $proc.HasExited
    if ($alive) { $proc.Kill() }
    Start-Sleep -Seconds 1
    $errText = if (Test-Path $errFile) { Get-Content $errFile -Raw -ErrorAction SilentlyContinue } else { '' }
    if ($null -eq $errText) { $errText = '' }
    $hits = @([regex]::Matches($errText, 'HRESULT\(0x[0-9A-Fa-f]+\)') | ForEach-Object { $_.Value } | Select-Object -Unique)
    $created = if ($profilePath) { Test-Path $profilePath } else { Test-Path $defaultProfilePath }
    Add-Line ("[" + $tag + "] alive=" + $alive + " webviewProcs=" + $wvCount + " profileCreated=" + $created + " hresult=" + ($hits -join ','))
}
$defaultProfilePath = Join-Path $localDir 'EBWebView'
$tempProfile = Join-Path $env:TEMP ("aether-diag-prof-" + $stamp)
$wsProfile = Join-Path $outDir 'prof'
$docProfile = Join-Path ([Environment]::GetFolderPath('MyDocuments')) ("aether-diag-prof-" + $stamp)
$localOtherProfile = Join-Path $localDir ("prof-" + $stamp)
Invoke-MatrixRun '' 'default' 12
Invoke-MatrixRun $tempProfile 'temp' 12
Invoke-MatrixRun $localOtherProfile 'localappdata_subdir' 12
Invoke-MatrixRun $docProfile 'documents' 12
Invoke-MatrixRun $wsProfile 'workspace' 12
Get-Process aether-desktop, msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Add-Block 'windows events last 20 min'
$since = (Get-Date).AddMinutes(-20)
$events = Get-WinEvent -FilterHashtable @{ LogName = 'Application'; StartTime = $since } -ErrorAction SilentlyContinue
$events = @($events | Where-Object { $_.Message -match 'aether|webview|msedge|Application Error|\.NET Runtime' })
Add-Line ("application events: " + $events.Count)
$events | Select-Object -First 10 | ForEach-Object {
    Add-Line ("--- " + $_.TimeCreated + " " + $_.ProviderName + " id=" + $_.Id)
    Add-Line (($_.Message -split "`r?`n" | Select-Object -First 6) -join ' / ')
}
$wer = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportArchive" -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 5
Add-Line ("wer reports: " + @($wer).Count)
$wer | ForEach-Object { Add-Line ("  " + $_.LastWriteTime + " " + $_.Name) }

Add-Block 'summary'
$errText = if (Test-Path $stderr) { Get-Content $stderr -Raw -ErrorAction SilentlyContinue } else { '' }
if ($null -eq $errText) { $errText = '' }
$hr = [regex]::Matches($errText, 'HRESULT\(0x[0-9A-Fa-f]+\)') | ForEach-Object { $_.Value } | Select-Object -Unique
Add-Line ("hresult: " + ($hr -join ', '))
Add-Line ("error log size: " + $errText.Length)
Add-Line ("folder: " + $outDir)

Write-Host ""
Write-Host "diagnostic done"
Write-Host ("folder: " + $outDir)
Write-Host ("hresult: " + ($hr -join ', '))
Write-Host "send me report.txt and app.err.log"
if (-not $NoPause) { Read-Host 'enter to close' }
