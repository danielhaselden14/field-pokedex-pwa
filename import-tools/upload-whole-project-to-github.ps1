$ErrorActionPreference = "Stop"

$project = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa"
cd $project

Write-Host ""
Write-Host "=== Field Pokédex GitHub Full Upload ===" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path ".git")) {
  Write-Host "This folder is not connected to Git yet." -ForegroundColor Red
  Write-Host "Folder: $project"
  Write-Host ""
  Write-Host "You may be in the wrong project folder, or this was not cloned from GitHub."
  pause
  exit
}

git --version | Out-Null

Write-Host "Checking GitHub remote..." -ForegroundColor Yellow
$remote = git remote get-url origin 2>$null

if (!$remote) {
  Write-Host "No GitHub remote found. Adding your repo as origin..." -ForegroundColor Yellow
  git remote add origin "https://github.com/danielhaselden14/field-pokedex-pwa.git"
} else {
  Write-Host "Remote found:" -ForegroundColor Green
  Write-Host $remote
}

Write-Host ""
Write-Host "Making sure backup junk does not upload..." -ForegroundColor Yellow

$gitignorePath = Join-Path $project ".gitignore"
$ignoreLines = @(
  "*.backup-*",
  "reset-cache.html",
  "__pycache__/",
  ".DS_Store",
  "Thumbs.db"
)

if (!(Test-Path $gitignorePath)) {
  New-Item -ItemType File -Path $gitignorePath | Out-Null
}

$currentIgnore = Get-Content $gitignorePath -Raw -ErrorAction SilentlyContinue

foreach ($line in $ignoreLines) {
  if ($currentIgnore -notmatch [regex]::Escape($line)) {
    Add-Content $gitignorePath $line
  }
}

Write-Host ""
Write-Host "Checking important Charmander image files..." -ForegroundColor Yellow

$requiredFiles = @(
  "assets\images\pokemon\charmander\charmander-display.png",
  "assets\images\pokemon\charmander\charmander-anatomy.png",
  "data\pokemon\pokemon-charmander.json",
  "data\entries-index.json",
  "index.html",
  "app.js",
  "styles.css",
  "service-worker.js"
)

foreach ($file in $requiredFiles) {
  if (Test-Path (Join-Path $project $file)) {
    Write-Host "FOUND: $file" -ForegroundColor Green
  } else {
    Write-Host "MISSING: $file" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Cleaning old backup files from Git tracking if any were accidentally added..." -ForegroundColor Yellow
git rm -r --cached --ignore-unmatch "*.backup-*" 2>$null
git rm --cached --ignore-unmatch "reset-cache.html" 2>$null

Write-Host ""
Write-Host "Adding all real project changes..." -ForegroundColor Yellow
git add -A

Write-Host ""
Write-Host "Current upload preview:" -ForegroundColor Cyan
git status --short

Write-Host ""
$commitMessage = "Update Charmander images anatomy card and field guide files"

$hasChanges = git status --porcelain

if (!$hasChanges) {
  Write-Host "No changes to upload. GitHub already matches this folder." -ForegroundColor Green
  Write-Host ""
  pause
  exit
}

Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m $commitMessage

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "Upload complete." -ForegroundColor Green
Write-Host "GitHub repo:"
Write-Host "https://github.com/danielhaselden14/field-pokedex-pwa"
Write-Host ""
Write-Host "Live site:"
Write-Host "https://danielhaselden14.github.io/field-pokedex-pwa/"
Write-Host ""
Write-Host "If Chrome still shows old files online, open the live site and press Ctrl + Shift + R."
Write-Host ""

pause
