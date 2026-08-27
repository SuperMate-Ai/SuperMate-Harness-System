---
name: deepseek-eyes
description: deepseek-eyes：协助文本 AI 模型做图片分析——给 DeepSeek Harness（DSH）里的文本模型长眼睛。Use when DSH needs to analyze an image file or a folder of images (asset entry, prompt management, screenshot understanding, image comparison, OCR-in-image)：first preprocess (convert any non-PNG/JPEG format such as WebP to PNG; downscale long edge to at most 1080px), then call a vision model — a local Ollama model (think off) OR an OpenAI-compatible vision API — and return a structured Chinese description plus retrieval tags that get injected into the text model's context. Prerequisite：the user must have either a local vision model or a vision API key.
---

# 图片分析（在 DSH 里给文本模型长眼睛）

把任意图片变成**结构化文本描述 + 检索标签**，让 DSH（DeepSeek Harness）里的文本模型（DeepSeek 等，也支持换成其他文本模型）"看见"图片、基于图片内容推理。

> **前提条件（二选一）**：用户须具备其一——① **本地视觉模型**（Ollama 已装并运行 + 一个 vision 能力的模型）；或 ② **OpenAI 兼容的视觉 API**（任意服务商，需 API Key）。两种通道脚本都支持，`-Provider local`（默认）或 `-Provider openai`。

## 核心流程（三步）

对任意图片（单张或文件夹批量）：

1. **预处理**：非 PNG/JPEG 格式（WebP/GIF/BMP/TIFF）统一转 PNG（无损）；长边 > 1080 等比缩放到 1080（可调）；
2. **分析**：调用本地 Ollama 视觉模型（`think: false` 强制关思考），输出中文结构化描述 + 3-6 个检索标签；
3. **交付**：返回描述文本（连同预处理信息：原尺寸/格式 → 处理后尺寸），供入库、提示词管理或注入上下文。

## 执行方式

### 方式 A（推荐）：调用同目录脚本 `deepseek-eyes.ps1`

```powershell
# 单张图：本地 Ollama（默认通道）
& '...\deepseek-eyes.ps1' -ImagePath '<图片路径>'

# 单张图：OpenAI 兼容视觉 API
$env:VISION_API_KEY = '<你的Key>'          # 或 -ApiKey 参数
& '...\deepseek-eyes.ps1' -ImagePath '<图片路径>' -Provider openai -Model 'gpt-4o-mini'

# 批量：对文件夹内所有图片循环调用
Get-ChildItem '<文件夹>' -Include *.png,*.jpg,*.webp -Recurse | ForEach-Object {
  & '...\deepseek-eyes.ps1' -ImagePath $_.FullName
}
```

参数与环境变量（详见脚本 `Get-Help`）：

| 参数 | 默认 | 说明 |
|---|---|---|
| `-ImagePath` | 必填 | 输入图片 |
| `-Provider` | `local` | `local`（Ollama）或 `openai`（OpenAI 兼容 API） |
| `-Model` | `llava:13b` / `gpt-4o-mini` | 视觉模型名 |
| `-Endpoint` | `http://127.0.0.1:11434` / `https://api.openai.com/v1` | 服务地址（其他兼容服务自行指定） |
| `-ApiKey` | 空 | 仅 `openai` 需要；优先用 `$env:VISION_API_KEY` |
| `-MaxEdge` | `1080` | 长边阈值；需要极致细节调 `1536` |
| `-Prompt` | 内置 | 自定义提示词 |
| `-MaxTokens` | `700` | 输出上限 |

全部配置支持环境变量覆盖：`VISION_PROVIDER` / `VISION_MODEL` / `VISION_ENDPOINT` / `VISION_API_KEY`（优先级：参数 > 环境变量 > 默认）。

> 本地通道模型未装时先 `ollama pull <模型>`；查看本机模型：`ollama list`。

### 方式 B：内联执行（无脚本环境时）

