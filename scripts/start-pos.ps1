$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $projectRoot "server"
$clientDir = Join-Path $projectRoot "client"
$envPath = Join-Path $serverDir ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"
$seedFlagPath = Join-Path $serverDir ".seeded"
$portableNode = Join-Path $projectRoot "runtime\node.exe"
$builtServer = Join-Path $serverDir "dist\index.js"
$builtClient = Join-Path $clientDir "dist\index.html"

function Test-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Invoke-Step($message, $scriptBlock) {
  Write-Host ""
  Write-Host "==> $message"
  & $scriptBlock
}

if (-not (Test-Command "node")) {
  if (-not (Test-Path $portableNode)) {
    throw "Node.js is not installed and portable node.exe was not found. Use the release zip or install Node.js LTS."
  }
}

Set-Location $projectRoot

Set-Content -Path $envPath -Value 'DATABASE_URL="file:./prisma/dev.db"', 'PORT=4000' -Encoding UTF8

if ((Test-Path $portableNode) -and (Test-Path $builtServer) -and (Test-Path $builtClient)) {
  Write-Host ""
  Write-Host "==> Starting POS app"
  Start-Process "http://localhost:4000"
  & $portableNode $builtServer
  exit $LASTEXITCODE
}

if (-not (Test-Command "npm.cmd")) {
  throw "npm is not available. Reinstall Node.js LTS, then double-click Start POS.cmd again."
}

Invoke-Step "Checking dependencies" {
  npm.cmd install
}

Invoke-Step "Preparing database" {
  npm.cmd run db:generate
  try {
    npm.cmd run db:push
  } catch {
    Write-Warning "Database update failed. The app will try to use the included database."
  }
}

if (-not (Test-Path $seedFlagPath)) {
  Invoke-Step "Adding starter data" {
    try {
      npm.cmd run db:seed
    } catch {
      Write-Warning "Starter data could not be added. The app will start with an empty menu/stock database."
    }
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
