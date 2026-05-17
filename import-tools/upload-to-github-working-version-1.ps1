$ErrorActionPreference = "Stop"

$project = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa"
$publishFolder = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa-clean-github-upload"
$repoUrl = "https://github.com/danielhaselden14/field-pokedex-pwa.git"

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

Write-Host "Rebuilding local index and cache before upload..." -ForegroundColor Cyan

Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$rebuildScript = ".\import-tools\rebuild-index-and-cache.py"
$rebuildText = Get-Content $rebuildScript -Raw
$rebuildText = [regex]::Replace($rebuildText, 'STAMP = "[^"]+"', "STAMP = `"$stamp`"")
Set-Content -Path $rebuildScript -Value $rebuildText -Encoding UTF8

python $rebuildScript

Write-Host "Preparing clean GitHub upload folder..." -ForegroundColor Cyan

if (!(Test-Path $publishFolder)) {
  git clone $repoUrl $publishFolder
}

if (!(Test-Path (Join-Path $publishFolder ".git"))) {
  if (Test-Path $publishFolder) {
    Remove-Item $publishFolder -Recurse -Force
  }

  git clone $repoUrl $publishFolder
}

Set-Location $publishFolder
git remote set-url origin $repoUrl
git branch -M main

Write-Host "Clearing old copied files from publish folder..." -ForegroundColor Yellow

Get-ChildItem -Force | Where-Object {
  $_.Name -ne ".git"
} | Remove-Item -Recurse -Force

Write-Host "Copying current local project into publish folder..." -ForegroundColor Cyan

robocopy $project $publishFolder /E /XD ".git" "_backup*" /XF "*.xlsx" "*.xlsm" "*.xls" "*.bak" "*.tmp" /NFL /NDL /NJH /NJS /NP | Out-Null

Set-Location $publishFolder

@"
_backup*/
import-tools/*.xlsx
import-tools/upload.xlsx
*.bak
*.tmp
"@ | Set-Content -Path ".gitignore" -Encoding UTF8

"" | Set-Content -Path ".nojekyll" -Encoding UTF8

if (!(git config --global user.name)) {
  git config --global user.name "Daniel Haselden"
}

if (!(git config --global user.email)) {
  git config --global user.email "danielhaselden14@users.noreply.github.com"
}

if (!(Test-Path ".\data\entries-index.json")) {
  throw "Publish folder is missing data\entries-index.json."
}

if (!(Test-Path ".\data\pokemon")) {
  throw "Publish folder is missing data\pokemon."
}

$pokemonFiles = Get-ChildItem ".\data\pokemon" -Filter "*.json" -File

if ($pokemonFiles.Count -lt 1) {
  throw "No Pokemon JSON files found in publish folder."
}

Write-Host "Pokemon JSON files ready to upload: $($pokemonFiles.Count)" -ForegroundColor Green

git add -A

Write-Host ""
Write-Host "Files ready for GitHub:" -ForegroundColor Cyan
git status --short

$changes = git status --porcelain

if ($changes) {
  git commit -m "Update Field Pokedex working version 1 $stamp"
  git push -u origin main
} else {
  Write-Host "No file changes detected. Nothing new to push." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Opening GitHub and live site..." -ForegroundColor Green

Start-Process "https://github.com/danielhaselden14/field-pokedex-pwa/tree/main/data/pokemon"
Start-Process "https://danielhaselden14.github.io/field-pokedex-pwa/?fresh=$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host ""
Write-Host "Upload complete. GitHub Pages may take a minute to refresh." -ForegroundColor Green
