/**
 * HashApe Cloudflare Edge Worker
 * Handles all /api/* routes, /metadata/*, /storefront.json, and proxies static assets to env.ASSETS
 */

import { ethers } from 'ethers';

const ADMIN_WALLET = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';
const RIG_TOKEN_CONTRACT = '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc';
const NFT_CONTRACT = '0x3b1c67B6651E523A3Eb199203c40788641473138';
const WALLET_MAX_MINTS = 5;

const WALLET_DIFFICULTY_TIERS = [
  { tier: 1, label: 'HARD (NFT 1/5)', target: '0x' + '00000f'.padEnd(64, 'f'), leadingZeros: 5, estHashes: '1.05M' },
  { tier: 2, label: 'HARDER (NFT 2/5)', target: '0x' + '000007'.padEnd(64, 'f'), leadingZeros: 5, estHashes: '2.10M' },
  { tier: 3, label: 'VERY HARD (NFT 3/5)', target: '0x' + '000003'.padEnd(64, 'f'), leadingZeros: 6, estHashes: '4.19M' },
  { tier: 4, label: 'EXTREME (NFT 4/5)', target: '0x' + '000001'.padEnd(64, 'f'), leadingZeros: 6, estHashes: '8.38M' },
  { tier: 5, label: 'LEGENDARY (NFT 5/5)', target: '0x' + '000000f'.padEnd(64, 'f'), leadingZeros: 7, estHashes: '16.7M' },
];

const BASE_EPOCHS = [
  { id: 1, name: 'EPOCH 1 (GENESIS)', startToken: 1, endToken: 10, count: 10, mintFeeUsd: 5, mintFeeEth: 0.0020, mintFeeApe: 5, difficulty: 'HARD', target: '0x' + '00000f'.padEnd(64, 'f') },
  { id: 2, name: 'EPOCH 2 (ASCENSION)', startToken: 11, endToken: 30, count: 20, mintFeeUsd: 7, mintFeeEth: 0.0028, mintFeeApe: 7, difficulty: 'HARDER', target: '0x' + '000007'.padEnd(64, 'f') },
  { id: 3, name: 'EPOCH 3 (EXPANSION)', startToken: 31, endToken: 70, count: 40, mintFeeUsd: 10, mintFeeEth: 0.0040, mintFeeApe: 10, difficulty: 'VERY HARD', target: '0x' + '000003'.padEnd(64, 'f') },
  { id: 4, name: 'EPOCH 4 (SURGE)', startToken: 71, endToken: 150, count: 80, mintFeeUsd: 14, mintFeeEth: 0.0056, mintFeeApe: 14, difficulty: 'VERY HARD+', target: '0x' + '000001'.padEnd(64, 'f') },
  { id: 5, name: 'EPOCH 5 (NEXUS)', startToken: 151, endToken: 300, count: 150, mintFeeUsd: 18, mintFeeEth: 0.0072, mintFeeApe: 18, difficulty: 'EXTREME', target: '0x' + '000000f'.padEnd(64, 'f') },
  { id: 6, name: 'EPOCH 6 (APEX)', startToken: 301, endToken: 600, count: 300, mintFeeUsd: 22, mintFeeEth: 0.0088, mintFeeApe: 22, difficulty: 'EXTREME+', target: '0x' + '0000007'.padEnd(64, 'f') },
  { id: 7, name: 'EPOCH 7 (SOVEREIGN)', startToken: 601, endToken: 1200, count: 600, mintFeeUsd: 26, mintFeeEth: 0.0104, mintFeeApe: 26, difficulty: 'LEGENDARY', target: '0x' + '0000003'.padEnd(64, 'f') },
  { id: 8, name: 'EPOCH 8 (TITAN)', startToken: 1201, endToken: 2500, count: 1300, mintFeeUsd: 30, mintFeeEth: 0.0120, mintFeeApe: 30, difficulty: 'LEGENDARY+', target: '0x' + '0000001'.padEnd(64, 'f') },
  { id: 9, name: 'EPOCH 9 (MYTHIC)', startToken: 2501, endToken: 5000, count: 2500, mintFeeUsd: 35, mintFeeEth: 0.0140, mintFeeApe: 35, difficulty: 'MYTHIC', target: '0x' + '0000000f'.padEnd(64, 'f') },
  { id: 10, name: 'EPOCH 10 (OMEGA)', startToken: 5001, endToken: 10000, count: 5000, mintFeeUsd: 40, mintFeeEth: 0.0160, mintFeeApe: 40, difficulty: 'OMEGA', target: '0x' + '00000007'.padEnd(64, 'f') },
];

