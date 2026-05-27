# Clash Royale Card Downloader for Windows PowerShell
# Downloads card images (base, evolution, hero) and generates cards.json from official CR API
# Converts PNG images to WebP for faster loading
#
# Prerequisites:
#   - Windows PowerShell 5.0 or later
#   - Internet connection
#   - Clash Royale API token from https://developer.clashroyale.com/
#   - Python with Pillow (pip install Pillow)
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
$PLACEHOLDER_IMAGE = "$CARDS_DIR/placeholder.webp"

# Ensure we're in the project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Clash Royale Card Downloader" -ForegroundColor Cyan
Write-Host "  (WebP + Evo/Hero Edition)" -ForegroundColor Cyan
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
    $pythonCmd = "python"
    if (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonCmd = "python3"
    }
    
    $pyScript = @"
from PIL import Image
img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
img.save('$PLACEHOLDER_IMAGE', 'WEBP')
print('OK')
"@
    
    try {
        $result = $pyScript | & $pythonCmd - 2>&1
        if ($result -eq "OK") {
            Write-Host "  OK - Placeholder created" -ForegroundColor Green
        } else {
            Write-Host "  WARNING - Could not create placeholder, continuing..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  WARNING - Could not create placeholder, continuing..." -ForegroundColor Yellow
    }
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
        $urls = $card.iconUrls
        
        # Determine card type
        $type = "troop"
        if ($card_id -match "^27") {
            $type = "building"
        } elseif ($card.maxLevel -le 11) {
            $type = "spell"
        }
        
        $entry = @{
            id = $card.id
            name = $card.name
            image = "/cards/$card_id.webp"
            elixir = $card.elixirCost
            rarity = $card.rarity.ToLower()
            type = $type
        }
        
        # Add evolution image if available
        if ($urls.evolutionMedium) {
            $entry.evolutionImage = "/cards/${card_id}_evo.webp"
        }
        
        # Add hero image if available
        if ($urls.heroMedium) {
            $entry.heroImage = "/cards/${card_id}_hero.webp"
        }
        
        $cards_map[$card_id] = $entry
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
    $urls = $card.iconUrls
    
    # Download base image
    $base_png = "$CARDS_DIR/$card_id.png"
    $base_webp = "$CARDS_DIR/$card_id.webp"
    
    if (-not (Test-Path $base_webp)) {
        try {
            Invoke-WebRequest -Uri $urls.medium -OutFile $base_png -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing
            if ((Test-Path $base_png) -and (Get-Item $base_png).Length -gt 100) {
                $success++
            } else {
                Remove-Item $base_png -ErrorAction SilentlyContinue
                $failed++
                $failedCards += "$card_id (base)"
            }
        } catch {
            Remove-Item $base_png -ErrorAction SilentlyContinue
            $failed++
            $failedCards += "$card_id (base)"
        }
    } else {
        $skipped++
    }
    
    # Download evolution image if available
    if ($urls.evolutionMedium) {
        $evo_png = "$CARDS_DIR/${card_id}_evo.png"
        $evo_webp = "$CARDS_DIR/${card_id}_evo.webp"
        
        if (-not (Test-Path $evo_webp)) {
            try {
                Invoke-WebRequest -Uri $urls.evolutionMedium -OutFile $evo_png -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing
                if (-not ((Test-Path $evo_png) -and (Get-Item $evo_png).Length -gt 100)) {
                    Remove-Item $evo_png -ErrorAction SilentlyContinue
                    $failed++
                    $failedCards += "$card_id (evo)"
                }
            } catch {
                Remove-Item $evo_png -ErrorAction SilentlyContinue
                $failed++
                $failedCards += "$card_id (evo)"
            }
        }
    }
    
    # Download hero image if available
    if ($urls.heroMedium) {
        $hero_png = "$CARDS_DIR/${card_id}_hero.png"
        $hero_webp = "$CARDS_DIR/${card_id}_hero.webp"
        
        if (-not (Test-Path $hero_webp)) {
            try {
                Invoke-WebRequest -Uri $urls.heroMedium -OutFile $hero_png -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing
                if (-not ((Test-Path $hero_png) -and (Get-Item $hero_png).Length -gt 100)) {
                    Remove-Item $hero_png -ErrorAction SilentlyContinue
                    $failed++
                    $failedCards += "$card_id (hero)"
                }
            } catch {
                Remove-Item $hero_png -ErrorAction SilentlyContinue
                $failed++
                $failedCards += "$card_id (hero)"
            }
        }
    }
    
    Write-Host "  [$total/$CARD_COUNT] $card_id - $($card.name)" -ForegroundColor Green
}

Write-Host ""

# Convert PNGs to WebP
Write-Host "Converting PNG images to WebP..." -ForegroundColor Yellow

$pythonCmd = "python"
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
}

$pyScript = @"
from PIL import Image
import os, glob

cards_dir = '$CARDS_DIR'
png_files = glob.glob(os.path.join(cards_dir, '*.png'))
converted = 0
errors = 0

for png_path in png_files:
    try:
        webp_path = png_path.replace('.png', '.webp')
        img = Image.open(png_path)
        if img.mode == 'P':
            img = img.convert('RGBA')
        img.save(webp_path, 'WEBP', quality=85, method=0)
        os.remove(png_path)
        converted += 1
    except Exception as e:
        errors += 1
        print(f'Error: {os.path.basename(png_path)}: {e}')

print(f'Converted {converted} images to WebP')
if errors:
    print(f'Errors: {errors}')
"@

try {
    $conversionResult = $pyScript | & $pythonCmd - 2>&1
    Write-Host "  $conversionResult" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: PNG to WebP conversion failed. Images remain as PNG." -ForegroundColor Yellow
    Write-Host "  Make sure Python and Pillow are installed: pip install Pillow" -ForegroundColor Yellow
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
    Write-Host "Failed: $($failedCards -join ', ')" -ForegroundColor Yellow
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
