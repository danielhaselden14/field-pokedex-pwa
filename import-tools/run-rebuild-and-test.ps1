$ErrorActionPreference = "Stop"

$project = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa"
$scriptPath = Join-Path $project "import-tools\rebuild-index-and-cache.py"

if (!(Test-Path $project)) {
  throw "Project folder not found: $project"
}

if (!(Test-Path $scriptPath)) {
  throw "Rebuild script not found: $scriptPath"
}

Set-Location $project

Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $project "_backup-before-click-rebuild-$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null

Copy-Item ".\app.js", ".\index.html", ".\service-worker.js", ".\data\entries-index.json" -Destination $backup -Force

$py = Get-Content $scriptPath -Raw
$py = [regex]::Replace($py, 'STAMP = "[^"]+"', "STAMP = `"$stamp`"")
Set-Content -Path $scriptPath -Value $py -Encoding UTF8

python $scriptPath

Write-Host ""
Write-Host "Backup saved here:" -ForegroundColor Yellow
Write-Host $backup
Write-Host ""
Write-Host "Starting local server..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$project`"; python -m http.server 8080"

Start-Sleep -Seconds 2
Start-Process "http://localhost:8080/?fresh=$stamp"

Write-Host ""
Write-Host "Done. You can test the app in the browser." -ForegroundColor Green
