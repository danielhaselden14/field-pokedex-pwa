$ErrorActionPreference = "Stop"

Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

$project = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa"

if (!(Test-Path $project)) {
  throw "Project folder not found: $project"
}

Set-Location $project

if (!(Test-Path ".\data\pokemon")) {
  throw "Missing data\pokemon folder."
}

if (!(Test-Path ".\import-tools\rebuild-index-and-cache.py")) {
  throw "Missing rebuild script: import-tools\rebuild-index-and-cache.py"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $project "_backup-before-local-rebuild-$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null

Copy-Item ".\data\entries-index.json", ".\service-worker.js", ".\app.js", ".\index.html" -Destination $backup -Force

$rebuildScript = ".\import-tools\rebuild-index-and-cache.py"
$rebuildText = Get-Content $rebuildScript -Raw
$rebuildText = [regex]::Replace($rebuildText, 'STAMP = "[^"]+"', "STAMP = `"$stamp`"")
Set-Content -Path $rebuildScript -Value $rebuildText -Encoding UTF8

python $rebuildScript

Write-Host ""
Write-Host "Local rebuild complete. No GitHub upload was done." -ForegroundColor Green
Write-Host "Backup saved here:" -ForegroundColor Yellow
Write-Host $backup

Write-Host ""
Write-Host "Pokemon JSON files currently in data\pokemon:" -ForegroundColor Cyan
Get-ChildItem ".\data\pokemon" -Filter "*.json" | Select-Object Name

Write-Host ""
Write-Host "Starting local server..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$project`"; python -m http.server 8080"

Start-Sleep -Seconds 2
Start-Process "http://localhost:8080/?fresh=$stamp"

Write-Host ""
Write-Host "Done. Test the local site in your browser." -ForegroundColor Green
