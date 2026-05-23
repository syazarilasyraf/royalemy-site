# Clash Royale Card Downloader for Windows PowerShell
# Downloads card images and generates cards.json from official CR API
#
# Prerequisites:
#   - Windows PowerShell 5.0 or later
#   - Internet connection
#   - Clash Royale API token from https://developer.clashroyale.com/
#
# Usage:
#   $env:CR_TOKEN = "your_token_here"
#   .\scripts\download-cards.ps1
#
# Or with the token inline:
#   $env:CR_TOKEN="your_token"; .\scripts\download-cards.ps1

param()

# Configuration
$API_URL = "https://api.clashroyale.com/v1/cards"
$CARDS_DIR = "public/cards"
$DATA_DIR = "src/data"
$CARDS_JSON = "$DATA_DIR/cards.json"
$PLACEHOLDER_IMAGE = "$CARDS_DIR/placeholder.png"

# Ensure we're in the project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Clash Royale Card Downloader" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for API token
if (-not $env:CR_TOKEN) {
    Write-Host "ERROR: CR_TOKEN environment variable is not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix this, run one of these commands first:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Option 1 - Set for current session:" -ForegroundColor Gray
    Write-Host '    $env:CR_TOKEN = "your_token_here"' -ForegroundColor White
    Write-Host ""
    Write-Host "  Option 2 - Set inline with script:" -ForegroundColor Gray
    Write-Host '    $env:CR_TOKEN="your_token"; .\scripts\download-cards.ps1' -ForegroundColor White
    Write-Host ""
    Write-Host "Get your token from: https://developer.clashroyale.com/" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Validate token format (basic check)
if ($env:CR_TOKEN.Length -lt 10) {
    Write-Host "ERROR: CR_TOKEN appears to be invalid (too short)" -ForegroundColor Red
    Write-Host "Please check your token and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "API Token: $($env:CR_TOKEN.Substring(0, [Math]::Min(10, $env:CR_TOKEN.Length)))... (hidden)" -ForegroundColor Green
Write-Host ""

# Create directories
Write-Host "Creating directories..." -ForegroundColor Yellow
try {
    New-Item -ItemType Directory -Force -Path $CARDS_DIR | Out-Null
    New-Item -ItemType Directory -Force -Path $DATA_DIR | Out-Null
    Write-Host "  OK - Directories ready" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create directories" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Create placeholder image if it doesn't exist
if (-not (Test-Path $PLACEHOLDER_IMAGE)) {
    Write-Host "Creating placeholder image..." -ForegroundColor Yellow
    # Create a simple 1x1 transparent PNG as base64
    $placeholderBase64 = "iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8xMi8xMqJYsQoAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAABHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgx7cOAAEMRMJAAAAAElFTkSuQmCC"
    [Convert]::FromBase64String($placeholderBase64) | Set-Content $PLACEHOLDER_IMAGE -Encoding Byte
    Write-Host "  OK - Placeholder created" -ForegroundColor Green
}

# Fetch cards from API
Write-Host "Fetching cards from Clash Royale API..." -ForegroundColor Yellow
Write-Host "  URL: $API_URL" -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $($env:CR_TOKEN)"
        "Accept" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $API_URL -Headers $headers -Method Get -TimeoutSec 30
    
    $CARD_COUNT = $response.items.Count
    Write-Host "  OK - Found $CARD_COUNT cards" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: API request failed!" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
        
        switch ($statusCode) {
            401 { 
                Write-Host "Reason: Unauthorized - Your API token is invalid or expired" -ForegroundColor Yellow
                Write-Host "Solution: Generate a new token at https://developer.clashroyale.com/" -ForegroundColor Cyan
            }
            403 { 
                Write-Host "Reason: Forbidden - Your IP may not be whitelisted" -ForegroundColor Yellow
                Write-Host "Solution: Add your current IP to the allowed list in the developer portal" -ForegroundColor Cyan
            }
            429 { 
                Write-Host "Reason: Rate Limited - Too many requests" -ForegroundColor Yellow
                Write-Host "Solution: Wait a few minutes and try again" -ForegroundColor Cyan
            }
            503 { 
                Write-Host "Reason: Service Unavailable - CR API may be down" -ForegroundColor Yellow
                Write-Host "Solution: Try again later" -ForegroundColor Cyan
            }
            default {
                Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Check your internet connection." -ForegroundColor Yellow
    }
    
    Write-Host ""
    exit 1
}

Write-Host ""

# Generate cards.json
Write-Host "Generating $CARDS_JSON..." -ForegroundColor Yellow

try {
    $cards_map = @{}
    
    foreach ($card in $response.items) {
        $card_id = [string]$card.id
        $cards_map[$card_id] = @{
            id = $card.id
            name = $card.name
            image = "/cards/$card_id.png"
        }
    }
    
    # Convert to ordered hashtable for consistent JSON output
    $orderedCards = [ordered]@{}
    $sortedKeys = $cards_map.Keys | Sort-Object {[int]$_}
    foreach ($key in $sortedKeys) {
        $orderedCards[$key] = $cards_map[$key]
    }
    
    # Convert to JSON and save with UTF8 encoding
    $jsonOutput = $orderedCards | ConvertTo-Json -Depth 10
    $jsonOutput | Set-Content $CARDS_JSON -Encoding UTF8
    
    Write-Host "  OK - Saved $CARDS_JSON with $($cards_map.Count) cards" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to generate cards.json" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# Download images
Write-Host "Downloading card images..." -ForegroundColor Yellow
Write-Host "  Saving to: $CARDS_DIR/" -ForegroundColor Gray
Write-Host ""

$total = 0
$success = 0
$skipped = 0
$failed = 0
$failedCards = @()

foreach ($card in $response.items | Sort-Object id) {
    $total++
    $card_id = [string]$card.id
    $icon_url = $card.iconUrls.medium
    $output_file = "$CARDS_DIR/$card_id.png"
    
    # Check if already exists
    if (Test-Path $output_file) {
        $fileSize = (Get-Item $output_file).Length
        if ($fileSize -gt 100) {
            Write-Host "  [$total/$CARD_COUNT] $card_id.png - Already exists (skipping)" -ForegroundColor DarkGray
            $skipped++
            continue
        } else {
            Write-Host "  [$total/$CARD_COUNT] $card_id.png - File corrupt, re-downloading..." -ForegroundColor Yellow
            Remove-Item $output_file -ErrorAction SilentlyContinue
        }
    }
    
    # Download the image
    try {
        Invoke-WebRequest -Uri $icon_url -OutFile $output_file -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing
        
        # Verify the download
        if ((Test-Path $output_file) -and (Get-Item $output_file).Length -gt 100) {
            Write-Host "  [$total/$CARD_COUNT] $card_id.png - $($card.name) - OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host "  [$total/$CARD_COUNT] $card_id.png - FAILED (invalid file)" -ForegroundColor Red
            Remove-Item $output_file -ErrorAction SilentlyContinue
            $failed++
            $failedCards += $card_id
        }
    } catch {
        Write-Host "  [$total/$CARD_COUNT] $card_id.png - FAILED ($($_.Exception.Message))" -ForegroundColor Red
        Remove-Item $output_file -ErrorAction SilentlyContinue
        $failed++
        $failedCards += $card_id
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Download Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Total cards:    $total" -ForegroundColor White
Write-Host "  Downloaded:     $success" -ForegroundColor Green
Write-Host "  Skipped:        $skipped" -ForegroundColor Yellow
Write-Host "  Failed:         $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "  Images saved to: $((Resolve-Path $CARDS_DIR).Path)" -ForegroundColor Gray
Write-Host "  Card data saved to: $((Resolve-Path $CARDS_JSON).Path)" -ForegroundColor Gray
Write-Host ""

if ($failed -gt 0) {
    Write-Host "WARNING: Some cards failed to download." -ForegroundColor Yellow
    Write-Host "Failed cards: $($failedCards -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can re-run this script to retry failed downloads." -ForegroundColor Cyan
    Write-Host ""
    exit 1
} else {
    Write-Host "All cards downloaded successfully! " -ForegroundColor Green -NoNewline
    Write-Host "🎉"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run 'npm run dev' to start the app" -ForegroundColor White
    Write-Host "  2. Open http://localhost:3000 in your browser" -ForegroundColor White
    Write-Host ""
    exit 0
}