let inMemoryDb = {
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
  activeMiners: {},
  epochOverrides: {},
  treasury: { claimedMintFeesEth: 0, claimedRigFeesHashApe: 0, claims: [] }
};

function getEffectiveEpochs() {
  return BASE_EPOCHS.map(ep => {
    const override = inMemoryDb.epochOverrides[ep.id];
    if (override) {
      return {
        ...ep,
        mintFeeUsd: override.mintFeeUsd !== undefined ? override.mintFeeUsd : ep.mintFeeUsd,
        mintFeeEth: override.mintFeeEth !== undefined ? override.mintFeeEth : ep.mintFeeEth,
        mintFeeApe: override.mintFeeUsd !== undefined ? override.mintFeeUsd : ep.mintFeeApe
      };
    }
    return ep;
  });
}

function getCurrentEpoch(tokenNumber) {
  const epochs = getEffectiveEpochs();
  const found = epochs.find(e => tokenNumber >= e.startToken && tokenNumber <= e.endToken);
  return found || epochs[epochs.length - 1];
}

function getWalletMintCount(wallet) {
  if (!wallet) return 0;
  const w = wallet.toLowerCase();
  return inMemoryDb.records.filter(r => r.wallet && r.wallet.toLowerCase() === w && r.status === 'MINTED').length;
}

function getWalletTier(mintCount) {
  const clamped = Math.min(mintCount, 4);
  return WALLET_DIFFICULTY_TIERS[clamped];
}

