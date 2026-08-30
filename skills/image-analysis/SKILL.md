---
name: image-analysis
description: 本地视觉模型图片分析。Use when analyzing an image file for asset entry, prompt management, or any vision task: first preprocess (convert any non-PNG/JPEG format such as WebP to PNG; downscale so the long edge is at most 1080px), then run the local Ollama vision model (default ornith-1.5:9b, think off) and return a structured Chinese description plus retrieval tags.
---

# 图片分析（本地视觉模型）

任何需要"读图"的任务（资产入库、提示词管理、截图理解、图片对比等）都先走本流程。在 5080 16GB 显存 / 32GB 内存机器上实测通过。

## 1. 预处理（必做，统一入口）

对任意图片文件执行：

1. **格式**：模型只保证 PNG/JPEG 稳定可读。WebP 及其他格式（GIF 动图取首帧、BMP、TIFF 等）统一转成 **PNG**（无损）。
2. **尺寸**：计算长边（max 宽高）。若**长边 > 1080**，等比缩放到长边 = 1080；若 ≤ 1080 保持原尺寸（不放大）。
3. 输出到工作区缓存路径（如 `E:\Harness Workspace\vision_tmp\<原名>.png`）。

预处理 PowerShell（WIC 编解码，Windows 自带，无需装软件；失败回退 ffmpeg）：

```powershell
Add-Type -AssemblyName PresentationCore
function Convert-ImageForVision($src, $dst) {
  $fs = [System.IO.File]::OpenRead($src)
  $dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create($fs, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
  $frame = $dec.Frames[0]
  $w = [double]$frame.PixelWidth; $h = [double]$frame.PixelHeight
  $long = [Math]::Max($w, $h)
  if ($long -gt 1080) { $scale = 1080.0 / $long; $tw = [int][Math]::Round($w * $scale); $th = [int][Math]::Round($h * $scale) } else { $tw = [int]$w; $th = [int]$h }
  if ($tw -ne [int]$w -or $th -ne [int]$h) {
    $t = New-Object System.Windows.Media.Imaging.TransformedBitmap
    $t.BeginInit(); $t.Source = $frame; $t.Transform = New-Object System.Windows.Media.ScaleTransform ($tw/$w), ($th/$h); $t.EndInit()
    $frame = $t
  }
  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($frame))
  $out = [System.IO.File]::Create($dst); $enc.Save($out); $out.Close(); $fs.Close()
  Write-Host "OK: $($frame.PixelWidth)x$($frame.PixelHeight) -> $dst"
}
Convert-ImageForVision '<原图路径>' '<输出路径>'
```

> WIC 解码失败时（罕见格式）回退：`ffmpeg -i <src> -vf "scale='min(1080,iw)':-2" <dst>`。

## 2. 分析（调用本地 Ollama 视觉模型）

预处理后的 PNG 用 Ollama `/api/chat` 分析：**ornith-1.5:9b**（2026-08-22 定标：9B Q8_0 10GB、100% GPU、256K 上下文、视觉质量与 35B 同级且最省资源——16GB 显存下 35B 要 14-24GB，9B 只需 10GB，留出显存余量），**必须 `think: false`**（关思考，否则 token 全花在推理上正文为空）。

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$img = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes('<预处理后PNG路径>'))
$prompt = '请用中文详细描述这张图片的内容和画面元素（人物/动作/文字/形状/颜色/布局）。如果图中有文字请完整读出。最后给出 3-6 个检索标签（逗号分隔）。请具体、准确。'
$body = @{ model = 'ornith-1.5:9b'; stream = $false; think = $false; options = @{ num_predict = 700 }; messages = @(@{ role='user'; content=$prompt; images = @($img) }) } | ConvertTo-Json -Depth 8
# 关键：必须用 UTF-8 字节发送！Windows PowerShell 5.1 的 Invoke-RestMethod -Body <string>
# 默认按 ASCII 编码，中文会被替换成 '?'（模型会误以为收到乱码/问号，产生"问号怪癖"）
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$r = Invoke-RestMethod -Uri 'http://127.0.0.1:11598/api/chat' -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 600
$r.message.content
```

## 3. 输出约定

- 中文结构化描述（内容 → 元素 → 文字 → 标签），供资产入库与提示词管理使用；
- 报告时附上预处理信息（原尺寸/格式 → 处理后尺寸），便于判断是否因缩放丢失细节；
- 需要更高细节时（小字号 OCR、极密插画），临时放宽长边到 1536（token 约翻倍到 ~1400），默认 1080。

## 设计依据与实测数据（本机：RTX 5080 16GB + 32GB 内存，Ollama 端口 11598）

- **缩放收益**（天宫大图 2560×1440）：原图直喂 3647 tokens / 119s；缩放 1080 后 713 tokens / 4.9s——**token 降 80%、快 24 倍，读图质量无感知损失**（视觉模型按 patch 编码，分辨率过高 token 爆炸且易溢出上下文）。
- **格式兼容**：WebP 在 llama.cpp/Ollama 解码兼容性差（实测直喂报 "Failed to load image or audio file"），PNG 无损转换是稳定解。
- **编码坑（重要修复）**：Windows PowerShell 5.1 的 `Invoke-RestMethod -Body <string>` 按 ASCII 编码，中文请求体会变成 `?`，模型会误判为"乱码/问号"并偏离任务——必须显式 `[System.Text.Encoding]::UTF8.GetBytes($body)` 发送（见第 2 节注释）。
- **模型选择（2026-08-22 更新）**：视觉默认改为 **ornith-1.5:9b**（9B Q8_0，10GB，100% GPU，256K 上下文；实测三视图/角色设定图分析质量与 35B 同级，识别出服装/构图/设定文字/标签）。备选：Qwen3.6-35B-IQ3_S（14GB，~115 tok/s，更复杂的理解任务）、ornith-1.5:35b（22GB，资源占用大，非必需不用）。qwen3.8 系列需把 num_ctx 压到 16K~32K 才能接近满显存（128K 上下文时仅 76% GPU、~9 tok/s）。
- **上下文**：128K 是显存杀手；本机建议 num_ctx ≤ 32768，日常 16384 即可（9B 跑 256K 全 GPU 12GB，但视觉分析用不到）。

## 实测验证记录（2026-08-15 / 2026-08-22）

| 测试图 | 预处理 | 结果 |
|---|---|---|
| WebP 角色设定图 1280×714 | →PNG 1080×602 | 文字/服装/特征全读出 + 6 标签 |
| 竖屏截图 335×773 | 无需缩放 | 界面元素 + 提示词原文逐字读出 |
| 9.85MB 大图 5404×3040 | →1080×608 | 角色设定全读出 + 6 标签 |
| 三视图 1280×720（ornith-1.5:9b） | 无需缩放 | 结构化四段式（人物/场景/构图/画质）+ 16 标签 + 识别设定文字，质量与 35B 同级 |
