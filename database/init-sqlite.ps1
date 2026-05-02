# Creates database\aspen_grove.db from schema + seed (requires sqlite3 on PATH)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$db = Join-Path $root "aspen_grove.db"
if (-not (Get-Command sqlite3 -ErrorAction SilentlyContinue)) {
  Write-Error "sqlite3 not found. Install SQLite (https://www.sqlite.org/download.html) and add it to PATH."
}
if (Test-Path $db) { Remove-Item $db -Force }
sqlite3 $db ".read $(Join-Path $root 'schema.sqlite.sql')"
sqlite3 $db ".read $(Join-Path $root 'seed.sql')"
Write-Host "Created $db"
