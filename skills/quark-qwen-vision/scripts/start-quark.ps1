<#
  start-quark.ps1 — 跨机器通用夸克启动器（quark-qwen-vision skill）
  自动查找 quark.exe（常见目录 / PATH / 注册表卸载项）：
    - 若 9222 调试端口已监听 → 跳过重启，直接确保千问对话页打开
    - 否则关闭现有 quark → 以 --remote-debugging-port=9222 重启 → 等待端口 → 打开千问对话页
  用法: powershell -ExecutionPolicy Bypass -File start-quark.ps1
#>
$ErrorActionPreference = 'SilentlyContinue'

# ---------- 1. 查找 quark.exe ----------
$cands = @()
$cmd = Get-Command quark.exe | Select-Object -First 1
if ($cmd) { $cands += $cmd.Source }
$cands += @(
  "$env:LOCALAPPDATA\Programs\Quark\quark.exe",
  "$env:ProgramFiles\Quark\quark.exe",
  "$env:ProgramFiles\Quark\*\quark.exe",
  "${env:ProgramFiles(x86)}\Quark\quark.exe",
  "$env:ProgramData\Quark\quark.exe",
  "$env:USERPROFILE\AppData\Local\Programs\Quark\quark.exe"
)
$regRoots = @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($root in $regRoots) {
  Get-ItemProperty $root | Where-Object { $_.DisplayName -match '夸克|Quark' -and $_.InstallLocation } |
    ForEach-Object { $cands += (Join-Path $_.InstallLocation 'quark.exe') }
}
$quark = $null
foreach ($c in $cands) {
  $r = Resolve-Path $c -ErrorAction SilentlyContinue
  if ($r) { $quark = $r[0].Path; break }
}
if (-not $quark) { Write-Error '未找到夸克浏览器（quark.exe），请手动启动并带 --remote-debugging-port=9222'; exit 1 }
Write-Host "找到夸克: $quark"

# ---------- 2. 9222 是否已在线 ----------
$already = $false
try { $null = Invoke-RestMethod 'http://127.0.0.1:9222/json/version' -TimeoutSec 2; $already = $true } catch { }
if (-not $already) {
  $procs = @(Get-Process quark -ErrorAction SilentlyContinue)
  if ($procs.Count) { Write-Host "关闭 $($procs.Count) 个 quark 进程（保证调试端口生效）..."; $procs | Stop-Process -Force }
  Start-Sleep -Seconds 2
  Start-Process $quark -ArgumentList '--remote-debugging-port=9222'
  Write-Host '启动中，等待 9222 调试端口...'
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try { $null = Invoke-RestMethod 'http://127.0.0.1:9222/json/version' -TimeoutSec 2; $ready = $true; break } catch { }
  }
  if (-not $ready) { Write-Error '9222 端口未就绪'; exit 1 }
  Write-Host "9222 已就绪（约 $($i + 1) 秒）"
} else {
  Write-Host '9222 已在监听，跳过重启'
}

# ---------- 3. 确保千问对话页打开 ----------
$list = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 3
if ($list | Where-Object { $_.url -match 'pcquark-chat' }) {
  Write-Host '千问对话页已在'
} else {
  try {
    $null = Invoke-RestMethod -Method Put -Uri 'http://127.0.0.1:9222/json/new?https%3A%2F%2Fp.quark.cn%2Fpcquark-chat%2Fsidebar' -TimeoutSec 10
    Write-Host '千问对话页已打开: p.quark.cn/pcquark-chat/sidebar'
  } catch { Write-Host '对话页自动打开失败，请手动打开夸克 AI 侧边栏' }
}
Write-Host '完成：可直接运行 node "<skill 目录>\scripts\qwen-vision.js" <图片路径>'
