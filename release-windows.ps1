# Windows-compatible release script for Theatre.js
# Usage: .\release-windows.ps1 -Version "1.0.13"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

Write-Host "Starting release process for version $Version" -ForegroundColor Green

# Validate version format
if ($Version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+(\-(dev|rc|beta)\.[0-9]+)?$') {
    Write-Host "Error: Invalid version format. Use semver like 1.2.3 or 1.2.3-rc.4" -ForegroundColor Red
    exit 1
}

# Check if git working directory is clean
$gitStatus = git status -s
if ($gitStatus) {
    Write-Host "Error: Git working directory contains uncommitted changes:" -ForegroundColor Red
    git status -s
    Write-Host "Commit/stash them and try again." -ForegroundColor Red
    exit 1
}

# Get current version from package.json
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

if ($Version -eq $currentVersion) {
    Write-Host "Error: Version $Version is already assigned to package.json" -ForegroundColor Red
    exit 1
}

# Check if git tag already exists
$existingTags = git tag --list
if ($existingTags -contains $Version) {
    Write-Host "Error: Git tag $Version already exists" -ForegroundColor Red
    exit 1
}

# Determine npm tag
$npmTag = "latest"
if ($Version -match '^[0-9]+\.[0-9]+\.[0-9]+$') {
    Write-Host "NPM tag: latest" -ForegroundColor Cyan
} elseif ($Version -match '^[0-9]+\.[0-9]+\.[0-9]+\-(dev|rc|beta)\.[0-9]+$') {
    $npmTag = $Matches[1]
    Write-Host "NPM tag: $npmTag" -ForegroundColor Cyan
} else {
    Write-Host "Error: Invalid version format" -ForegroundColor Red
    exit 1
}

# Run typecheck and lint
Write-Host "`nRunning typecheck and lint..." -ForegroundColor Yellow
yarn run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
yarn run lint:all
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Update version in all package.json files
Write-Host "`nUpdating version numbers..." -ForegroundColor Yellow
$packagesToUpdate = @(
    ".",
    "theatre",
    "theatre/core",
    "theatre/studio",
    "packages/dataverse",
    "packages/react",
    "packages/browser-bundles",
    "packages/r3f",
    "packages/theatric"
)

foreach ($pkg in $packagesToUpdate) {
    $pkgPath = Join-Path $pwd "$pkg/package.json"
    $pkgJson = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $pkgJson.version = $Version
    $pkgJson | ConvertTo-Json -Depth 100 | Set-Content $pkgPath -NoNewline
    
    # Run prettier
    yarn prettier --write "$pkg/package.json"
}

# Build all packages
Write-Host "`nBuilding all packages..." -ForegroundColor Yellow
$packagesToBuild = @(
    "theatre",
    "@tomorrowevening/theatre-dataverse",
    "@tomorrowevening/theatre-react",
    "@tomorrowevening/theatre-browser-bundles",
    "@tomorrowevening/theatre-r3f",
    "@tomorrowevening/theatric"
)

foreach ($workspace in $packagesToBuild) {
    Write-Host "Building $workspace..." -ForegroundColor Cyan
    yarn workspace $workspace run build
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "Error building $workspace" -ForegroundColor Red
        exit $LASTEXITCODE 
    }
}

# Commit and tag
Write-Host "`nCommitting and tagging..." -ForegroundColor Yellow
git add .
git commit -m $Version
git tag $Version

Write-Host "`nVersion $Version committed and tagged successfully!" -ForegroundColor Green

# Publish to npm
Write-Host "`nPublishing to npm with tag '$npmTag'..." -ForegroundColor Yellow
$packagesToPublish = @(
    "@tomorrowevening/theatre-core",
    "@tomorrowevening/theatre-studio",
    "@tomorrowevening/theatre-dataverse",
    "@tomorrowevening/theatre-react",
    "@tomorrowevening/theatre-browser-bundles",
    "@tomorrowevening/theatre-r3f",
    "@tomorrowevening/theatric"
)

foreach ($workspace in $packagesToPublish) {
    Write-Host "Publishing $workspace..." -ForegroundColor Cyan
    yarn workspace $workspace npm publish --access public --tag $npmTag
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "Error publishing $workspace" -ForegroundColor Red
        exit $LASTEXITCODE 
    }
}

Write-Host "`n✅ Release $Version completed successfully!" -ForegroundColor Green
Write-Host "All packages published to npm with tag '$npmTag'" -ForegroundColor Green
