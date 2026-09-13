@echo off
REM ==============================================================================
REM HashApe Cloudflare Tunnel Runner (Windows)
REM Exposes local Node.js mining server (port 3000) securely via Cloudflare Edge
REM ==============================================================================

where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] cloudflared CLI not found on PATH.
    echo Please install cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    echo Or via Winget: winget install --id Cloudflare.cloudflared
    pause
    exit /b 1
)

echo ==============================================================================
echo ⚡ Launching Cloudflare Quick Tunnel for HashApe Mining Server (Port 3000)...
echo 🔒 Traffic is encrypted via Cloudflare Edge with automatic HTTPS/SSL
echo ==============================================================================

cloudflared tunnel --url http://localhost:3000
