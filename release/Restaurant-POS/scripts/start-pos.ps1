$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $projectRoot "server"
$clientDir = Join-Path $projectRoot "client"
$envPath = Join-Path $serverDir ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"
$seedFlagPath = Join-Path $serverDir ".seeded"

function Test-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Invoke-Step($message, $scriptBlock) {
  Write-Host ""
  Write-Host "==> $message"
  & $scriptBlock
}

if (-not (Test-Command "node")) {
  throw "Node.js is not installed. Install Node.js LTS, then double-click Start POS.cmd again."
}

if (-not (Test-Command "npm.cmd")) {
  throw "npm is not available. Reinstall Node.js LTS, then double-click Start POS.cmd again."
}

Set-Location $projectRoot

if (-not (Test-Path $envPath)) {
  if (Test-Path $envExamplePath) {
    Copy-Item $envExamplePath $envPath
  } else {
    Set-Content -Path $envPath -Value 'DATABASE_URL="file:./prisma/dev.db"', 'PORT=4000' -Encoding UTF8
  }
}

if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
  Invoke-Step "Installing dependencies" {
    npm.cmd install
  }
}

Invoke-Step "Preparing database" {
  npm.cmd run db:generate
  npm.cmd run db:push
}

if (-not (Test-Path $seedFlagPath)) {
  Invoke-Step "Adding starter data" {
    npm.cmd run db:seed
    Set-Content -Path $seedFlagPath -Value (Get-Date -Format s) -Encoding ASCII
  }
}

if (Test-Path $clientDir) {
  Write-Host ""
  Write-Host "==> Starting POS app"
  Start-Process "http://localhost:5173"
  npm.cmd run dev
} else {
  Write-Host ""
  Write-Host "==> Starting POS API"
  Start-Process "http://localhost:4000/api/health"
  npm.cmd run dev -w server
}