```powershell
# 1. 预处理：任意格式 -> PNG，长边缩放 1080
Add-Type -AssemblyName PresentationCore
function Convert-ImageForVision($src, $dst) {
  $fs = [IO.File]::OpenRead($src)
  $dec = [Windows.Media.Imaging.BitmapDecoder]::Create($fs, [Windows.Media.Imaging.BitmapCreateOptions]::None, [Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
  $frame = $dec.Frames[0]
  $w = [double]$frame.PixelWidth; $h = [double]$frame.PixelHeight
  $long = [Math]::Max($w, $h)
  if ($long -gt 1080) {
    $scale = 1080.0 / $long; $tw = [int][Math]::Round($w*$scale); $th = [int][Math]::Round($h*$scale)
    $t = New-Object Windows.Media.Imaging.TransformedBitmap
    $t.BeginInit(); $t.Source = $frame; $t.Transform = New-Object Windows.Media.ScaleTransform ($tw/$w),($th/$h); $t.EndInit()
    $frame = $t
  }
  $enc = New-Object Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($frame))
  $out = [IO.File]::Create($dst); $enc.Save($out); $out.Close(); $fs.Close()
}
Convert-ImageForVision '<原图>' '<输出.png>'

# 2. 分析（必须 UTF-8 字节发送，见下方"关键坑"）
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes('<输出.png>'))
$prompt = '请用中文详细描述这张图片的内容和画面元素（人物/动作/文字/形状/颜色/布局）。如果图中有文字请完整读出。最后给出 3-6 个检索标签（逗号分隔）。请具体、准确。'
$body = @{ model='<视觉模型>'; stream=$false; think=$false; options=@{ num_predict=700 }; messages=@(@{ role='user'; content=$prompt; images=@($img) }) } | ConvertTo-Json -Depth 8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)   # 关键：UTF-8 字节
$r = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/chat' -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 600
$r.message.content
```

## 输出约定

- 中文结构化描述（内容 → 元素 → 文字 → 标签），供资产入库与提示词管理使用；
- 报告时附上预处理信息（原尺寸/格式 → 处理后尺寸），便于判断是否因缩放丢失细节；
- 需要更高细节（小字号 OCR、极密插画）时临时放宽长边到 1536，默认 1080。

## 设计依据（通用原则，任何机器适用）

- **为什么缩放**：视觉模型按 patch 编码图像，分辨率过高时 token 数爆炸、上下文被图片吃满、速度骤降。实测 2560×1440 直喂约 3647 tokens，缩放到 1080 后约 713 tokens（降 80%），质量无感知损失。长边 1080 是"信息保留/上下文占用/速度"的平衡点。
- **为什么转 PNG**：llama.cpp/Ollama 对 WebP 解码兼容性差（直读报 `Failed to load image or audio file`），PNG 无损且稳定。
- **为什么关思考**：Qwen 系视觉模型默认开思考，token 全花在推理上，正文为空；`think: false` 必开。
- **关键坑——UTF-8 编码**：Windows PowerShell 5.1 的 `Invoke-RestMethod -Body <string>` 按 ASCII 编码请求体，中文会变成 `?`，模型误判为"乱码/问号"并跑偏。**必须 `[System.Text.Encoding]::UTF8.GetBytes($body)` 以字节发送。**

## 故障排查

| 现象 | 原因与处理 |
|---|---|
| `model not found`（local） | 本地模型未装：`ollama pull <模型>` |
| 连不上 Ollama（local） | 检查服务是否在跑（`ollama serve`）、`-Endpoint` 端口（默认 11434） |
| 401/403（openai） | API Key 无效或权限不足：检查 `-ApiKey` / `$env:VISION_API_KEY`，并确认模型对当前账号可用 |
| `Failed to load image or audio file` | 格式不被解码：确认走了预处理转 PNG 步骤 |
| 输出是空/只有思考 | 未关思考：local 通道确认请求带 `think:false`（脚本已内置） |
| 回复出现"您输入的是一串问号" | 中文请求体被 ASCII 化：改用 UTF-8 字节发送（脚本已内置） |
| 模型很慢 | `ollama ps` 看 PROCESSOR：含 CPU 说明显存不够，降低模型的 num_ctx（如 16384~32768）或换更小量化档 |

## 实测记录（示例环境：RTX 5080 16GB / 32GB，Ollama 11598）

| 测试图 | 预处理 | 结果 |
|---|---|---|
| WebP 角色设定图 1280×714 | →PNG 1080×602 | 文字/服装/特征全读出 + 6 标签 ✅ |
| 竖屏截图 335×773 | 无需缩放 | 界面元素 + 提示词原文逐字读出 ✅ |
| 9.85MB 大图 5404×3040 | →1080×608 | 角色设定全读出 + 6 标签 ✅ |
