$project = "C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa"
$indexPath = Join-Path $project "data\entries-index.json"

Write-Host "`n=== CLEAN FIELD POKEDEX REBUILD ===" -ForegroundColor Cyan

if (!(Test-Path $project)) {
    Write-Host "Project folder not found: $project" -ForegroundColor Red
    pause
    exit
}

Set-Location $project

Write-Host "`nStopping old local server..."
Get-Process python, python3 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$jsonFolders = @(
    "data\pokemon",
    "data\field-entries"
)

$files = @()

foreach ($folder in $jsonFolders) {
    $fullFolder = Join-Path $project $folder
    if (Test-Path $fullFolder) {
        $files += Get-ChildItem -LiteralPath $fullFolder -File -Filter "*.json"
    }
}

Write-Host "`nFound $($files.Count) JSON files."

$badFiles = @()
$entries = @()

foreach ($file in $files) {
    try {
        $raw = Get-Content -LiteralPath $file.FullName -Raw
        $json = $raw | ConvertFrom-Json -ErrorAction Stop

        $entry = [ordered]@{}

        foreach ($prop in $json.PSObject.Properties) {
            $entry[$prop.Name] = $prop.Value
        }

        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
        $safeId = ($baseName.ToLower() -replace '[^a-z0-9]+','-' -replace '^-+|-+$','')

        $displayName = $baseName -replace '^(?i)pokemon[-_ ]*',''
        $displayName = $displayName -replace '^(?i)field[-_ ]*',''
        $displayName = $displayName -replace '[-_]+',' '
        $displayName = (Get-Culture).TextInfo.ToTitleCase($displayName.ToLower())

        if (!$entry.Contains("id") -or [string]::IsNullOrWhiteSpace([string]$entry["id"])) {
            $entry["id"] = $safeId
        }

        if (!$entry.Contains("name") -or [string]::IsNullOrWhiteSpace([string]$entry["name"])) {
            $entry["name"] = $displayName
        }

        if (!$entry.Contains("category") -or [string]::IsNullOrWhiteSpace([string]$entry["category"])) {
            if ($file.FullName -like "*\data\pokemon\*") {
                $entry["category"] = "animals"
            } else {
                $entry["category"] = "field"
            }
        }

        $entry["detailPath"] = "./" + (($file.FullName.Substring($project.Length + 1)) -replace "\\","/")

        if ($entry.Contains("searchText")) {
            $entry.Remove("searchText") | Out-Null
        }

        $entry["searchText"] = ($raw + " " + $file.Name + " " + $entry["id"] + " " + $entry["name"]).ToLower()

        $entries += [pscustomobject]$entry
    }
    catch {
        $badFiles += "$($file.FullName) | $($_.Exception.Message)"
    }
}

if ($badFiles.Count -gt 0) {
    Write-Host "`nREAL JSON ERRORS FOUND:" -ForegroundColor Red
    $badFiles | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    pause
    exit
}

Write-Host "`nAll JSON files are valid." -ForegroundColor Green

$entries = $entries | Sort-Object name

$entries | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $indexPath -Encoding UTF8

Write-Host "`nRebuilt index:" -ForegroundColor Green
Write-Host $indexPath -ForegroundColor Green

Write-Host "`nStarting local server..."
Start-Process cmd.exe -ArgumentList "/k cd /d `"$project`" && py -3 -m http.server 8080"

Start-Sleep -Seconds 2

Write-Host "`nChecking server index..."
try {
    $serverIndex = Invoke-WebRequest "http://localhost:8080/data/entries-index.json?fresh=$((Get-Date).Ticks)" -UseBasicParsing
    Write-Host "Server is serving the rebuilt index." -ForegroundColor Green
}
catch {
    Write-Host "Server test failed. Chrome may still open, but the server did not answer the index check." -ForegroundColor Yellow
}

Write-Host "`nOpening Chrome..."
Start-Process "chrome.exe" "http://localhost:8080/?fresh=$((Get-Date).Ticks)"

Write-Host "`nDONE. App refreshed, rebuilt, server started, Chrome opened." -ForegroundColor Cyan
pause
