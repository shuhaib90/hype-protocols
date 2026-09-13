# Cloudflare Production Deployment & Edge CDN Caching Guide

This guide provides the complete setup for running **ApeSyndicate HashApe** on **Cloudflare** for maximum performance, global sub-20ms edge delivery for 10,000 NFT images/metadata, and enterprise-grade DDoS mitigation.

---

## 1. SSL/TLS & Encryption Settings

In your Cloudflare Dashboard for your domain (e.g. `hashape.fun`):

1. Navigate to **SSL/TLS** -> **Overview**:
   - Set encryption mode to: **Full (Strict)** (if your origin uses valid TLS), or **Full** (if using a self-signed or Cloudflare Origin CA certificate).
2. Navigate to **SSL/TLS** -> **Edge Certificates**:
   - **Always Use HTTPS**: `ON`
   - **Minimum TLS Version**: `TLS 1.2` (or `TLS 1.3`)
   - **Opportunistic Encryption**: `ON`
   - **TLS 1.3**: `ON`
   - **Automatic HTTPS Rewrites**: `ON`

---

## 2. Cloudflare Edge Cache Rules (Critical for 10,000 NFTs)

Cloudflare Edge Cache eliminates 99.9% of origin server bandwidth and CPU usage by caching metadata and images across 300+ global datacenters.

Navigate to **Caching** -> **Cache Rules** -> **Create Rule**:

### Rule 1: 10,000 NFT PNG Images (Cache Everything)
- **Rule Name**: `Cache HashApe NFT Images`
- **Expression**:
  ```text
  (http.request.uri.path starts_with "/images/") or (http.request.uri.path eq "/preview.png")
  ```
- **Cache Eligibility**: `Eligible for cache`
- **Edge TTL**: `Override origin` -> `1 month` (or `Respect origin`, which sets `s-maxage=31536000` / 1 year)
- **Browser TTL**: `Override origin` -> `1 month`
- **Tiered Cache**: `ON`

### Rule 2: OpenSea / Marketplace Metadata
- **Rule Name**: `Cache OpenSea Metadata JSON`
- **Expression**:
  ```text
  (http.request.uri.path starts_with "/metadata/") or (http.request.uri.path eq "/storefront.json")
  ```
- **Cache Eligibility**: `Eligible for cache`
- **Edge TTL**: `Override origin` -> `1 day` (86,400s)
- **Browser TTL**: `Override origin` -> `1 hour` (3,600s)
- **Serve Stale While Revalidating**: `ON`

### Rule 3: Dynamic Mining & Admin APIs (Bypass Cache)
- **Rule Name**: `Bypass Mining & Admin APIs`
- **Expression**:
  ```text
  (http.request.uri.path starts_with "/api/")
  ```
- **Cache Eligibility**: `Bypass cache`

---

## 3. Cloudflare WAF & Security Rules

### A. Bot Fight Mode
Navigate to **Security** -> **Bots**:
- Turn **Bot Fight Mode**: `ON` (mitigates malicious automated scrapers and layer-7 HTTP flood bots).

### B. Mining API Rate Limiting (Prevent Challenge Floods)
Navigate to **Security** -> **WAF** -> **Rate Limiting Rules** -> **Create Rule**:
- **Rule Name**: `Throttle Mining Session Generation`
- **If incoming requests match**:
  ```text
  (http.request.uri.path eq "/api/mining/session" and http.request.method eq "POST")
  ```
- **Rate**: `60 requests per 1 minute`
- **Action**: `Block` or `Managed Challenge` for 10 minutes.

### C. Admin Endpoints Protection (Optional Extra Security)
- You can place `/api/admin/*` behind **Cloudflare Zero Trust Access** requiring email OTP verification, ensuring only your admin can touch treasury fee claims and epoch overrides.

---

## 4. Cloudflare Tunnel (`cloudflared`) Setup (Zero Open Ports)

Cloudflare Tunnel creates an encrypted outbound-only connection from your server to Cloudflare Edge. You never need to open port 80 or 443 in your router or VPS firewall.

### Quick Tunnel (Temporary Testing URL)
```bash
# Windows
cloudflare\run-tunnel.bat

# Linux / macOS
chmod +x cloudflare/run-tunnel.sh
./cloudflare/run-tunnel.sh
```
This prints a live public HTTPS URL (e.g. `https://random-words.trycloudflare.com`) pointing directly to your local instance.

### Permanent Production Named Tunnel

1. **Authenticate CLI with Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```
2. **Create Named Tunnel**:
   ```bash
   cloudflared tunnel create hashape-prod
   ```
   *(Note the Tunnel UUID output in the terminal)*

3. **Configure DNS Route**:
   ```bash
   cloudflared tunnel route dns hashape-prod hashape.fun
   cloudflared tunnel route dns hashape-prod cdn.hashape.fun
   ```

4. **Copy & Edit Config File**:
   Copy `cloudflare/tunnel-config.example.yml` to `~/.cloudflared/config.yml` and insert your tunnel UUID.

5. **Start Tunnel as a Background Service**:
   ```bash
   # Test in foreground
   cloudflared tunnel run hashape-prod

   # Or install as continuous OS system service
   cloudflared service install
   ```

---

## 5. Origin Server Real IP Verification

`serve.js` automatically inspects:
1. `CF-Connecting-IP`: Primary Cloudflare client IP
2. `True-Client-IP`: Enterprise Cloudflare header
3. `X-Forwarded-For`: Standard reverse proxy chain

You can verify that your Cloudflare connection is recognized at:
```http
GET https://hashape.fun/api/system/health
```
Response:
```json
{
  "success": true,
  "status": "HEALTHY",
  "service": "ApeSyndicate HashApe PoW Mining Engine",
  "network": "Robinhood EVM L2",
  "clientIp": "198.51.100.24",
  "cloudflare": {
    "isCloudflare": true,
    "cfRay": "8931b26f5a31a97c-IAD",
    "cfCountry": "US",
    "cfConnectingIp": "198.51.100.24"
  },
  "uptimeSeconds": 3600
}
```
