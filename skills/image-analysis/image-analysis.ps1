<#
.SYNOPSIS
    图片分析：预处理（任意格式转 PNG、长边缩放）+ 视觉模型描述 + 检索标签。
    给文本型 LLM 代理"长眼睛"：把图片转成结构化文本描述。

.DESCRIPTION
    通用脚本。**前提：用户须具备其一——(a) 本地 Ollama + 视觉模型；或 (b) 任意 OpenAI 兼容视觉 API（含 API Key）。**
    自动完成：
      1) 预处理：非 PNG/JPEG 格式（WebP/GIF/BMP/TIFF）转 PNG；长边 > MaxEdge 等比缩放
      2) 分析：调用视觉模型（本地 Ollama 或 OpenAI 兼容 API），强制关闭思考
      3) 输出：中文结构化描述 + 3-6 个检索标签

.PARAMETER ImagePath
    输入图片路径（必填）。

.PARAMETER Provider
    视觉模型来源：`local`（默认，Ollama）或 `openai`（OpenAI 兼容 API）。
    可用环境变量 VISION_PROVIDER 覆盖。

.PARAMETER OutputPng
    预处理后的 PNG 输出路径；缺省为图片同目录下 "<原名>_analysis.png"。

.PARAMETER MaxEdge
    长边缩放阈值（像素），默认 1080。需更高细节可调 1536。

.PARAMETER Model
    视觉模型名。
    local 默认 llava:13b；openai 默认 gpt-4o-mini。
    可用环境变量 VISION_MODEL 覆盖。

.PARAMETER Endpoint
    服务地址。
    local 默认 http://127.0.0.1:11434（Ollama 标准端口）；
    openai 默认 https://api.openai.com/v1（其他兼容服务自行指定，如
    https://dashscope.aliyuncs.com/compatible-mode/v1、https://generativelanguage.googleapis.com/v1beta/openai 等）。
    可用环境变量 VISION_ENDPOINT 覆盖。

.PARAMETER ApiKey
    API Key（仅 openai 需要）。可用环境变量 VISION_API_KEY 覆盖，避免明文写在命令行。

.PARAMETER Prompt
    自定义提示词；缺省使用内置默认提示词。

.PARAMETER MaxTokens
    输出 token 上限，默认 700。

.EXAMPLE
    # 本地 Ollama
    .\image-analysis.ps1 -ImagePath "D:\pics\photo.webp"

.EXAMPLE
    # 本地 Ollama（自定义端口/模型）
    .\image-analysis.ps1 -ImagePath "D:\pics\photo.png" -Model "qwen3-vl:7b" -Endpoint "http://127.0.0.1:11598"

.EXAMPLE
    # OpenAI 兼容 API
    $env:VISION_API_KEY = "sk-..."
    .\image-analysis.ps1 -ImagePath "D:\pics\photo.png" -Provider openai -Model "gpt-4o-mini"
