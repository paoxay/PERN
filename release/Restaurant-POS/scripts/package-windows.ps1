$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $projectRoot "release"
$stagingDir = Join-Path $outDir "Restaurant-POS"
$zipPath = Join-Path $outDir "Restaurant-POS-OneClick.zip"

if (Test-Path $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

$excludeDirNames = @("node_modules", "release", ".git")
$excludeFiles = @("\server\.env", "\server\.seeded")

Get-ChildItem -Path $projectRoot -Recurse -Force | ForEach-Object {
  $relative = $_.FullName.Substring($projectRoot.Length)
  $pathParts = $relative.TrimStart("\").Split("\")

  foreach ($dirName in $excludeDirNames) {
    if ($pathParts -contains $dirName) {
      return
    }
  }

  foreach ($file in $excludeFiles) {
    if ($relative.Equals($file, [System.StringComparison]::OrdinalIgnoreCase)) {
      return
    }
  }

  $target = Join-Path $stagingDir $relative.TrimStart("\")

  if ($_.PSIsContainer) {
    New-Item -ItemType Directory -Force -Path $target | Out-Null
  } else {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force
Write-Host "Created $zipPath"
