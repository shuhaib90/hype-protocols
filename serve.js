require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers');
const supabaseAdapter = require('./supabaseAdapter');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mining-db.json');
const COLLECTION_DIR = path.join(__dirname, 'collection');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      totalMined: 3,
      maxSupply: 10000,
      records: [
        {
          id: 'mint_genesis_1',
          wallet: '0x3333111122223333444455556666777788889999',
          tokenId: 1,
          nonce: '1042',
          status: 'MINTED',
          epochId: 1,
          feeUsd: 5,
          txHash: '0x01a88b8e91f1c7d24a0d9e4c19b6bf35b9fd87f8373f7f82c53bc93c00000001',
          mintedAt: Date.now() - 3600000
        },
        {
          id: 'mint_genesis_2',
          wallet: '0x7777111122223333444455556666777788889999',
          tokenId: 2,
          nonce: '2084',
          status: 'MINTED',
          epochId: 1,
          feeUsd: 5,
          txHash: '0x02a88b8e91f1c7d24a0d9e4c19b6bf35b9fd87f8373f7f82c53bc93c00000002',
          mintedAt: Date.now() - 2400000
        },
        {
          id: 'mint_genesis_3',
          wallet: '0x9999111122223333444455556666777788889999',
          tokenId: 3,
          nonce: '3126',
          status: 'MINTED',
          epochId: 1,
          feeUsd: 5,
          txHash: '0x03a88b8e91f1c7d24a0d9e4c19b6bf35b9fd87f8373f7f82c53bc93c00000003',
          mintedAt: Date.now() - 1200000
        }
      ],
      workerEntitlements: {},
      usedProofs: {},
      activeMiners: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (parsed.totalMined === undefined) parsed.totalMined = 3;
    if (!parsed.maxSupply) parsed.maxSupply = 10000;
    if (!parsed.records) parsed.records = [];
    if (!parsed.workerEntitlements) parsed.workerEntitlements = {};
    if (!parsed.usedProofs) parsed.usedProofs = {};
    if (!parsed.activeMiners) parsed.activeMiners = {};
    if (!parsed.epochOverrides) parsed.epochOverrides = {};
    if (!parsed.treasury) parsed.treasury = { claimedMintFeesEth: 0, claimedRigFeesHashApe: 0, claims: [] };
    return parsed;
  } catch (e) {
    const initial = {
      totalMined: 3,
      maxSupply: 10000,
      records: [],
      workerEntitlements: {},
      usedProofs: {},
      activeMiners: {},
      epochOverrides: {},
      treasury: { claimedMintFeesEth: 0, claimedRigFeesHashApe: 0, claims: [] }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

let db = initDb();

// Hydrate from Supabase PostgreSQL if configured
supabaseAdapter.loadInitialDataFromSupabase(db).catch(err => {
  console.warn('⚠️ [HashApe Supabase] Error during startup hydration:', err.message);
});

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    supabaseAdapter.syncState(
      db.totalMined,
      db.treasury ? db.treasury.claimedMintFeesEth : 0,
      db.treasury ? db.treasury.claimedRigFeesHashApe : 0
    );
  } catch (err) {
    console.error('Error saving mining-db.json:', err);
  }
}

// Deterministic Dynamic Difficulty Bounds
const DIFFICULTY_TIERS = {
  EASY:     '0x' + '000f'.padEnd(64, 'f'),
  MEDIUM:   '0x' + '0007'.padEnd(64, 'f'),
  HARD:     '0x' + '0003'.padEnd(64, 'f'),
  VERYHARD: '0x' + '0001'.padEnd(64, 'f'),
  EXTREME:  '0x' + '00007'.padEnd(64, 'f'),
  MAXIMUM:  '0x' + '00000f'.padEnd(64, 'f'),
};

const WALLET_MAX_MINTS = 5;

// Sequential Escalating Difficulty Targets Per-Wallet (NFT 1/5 through 5/5)
// Each subsequent NFT minted by a wallet becomes progressively harder
const WALLET_DIFFICULTY_TIERS = [
  { tier: 1, label: 'HARD (NFT 1/5)', target: '0x0003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', leadingZeros: 3, estHashes: '65K' },
  { tier: 2, label: 'HARDER (NFT 2/5)', target: '0x0001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', leadingZeros: 4, estHashes: '131K' },
  { tier: 3, label: 'VERY HARD (NFT 3/5)', target: '0x00007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', leadingZeros: 5, estHashes: '524K' },
  { tier: 4, label: 'EXTREME (NFT 4/5)', target: '0x00003fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', leadingZeros: 6, estHashes: '1.05M' },
  { tier: 5, label: 'LEGENDARY (NFT 5/5)', target: '0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', leadingZeros: 7, estHashes: '4.19M' },
];

