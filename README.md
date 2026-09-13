# 🦍 ApeSyndicate: HashApe WebGPU PoW NFT Mining Protocol

[![Network: Robinhood EVM L2](https://img.shields.io/badge/Network-Robinhood%20EVM%20L2-brightgreen)](https://github.com/shuhaib90/hype-protocols)
[![Cloudflare: Deployed](https://img.shields.io/badge/Cloudflare-Live%20on%20Edge-orange)](https://hashape-mining.maize-decade.workers.dev)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)](https://supabase.com)
[![Supply: 10,000 Hard Cap](https://img.shields.io/badge/Max%20Supply-10%2C000%20Hard%20Cap-blue)](https://github.com/shuhaib90/hype-protocols)

> **10,000 unique algorithmic pixel-art apes mined strictly via in-browser WebGPU compute shaders on Robinhood EVM Layer 2. Zero pre-sales, zero allowlists, zero team reservations.**

---

## 🌐 Live Deployments

- **Cloudflare Edge Live URL**: [https://hashape-mining.maize-decade.workers.dev](https://hashape-mining.maize-decade.workers.dev)
- **GitHub Repository**: [https://github.com/shuhaib90/hype-protocols](https://github.com/shuhaib90/hype-protocols)
- **Claim Cloudflare Worker into your permanent account**: [Claim Link](https://dash.cloudflare.com/claim-preview?claimToken=qCfg0Jsc5Fb9gPm6E2PPX7gtLW17McECsSJhThmvo7E) *(Valid for 60 minutes)*

---

## 💎 Protocol Specification & Parameters

| Parameter | Value | Details |
| :--- | :--- | :--- |
| **NFT Collection Name** | `HashApe` | 10,000 unique pixel-art ape editions |
| **Token Name & Symbol** | `HashApe` (`$HASHAPE`) | Used for worker rig blade activations |
| **Network** | **Robinhood EVM Layer 2** | Fast block times, gas-efficient compute |
| **Rig Activation Contract** | `0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc` | Required for Blades #2–#5 activation |
| **Admin & Treasury Wallet** | `0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C` | Creator royalty & fee recipient |
| **Creator Royalty** | **5.0% (500 BPS)** | ERC-2981 standard |
| **Max Quota Per Wallet** | **5 NFTs Max** | Anti-monopoly protection per address |
| **Proof-of-Work Architecture** | **Constant-Weight PoW** | Difficulty is determined strictly by active Epoch and wallet quota (1/5 to 5/5). Rig counts never dilute or soften target. |

---

## 🚀 Key Features

### 1. WebGPU Browser Compute Forge
- Parallelized Keccak-256 GPU compute shaders written in WGSL.
- **5-Worker Blade System**:
  - Blade 1: **FREE & Active by default**
  - Blades 2–5: Activated via `$HASHAPE` tokens (`0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc`)
  - Disjoint non-overlapping nonce space partitioning prevents duplicate hash computation across parallel nodes.

### 2. 10-Stage Progressive Epoch Pricing & Difficulty
- **Epoch 1 (Genesis)**: Tokens 1–10 ($5 ETH)
- **Epoch 2 (Ascension)**: Tokens 11–30 ($7 ETH)
- **Epoch 3 (Expansion)**: Tokens 31–70 ($10 ETH)
- ... escalating up to Epoch 10 (Tokens 5001–10000 @ $40 ETH).

### 3. Dedicated Admin Protocol Dashboard & Fee Vaults
- Accessible directly in the UI for creator wallet `0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C`.
- **Dual Fee Claim Vaults**:
  - **Mint Fees Vault (ETH)**: Claim collected ETH mint fees to admin wallet with cryptographic audit receipts.
  - **Rig Activation Vault (HASHAPE)**: Claim collected HASHAPE tokens from blade activations.
- **Batch 10-Epoch Fee Editor**: Custom pricing schedules committed on-chain.

### 4. Supabase Cloud Database (PostgreSQL)
- Dual-write architecture syncing state to Supabase PostgreSQL (`rcxpnlaldmzzmktrrhke`).
- Tables: `hashape_protocol_state`, `hashape_mining_records`, `hashape_worker_entitlements`, `hashape_used_proofs`, `hashape_epoch_overrides`, `hashape_treasury_claims`.
- Resilient local JSON fallback ensuring 100% offline availability.

### 5. Cloudflare Edge CDN & Security Hardening
- 1-Year Edge CDN caching for all 10,000 NFT PNG images (`s-maxage=31536000, immutable`).
- Real-client IP resolution via `CF-Connecting-IP`.
- In-memory sliding-window origin rate limiter (anti-DDoS).
- HSTS, X-Content-Type-Options: nosniff, and anti-clickjacking headers.

---

## 🛠 Local Development & Testing

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run Node.js production server with Supabase
npm start

# Run all 5 automated test suites (219 tests)
npm test

# Deploy to Cloudflare
npm run deploy:worker
```

---

## 🔒 OpenSea Metadata & Standard Compliance

- Token Metadata: `GET /metadata/:id` and `GET /metadata/:id.json`
- Token Images: `GET /images/:id.png`
- Collection Storefront: `GET /storefront.json` and `GET /contract.json`
- Collection Preview: `GET /preview.png`
