# Supermate-harness-launcher - one-click start: DeepSeek Harness (v0.1.3, auth-aware) + Quark (Qianwen sidebar)
# ASCII-only (double-click launch.bat runs Windows PowerShell 5.1; Chinese comments would mojibake without BOM).
# v0.1.3 dsh web prints a per-launch token URL into <webroot>\web-server.log
# ("dsh web: http://127.0.0.1:3080/?token=..."). Opening that URL mints the browser cookie.
# This script: starts web (--no-open via start-web.cmd), accepts 200 OR 401 as "online",
# parses the token URL and opens IT in Quark, then prepares the sidebar.
$ErrorActionPreference = 'SilentlyContinue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here

# ---- config ----
if (Test-Path (Join-Path $root 'config.ps1')) { . (Join-Path $root 'config.ps1') }
if (-not $HarnessUrl) { $HarnessUrl = 'http://127.0.0.1:3080' }
$webRoot = $null
if ($HarnessStartCmd) { $webRoot = Split-Path -Parent $HarnessStartCmd }   # e.g. E:\deepseek-harness-v013
$webLog   = if ($webRoot) { Join-Path $webRoot 'web-server.log' } else { $null }

function Test-Harness {
  # 200 (authorized) or 401 (server up, cookie needed) both mean the server is running.
  try {
    $r = Invoke-WebRequest -Uri $HarnessUrl -TimeoutSec 3 -UseBasicParsing
    return ($r.StatusCode -eq 200 -or $r.StatusCode -eq 401)
  } catch { return $false }
}

function Resolve-TokenUrl {
  $u = $null
  if ($webLog -and (Test-Path $webLog)) {
    $m = Select-String -Path $webLog -Pattern 'dsh web: (http://127\.0\.0\.1:3080/\?token=\S+)' -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($m) { $u = $m.Matches[0].Groups[1].Value }
  }
  if (-not $u) { $u = $HarnessUrl }
  return $u
}

function Resolve-OpenUrl {
  # Dual-mode: rc.5 (no auth) answers 200 to a cookie-less GET -> plain URL.
  # v0.1.3 (auth) answers 401 -> we need the per-launch token URL from web-server.log.
  try {
    $rr = Invoke-WebRequest -Uri $HarnessUrl -TimeoutSec 3 -UseBasicParsing
    if ($rr.StatusCode -eq 200) { return $HarnessUrl }
  } catch { }
  for ($i = 0; $i -lt 5; $i++) {   # give the token line time to flush
    $u = Resolve-TokenUrl
    if ($u -ne $HarnessUrl) { return $u }
    Start-Sleep -Seconds 2
  }
  return (Resolve-TokenUrl)
}

# ---- 1) Harness server ----
if (-not (Test-Harness)) {
  if ($HarnessStartCmd -and (Test-Path $HarnessStartCmd)) {
    Write-Host '[1/3] Starting Harness web server ...'
    Start-Process -FilePath $HarnessStartCmd -WorkingDirectory (Split-Path -Parent $HarnessStartCmd)
    $up = $false
    for ($i = 0; $i -lt 90; $i++) {
      Start-Sleep -Seconds 2
      if (Test-Harness) { $up = $true; break }
    }
    if ($up) { Write-Host '[1/3] Harness online.' } else { Write-Host '[WARN] Harness did not come up in 180s.' }
  } else {
    Write-Host '[WARN] Harness not running and HarnessStartCmd not configured - start it manually, then re-run.'
  }
} else {
  Write-Host '[1/3] Harness already online.'
}
$openUrl = Resolve-OpenUrl

# ---- 2) Quark (debug port 9222) ----
$cdpUp = $false
try { $null = Invoke-RestMethod 'http://127.0.0.1:9222/json/version' -TimeoutSec 3; $cdpUp = $true } catch { }
if (-not $cdpUp) {
  $quark = $QuarkExe
  if (-not $quark) {
    $cmd = Get-Command quark.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { $quark = $cmd.Source }
    if (-not $quark) {
      $cands = @("$env:LOCALAPPDATA\Programs\Quark\quark.exe", "$env:ProgramFiles\Quark\quark.exe", "$env:ProgramFiles\Quark\*\quark.exe", "${env:ProgramFiles(x86)}\Quark\quark.exe", "$env:ProgramData\Quark\quark.exe", "$env:USERPROFILE\AppData\Local\Programs\Quark\quark.exe")
      foreach ($c in $cands) { $r2 = Resolve-Path $c -ErrorAction SilentlyContinue; if ($r2) { $quark = $r2[0].Path; break } }
    }
  }
  if ($quark -and (Test-Path $quark)) {
    # Quark single-instance: if already running WITHOUT debug port, close it first so flags apply.
    $runningQuark = Get-Process quark -ErrorAction SilentlyContinue
    if ($runningQuark) {
      Write-Host '[2/3] Quark running without debug port - restarting with 9222 ...'
      $runningQuark | Stop-Process -Force
      Start-Sleep -Seconds 3
    }
    Write-Host '[2/3] Starting Quark (debug port 9222) ...'
    $tabId = Get-Random -Minimum 1000000000 -Maximum 1999999999
    Start-Process -FilePath $quark -ArgumentList @('--remote-debugging-port=9222', $openUrl, "https://p.quark.cn/pcquark-chat/sidebar?entry=frame&tab_id=$tabId&entry_l2=up_right&type=website")
    Start-Sleep -Seconds 12
  } else {
    Write-Host '[WARN] Quark not found. Install Quark or set QuarkExe in config.ps1.'
    exit 1
  }
} else {
  Write-Host '[2/3] Quark already running with debug port - opening Harness tab ...'
  if ($quarkPath = $QuarkExe) { } else { $quarkPath = 'C:\Program Files\Quark\quark.exe' }
  if (-not (Test-Path $quarkPath)) { $quarkPath = 'C:\Program Files\Quark\7.1.2.956\quark.exe' }
  if (Test-Path $quarkPath) { Start-Process -FilePath $quarkPath -ArgumentList @($openUrl) }
  Start-Sleep -Seconds 4
}

# ---- 3) ensure tabs + open Qianwen floating sidebar ----
Write-Host '[3/3] Ensuring tabs and opening Qianwen floating sidebar ...'
& (Join-Path $here 'quark_prepare.ps1')
Write-Host 'Done. Harness + Quark + Qianwen sidebar ready.'
