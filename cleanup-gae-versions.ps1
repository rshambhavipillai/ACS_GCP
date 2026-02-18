# GAE Version Cleanup Script
# Keeps only the current (live) version and deletes old idle versions

Write-Host "========================================" -ForegroundColor Green
Write-Host "GAE Version Cleanup Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Get the version currently serving 100% traffic
Write-Host "Fetching version information..." -ForegroundColor Yellow

# List versions and find the one with 100% traffic
$versions = gcloud app versions list --format=json --quiet 2>$null | ConvertFrom-Json

if ($versions.Count -eq 0) {
    Write-Host "No versions found" -ForegroundColor Red
    exit 1
}

# Find the live version (the one serving traffic)
$liveVersion = $null
foreach ($version in $versions) {
    if ($version.trafficSplit -eq 1.0 -or $version.trafficSplit -eq "1.0") {
        $liveVersion = $version.id
        break
    }
}

if (-not $liveVersion) {
    # If no live version found, use the most recent one
    $liveVersion = $versions[0].id
}

Write-Host "Live version (100% traffic): $liveVersion" -ForegroundColor Green
Write-Host ""
Write-Host "Versions to delete:" -ForegroundColor Yellow

$toDelete = @()
foreach ($version in $versions) {
    if ($version.id -ne $liveVersion) {
        Write-Host "  - $($version.id)" -ForegroundColor Red
        $toDelete += $version.id
    }
}

if ($toDelete.Count -eq 0) {
    Write-Host "No old versions to delete" -ForegroundColor Green
    exit 0
}

Write-Host ""
$confirm = Read-Host "Delete $($toDelete.Count) old version(s)? (y/n)"

if ($confirm -eq 'y') {
    Write-Host "Deleting old versions..." -ForegroundColor Yellow
    foreach ($version in $toDelete) {
        Write-Host "  Deleting $version..." -ForegroundColor Yellow
        gcloud app versions delete $version --quiet
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Deleted $version" -ForegroundColor Green
        } else {
            Write-Host "  Failed to delete $version" -ForegroundColor Red
        }
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Cleanup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "Cleanup cancelled" -ForegroundColor Yellow
}