function getTreasuryStats() {
  const effectiveEpochs = getEffectiveEpochs();
  const mintedRecords = inMemoryDb.records.filter(r => r.status === 'MINTED');
  let totalMintFeesEth = 0;
  let totalMintFeesUsd = 0;

  for (const r of mintedRecords) {
    const ep = effectiveEpochs.find(e => e.id === r.epochId) || effectiveEpochs[0];
    totalMintFeesEth += ep.mintFeeEth;
    totalMintFeesUsd += (r.feeUsd || ep.mintFeeUsd);
  }

  let totalRigFeesHashApe = 0;
  const RIG_COSTS = { 2: 100, 3: 200, 4: 300, 5: 500 };
  for (const w of Object.keys(inMemoryDb.workerEntitlements)) {
    const workers = inMemoryDb.workerEntitlements[w];
    if (Array.isArray(workers)) {
      for (const wid of workers) {
        if (RIG_COSTS[wid]) totalRigFeesHashApe += RIG_COSTS[wid];
      }
    }
  }

  const claimedMintFeesEth = inMemoryDb.treasury ? inMemoryDb.treasury.claimedMintFeesEth : 0;
  const claimedRigFeesHashApe = inMemoryDb.treasury ? inMemoryDb.treasury.claimedRigFeesHashApe : 0;
  const claimableMintFeesEth = Math.max(0, parseFloat((totalMintFeesEth - claimedMintFeesEth).toFixed(6)));
  const claimableRigFeesHashApe = Math.max(0, totalRigFeesHashApe - claimedRigFeesHashApe);

  return {
    totalMintFeesEth: parseFloat(totalMintFeesEth.toFixed(6)),
    totalMintFeesUsd,
    claimedMintFeesEth: parseFloat(claimedMintFeesEth.toFixed(6)),
    claimableMintFeesEth,
    totalRigFeesHashApe,
    claimedRigFeesHashApe,
    claimableRigFeesHashApe,
    claims: inMemoryDb.treasury ? inMemoryDb.treasury.claims : []
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-wallet-address',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-wallet-address',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (url.pathname === '/api/system/health') {
      return jsonResponse({
        status: 'OK',
        service: 'HashApe Mining Protocol Edge Worker',
        timestamp: Date.now(),
        cfRay: request.headers.get('cf-ray') || 'local',
        country: request.headers.get('cf-ipcountry') || 'US'
      });
    }

    if (url.pathname === '/api/config') {
      return jsonResponse({
        success: true,
        config: {
          contractAddress: NFT_CONTRACT,
          rpcUrl: 'https://rpc.robinhood.com',
          chainId: 1337,
          networkName: 'Robinhood EVM L2',
          tokenName: 'HashApe',
          tokenSymbol: 'HASHAPE',
          tokenAddress: RIG_TOKEN_CONTRACT,
          adminWallet: ADMIN_WALLET,
          creatorAdminWallet: ADMIN_WALLET,
          maxMintsPerWallet: WALLET_MAX_MINTS,
          creatorRoyaltyBps: 500,
          creatorRoyaltyPercent: 5.0,
          currentEpoch: getCurrentEpoch(inMemoryDb.totalMined + 1),
          epochs: getEffectiveEpochs()
        }
      });
    }

    if (url.pathname === '/api/mining/supply') {
      const remaining = inMemoryDb.maxSupply - inMemoryDb.totalMined;
      const currentEpoch = getCurrentEpoch(inMemoryDb.totalMined + 1);
      return jsonResponse({
        success: true,
        supply: {
          totalMined: inMemoryDb.totalMined,
          maxSupply: inMemoryDb.maxSupply,
          remainingSupply: Math.max(0, remaining),
          percentMinted: parseFloat(((inMemoryDb.totalMined / inMemoryDb.maxSupply) * 100).toFixed(2)),
          currentEpoch,
          epochs: getEffectiveEpochs()
        }
      }, 200, {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      });
    }

    if (url.pathname === '/api/mining/wallet-status') {
      const wallet = url.searchParams.get('wallet') || '';
      const mintedCount = getWalletMintCount(wallet);
      const remaining = Math.max(0, WALLET_MAX_MINTS - mintedCount);
      const isCapped = mintedCount >= WALLET_MAX_MINTS;
      const tierInfo = getWalletTier(mintedCount);

      return jsonResponse({
        success: true,
        wallet,
        mintedCount,
        maxMints: WALLET_MAX_MINTS,
        remainingMints: remaining,
        isCapped,
        currentTier: tierInfo.tier,
        difficultyLabel: tierInfo.label,
        target: tierInfo.target,
        estHashes: tierInfo.estHashes
      });
    }

    if (url.pathname === '/api/mining/session' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const wallet = body.wallet || '';
      const mintedCount = getWalletMintCount(wallet);

      if (mintedCount >= WALLET_MAX_MINTS) {
        return jsonResponse({
          success: false,
          error: `Max ${WALLET_MAX_MINTS} NFTs per wallet limit reached. This wallet has already minted ${mintedCount}/${WALLET_MAX_MINTS} NFTs.`,
          mintedCount,
          maxMints: WALLET_MAX_MINTS,
          isCapped: true
        }, 403);
      }

      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const challenge = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const tierInfo = getWalletTier(mintedCount);

      return jsonResponse({
        success: true,
        session: {
          challenge,
          target: tierInfo.target,
          difficultyTier: tierInfo.label,
          walletTier: tierInfo.tier,
          walletMintedCount: mintedCount,
          maxMints: WALLET_MAX_MINTS,
          workerCount: 5,
          timestamp: Date.now()
        }
      });
    }

    if (url.pathname === '/api/mining/verify' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const { challenge, miner, nonce, target } = body;

      if (!challenge || !miner || nonce === undefined) {
        return jsonResponse({ success: false, error: 'Missing challenge, miner, or nonce' }, 400);
      }

      const packed = ethers.solidityPacked(
        ['bytes32', 'address', 'uint256'],
        [challenge, miner.toLowerCase(), BigInt(nonce)]
      );
      const hash = ethers.keccak256(packed);
      const effectiveTarget = target ? BigInt(target) : BigInt(WALLET_DIFFICULTY_TIERS[0].target);

      if (inMemoryDb.usedProofs[hash]) {
        return jsonResponse({ success: false, error: 'Proof already submitted and used (Anti-Replay)', verified: false }, 409);
      }

      const valid = BigInt(hash) <= effectiveTarget;
      if (valid) {
        inMemoryDb.usedProofs[hash] = { miner, nonce, timestamp: Date.now() };
      }

      return jsonResponse({
        success: valid,
        verified: valid,
        hash,
        target: '0x' + effectiveTarget.toString(16).padStart(64, '0')
      });
    }

    if (url.pathname === '/api/mining/record' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const { action, wallet, tokenId, nonce, solvedHash, txHash } = body;

      if (action === 'solve') {
        const id = 'solve_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const record = {
          id,
          wallet: wallet ? wallet.toLowerCase() : '',
          tokenId: tokenId || (inMemoryDb.totalMined + 1),
          nonce: String(nonce || ''),
          solvedHash: solvedHash || '',
          status: 'SOLVED',
          epochId: getCurrentEpoch(tokenId || inMemoryDb.totalMined + 1).id,
          solvedAt: Date.now()
        };
        inMemoryDb.records.unshift(record);
        return jsonResponse({ success: true, record });
      }

      if (action === 'mint') {
        const existing = inMemoryDb.records.find(r => r.tokenId === tokenId || (wallet && r.wallet === wallet.toLowerCase() && r.status === 'SOLVED'));
        if (existing) {
          existing.status = 'MINTED';
          existing.txHash = txHash || ('0x' + Math.random().toString(16).substring(2).padEnd(64, '0'));
          existing.mintedAt = Date.now();
        } else {
          inMemoryDb.records.unshift({
            id: 'mint_' + Date.now(),
            wallet: wallet ? wallet.toLowerCase() : '',
            tokenId: tokenId || (inMemoryDb.totalMined + 1),
            nonce: String(nonce || '0'),
            solvedHash: solvedHash || '',
            status: 'MINTED',
            epochId: getCurrentEpoch(tokenId || inMemoryDb.totalMined + 1).id,
            txHash: txHash || '0x',
            mintedAt: Date.now()
          });
        }
        inMemoryDb.totalMined += 1;
        return jsonResponse({ success: true, totalMined: inMemoryDb.totalMined });
      }

      return jsonResponse({ success: false, error: 'Unknown action' }, 400);
    }

    if (url.pathname === '/api/mining/records') {
      const wallet = url.searchParams.get('wallet');
      let records = inMemoryDb.records;
      if (wallet) {
        records = records.filter(r => r.wallet && r.wallet.toLowerCase() === wallet.toLowerCase());
      }
      return jsonResponse({ success: true, records });
    }

    if (url.pathname === '/api/workers/status') {
      const wallet = url.searchParams.get('wallet') || '';
      const active = inMemoryDb.workerEntitlements[wallet.toLowerCase()] || [1];
      return jsonResponse({ success: true, activeWorkers: active });
    }

    if (url.pathname === '/api/workers/activate' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const { wallet, workerId } = body;
      const w = (wallet || '').toLowerCase();
      if (!inMemoryDb.workerEntitlements[w]) inMemoryDb.workerEntitlements[w] = [1];
      if (!inMemoryDb.workerEntitlements[w].includes(workerId)) {
        inMemoryDb.workerEntitlements[w].push(workerId);
      }
      return jsonResponse({ success: true, activeWorkers: inMemoryDb.workerEntitlements[w] });
    }

    if (url.pathname === '/api/admin/treasury') {
      const stats = getTreasuryStats();
      return jsonResponse({
        success: true,
        treasury: {
          adminRecipient: ADMIN_WALLET,
          rigTokenContract: RIG_TOKEN_CONTRACT,
          totalCollectedMintFeesEth: stats.totalMintFeesEth,
          totalCollectedMintFeesUsd: stats.totalMintFeesUsd,
          claimedMintFeesEth: stats.claimedMintFeesEth,
          claimableMintFeesEth: stats.claimableMintFeesEth,
          totalCollectedRigFeesHashApe: stats.totalRigFeesHashApe,
          claimedRigFeesHashApe: stats.claimedRigFeesHashApe,
          claimableRigFeesHashApe: stats.claimableRigFeesHashApe,
          claimsReceipts: stats.claims
        }
      });
    }

    if (url.pathname === '/api/admin/claim-mint-fees' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const adminWallet = body.adminWallet || request.headers.get('x-wallet-address') || '';

      if (adminWallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized: only Creator/Admin wallet can claim protocol fees' }, 403);
      }

      const stats = getTreasuryStats();
      const amountToClaim = stats.claimableMintFeesEth;
      if (amountToClaim <= 0) {
        return jsonResponse({ success: false, error: 'No claimable mint fees available', claimableMintFeesEth: 0 }, 400);
      }

      inMemoryDb.treasury.claimedMintFeesEth = parseFloat((inMemoryDb.treasury.claimedMintFeesEth + amountToClaim).toFixed(6));
      const receipt = {
        id: 'claim_eth_' + Date.now(),
        type: 'MINT_FEES_ETH',
        currency: 'ETH',
        amount: amountToClaim,
        recipient: ADMIN_WALLET,
        timestamp: Date.now(),
        txHash: '0x' + Math.random().toString(16).substring(2).padEnd(64, 'a')
      };
      inMemoryDb.treasury.claims.unshift(receipt);

      return jsonResponse({
        success: true,
        claimedAmountEth: amountToClaim,
        receipt
      });
    }

    if (url.pathname === '/api/admin/claim-rig-fees' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const adminWallet = body.adminWallet || request.headers.get('x-wallet-address') || '';

      if (adminWallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized: only Creator/Admin wallet can claim rig activation fees' }, 403);
      }

      const stats = getTreasuryStats();
      const amountToClaim = stats.claimableRigFeesHashApe;
      if (amountToClaim <= 0) {
        return jsonResponse({ success: false, error: 'No claimable rig fees available', claimableRigFeesHashApe: 0 }, 400);
      }

      inMemoryDb.treasury.claimedRigFeesHashApe += amountToClaim;
      const receipt = {
        id: 'claim_rig_' + Date.now(),
        type: 'RIG_ACTIVATION_FEES_HASHAPE',
        currency: 'HASHAPE',
        tokenAddress: RIG_TOKEN_CONTRACT,
        amount: amountToClaim,
        recipient: ADMIN_WALLET,
        timestamp: Date.now(),
        txHash: '0x' + Math.random().toString(16).substring(2).padEnd(64, 'b')
      };
      inMemoryDb.treasury.claims.unshift(receipt);

      return jsonResponse({
        success: true,
        claimedAmountHashApe: amountToClaim,
        tokenAddress: RIG_TOKEN_CONTRACT,
        receipt
      });
    }

    if (url.pathname === '/api/admin/epoch-fee' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const adminWallet = body.adminWallet || request.headers.get('x-wallet-address') || '';

      if (adminWallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
      }

      const { epochId, mintFeeUsd, mintFeeEth } = body;
      inMemoryDb.epochOverrides[epochId] = {
        mintFeeUsd: Number(mintFeeUsd),
        mintFeeEth: Number(mintFeeEth)
      };

      return jsonResponse({ success: true, epochId, updatedFeeUsd: mintFeeUsd, updatedFeeEth: mintFeeEth });
    }

    if (url.pathname === '/api/admin/epoch-fees-batch' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const adminWallet = body.adminWallet || request.headers.get('x-wallet-address') || '';

      if (adminWallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
      }

      const { updates } = body;
      if (Array.isArray(updates)) {
        for (const u of updates) {
          inMemoryDb.epochOverrides[u.epochId] = {
            mintFeeUsd: Number(u.mintFeeUsd),
            mintFeeEth: Number(u.mintFeeEth)
          };
        }
      }

      return jsonResponse({ success: true, updatedEpochs: getEffectiveEpochs() });
    }

    if (url.pathname === '/storefront.json') {
      return jsonResponse({
        name: 'HashApe PoW Mining Syndicate',
        description: 'First-of-its-kind 100% fair launch Proof-of-Work GPU NFT collection on Robinhood EVM L2.',
        image: `${url.origin}/preview.png`,
        external_link: url.origin,
        seller_fee_basis_points: 500,
        fee_recipient: ADMIN_WALLET
      }, 200, {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800'
      });
    }

    const metaMatch = url.pathname.match(/^\/metadata\/(\d+)(\.json)?$/);
    if (metaMatch) {
      const tokenId = parseInt(metaMatch[1], 10);
      const ep = getCurrentEpoch(tokenId);
      return jsonResponse({
        name: `HashApe #${tokenId}`,
        description: `Proof-of-Work NFT #${tokenId} minted via WebGPU compute on Robinhood EVM L2.`,
        image: `${url.origin}/images/${tokenId}.png`,
        edition: tokenId,
        attributes: [
          { trait_type: 'Epoch', value: ep.name },
          { trait_type: 'Mining Difficulty', value: ep.difficulty },
          { trait_type: 'Consensus', value: 'Proof-of-Work Keccak256' },
          { trait_type: 'Network', value: 'Robinhood EVM L2' }
        ]
      }, 200, {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600'
      });
    }

    if (url.pathname.startsWith('/images/')) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status === 200) {
        return assetRes;
      }
      const previewUrl = new URL('/preview.png', request.url);
      return env.ASSETS.fetch(new Request(previewUrl, request));
    }

    return env.ASSETS.fetch(request);
  }
};
