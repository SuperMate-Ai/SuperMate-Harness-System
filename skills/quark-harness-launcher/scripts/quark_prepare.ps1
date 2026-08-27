# quark_prepare.ps1 — 确保夸克标签就绪并打开千问悬浮侧边栏
# 1) 确保 Harness GUI 标签存在（3080）
# 2) 确保千问侧边栏页面存在（pcquark-chat，带 frame 参数，否则报 instanceId required）
# 3) 调用 quark_ai_panel.ps1 点击"问AI"，把侧边栏以悬浮面板形式打开
param()
$ErrorActionPreference = 'SilentlyContinue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here   # 上一层 = skill 根目录（config.ps1 所在）
if (Test-Path (Join-Path $root 'config.ps1')) { . (Join-Path $root 'config.ps1') }
if (-not $HarnessUrl) { $HarnessUrl = 'http://127.0.0.1:3080' }

$l = $null
try { $l = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 3 } catch { }
if (-not $l) { Write-Host 'NO_CDP'; exit 1 }

# ---- 1) Harness GUI 标签 ----
if (-not ($l | Where-Object { $_.url -match '127\.0\.0\.1:3080' })) {
  try { Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:9222/json/new?$([uri]::EscapeDataString($HarnessUrl))" -TimeoutSec 5 | Out-Null; Write-Host 'created Harness tab' } catch { }
}

# ---- 2) 千问侧边栏页面 ----
if (-not ($l | Where-Object { $_.url -match 'pcquark-chat' })) {
  $tabId = Get-Random -Minimum 1000000000 -Maximum 1999999999
  $u = "http://127.0.0.1:9222/json/new?https%3A%2F%2Fp.quark.cn%2Fpcquark-chat%2Fsidebar%3Fentry%3Dframe%26tab_id%3D$tabId%26entry_l2%3Dup_right%26type%3Dwebsite"
  try { Invoke-RestMethod -Method Put -Uri $u -TimeoutSec 5 | Out-Null; Write-Host "created sidebar tab ($tabId)"; Start-Sleep -Seconds 6 } catch { }
}

# ---- 3) 点击"问AI"打开悬浮面板 ----
& (Join-Path $here 'quark_ai_panel.ps1')
