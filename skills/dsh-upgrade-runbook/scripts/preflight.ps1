# preflight.ps1 - DSH upgrade data preflight (BOM strip + JSON validation)
# ASCII-safe. Usage:
#   powershell -ExecutionPolicy Bypass -File preflight.ps1
#   powershell -ExecutionPolicy Bypass -File preflight.ps1 -DshHome "E:\Harness Workspace\.dsh"
param(
  [string]$DshHome = ''
)
$ErrorActionPreference = 'Continue'
if (-not $DshHome) { $DshHome = $env:DSH_HOME }
if (-not $DshHome) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }
$store = Join-Path $DshHome 'storages'
Write-Host "DSH home : $DshHome"
Write-Host "preflight: $store"
$bad = 0
if (Test-Path $store) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  Get-ChildItem -LiteralPath $store -Filter '*.json' | ForEach-Object {
    $t = [System.IO.File]::ReadAllText($_.FullName)
    if ($t.StartsWith([char]0xFEFF)) { $t = $t.Substring(1); Write-Host "BOM-strip: $($_.Name)" }
    try { $null = $t | ConvertFrom-Json } catch { Write-Host "INVALID  : $($_.Name) -> $($_.Exception.Message)"; $bad++ }
    [System.IO.File]::WriteAllText($_.FullName, $t, $enc)   # rewrites without BOM
  }
  # schema hint: workspace records missing sessionIds
  $ws = Join-Path $store 'workspace.json'
  if (Test-Path $ws) {
    try {
      $j = Get-Content -LiteralPath $ws -Raw | ConvertFrom-Json
      $wsTable = $j.tables.workspaces
      foreach ($p in $wsTable.PSObject.Properties) {
        if ($p.Value.PSObject.Properties.Name -contains 'sessionIds' -eq $false) {
          Write-Host "SCHEMA-HINT: workspace '$($p.Name)' missing sessionIds - add `"sessionIds`": [] (utf8NoBOM)"
        }
      }
    } catch { Write-Host "workspace.json parse failed: $($_.Exception.Message)" }
  }
} else {
  Write-Host "no storages dir at $store"
}
Write-Host "preflight done. invalid=$bad (fix listed files before starting new version)"
exit $bad
