/**
 * Automated verification of HypeVM server endpoints and frontend delivery
 */

async function testEndpoints() {
  console.log('====================================================');
  console.log('🧪 TESTING HYPEVM SERVER ENDPOINTS & FRONTEND DELIVERY');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 0. Reset state to clean Genesis
  await fetch('http://localhost:3000/api/mining/reset', { method: 'POST' });

  // 1. Test Static Index Delivery
  const htmlRes = await fetch('http://localhost:3000/');
  assert(htmlRes.status === 200, 'Frontend HTML responds with HTTP 200');
  const htmlText = await htmlRes.text();
  assert(htmlText.includes('APESYNDICATE // WebGPU Proof-of-Work NFT Mining Protocol') || htmlText.includes('WebGPU Proof-of-Work NFT Mining Protocol'), 'HTML title and bundle delivered');
  assert(htmlText.includes('/assets/index-'), 'Compiled Vite JS and CSS assets linked');

  // 2. Test /api/mining/supply
  const supplyRes = await fetch('http://localhost:3000/api/mining/supply');
  assert(supplyRes.status === 200, '/api/mining/supply responds with HTTP 200');
  const supplyData = await supplyRes.json();
  assert(supplyData.success === true, 'Supply payload reports success');
  assert(supplyData.supply.maxSupply === 10000, 'Max supply is strictly 10,000');
  assert(typeof supplyData.supply.totalMined === 'number', 'Total mined is a valid number');
  assert(supplyData.supply.remaining === 10000 - supplyData.supply.totalMined, 'Remaining supply is mathematically consistent');
  assert(supplyData.supply.currentEpoch && supplyData.supply.currentEpoch.id >= 1, 'Supply includes active currentEpoch');
  assert(Array.isArray(supplyData.supply.epochs) && supplyData.supply.epochs.length === 10, 'Supply includes 10-epoch schedule');

  // 3. Test /api/mining/session
  const testWallet = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';
  const sessionWallet = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const sessionRes = await fetch('http://localhost:3000/api/mining/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: sessionWallet })
  });
  assert(sessionRes.status === 200, '/api/mining/session responds with HTTP 200');
  const sessionData = await sessionRes.json();
  assert(sessionData.session.challenge.startsWith('0x') && sessionData.session.challenge.length === 66, 'Session challenge is valid 32-byte hash');
  assert(sessionData.session.expiresAt > Date.now(), 'Session expiration is set in the future');
  assert(sessionData.session.epoch && sessionData.session.epoch.id >= 1, 'Session includes active epoch information');

  // 4. Test /api/config
  const configRes = await fetch('http://localhost:3000/api/config');
  assert(configRes.status === 200, '/api/config responds with HTTP 200');
  const configData = await configRes.json();
  assert(configData.config.maxSupply === 10000, 'Config reports 10,000 max supply');
  assert(configData.config.workerCosts[2] === 100, 'Worker #2 cost is 100 HYPE');
  assert(configData.config.workerCosts[5] === 500, 'Worker #5 cost is 500 HYPE');
  assert(configData.config.adminWallet.toLowerCase() === testWallet.toLowerCase(), 'Admin wallet is configured');
  assert(configData.config.currentEpoch && configData.config.currentEpoch.id >= 1, 'Config reports active epoch');
  assert(Array.isArray(configData.config.epochs) && configData.config.epochs.length === 10, 'Config reports 10-epoch schedule');
  assert(configData.config.activationTokenContract === '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc', 'Config specifies 0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc token contract for active rig');

  // 5. Test /api/workers/activate
  const activateRes = await fetch('http://localhost:3000/api/workers/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: testWallet, workerId: 2 })
  });
  assert(activateRes.status === 200, '/api/workers/activate responds with HTTP 200');
  const activateData = await activateRes.json();
  assert(activateData.active === true, 'Worker entitlement successfully recorded on backend');
  assert(activateData.activationTokenContract === '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc', 'Worker activation specifies 0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc token contract');

  // 6. Test /api/mining/record (Solve & Mint)
  const solveRes = await fetch('http://localhost:3000/api/mining/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'solve',
      wallet: testWallet,
      tokenId: 7843,
      nonce: '424242',
      solvedHash: '0x0002138947192837192837192837192837192837192837192837192837192837',
      difficulty: 4,
      gpuRenderer: 'NVIDIA GeForce RTX 4090 WebGPU'
    })
  });
  assert(solveRes.status === 200, '/api/mining/record (solve) responds with HTTP 200');

  const recordsRes = await fetch(`http://localhost:3000/api/mining/records?wallet=${testWallet}`);
  assert(recordsRes.status === 200, '/api/mining/records responds with HTTP 200');
  const recordsData = await recordsRes.json();
  assert(recordsData.records.length > 0, 'User records returned from database ledger');
  assert(recordsData.records[0].wallet === testWallet.toLowerCase(), 'Record wallet matches query');

  // 7. Test Self-Hosted OpenSea Collection Metadata Endpoints
  const metaRes = await fetch('http://localhost:3000/metadata/1.json');
  assert(metaRes.status === 200, '/metadata/1.json responds with HTTP 200');
  const metaData = await metaRes.json();
  assert(metaData.edition === 1 || metaData.name.includes('#00001'), 'Metadata edition matches token #1');
  assert(metaData.image === 'http://localhost:3000/images/1.png', 'Metadata image URL dynamically resolved to absolute local/domain path');
  assert(Array.isArray(metaData.attributes) && metaData.attributes.length > 0, 'Metadata has traits/attributes array');

  // Test metadata without .json extension
  const metaNoExtRes = await fetch('http://localhost:3000/metadata/1');
  assert(metaNoExtRes.status === 200, '/metadata/1 without extension responds with HTTP 200');

  // 8. Test Self-Hosted Image Streaming
  const imgRes = await fetch('http://localhost:3000/images/1.png');
  assert(imgRes.status === 200, '/images/1.png responds with HTTP 200');
  assert(imgRes.headers.get('content-type') === 'image/png', 'Image Content-Type is image/png');
  const imgBuffer = await imgRes.arrayBuffer();
  assert(imgBuffer.byteLength > 1000, 'Image bytes received successfully (> 1KB)');

  // 9. Test OpenSea Storefront / Contract Metadata
  const sfRes = await fetch('http://localhost:3000/storefront.json');
  assert(sfRes.status === 200, '/storefront.json responds with HTTP 200');
  const sfData = await sfRes.json();
  assert(sfData.seller_fee_basis_points === 500, 'Storefront enforces 5% (500 BPS) royalty');
  assert(sfData.fee_recipient === '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C', 'Storefront royalty recipient matches creator wallet');
  assert(sfData.image === 'http://localhost:3000/preview.png', 'Storefront collection preview linked');

  // 10. Test Preview Image
  const prevRes = await fetch('http://localhost:3000/preview.png');
  assert(prevRes.status === 200, '/preview.png responds with HTTP 200');
  assert(prevRes.headers.get('content-type') === 'image/png', 'Preview Content-Type is image/png');

  // 11. Test GET /api/mining/wallet-status
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const statusWallet = '0x3333' + randomSuffix.padEnd(36, '0');
  const statusRes = await fetch(`http://localhost:3000/api/mining/wallet-status?wallet=${statusWallet}`);
  assert(statusRes.status === 200, '/api/mining/wallet-status responds with HTTP 200');
  const statusData = await statusRes.json();
  assert(statusData.success === true, 'Wallet status reports success');
  assert(statusData.maxMints === 5, 'Max mints per wallet is 5');
  assert(statusData.isCapped === false, 'Fresh wallet is not capped');
  assert(statusData.currentTier.label.includes('NFT 1/5'), 'Fresh wallet is at Tier 1 (NFT 1/5)');

  // 12. Test Quota Capping when a wallet reaches 5 mints
  const cappedWallet = '0x4444' + randomSuffix.padEnd(36, '1');
  // Simulate 5 mint records for this wallet
  for (let i = 1; i <= 5; i++) {
    const mintRes = await fetch('http://localhost:3000/api/mining/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mint',
        wallet: cappedWallet,
        tokenId: 8000 + i,
        txHash: `0xmocktx${i}`,
        nonce: `${i * 1000}`
      })
    });
    assert(mintRes.status === 200, `Mint #${i} for cappedWallet succeeds`);
  }

  // 13. Test 6th mint for cappedWallet is rejected (HTTP 403)
  const sixthMintRes = await fetch('http://localhost:3000/api/mining/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'mint',
      wallet: cappedWallet,
      tokenId: 8006,
      txHash: '0xmocktx6',
      nonce: '6000'
    })
  });
  assert(sixthMintRes.status === 403, '6th mint for cappedWallet rejected with HTTP 403');
  const sixthMintData = await sixthMintRes.json();
  assert(sixthMintData.error.includes('MAX WALLET QUOTA REACHED'), 'Error message confirms max wallet quota reached');

  // 14. Test Session creation for cappedWallet is rejected (HTTP 403)
  const cappedSessionRes = await fetch('http://localhost:3000/api/mining/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: cappedWallet })
  });
  assert(cappedSessionRes.status === 403, 'Mining session creation for cappedWallet rejected with HTTP 403');
  const cappedSessionData = await cappedSessionRes.json();
  assert(cappedSessionData.isCapped === true, 'Capped session payload reports isCapped: true');

  // 15. Test Admin Single Epoch Fee Update (/api/admin/epoch-fee)
  const nonAdminWallet = '0x1234567890123456789012345678901234567890';
  const unauthorizedRes = await fetch('http://localhost:3000/api/admin/epoch-fee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: nonAdminWallet, epochId: 1, mintFeeUsd: 9 })
  });
  assert(unauthorizedRes.status === 403, 'Non-admin wallet rejected from editing epoch fee with HTTP 403');

  const adminUpdateRes = await fetch('http://localhost:3000/api/admin/epoch-fee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: testWallet, epochId: 1, mintFeeUsd: 9 })
  });
  assert(adminUpdateRes.status === 200, 'Admin successfully updates Epoch 1 mint fee to $9');
  const adminUpdateData = await adminUpdateRes.json();
  assert(adminUpdateData.success === true, 'Admin epoch fee update reports success');
  assert(adminUpdateData.epoch.mintFeeUsd === 9, 'Epoch 1 mint fee USD is updated to 9');

  const supplyCheckRes = await fetch('http://localhost:3000/api/mining/supply');
  const supplyCheckData = await supplyCheckRes.json();
  assert(supplyCheckData.supply.epochs.find(e => e.id === 1).mintFeeUsd === 9, 'Epoch 1 in supply reflects edited $9 fee');
  if (supplyCheckData.supply.currentEpoch.id === 1) {
    assert(supplyCheckData.supply.currentEpoch.mintFeeUsd === 9, 'Active currentEpoch in supply reflects edited $9 fee');
  }

  // 16. Test Admin Batch Epoch Fees Update & Reset
  const batchRes = await fetch('http://localhost:3000/api/admin/epoch-fees-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: testWallet,
      epochs: [
        { id: 1, mintFeeUsd: 5 },
        { id: 2, mintFeeUsd: 7 },
        { id: 3, mintFeeUsd: 12 }
      ]
    })
  });
  assert(batchRes.status === 200, 'Admin batch updates epoch fees successfully');
  const batchData = await batchRes.json();
  assert(batchData.epochs.find(e => e.id === 1).mintFeeUsd === 5, 'Epoch 1 fee successfully restored to $5');
  assert(batchData.epochs.find(e => e.id === 3).mintFeeUsd === 12, 'Epoch 3 fee successfully customized to $12');

  // 17. Test Admin Treasury API (GET /api/admin/treasury)
  const treasuryRes = await fetch('http://localhost:3000/api/admin/treasury');
  assert(treasuryRes.status === 200, 'GET /api/admin/treasury responds with HTTP 200');
  const treasuryData = await treasuryRes.json();
  assert(treasuryData.success === true, 'Treasury reports success');
  assert(treasuryData.treasury.adminWallet === testWallet, 'Treasury admin recipient matches creator wallet');
  assert(treasuryData.treasury.activationTokenContract === '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc', 'Treasury specifies 0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc token contract');
  assert(typeof treasuryData.treasury.mintFees.totalCollectedEth === 'number', 'Total collected mint fees is a number');
  assert(typeof treasuryData.treasury.mintFees.claimableEth === 'number', 'Claimable mint fees is a number');
  assert(typeof treasuryData.treasury.rigFees.totalCollectedHashApe === 'number', 'Total collected rig activation fees is a number');

  // 18. Test Non-Admin Rejection from Claiming Fees
  const unauthClaimRes = await fetch('http://localhost:3000/api/admin/claim-mint-fees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: nonAdminWallet })
  });
  assert(unauthClaimRes.status === 403, 'Non-admin rejected from claiming mint fees with HTTP 403');

  const unauthRigClaimRes = await fetch('http://localhost:3000/api/admin/claim-rig-fees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: nonAdminWallet })
  });
  assert(unauthRigClaimRes.status === 403, 'Non-admin rejected from claiming rig fees with HTTP 403');

  // 19. Test Admin Claim Mint Fees (POST /api/admin/claim-mint-fees)
  if (treasuryData.treasury.mintFees.claimableEth > 0) {
    const claimMintRes = await fetch('http://localhost:3000/api/admin/claim-mint-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: testWallet })
    });
    assert(claimMintRes.status === 200, 'Admin successfully claims accumulated mint fees (ETH)');
    const claimMintData = await claimMintRes.json();
    assert(claimMintData.success === true, 'Claim mint fees reports success');
    assert(claimMintData.claim.recipient === testWallet, 'Claim receipt recipient is admin wallet');
    assert(claimMintData.treasury.mintFees.claimableEth === 0, 'Claimable mint fees reduced to 0 after claim');
  }

  // 20. Test Admin Claim Rig Activation Fees (POST /api/admin/claim-rig-fees)
  // Activate worker 3 to add 200 HASHAPE in activation fees
  await fetch('http://localhost:3000/api/workers/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: testWallet, workerId: 3 })
  });
  const claimRigRes = await fetch('http://localhost:3000/api/admin/claim-rig-fees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: testWallet })
  });
  assert(claimRigRes.status === 200, 'Admin successfully claims rig activation fees (HASHAPE)');
  const claimRigData = await claimRigRes.json();
  assert(claimRigData.success === true, 'Claim rig fees reports success');
  assert(claimRigData.claim.tokenContract === '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc', 'Rig fee claim specifies token contract');
  assert(claimRigData.claim.recipient === testWallet, 'Rig fee claim receipt recipient is admin wallet');

  // Final cleanup reset to default genesis
  await fetch('http://localhost:3000/api/mining/reset', { method: 'POST' });

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} SERVER ENDPOINT TESTS PASSED!`);
  console.log('====================================================');
}

testEndpoints().catch((err) => {
  console.error(err);
  process.exit(1);
});
