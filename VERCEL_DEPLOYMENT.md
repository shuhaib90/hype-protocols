# 🚀 Deploying HashApe NFT Mining Protocol to Vercel

This guide provides the complete setup for deploying **HashApe** to **Vercel** with full static frontend delivery, WebGPU mining shaders, and serverless Node.js backend endpoints.

---

## Method 1: Deploy via Vercel Dashboard (Recommended - 1 Click)

Since all code is pushed to your GitHub repository ([`shuhaib90/hype-protocols`](https://github.com/shuhaib90/hype-protocols)), you can deploy with zero CLI commands:

1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Sign in with GitHub and select repository **`shuhaib90/hype-protocols`**.
3. Vercel automatically detects the configuration from [`vercel.json`](./vercel.json):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** (Optional, automated fallbacks are pre-configured):
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `SUPABASE_URL` | `https://rcxpnlaldmzzmktrrhke.supabase.co` | Remote PostgreSQL database |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Client anon API key |
5. Click **Deploy**.
6. Vercel builds the bundle and assigns your production domain (e.g. `https://hype-protocols.vercel.app`).

---

## Method 2: Deploy via Vercel CLI

In your terminal:

```bash
# 1. Login to Vercel (first-time only)
npx vercel login

# 2. Deploy to Production
npx vercel --prod
```

When prompted:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name: **hashape-mining** (or any name you prefer)
- In which directory is code located? **./**
- Want to modify settings? **N** (settings in `vercel.json` are automatically used)

---

## 🏗️ Architecture on Vercel

```
┌─────────────────────────────────────────────────────────────┐
│                       Vercel Edge CDN                       │
│  - Static Assets (Vite dist/): /assets/*, index.html        │
│  - Immutable Cache Headers (1 Year for assets)              │
│  - SPA Routing Fallback to index.html                       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Vercel Serverless Function │ │  4EVERLAND IPFS Gateway    │
│   (api/index.js)             │ │  (10,000 Pinned NFTs)      │
│  - /api/mining/supply        │ │  - /metadata/:id.json      │
│  - /api/mining/session       │ │  - /images/:id.png         │
│  - /api/mining/verify        │ │  - /storefront.json        │
│  - /api/config               │ └────────────────────────────┘
│  - /api/admin/*              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Supabase PostgreSQL     │
│   (Persistent Remote State)  │
│  - Total Mined & Epochs      │
│  - Mining Ledger Records     │
│  - Treasury Claim Logs       │
└──────────────────────────────┘
```

---

## 🔍 Verification After Deploy

Once your Vercel deployment URL is live (e.g. `https://your-app.vercel.app`), verify:

1. **System Health Check**:
   `GET https://your-app.vercel.app/api/system/health`
2. **Current Supply & Epoch Status**:
   `GET https://your-app.vercel.app/api/mining/supply`
3. **Smart Contract Config**:
   `GET https://your-app.vercel.app/api/config`
4. **Token Metadata**:
   `GET https://your-app.vercel.app/metadata/1.json`
5. **Collection Storefront**:
   `GET https://your-app.vercel.app/storefront.json`
