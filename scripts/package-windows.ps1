$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $projectRoot "release"
$stagingDir = Join-Path $outDir "Restaurant-POS"
$zipPath = Join-Path $outDir "Restaurant-POS-OneClick.zip"
$runtimeDir = Join-Path $stagingDir "runtime"
$nodePath = (Get-Command node -ErrorAction Stop).Source

function Copy-Directory($source, $destination) {
  if (-not (Test-Path $source)) {
    throw "Missing required path: $source"
  }
  if (Test-Path $destination) {
    Remove-Item -LiteralPath $destination -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  robocopy $source $destination /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Failed to copy $source to $destination"
  }
}

Set-Location $projectRoot

Set-Content -Path (Join-Path $projectRoot "server\.env") -Value 'DATABASE_URL="file:./prisma/dev.db"', 'PORT=4000' -Encoding UTF8

Write-Host "Installing dependencies"
npm.cmd install

Write-Host "Preparing database"
npm.cmd run db:generate
npm.cmd run db:push
try {
  npm.cmd run db:seed
} catch {
  Write-Warning "Seed failed; packaging the existing database."
}
Set-Content -Path (Join-Path $projectRoot "server\.seeded") -Value "ok" -Encoding ASCII

Write-Host "Building app"
npm.cmd run build

if (Test-Path $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

Copy-Item -LiteralPath (Join-Path $projectRoot "Start POS.cmd") -Destination $stagingDir -Force
Copy-Item -LiteralPath (Join-Path $projectRoot ".env.example") -Destination $stagingDir -Force

New-Item -ItemType Directory -Force -Path (Join-Path $stagingDir "scripts") | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\start-pos.ps1") -Destination (Join-Path $stagingDir "scripts") -Force

Copy-Item -LiteralPath $nodePath -Destination (Join-Path $runtimeDir "node.exe") -Force

Set-Content -Path (Join-Path $stagingDir "package.json") -Encoding ASCII -Value @(
  '{',
  '  "name": "restaurant-pos-portable",',
  '  "private": true,',
  '  "dependencies": {',
  '    "@prisma/client": "^6.19.3",',
  '    "cors": "^2.8.5",',
  '    "dotenv": "^16.6.1",',
  '    "express": "^4.21.2"',
  '  }',
  '}'
)

Push-Location $stagingDir
Write-Host "Installing portable production dependencies"
npm.cmd install --omit=dev --no-audit --no-fund
Pop-Location

Copy-Directory (Join-Path $projectRoot "node_modules\.prisma") (Join-Path $stagingDir "node_modules\.prisma")

New-Item -ItemType Directory -Force -Path (Join-Path $stagingDir "server") | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "server\package.json") -Destination (Join-Path $stagingDir "server") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "server\.seeded") -Destination (Join-Path $stagingDir "server") -Force
Copy-Directory (Join-Path $projectRoot "server\dist") (Join-Path $stagingDir "server\dist")
Copy-Directory (Join-Path $projectRoot "server\prisma") (Join-Path $stagingDir "server\prisma")

New-Item -ItemType Directory -Force -Path (Join-Path $stagingDir "client") | Out-Null
Copy-Directory (Join-Path $projectRoot "client\dist") (Join-Path $stagingDir "client\dist")

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force
Write-Host "Created $zipPath"