#>
param(
  [Parameter(Mandatory=$true)][string]$ImagePath,
  [string]$Provider = '',
  [string]$OutputPng = '',
  [int]$MaxEdge = 1080,
  [string]$Model = '',
  [string]$Endpoint = '',
  [string]$ApiKey = '',
  [string]$Prompt = '',
  [int]$MaxTokens = 700
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ── 配置解析：参数 > 环境变量 > 默认 ─────────────────────────────
if (-not $Provider) { $Provider = if ($env:VISION_PROVIDER) { $env:VISION_PROVIDER } else { 'local' } }
if ($Provider -notin @('local','openai')) { throw "Provider 无效: '$Provider'（仅支持 local / openai）" }
if (-not $Model)    { $Model = if ($env:VISION_MODEL) { $env:VISION_MODEL } elseif ($Provider -eq 'openai') { 'gpt-4o-mini' } else { 'llava:13b' } }
if (-not $Endpoint) {
  $Endpoint = if ($env:VISION_ENDPOINT) { $env:VISION_ENDPOINT } elseif ($Provider -eq 'openai') { 'https://api.openai.com/v1' } else { 'http://127.0.0.1:11434' }
}
if (-not $ApiKey)   { $ApiKey = if ($env:VISION_API_KEY) { $env:VISION_API_KEY } else { '' } }
if ($Provider -eq 'openai' -and -not $ApiKey) { throw "openai provider 需要 API Key：请用 -ApiKey 或环境变量 VISION_API_KEY" }
if (-not $Prompt)  {
  $Prompt = '请用中文详细描述这张图片的内容和画面元素（人物/动作/文字/形状/颜色/布局）。如果图中有文字请完整读出。最后给出 3-6 个检索标签（逗号分隔）。请具体、准确。'
}

if (-not (Test-Path $ImagePath)) { throw "图片不存在: $ImagePath" }
if (-not $OutputPng) {
  $OutputPng = Join-Path ([IO.Path]::GetDirectoryName($ImagePath)) ([IO.Path]::GetFileNameWithoutExtension($ImagePath) + '_analysis.png')
}

# ── 1. 预处理：格式统一转 PNG + 长边缩放 ────────────────────────
function Convert-ImageForVision($src, $dst, $maxEdge) {
  # 首选 Windows 内置 WIC（零依赖）；失败回退 ffmpeg
  try {
    Add-Type -AssemblyName PresentationCore
    $fs = [System.IO.File]::OpenRead($src)
    $dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create($fs, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
    $frame = $dec.Frames[0]
    $w = [double]$frame.PixelWidth; $h = [double]$frame.PixelHeight
    $long = [Math]::Max($w, $h)
    if ($long -gt $maxEdge) {
      $scale = $maxEdge / $long
      $tw = [int][Math]::Round($w * $scale); $th = [int][Math]::Round($h * $scale)
      $t = New-Object System.Windows.Media.Imaging.TransformedBitmap
      $t.BeginInit(); $t.Source = $frame; $t.Transform = New-Object System.Windows.Media.ScaleTransform ($tw/$w), ($th/$h); $t.EndInit()
      $frame = $t
    }
    $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
    $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($frame))
    $out = [System.IO.File]::Create($dst); $enc.Save($out); $out.Close(); $fs.Close()
    Write-Host ("预处理 OK: {0}x{1} -> {2}x{3} -> {4}" -f $w, $h, $frame.PixelWidth, $frame.PixelHeight, $dst)
    return
  } catch {
    Write-Warning "WIC 解码失败，回退 ffmpeg: $($_.Exception.Message)"
  }
  # ffmpeg 回退（需安装 ffmpeg；Windows 可用 winget install ffmpeg）
  & ffmpeg -y -i $src -vf "scale='min($maxEdge,iw)':-2" $dst 2>$null
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dst)) { throw "图片预处理失败（WIC 与 ffmpeg 均不可用）: $src" }
}

Convert-ImageForVision -src $ImagePath -dst $OutputPng -maxEdge $MaxEdge

# ── 2. 分析 ─────────────────────────────────────────────────────
$imgB64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($OutputPng))

if ($Provider -eq 'openai') {
  # OpenAI 兼容 /chat/completions（图片以 data URI 传入）
  $payload = @{
    model = $Model
    max_tokens = $MaxTokens
    messages = @(@{
      role = 'user'
      content = @(
        @{ type = 'text'; text = $Prompt },
        @{ type = 'image_url'; image_url = @{ url = "data:image/png;base64,$imgB64" } }
      )
    })
  } | ConvertTo-Json -Depth 8
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)   # 关键：UTF-8 字节
  $headers = @{ Authorization = "Bearer $ApiKey" }
  $r = Invoke-RestMethod -Uri "$Endpoint/chat/completions" -Method Post -ContentType 'application/json; charset=utf-8' -Headers $headers -Body $bytes -TimeoutSec 600
  $content = $r.choices[0].message.content
  $inTok = $r.usage.prompt_tokens; $outTok = $r.usage.completion_tokens
} else {
  # Ollama /api/chat（think:false 关思考）
  $payload = @{
    model    = $Model
    stream   = $false
    think    = $false
    options  = @{ num_predict = $MaxTokens }
    messages = @(@{ role = 'user'; content = $Prompt; images = @($imgB64) })
  } | ConvertTo-Json -Depth 8
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)   # 关键：UTF-8 字节
  $r = Invoke-RestMethod -Uri "$Endpoint/api/chat" -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 600
  $content = $r.message.content
  $inTok = $r.prompt_eval_count; $outTok = $r.eval_count
}

Write-Host "Provider: $Provider | 模型: $Model | 输入 token: $inTok | 输出 token: $outTok"
Write-Host "── 分析结果 ──────────────────────────────────────────"
$content
Write-Host "──────────────────────────────────────────────────────"
