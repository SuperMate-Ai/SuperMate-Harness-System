# ============================================================
#  apply-patch.ps1 — Apply the Qwen-sidebar image proxy patch to a
#  copy of @xmanrui/dsh-im and (optionally) link-install it into a
#  DSH profile.
#
#  What it does:
#    1. Locate the plugin source (node_modules/@xmanrui/dsh-im by default)
#    2. Copy it to <repo>\build\dsh-im-patched (excluding node_modules)
#    3. Copy wecom-qwen-proxy.mjs into src\channels\wecom\
#    4. Patch wecom-bridge.mjs (import + image content construction)
#    5. npm install (dev deps) if missing
#    6. Rebuild the host bundle (esbuild)
#    7. dsh plugin --profile <Profile> add -w link:<copy>  (unless -SkipInstall)
#    8. Print a reminder to restart dsh web
#
#  Idempotent: re-running skips already-applied edits.
#
#  Usage:
#    powershell -ExecutionPolicy Bypass -File patch\apply-patch.ps1
#    powershell -ExecutionPolicy Bypass -File patch\apply-patch.ps1 -Profile im -SkipInstall
# ============================================================
[CmdletBinding()]
param(
    [string]$Profile = 'web',
    [switch]$SkipInstall,
    [string]$PluginSource = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$workDir  = Join-Path $repoRoot 'build\dsh-im-patched'
$proxyFile = Join-Path $PSScriptRoot 'wecom-qwen-proxy.mjs'

Write-Host "[1/7] Locating plugin source..."

if (-not $PluginSource) {
    $dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
    $candidate = Join-Path $dshHome "profiles\$Profile\node_modules\@xmanrui\dsh-im"
    if (Test-Path (Join-Path $candidate 'package.json')) {
        $PluginSource = $candidate
    } else {
        throw "Plugin source not found at $candidate. Pass -PluginSource <dir> or install @xmanrui/dsh-im first."
    }
}
Write-Host "    source: $PluginSource"

# --- 1/2 copy -------------------------------------------------
$fresh = $false
if (-not (Test-Path (Join-Path $workDir 'package.json'))) {
    Write-Host "[2/7] Copying plugin source to $workDir ..."
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    robocopy $PluginSource $workDir /E /XD node_modules /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit $LASTEXITCODE" }
    $fresh = $true
} else {
    Write-Host "[2/7] Work copy already exists; reusing $workDir (remove it to force a fresh copy)."
}

# --- 3 copy proxy module --------------------------------------
$bridge = Join-Path $workDir 'src\channels\wecom\wecom-bridge.mjs'
$target = Join-Path $workDir 'src\channels\wecom\wecom-qwen-proxy.mjs'
if (-not (Test-Path $bridge)) { throw "wecom-bridge.mjs not found under $workDir" }
Write-Host "[3/7] Copying wecom-qwen-proxy.mjs ..."
Copy-Item $proxyFile $target -Force

# --- 4 patch wecom-bridge.mjs ---------------------------------
Write-Host "[4/7] Patching wecom-bridge.mjs ..."
$text = [System.IO.File]::ReadAllText($bridge)

$importOld = "} from '../shared/image-prompt.mjs';"
$importNew = @"
} from '../shared/image-prompt.mjs';
import { qwenVisionContentForMessage } from './wecom-qwen-proxy.mjs';
"@

if ($text.Contains($importOld) -and -not $text.Contains('wecom-qwen-proxy')) {
    $text = $text.Replace($importOld, $importNew)
    Write-Host "    + import patched"
} elseif ($text.Contains('wecom-qwen-proxy')) {
    Write-Host "    + import already patched (skip)"
} else {
    throw 'Import anchor not found in wecom-bridge.mjs; the plugin version may differ.'
}

$contentOld = @'
      let content = hasImages
        ? await promptContentForMessage(message, { signal: this.#signal })
        : undefined;
'@
$contentNew = @'
      let content;
      if (hasImages) {
        if (process.env.DSH_WECOM_QWEN_VISION === '0') {
          content = await promptContentForMessage(message, { signal: this.#signal });
        } else {
          try {
            content = await qwenVisionContentForMessage(message, {
              signal: this.#signal,
              logger: this.#logger,
            });
          } catch (proxyError) {
            this.#logger.warn?.(
              '[dsh-im:wecom] qwen sidebar proxy failed; falling back to model images:',
              proxyError,
            );
            content = await promptContentForMessage(message, { signal: this.#signal });
          }
        }
      }
'@

if ($text.Contains($contentOld)) {
    $text = $text.Replace($contentOld, $contentNew)
    Write-Host "    + image content construction patched"
} elseif ($text.Contains('qwen sidebar proxy failed')) {
    Write-Host "    + image content construction already patched (skip)"
} else {
    throw 'Content anchor not found in wecom-bridge.mjs; the plugin version may differ.'
}

[System.IO.File]::WriteAllText($bridge, $text)

# --- 5 npm install --------------------------------------------
if (-not (Test-Path (Join-Path $workDir 'node_modules'))) {
    Write-Host "[5/7] Installing dev dependencies (esbuild etc.) ..."
    Push-Location $workDir
    try { npm install --no-audit --no-fund | Out-Null } finally { Pop-Location }
} else {
    Write-Host "[5/7] node_modules present; skipping npm install."
}

# --- 6 rebuild host bundle ------------------------------------
Write-Host "[6/7] Rebuilding host bundle (esbuild) ..."
Push-Location $workDir
try {
    node plugin-src/host/build.mjs
    if ($LASTEXITCODE -ne 0) { throw "build.mjs failed with exit $LASTEXITCODE" }
} finally { Pop-Location }

# sanity: patch embedded in the bundle
$bundle = [System.IO.File]::ReadAllText((Join-Path $workDir 'lib\index.js'))
if (-not $bundle.Contains('qwen sidebar proxy failed')) {
    throw 'Rebuilt bundle does not contain the proxy; build may have produced stale output.'
}
Write-Host "    bundle verified (proxy embedded)."

# --- 7 link install -------------------------------------------
if ($SkipInstall) {
    Write-Host "[7/7] -SkipInstall set; skipping profile install."
} else {
    Write-Host "[7/7] Linking patched plugin into profile '$Profile' ..."
    $dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
    if ($dshCmd) {
        & dsh plugin --profile $Profile add -w "link:$workDir"
    } else {
        $npmRoot = (npm root -g).Trim()
        $dshBin = Join-Path $npmRoot '@deepseek-ai\dsh\lib\bin.js'
        if (-not (Test-Path $dshBin)) { throw "dsh CLI not found; install profile manually with: dsh plugin --profile $Profile add -w link:$workDir" }
        & node $dshBin plugin --profile $Profile add -w "link:$workDir"
    }
    if ($LASTEXITCODE -ne 0) { throw "link install failed with exit $LASTEXITCODE" }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DONE. Next step: RESTART dsh web, refresh the browser,"
Write-Host " then send an image to the WeCom bot to verify."
Write-Host " Patch copy: $workDir"
Write-Host "============================================================"
