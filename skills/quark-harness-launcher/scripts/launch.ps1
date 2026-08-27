# quark-harness-launcher — 一键启动 DeepSeek Harness + 夸克（千问悬浮侧边栏）
# 用法: powershell -ExecutionPolicy Bypass -File launch.ps1   或双击 launch.bat
$ErrorActionPreference = 'SilentlyContinue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here   # 上一层 = skill 根目录（config.ps1 所在）

# ---- 配置 ----
if (Test-Path (Join-Path $root 'config.ps1')) { . (Join-Path $root 'config.ps1') }
if (-not $HarnessUrl) { $HarnessUrl = 'http://127.0.0.1:3080' }

function Test-Harness {
  try { $r = Invoke-WebRequest -Uri $HarnessUrl -TimeoutSec 3 -UseBasicParsing; return ($r.StatusCode -eq 200) } catch { return $false }
}

# ---- 1) Harness 服务器 ----
if (-not (Test-Harness)) {
  if ($HarnessStartCmd -and (Test-Path $HarnessStartCmd)) {
    Write-Host '[1/3] Starting Harness web server ...'
    Start-Process -FilePath $HarnessStartCmd -WorkingDirectory (Split-Path -Parent $HarnessStartCmd)
    $up = $false
    for ($i = 0; $i -lt 60; $i++) {
      Start-Sleep -Seconds 2
      if (Test-Harness) { $up = $true; break }
    }
    if ($up) { Write-Host '[1/3] Harness online.' } else { Write-Host '[WARN] Harness did not come up in 120s.' }
  } else {
    Write-Host '[WARN] Harness not running and HarnessStartCmd not configured — start it manually, then re-run.'
  }
} else {
  Write-Host '[1/3] Harness already online.'
}

# ---- 2) 夸克浏览器（调试端口 9222）----
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
    # 夸克单实例：已在运行但无调试端口时，Start-Process 会复用旧进程并忽略参数 → 先关闭再重启
    $runningQuark = Get-Process quark -ErrorAction SilentlyContinue
    if ($runningQuark) {
      Write-Host '[2/3] Quark running without debug port - restarting with 9222 ...'
      $runningQuark | Stop-Process -Force
      Start-Sleep -Seconds 3
    }
    Write-Host '[2/3] Starting Quark (debug port 9222) ...'
    $tabId = Get-Random -Minimum 1000000000 -Maximum 1999999999
    Start-Process -FilePath $quark -ArgumentList @('--remote-debugging-port=9222', $HarnessUrl, "https://p.quark.cn/pcquark-chat/sidebar?entry=frame&tab_id=$tabId&entry_l2=up_right&type=website")
    Start-Sleep -Seconds 10
  } else {
    Write-Host '[WARN] Quark not found. Install Quark or set QuarkExe in config.ps1.'
    exit 1
  }
} else {
  Write-Host '[2/3] Quark already running with debug port.'
}

# ---- 3) 确保标签 + 打开千问悬浮侧边栏 ----
Write-Host '[3/3] Ensuring tabs and opening Qianwen floating sidebar ...'
& (Join-Path $here 'quark_prepare.ps1')
Write-Host 'Done. Harness + Quark + Qianwen sidebar ready.'
