$ErrorActionPreference = "Stop"

$sourceProject = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa"
$uploadClone = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa-github-upload-temp"
$repoUrl = "https://github.com/danielhaselden14/field-pokedex-pwa.git"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host ""
Write-Host "=== Field Pokédex Full GitHub Upload ===" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path $sourceProject)) {
  Write-Host "Source project folder not found:" -ForegroundColor Red
  Write-Host $sourceProject
  pause
  exit
}

git --version | Out-Null

Write-Host "Closing local Python server if running..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Updating cache version so Chrome and GitHub Pages do not hold old files..." -ForegroundColor Yellow

$indexPath = Join-Path $sourceProject "index.html"
if (Test-Path $indexPath) {
  $index = Get-Content $indexPath -Raw

  $index = [System.Text.RegularExpressions.Regex]::Replace(
    $index,
    'href="styles\.css(?:\?v=[^"]*)?"',
    "href=`"styles.css?v=$stamp`""
  )

  $index = [System.Text.RegularExpressions.Regex]::Replace(
    $index,
    'src="app\.js(?:\?v=[^"]*)?"',
    "src=`"app.js?v=$stamp`""
  )

  Set-Content $indexPath $index -Encoding UTF8
}

Write-Host "Rebuilding service-worker.js cache list from current project files..." -ForegroundColor Yellow

$swPath = Join-Path $sourceProject "service-worker.js"

$cacheFiles = New-Object System.Collections.Generic.List[string]
$cacheFiles.Add("./")

$coreFiles = @(
  "index.html",
  "styles.css",
  "app.js",
  "voice-search.js",
  "manifest.json"
)

foreach ($file in $coreFiles) {
  if (Test-Path (Join-Path $sourceProject $file)) {
    $cacheFiles.Add("./" + $file.Replace("\", "/"))
  }
}

$cacheFolders = @(
  "data",
  "assets",
  "icons"
)

foreach ($folder in $cacheFolders) {
  $fullFolder = Join-Path $sourceProject $folder

  if (Test-Path $fullFolder) {
    Get-ChildItem $fullFolder -Recurse -File | Where-Object {
      $_.Name -notlike "*.backup-*" -and
      $_.Name -notlike "*.tmp" -and
      $_.Name -notlike "*.log" -and
      $_.Name -ne "Thumbs.db" -and
      $_.Name -ne ".DS_Store"
    } | ForEach-Object {
      $relative = $_.FullName.Substring($sourceProject.Length + 1).Replace("\", "/")
      $cacheFiles.Add("./" + $relative)
    }
  }
}

$uniqueCacheFiles = $cacheFiles | Sort-Object -Unique

$cacheArrayText = ($uniqueCacheFiles | ForEach-Object { '  "' + $_ + '"' }) -join ",`r`n"

$serviceWorker = @"
const CACHE_NAME = "field-pokedex-$stamp";

const FILES_TO_CACHE = [
$cacheArrayText
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
"@

Set-Content $swPath $serviceWorker -Encoding UTF8

if (Test-Path $uploadClone) {
  Write-Host "Removing old temporary upload folder..." -ForegroundColor Yellow
  Remove-Item $uploadClone -Recurse -Force
}

Write-Host "Cloning GitHub repo into temporary upload folder..." -ForegroundColor Yellow
git clone $repoUrl $uploadClone

if (!(Test-Path "$uploadClone\.git")) {
  Write-Host "Clone failed. Temporary folder is not connected to Git." -ForegroundColor Red
  pause
  exit
}

Write-Host "Removing old repo files but keeping .git..." -ForegroundColor Yellow
Get-ChildItem $uploadClone -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

Write-Host "Copying your current project into the GitHub-connected folder..." -ForegroundColor Yellow

$excludeDirs = @(
  ".git",
  ".github",
  "node_modules",
  "__pycache__"
)

$excludeFilePatterns = @(
  "*.backup-*",
  "*.tmp",
  "*.log",
  "Thumbs.db",
  ".DS_Store",
  "reset-cache.html"
)

Get-ChildItem $sourceProject -Force | ForEach-Object {
  $item = $_

  if ($excludeDirs -contains $item.Name) {
    return
  }

  $skipFile = $false
  foreach ($pattern in $excludeFilePatterns) {
    if ($item.Name -like $pattern) {
      $skipFile = $true
    }
  }

  if ($skipFile) {
    return
  }

  Copy-Item $item.FullName -Destination $uploadClone -Recurse -Force
}

cd $uploadClone

Write-Host "Making sure backup junk stays ignored..." -ForegroundColor Yellow

$gitignorePath = Join-Path $uploadClone ".gitignore"
$ignoreLines = @(
  "*.backup-*",
  "__pycache__/",
  ".DS_Store",
  "Thumbs.db",
  "*.tmp",
  "*.log",
  "reset-cache.html"
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
Write-Host "Checking important folders and files..." -ForegroundColor Cyan

$importantItems = @(
  "index.html",
  "app.js",
  "styles.css",
  "service-worker.js",
  "data\entries-index.json",
  "data\pokemon",
  "assets\images",
  "icons"
)

foreach ($item in $importantItems) {
  if (Test-Path (Join-Path $uploadClone $item)) {
    Write-Host "FOUND: $item" -ForegroundColor Green
  } else {
    Write-Host "MISSING: $item" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Adding files to Git..." -ForegroundColor Yellow
git add -A

Write-Host ""
Write-Host "Upload preview:" -ForegroundColor Cyan
git status --short

$hasChanges = git status --porcelain

if (!$hasChanges) {
  Write-Host ""
  Write-Host "No changes found. GitHub already matches this project." -ForegroundColor Green
  Start-Process "https://danielhaselden14.github.io/field-pokedex-pwa/"
  pause
  exit
}

Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "Upload current Field Pokedex project changes $stamp"

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "Upload complete." -ForegroundColor Green
Write-Host ""
Write-Host "GitHub repo:"
Write-Host "https://github.com/danielhaselden14/field-pokedex-pwa"
Write-Host ""
Write-Host "Live site:"
Write-Host "https://danielhaselden14.github.io/field-pokedex-pwa/"
Write-Host ""
Write-Host "Opening live site now..." -ForegroundColor Cyan

Start-Process "https://danielhaselden14.github.io/field-pokedex-pwa/"

Write-Host ""
Write-Host "If Chrome shows old files online, press Ctrl + Shift + R once." -ForegroundColor Yellow
Write-Host ""

pause