// Authoritative 10-Epoch Progressive Difficulty & Escalating Mint Fees
// 10 Epochs across 10,000 supply:
// Epoch 1: Tokens 1 to 10 (10 NFTs) - Mine Hard, Mint Fee: $5 ETH (0.0020 ETH / 5 $APE)
// Epoch 2: Tokens 11 to 30 (20 NFTs) - Mine Harder, Mint Fee: $7 ETH (0.0028 ETH / 7 $APE)
// Subsequent Epochs: Progressively escalating difficulty and fees up to 10,000 Hard Cap
const BASE_EPOCHS = [
  { id: 1, name: 'EPOCH 1 (GENESIS)', startToken: 1, endToken: 10, count: 10, mintFeeUsd: 5, mintFeeEth: 0.0020, mintFeeApe: 5, difficulty: 'HARD', target: '0x0003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 2, name: 'EPOCH 2 (ASCENSION)', startToken: 11, endToken: 30, count: 20, mintFeeUsd: 7, mintFeeEth: 0.0028, mintFeeApe: 7, difficulty: 'HARDER', target: '0x0001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 3, name: 'EPOCH 3 (EXPANSION)', startToken: 31, endToken: 70, count: 40, mintFeeUsd: 10, mintFeeEth: 0.0040, mintFeeApe: 10, difficulty: 'VERY HARD', target: '0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 4, name: 'EPOCH 4 (SURGE)', startToken: 71, endToken: 150, count: 80, mintFeeUsd: 14, mintFeeEth: 0.0056, mintFeeApe: 14, difficulty: 'VERY HARD+', target: '0x00007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 5, name: 'EPOCH 5 (NEXUS)', startToken: 151, endToken: 300, count: 150, mintFeeUsd: 18, mintFeeEth: 0.0072, mintFeeApe: 18, difficulty: 'EXTREME', target: '0x00003fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 6, name: 'EPOCH 6 (APEX)', startToken: 301, endToken: 600, count: 300, mintFeeUsd: 22, mintFeeEth: 0.0088, mintFeeApe: 22, difficulty: 'EXTREME+', target: '0x00001fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 7, name: 'EPOCH 7 (SOVEREIGN)', startToken: 601, endToken: 1200, count: 600, mintFeeUsd: 26, mintFeeEth: 0.0104, mintFeeApe: 26, difficulty: 'LEGENDARY', target: '0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 8, name: 'EPOCH 8 (TITAN)', startToken: 1201, endToken: 2500, count: 1300, mintFeeUsd: 30, mintFeeEth: 0.0120, mintFeeApe: 30, difficulty: 'LEGENDARY+', target: '0x000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 9, name: 'EPOCH 9 (MYTHIC)', startToken: 2501, endToken: 5000, count: 2500, mintFeeUsd: 35, mintFeeEth: 0.0140, mintFeeApe: 35, difficulty: 'MYTHIC', target: '0x000003fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
  { id: 10, name: 'EPOCH 10 (OMEGA)', startToken: 5001, endToken: 10000, count: 5000, mintFeeUsd: 40, mintFeeEth: 0.0160, mintFeeApe: 40, difficulty: 'OMEGA', target: '0x000001fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
];

function getEffectiveEpochs() {
  const overrides = db.epochOverrides || {};
  return BASE_EPOCHS.map(e => {
    const o = overrides[e.id] || overrides[String(e.id)];
    if (o) {
      const usd = o.mintFeeUsd !== undefined ? Number(o.mintFeeUsd) : e.mintFeeUsd;
      const eth = o.mintFeeEth !== undefined ? Number(o.mintFeeEth) : Number((usd / 2500).toFixed(4));
      const ape = o.mintFeeApe !== undefined ? Number(o.mintFeeApe) : usd;
      return {
        ...e,
        mintFeeUsd: usd,
        mintFeeEth: eth,
        mintFeeApe: ape
      };
    }
    return { ...e };
  });
}

function getEpochForToken(tokenId) {
  const safeId = Math.max(1, Math.min(10000, tokenId));
  const epochs = getEffectiveEpochs();
  return epochs.find(e => safeId >= e.startToken && safeId <= e.endToken) || epochs[epochs.length - 1];
}

function getCurrentEpoch(totalMined) {
  const nextToken = Math.min(10000, totalMined + 1);
  const epoch = getEpochForToken(nextToken);
  const minedInEpoch = Math.max(0, Math.min(epoch.count, totalMined - (epoch.startToken - 1)));
  const remainingInEpoch = Math.max(0, epoch.endToken - totalMined);
  const percentInEpoch = Number(((minedInEpoch / epoch.count) * 100).toFixed(1));
  const epochs = getEffectiveEpochs();
  const nextEpoch = epochs.find(e => e.id === epoch.id + 1) || null;

  return {
    ...epoch,
    nextToken,
    minedInEpoch,
    remainingInEpoch,
    percentInEpoch,
    nextEpoch: nextEpoch ? {
      id: nextEpoch.id,
      name: nextEpoch.name,
      startToken: nextEpoch.startToken,
      endToken: nextEpoch.endToken,
      mintFeeUsd: nextEpoch.mintFeeUsd,
      mintFeeEth: nextEpoch.mintFeeEth,
      mintFeeApe: nextEpoch.mintFeeApe
    } : null
  };
}

const WORKER_COST_MAP = { 2: 100, 3: 200, 4: 300, 5: 500 };

function getTreasuryStats() {
  if (!db.treasury) {
    db.treasury = { claimedMintFeesEth: 0, claimedRigFeesHashApe: 0, claims: [] };
  }

  // Calculate total mint fees collected (ETH)
  let totalMintFeesEth = 0;
  let mintedCount = 0;
  for (const r of (db.records || [])) {
    if (r.status === 'MINTED') {
      mintedCount++;
      const eth = r.feeEth !== undefined ? Number(r.feeEth) : (r.feeUsd ? Number((r.feeUsd / 2500).toFixed(4)) : 0.0020);
      totalMintFeesEth += eth;
    }
  }
  totalMintFeesEth = Number(totalMintFeesEth.toFixed(4));
  const claimedMintFeesEth = Number((db.treasury.claimedMintFeesEth || 0).toFixed(4));
  const claimableMintFeesEth = Number(Math.max(0, totalMintFeesEth - claimedMintFeesEth).toFixed(4));

  // Calculate total rig activation fees collected (HASHAPE)
  let totalRigFeesHashApe = 0;
  let activatedRigCount = 0;
  for (const wallet in (db.workerEntitlements || {})) {
    const entitlements = db.workerEntitlements[wallet];
    for (const [wId, active] of Object.entries(entitlements)) {
      if (active && WORKER_COST_MAP[wId]) {
        totalRigFeesHashApe += WORKER_COST_MAP[wId];
        activatedRigCount++;
      }
    }
  }
  const claimedRigFeesHashApe = Number(db.treasury.claimedRigFeesHashApe || 0);
  const claimableRigFeesHashApe = Math.max(0, totalRigFeesHashApe - claimedRigFeesHashApe);

  return {
    adminWallet: '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
    activationTokenContract: '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc',
    network: 'Robinhood EVM L2',
    mintFees: {
      totalCollectedEth: totalMintFeesEth,
      claimedEth: claimedMintFeesEth,
      claimableEth: claimableMintFeesEth,
      mintedCount,
      currency: 'ETH'
    },
    rigFees: {
      totalCollectedHashApe: totalRigFeesHashApe,
      claimedHashApe: claimedRigFeesHashApe,
      claimableHashApe: claimableRigFeesHashApe,
      activatedRigCount,
      currency: 'HASHAPE'
    },
    claims: db.treasury.claims || []
  };
}

function getWalletMintCount(wallet) {
  if (!wallet) return 0;
  const safe = wallet.toLowerCase();
  return (db.records || []).filter(r => r.wallet && r.wallet.toLowerCase() === safe && r.status === 'MINTED').length;
}

function getDifficultyForWallet(wallet) {
  const mintCount = getWalletMintCount(wallet);
  if (mintCount >= WALLET_MAX_MINTS) {
    return {
      tier: 6,
      label: 'MAX QUOTA REACHED (5/5)',
      target: '0x0000000000000000000000000000000000000000000000000000000000000000',
      estHashes: 'CAPPED',
      isCapped: true,
      mintCount,
      remainingQuota: 0
    };
  }
  const tierInfo = WALLET_DIFFICULTY_TIERS[mintCount];
  return {
    tier: tierInfo.tier,
    label: tierInfo.label,
    target: tierInfo.target,
    estHashes: tierInfo.estHashes,
    isCapped: false,
    mintCount,
    remainingQuota: WALLET_MAX_MINTS - mintCount
  };
}

function getDifficultyForSupply(totalMined, maxSupply) {
  const remaining = Math.max(0, maxSupply - totalMined);
  if (remaining > 7500) return { band: 'EASY', target: DIFFICULTY_TIERS.EASY };
  if (remaining > 5000) return { band: 'MEDIUM', target: DIFFICULTY_TIERS.MEDIUM };
  if (remaining > 2500) return { band: 'HARD', target: DIFFICULTY_TIERS.HARD };
  if (remaining > 1000) return { band: 'VERY HARD', target: DIFFICULTY_TIERS.VERYHARD };
  if (remaining > 100)  return { band: 'EXTREME', target: DIFFICULTY_TIERS.EXTREME };
  return { band: 'MAXIMUM', target: DIFFICULTY_TIERS.MAXIMUM };
}

// Parse incoming JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// Real Client IP resolution supporting Cloudflare Edge Proxy headers
function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp.trim();
  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp) return trueClientIp.trim();
  const xForwarded = req.headers['x-forwarded-for'];
  if (xForwarded) return xForwarded.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

// In-Memory Sliding Window Rate Limiter
const rateLimits = new Map();

function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimits.get(ip);
  if (!record || now > record.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

// Periodic cleanup of expired rate limit windows (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimits.entries()) {
    if (now > record.resetTime) rateLimits.delete(ip);
  }
}, 300000);

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let reqPath = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, CF-Connecting-IP');

  // Cloudflare & Production Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent Edge CDN Caching of Dynamic Mining and Admin API Endpoints
  if (reqPath.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ==========================================
  // SYSTEM & CLOUDFLARE HEALTH ROUTE
  // ==========================================
  if (reqPath === '/api/system/health' && req.method === 'GET') {
    const clientIp = getClientIp(req);
    const cfRay = req.headers['cf-ray'] || null;
    const cfCountry = req.headers['cf-ipcountry'] || null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      status: 'HEALTHY',
      service: 'ApeSyndicate HashApe PoW Mining Engine',
      network: 'Robinhood EVM L2',
      clientIp,
      cloudflare: {
        isCloudflare: !!cfRay,
        cfRay,
        cfCountry,
        cfConnectingIp: req.headers['cf-connecting-ip'] || null
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: Date.now()
    }));
    return;
  }

  // ==========================================
  // OPENSEA METADATA & IMAGE STORAGE ROUTES
  // ==========================================

  // 1. Token Metadata: GET /metadata/:id or GET /metadata/:id.json
  const metaMatch = reqPath.match(/^\/metadata\/(\d+)(\.json)?$/i);
  if (metaMatch && req.method === 'GET') {
    const tokenId = parseInt(metaMatch[1], 10);
    if (tokenId >= 1 && tokenId <= 10000) {
      const metaFilePath = path.join(COLLECTION_DIR, 'metadata', `${tokenId}.json`);
      if (fs.existsSync(metaFilePath)) {
        try {
          const raw = fs.readFileSync(metaFilePath, 'utf8');
          const parsed = JSON.parse(raw);
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const host = req.headers.host || `localhost:${PORT}`;
          // Ensure image URL is absolute and conforms to OpenSea standard
          parsed.image = `${protocol}://${host}/images/${tokenId}.png`;
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(parsed, null, 2));
          return;
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to read metadata' }));
          return;
        }
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Metadata not found' }));
    return;
  }

  // 2. Token Image: GET /images/:id.png
  const imgMatch = reqPath.match(/^\/images\/(\d+)\.png$/i);
  if (imgMatch && req.method === 'GET') {
    const tokenId = parseInt(imgMatch[1], 10);
    const imgFilePath = path.join(COLLECTION_DIR, 'images', `${tokenId}.png`);
    if (fs.existsSync(imgFilePath)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, s-maxage=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(imgFilePath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Image not found');
    return;
  }

  // 3. OpenSea Collection Storefront Metadata: GET /storefront.json or GET /contract.json
  if ((reqPath === '/storefront.json' || reqPath === '/contract.json') && req.method === 'GET') {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${PORT}`;
    const storefront = {
      name: "ApeSyndicate HashApes",
      description: "10,000 unique, named pixel-art ape editions mined strictly via in-browser WebGPU Proof-of-Work. Assembled through deterministic pixel editing of licensed reference artwork on HyperEVM. Zero direct public mints.",
      image: `${protocol}://${host}/preview.png`,
      external_link: `${protocol}://${host}`,
      seller_fee_basis_points: 500, // 5% royalty
      fee_recipient: "0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C"
    };
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(storefront, null, 2));
    return;
  }

  // 4. Collection Preview Image: GET /preview.png
  if (reqPath === '/preview.png' && req.method === 'GET') {
    const previewPath = path.join(COLLECTION_DIR, 'preview.png');
    if (fs.existsSync(previewPath)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(previewPath).pipe(res);
      return;
    }
  }

  // API 0: POST /api/mining/reset (Reset to Epoch 1 Genesis)
  if (reqPath === '/api/mining/reset' && req.method === 'POST') {
    db.totalMined = 3;
    db.records = [
      {
        id: 'mint_genesis_3',
        wallet: '0x9999111122223333444455556666777788889999',
        tokenId: 3,
        nonce: '3126',
        status: 'MINTED',
        epochId: 1,
        feeUsd: 5,
        txHash: '0x03a88b8e91f1c7d24a0d9e4c19b6bf35b9fd87f8373f7f82c53bc93c00000003',
        mintedAt: Date.now() - 1200000
      },
      {
        id: 'mint_genesis_2',
        wallet: '0x7777111122223333444455556666777788889999',
        tokenId: 2,
        nonce: '2084',
        status: 'MINTED',
        epochId: 1,
        feeUsd: 5,
        txHash: '0x02a88b8e91f1c7d24a0d9e4c19b6bf35b9fd87f8373f7f82c53bc93c00000002',
        mintedAt: Date.now() - 2400000
      },
      {
        id: 'mint_genesis_1',
        wallet: '0x3333111122223333444455556666777788889999',
        tokenId: 1,
        nonce: '1042',
        status: 'MINTED',
        epochId: 1,
        feeUsd: 5,
        txHash: '0x01a88b8e91f1c7d24a0d9e4c19b6bf35b9fd87f8373f7f82c53bc93c00000001',
        mintedAt: Date.now() - 3600000
      }
    ];
    db.usedProofs = {};
    db.epochOverrides = {};
    db.workerEntitlements = {};
    db.treasury = { claimedMintFeesEth: 0, claimedRigFeesHashApe: 0, claims: [] };
    saveDb();
    supabaseAdapter.resetRemoteState().catch(() => {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Reset to Epoch 1 (Tokens 1-10 @ $5 ETH)', totalMined: db.totalMined, currentEpoch: getCurrentEpoch(db.totalMined) }));
    return;
  }

  // API 1: GET /api/mining/supply
  if (reqPath === '/api/mining/supply' && req.method === 'GET') {
    const diff = getDifficultyForSupply(db.totalMined, db.maxSupply);
    const percentMined = Number(((db.totalMined / db.maxSupply) * 100).toFixed(2));
    const currentEpoch = getCurrentEpoch(db.totalMined);
    const supply = {
      totalMined: db.totalMined,
      maxSupply: db.maxSupply,
      remaining: Math.max(0, db.maxSupply - db.totalMined),
      difficultyBand: currentEpoch.difficulty,
      currentTargetHex: currentEpoch.target,
      percentMined,
      walletCap: WALLET_MAX_MINTS,
      escalatingTiers: WALLET_DIFFICULTY_TIERS,
      currentEpoch,
      epochs: getEffectiveEpochs(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, supply }));
    return;
  }

  // API 1.5: GET /api/mining/wallet-status
  if (reqPath === '/api/mining/wallet-status' && req.method === 'GET') {
    const wallet = (parsedUrl.searchParams.get('wallet') || '').toLowerCase();
    if (!wallet || !wallet.startsWith('0x')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Valid wallet address required' }));
      return;
    }
    const mintCount = getWalletMintCount(wallet);
    const diff = getDifficultyForWallet(wallet);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      wallet,
      walletMints: mintCount,
      maxMints: WALLET_MAX_MINTS,
      remainingQuota: Math.max(0, WALLET_MAX_MINTS - mintCount),
      isCapped: mintCount >= WALLET_MAX_MINTS,
      currentTier: diff,
    }));
    return;
  }

  // API 2: POST /api/mining/session
  if (reqPath === '/api/mining/session' && req.method === 'POST') {
    try {
      const clientIp = getClientIp(req);
      const rl = checkRateLimit(`sess_${clientIp}`, 60, 60000);
      if (!rl.allowed) {
        res.writeHead(429, { 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rl.resetTime - Date.now()) / 1000)
        });
        res.end(JSON.stringify({ success: false, error: 'Too many session requests. Rate limited by origin firewall.' }));
        return;
      }

      const data = await parseJsonBody(req);
      const wallet = (data.wallet || '').toLowerCase();
      if (!wallet || !wallet.startsWith('0x')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Valid wallet address required' }));
        return;
      }

      const mintCount = getWalletMintCount(wallet);
      if (mintCount >= WALLET_MAX_MINTS) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `MAX WALLET QUOTA REACHED (${WALLET_MAX_MINTS}/${WALLET_MAX_MINTS} NFTs MINTED). Each wallet can mint a maximum of 5 NFTs.`,
          walletMints: mintCount,
          maxMints: WALLET_MAX_MINTS,
          isCapped: true
        }));
        return;
      }

      const currentEpoch = getCurrentEpoch(db.totalMined);
      const diff = getDifficultyForWallet(wallet);
      const walletTargetBigInt = BigInt(diff.target);
      const epochTargetBigInt = BigInt(currentEpoch.target);
      const effectiveTarget = walletTargetBigInt < epochTargetBigInt ? diff.target : currentEpoch.target;

      const sessionId = 'sess_' + crypto.randomBytes(8).toString('hex');
      const challenge = '0x' + crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const expiresAt = now + 600 * 1000; // 10 minutes session

      const session = {
        sessionId,
        challenge,
        wallet,
        targetDifficulty: effectiveTarget,
        difficultyBand: diff.label,
        tier: diff.tier,
        walletMints: mintCount,
        maxMints: WALLET_MAX_MINTS,
        epoch: currentEpoch,
        startTime: now,
        expiresAt,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, session }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 3: POST /api/mining/verify
  if (reqPath === '/api/mining/verify' && req.method === 'POST') {
    try {
      const clientIp = getClientIp(req);
      const rl = checkRateLimit(`ver_${clientIp}`, 120, 60000);
      if (!rl.allowed) {
        res.writeHead(429, { 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rl.resetTime - Date.now()) / 1000)
        });
        res.end(JSON.stringify({ success: false, error: 'Too many verification attempts. Rate limited by origin firewall.' }));
        return;
      }

      const data = await parseJsonBody(req);
      const wallet = (data.wallet || '').toLowerCase();
      const challenge = data.challenge;
      const nonce = data.nonce;

      if (!wallet || !challenge || nonce === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing challenge, wallet, or nonce' }));
        return;
      }

      // Check supply
      if (db.totalMined >= db.maxSupply) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'NFT ALREADY CLAIMED: 10,000 Sold Out' }));
        return;
      }

      // Check wallet quota cap
      const mintCount = getWalletMintCount(wallet);
      if (mintCount >= WALLET_MAX_MINTS) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'MAX WALLET QUOTA REACHED (5/5 NFTs MINTED)' }));
        return;
      }

      const walletDiff = getDifficultyForWallet(wallet);
      const targetDiff = data.targetDifficulty || walletDiff.target;

      // Cryptographic Keccak-256 verification:
      // keccak256(abi.encodePacked(challenge, wallet, nonce))
      const safeMiner = wallet.startsWith('0x') ? wallet.toLowerCase() : '0x' + wallet.toLowerCase();
      const packed = ethers.solidityPacked(['bytes32', 'address', 'uint256'], [challenge, safeMiner, BigInt(nonce)]);
      const computedHash = ethers.keccak256(packed);
      const hashBigInt = BigInt(computedHash);
      const targetBigInt = BigInt(targetDiff);

      if (hashBigInt >= targetBigInt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid proof: Hash does not meet target difficulty' }));
        return;
      }

      // Check replay
      if (db.usedProofs[computedHash]) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Proof already used (replay protection)' }));
        return;
      }

      // Mark used
      db.usedProofs[computedHash] = true;
      saveDb();
      supabaseAdapter.syncUsedProof(computedHash).catch(() => {});

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        valid: true,
        proofHash: computedHash,
        walletMints: mintCount,
        maxMints: WALLET_MAX_MINTS,
        verifiedAt: Date.now()
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 4: POST /api/mining/record
  if (reqPath === '/api/mining/record' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const wallet = (data.wallet || '').toLowerCase();

      if (data.action === 'solve') {
        const newRecord = {
          id: 'solv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          wallet,
          tokenId: Number(data.tokenId || db.totalMined + 1),
          nonce: String(data.nonce),
          solvedHash: data.solvedHash || '',
          difficulty: Number(data.difficulty || 4),
          gpuRenderer: data.gpuRenderer || 'WebGPU Compute Core',
          status: 'SOLVED',
          solvedAt: Date.now(),
          txHash: null
        };
        db.records.unshift(newRecord);
        saveDb();
        supabaseAdapter.syncRecord(newRecord).catch(() => {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, record: newRecord }));
        return;
      }

      if (data.action === 'mint') {
        const tokenId = Number(data.tokenId);
        const txHash = data.txHash || '';

        // Check wallet quota cap
        const mintCount = getWalletMintCount(wallet);
        if (mintCount >= WALLET_MAX_MINTS) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'MAX WALLET QUOTA REACHED (5/5 NFTs MINTED)' }));
          return;
        }

        const currentEpoch = getCurrentEpoch(db.totalMined);

        // Increment supply on mint
        if (db.totalMined < db.maxSupply) {
          db.totalMined++;
        }

        const target = db.records.find(r => r.wallet === wallet && r.tokenId === tokenId);
        if (target) {
          target.status = 'MINTED';
          target.txHash = txHash;
          target.epochId = currentEpoch.id;
          target.feeUsd = currentEpoch.mintFeeUsd;
          target.feeEth = currentEpoch.mintFeeEth;
          target.mintedAt = Date.now();
        } else {
          db.records.unshift({
            id: 'mint_' + Date.now(),
            wallet,
            tokenId,
            nonce: data.nonce || '0',
            status: 'MINTED',
            epochId: currentEpoch.id,
            feeUsd: currentEpoch.mintFeeUsd,
            feeEth: currentEpoch.mintFeeEth,
            txHash,
            mintedAt: Date.now()
          });
        }
        const updatedRecord = target || db.records[0];
        saveDb();
        supabaseAdapter.syncRecord(updatedRecord).catch(() => {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          totalMined: db.totalMined,
          record: updatedRecord,
          walletMints: mintCount + 1,
          maxMints: WALLET_MAX_MINTS,
          currentEpoch: getCurrentEpoch(db.totalMined)
        }));
        return;
      }


      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 5: GET /api/mining/records
  if (reqPath === '/api/mining/records' && req.method === 'GET') {
    const wallet = (parsedUrl.searchParams.get('wallet') || '').toLowerCase();
    const userRecords = wallet
      ? db.records.filter(r => r.wallet === wallet)
      : db.records.slice(0, 50);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, records: userRecords }));
    return;
  }

  // API 6: POST /api/workers/activate
  if (reqPath === '/api/workers/activate' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const wallet = (data.wallet || '').toLowerCase();
      const workerId = Number(data.workerId);

      if (!wallet || workerId < 2 || workerId > 5) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid wallet or worker ID' }));
        return;
      }

      if (!db.workerEntitlements[wallet]) db.workerEntitlements[wallet] = {};
      db.workerEntitlements[wallet][workerId] = true;
      saveDb();
      supabaseAdapter.syncWorkerEntitlement(wallet, workerId, true).catch(() => {});

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        wallet,
        workerId,
        active: true,
        activationTokenContract: '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc',
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 6.5: GET /api/workers/status
  if (reqPath === '/api/workers/status' && req.method === 'GET') {
    const wallet = (parsedUrl.searchParams.get('wallet') || '').toLowerCase();
    const entitlements = (wallet && db.workerEntitlements[wallet]) || {};
    const workers = {
      1: true,
      2: !!entitlements[2],
      3: !!entitlements[3],
      4: !!entitlements[4],
      5: !!entitlements[5],
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      wallet,
      workers,
      activationTokenContract: '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc',
    }));
    return;
  }

  // API 7: GET /api/config
  if (reqPath === '/api/config' && req.method === 'GET') {
    const currentEpoch = getCurrentEpoch(db.totalMined);
    const config = {
      maxSupply: 10000,
      maxMintsPerWallet: WALLET_MAX_MINTS,
      mintFeeHype: currentEpoch.mintFeeApe,
      mintFeeEth: currentEpoch.mintFeeEth,
      mintFeeUsd: currentEpoch.mintFeeUsd,
      currentEpoch,
      epochs: getEffectiveEpochs(),
      workerCosts: { 1: 0, 2: 100, 3: 200, 4: 300, 5: 500 },
      sessionDurationSeconds: 600,
      adminWallet: '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
      royaltyBasisPoints: 500,
      difficultyTiers: WALLET_DIFFICULTY_TIERS,
      activationTokenContract: '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc',
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, config }));
    return;
  }

  // API 8: POST /api/admin/epoch-fee (Single Epoch Mint Fee Update)
  if (reqPath === '/api/admin/epoch-fee' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const wallet = (data.wallet || '').toLowerCase();
      const adminWallet = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'.toLowerCase();

      if (wallet !== adminWallet) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized: Admin wallet required' }));
        return;
      }

      const epochId = parseInt(data.epochId, 10);
      if (isNaN(epochId) || epochId < 1 || epochId > 10) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid epoch ID (1-10)' }));
        return;
      }

      const mintFeeUsd = parseFloat(data.mintFeeUsd);
      if (isNaN(mintFeeUsd) || mintFeeUsd <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Mint fee must be greater than 0' }));
        return;
      }

      const mintFeeEth = data.mintFeeEth ? parseFloat(data.mintFeeEth) : Number((mintFeeUsd / 2500).toFixed(4));
      const mintFeeApe = data.mintFeeApe ? parseFloat(data.mintFeeApe) : mintFeeUsd;

      if (!db.epochOverrides) db.epochOverrides = {};
      db.epochOverrides[epochId] = {
        mintFeeUsd,
        mintFeeEth,
        mintFeeApe,
        updatedAt: Date.now()
      };
      saveDb();
      supabaseAdapter.syncEpochOverride(epochId, mintFeeUsd, mintFeeEth, mintFeeApe).catch(() => {});

      const updatedEpochs = getEffectiveEpochs();
      const currentEpoch = getCurrentEpoch(db.totalMined);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Epoch #${epochId} mint fee updated to $${mintFeeUsd} ETH (${mintFeeEth} ETH)`,
        epoch: updatedEpochs.find(e => e.id === epochId),
        currentEpoch,
        epochs: updatedEpochs
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 9: POST /api/admin/epoch-fees-batch (Batch Update All Epochs)
  if (reqPath === '/api/admin/epoch-fees-batch' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const wallet = (data.wallet || '').toLowerCase();
      const adminWallet = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'.toLowerCase();

      if (wallet !== adminWallet) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized: Admin wallet required' }));
        return;
      }

      const updates = data.epochs;
      if (!Array.isArray(updates)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Array of epoch updates required' }));
        return;
      }

      if (!db.epochOverrides) db.epochOverrides = {};
      for (const item of updates) {
        const id = parseInt(item.id, 10);
        const usd = parseFloat(item.mintFeeUsd);
        if (id >= 1 && id <= 10 && usd > 0) {
          const eth = item.mintFeeEth ? parseFloat(item.mintFeeEth) : Number((usd / 2500).toFixed(4));
          const ape = item.mintFeeApe ? parseFloat(item.mintFeeApe) : usd;
          db.epochOverrides[id] = {
            mintFeeUsd: usd,
            mintFeeEth: eth,
            mintFeeApe: ape,
            updatedAt: Date.now()
          };
          supabaseAdapter.syncEpochOverride(id, usd, eth, ape).catch(() => {});
        }
      }
      saveDb();

      const updatedEpochs = getEffectiveEpochs();
      const currentEpoch = getCurrentEpoch(db.totalMined);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'All epoch mint fees successfully updated',
        currentEpoch,
        epochs: updatedEpochs
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 10: GET /api/admin/treasury
  if (reqPath === '/api/admin/treasury' && req.method === 'GET') {
    const stats = getTreasuryStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, treasury: stats }));
    return;
  }

  // API 11: POST /api/admin/claim-mint-fees
  if (reqPath === '/api/admin/claim-mint-fees' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const wallet = (data.wallet || data.adminWallet || '').toLowerCase();
      const adminWallet = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'.toLowerCase();

      if (wallet !== adminWallet) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized: Admin wallet required' }));
        return;
      }

      const stats = getTreasuryStats();
      const claimable = stats.mintFees.claimableEth;

      if (claimable <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No claimable mint fees available in treasury' }));
        return;
      }

      const amountToClaim = data.amount ? Math.min(claimable, parseFloat(data.amount)) : claimable;
      db.treasury.claimedMintFeesEth = Number(((db.treasury.claimedMintFeesEth || 0) + amountToClaim).toFixed(4));

      const claimReceipt = {
        id: 'claim_mint_' + Date.now(),
        type: 'MINT_FEES_ETH',
        amount: amountToClaim,
        currency: 'ETH',
        network: 'Robinhood EVM L2',
        recipient: '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        timestamp: Date.now()
      };

      if (!db.treasury.claims) db.treasury.claims = [];
      db.treasury.claims.unshift(claimReceipt);
      saveDb();
      supabaseAdapter.syncTreasuryClaim(claimReceipt).catch(() => {});

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Successfully claimed ${amountToClaim} ETH to admin wallet`,
        claim: claimReceipt,
        treasury: getTreasuryStats()
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 12: POST /api/admin/claim-rig-fees
  if (reqPath === '/api/admin/claim-rig-fees' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const wallet = (data.wallet || data.adminWallet || '').toLowerCase();
      const adminWallet = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'.toLowerCase();

      if (wallet !== adminWallet) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized: Admin wallet required' }));
        return;
      }

      const stats = getTreasuryStats();
      const claimable = stats.rigFees.claimableHashApe;

      if (claimable <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No claimable rig activation fees available in treasury' }));
        return;
      }

      const amountToClaim = data.amount ? Math.min(claimable, parseFloat(data.amount)) : claimable;
      db.treasury.claimedRigFeesHashApe = (db.treasury.claimedRigFeesHashApe || 0) + amountToClaim;

      const claimReceipt = {
        id: 'claim_rig_' + Date.now(),
        type: 'RIG_FEES_HASHAPE',
        amount: amountToClaim,
        currency: 'HASHAPE',
        tokenContract: '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc',
        network: 'Robinhood EVM L2',
        recipient: '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        timestamp: Date.now()
      };

      if (!db.treasury.claims) db.treasury.claims = [];
      db.treasury.claims.unshift(claimReceipt);
      saveDb();
      supabaseAdapter.syncTreasuryClaim(claimReceipt).catch(() => {});

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Successfully claimed ${amountToClaim} HASHAPE to admin wallet`,
        claim: claimReceipt,
        treasury: getTreasuryStats()
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Static File Serving from dist/
  let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);

  // Fallback for client-side routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImmutableAsset = reqPath.startsWith('/assets/') || ext === '.woff2';
    const isHtml = ext === '.html';
    const cacheControl = isImmutableAsset
      ? 'public, max-age=31536000, s-maxage=31536000, immutable'
      : (isHtml ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400, s-maxage=604800');

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚡ ApeSyndicate NFT Mining Server listening on port ${PORT}`);
  console.log(`🌐 Web URL: http://localhost:${PORT}`);
  console.log(`💎 10,000 Hard Cap | WebGPU PoW | 5-Worker System`);
  console.log(`====================================================`);
});
