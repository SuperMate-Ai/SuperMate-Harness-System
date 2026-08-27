# quark_ai_panel.ps1 — 跨机型/跨DPI定位并点击夸克"问AI"按钮（千问悬浮侧边栏开关）
# 原理：位置比例固定、像素随分辨率/DPI 变化
#   → EnumWindows 找夸克"可见+面积最大"的主窗口（MainWindowHandle 对夸克无效）
#   → 声明 DPI 感知 → 取窗口矩形 → 截图右上工具栏区 → 颜色扫描蓝星(取最顶部簇) → 点击
param([switch]$Log)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W4 { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo); [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r); public struct RECT { public int L, T, Rt, B; } }'
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W6 { public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd); }'

[W4]::SetProcessDPIAware() | Out-Null

# ---- 0) EnumWindows 找夸克主窗口（可见 + 面积最大；MainWindowHandle 对夸克返回 0）----
$quarkPids = @(Get-Process quark -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$script:bestArea = 0; $script:bestHwnd = [IntPtr]::Zero
$cb = [W6+EnumWindowsProc]{ param($hwnd, $lParam)
  $pid2 = 0
  [W6]::GetWindowThreadProcessId($hwnd, [ref]$pid2) | Out-Null
  if ($quarkPids -contains $pid2) {
    $r2 = New-Object W4+RECT
    [W4]::GetWindowRect($hwnd, [ref]$r2) | Out-Null
    $area = ($r2.Rt - $r2.L) * ($r2.B - $r2.T)
    if ([W6]::IsWindowVisible($hwnd) -and $area -gt $script:bestArea) {
      $script:bestArea = $area; $script:bestHwnd = $hwnd
    }
  }
  return $true
}
[W6]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
if ($script:bestHwnd -eq [IntPtr]::Zero) { Write-Host 'NO_QUARK'; exit 2 }

$r = New-Object W4+RECT
[W4]::GetWindowRect($script:bestHwnd, [ref]$r) | Out-Null
$winW = $r.Rt - $r.L; $winH = $r.B - $r.T
if ($Log) { Write-Host "window: ($($r.L),$($r.T))-($($r.Rt),$($r.B)) ${winW}x${winH} hwnd=$($script:bestHwnd)" }

# ---- 1) 截图右上工具栏区（按窗口比例取，覆盖高 DPI 的更高工具栏）----
$stripW = [Math]::Min(800, $winW)
$stripH = [Math]::Max(50, [Math]::Min(120, [Math]::Round($winH * 0.1)))
$x0 = $r.Rt - $stripW; $y0 = $r.T
$bmp = New-Object System.Drawing.Bitmap($stripW, $stripH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($x0, $y0, 0, 0, (New-Object System.Drawing.Size($stripW, $stripH)))
$g.Dispose()

# ---- 2) 颜色扫描蓝色像素，聚类后取最顶部簇（星标永远高于头像等其它蓝色元素）----
$pts = @()
for ($x = 0; $x -lt $stripW; $x++) {
  for ($y = 0; $y -lt $stripH; $y++) {
    $c = $bmp.GetPixel($x, $y)
    if ($c.B -gt 140 -and ($c.B - $c.R) -gt 40 -and $c.G -lt 210) { $pts += @($x, $y) }
  }
}
$bmp.Dispose()

$cx = 0; $cy = 0
if ($pts.Count -gt 4) {
  $clusters = @()
  for ($i = 0; $i -lt $pts.Count; $i += 2) {
    $px = $pts[$i]; $py = $pts[$i + 1]; $merged = $false
    for ($j = 0; $j -lt $clusters.Count; $j++) {
      $c = $clusters[$j]
      if ([Math]::Abs($px - $c.CX) -lt 40 -and [Math]::Abs($py - $c.CY) -lt 30) {
        $c.Count++; $c.SumX += $px; $c.SumY += $py
        $c.CX = [math]::Round($c.SumX / $c.Count); $c.CY = [math]::Round($c.SumY / $c.Count)
        $merged = $true; break
      }
    }
    if (-not $merged) { $clusters += [pscustomobject]@{ Count = 1; SumX = $px; SumY = $py; CX = $px; CY = $py } }
  }
  $real = @($clusters | Where-Object { $_.Count -ge 3 })
  if ($real.Count) {
    $top = $real | Sort-Object CY | Select-Object -First 1
    $cx = $top.CX; $cy = $top.CY
    if ($Log) { Write-Host "blue star cluster at strip ($cx,$cy) count=$($top.Count)" }
  }
}
if ($cx -eq 0 -and $cy -eq 0) {
  # ---- 兜底：按窗口宽高比换算（参考 1936x1048 下"右缘-175、顶缘+26"）----
  $fx = $winW / 1936.0; $fy = $winH / 1048.0
  $cx = $stripW - [math]::Round(175 * $fx)
  $cy = [math]::Round(26 * $fy)
  if ($Log) { Write-Host 'fallback ratio offsets' }
}

$screenX = $x0 + $cx
$screenY = $y0 + $cy

# ---- 3) 置前窗口并点击 ----
[W4]::SetForegroundWindow($script:bestHwnd) | Out-Null
Start-Sleep -Milliseconds 600
[W4]::SetCursorPos($screenX, $screenY) | Out-Null
Start-Sleep -Milliseconds 250
[W4]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
[W4]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
Write-Host "CLICKED ($screenX,$screenY)"
