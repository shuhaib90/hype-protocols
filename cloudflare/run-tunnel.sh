#!/usr/bin/env bash
# ==============================================================================
# HashApe Cloudflare Tunnel Runner (Linux / macOS)
# Exposes local Node.js mining server (port 3000) securely via Cloudflare Edge
# ==============================================================================

if ! command -v cloudflared &> /dev/null; then
    echo "[ERROR] cloudflared CLI is not installed."
    echo "Install via Homebrew: brew install cloudflared"
    echo "Install on Debian/Ubuntu: curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb"
    exit 1
fi

echo "=============================================================================="
echo "⚡ Launching Cloudflare Quick Tunnel for HashApe Mining Server (Port 3000)..."
echo "🔒 Traffic is encrypted via Cloudflare Edge with automatic HTTPS/SSL"
echo "=============================================================================="

cloudflared tunnel --url http://localhost:3000
