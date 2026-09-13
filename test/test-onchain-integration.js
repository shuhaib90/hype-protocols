const assert = require('assert');
const { ethers } = require('ethers');

const RPC_URL = 'https://robinhood-mainnet.g.alchemy.com/v2/VADj_sajpbD_KAWbnZk5x';
const CONTRACT_ADDRESS = '0x7D959C29aa1098d93b307Ca40bEEEc0bF7bbfF85';
const OWNER_WALLET = '0x2A232D1ab1226b981c35DA8B477E337952B5486F';
const ADMIN_WALLET = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';

async function runOnChainIntegrationTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ON-CHAIN INTEGRATION & CHALLENGE SYNC TESTS');
  console.log('====================================================\n');

  // Test 1: Query deployed contract directly via Alchemy RPC
  console.log('--- Test 1: Deployed Contract State on Robinhood Chain ---');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    [
      'function owner() view returns (address)',
      'function CREATOR_ADMIN_WALLET() view returns (address)',
      'function currentChallenge() view returns (bytes32)',
      'function totalMined() view returns (uint256)',
      'function workerActivationCost(uint256) view returns (uint256)',
      'function getEpoch(uint256) view returns (tuple(uint256 id, uint256 startToken, uint256 endToken, uint256 mintFeeWei, uint256 feeUsd, uint256 target, string name))'
    ],
    provider
  );

  const onChainOwner = await contract.owner();
  const onChainAdmin = await contract.CREATOR_ADMIN_WALLET();
  const onChainChallenge = await contract.currentChallenge();
  const onChainTotalMined = await contract.totalMined();
  const epoch1 = await contract.getEpoch(1);

  console.log('On-Chain Contract Owner:', onChainOwner);
  console.log('On-Chain Creator Admin:', onChainAdmin);
  console.log('On-Chain Challenge:', onChainChallenge);
  console.log('On-Chain Total Mined:', onChainTotalMined.toString());
  console.log('Epoch 1 Mint Fee (Wei):', epoch1.mintFeeWei.toString(), `($${epoch1.feeUsd})`);

  assert.strictEqual(onChainOwner.toLowerCase(), OWNER_WALLET.toLowerCase(), 'Contract owner matches OWNER_WALLET');
  assert.strictEqual(onChainAdmin.toLowerCase(), ADMIN_WALLET.toLowerCase(), 'Contract admin matches ADMIN_WALLET');
  console.log('✅ [PASS] On-chain contract owner and admin verified');

  // Test 2: Verify /api/mining/session serves authentic on-chain challenge
  console.log('\n--- Test 2: Mining Session Authentic Challenge Sync ---');
  const sessionRes = await fetch('http://localhost:3000/api/mining/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: '0x1111222233334444555566667777888899990000' })
  });
  assert.strictEqual(sessionRes.status, 200, 'Session endpoint returned HTTP 200');
  const sessionData = await sessionRes.json();
  assert.strictEqual(sessionData.session.challenge.toLowerCase(), onChainChallenge.toLowerCase(), 'Session challenge strictly matches on-chain currentChallenge');
  console.log('✅ [PASS] /api/mining/session delivers genuine on-chain currentChallenge');

  // Test 3: Verify Owner Wallet authorization in admin endpoints
  console.log('\n--- Test 3: Multi-Admin Authorization (Owner + Creator Admin) ---');
  const ownerBatchRes = await fetch('http://localhost:3000/api/admin/epoch-fees-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: OWNER_WALLET,
      epochs: [{ id: 1, mintFeeUsd: 5 }]
    })
  });
  assert.strictEqual(ownerBatchRes.status, 200, 'Contract owner is authorized to update epoch fees');
  console.log('✅ [PASS] Contract deployer/owner (0x2A232D1ab...) successfully authorized as admin');

  const creatorAdminBatchRes = await fetch('http://localhost:3000/api/admin/epoch-fees-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: ADMIN_WALLET,
      epochs: [{ id: 1, mintFeeUsd: 5 }]
    })
  });
  assert.strictEqual(creatorAdminBatchRes.status, 200, 'Creator admin is authorized to update epoch fees');
  console.log('✅ [PASS] Creator admin (0xb8E3DfDd19...) successfully authorized as admin');

  // Non-admin rejection
  const nonAdminRes = await fetch('http://localhost:3000/api/admin/epoch-fees-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: '0xdead00000000000000000000000000000000beef',
      epochs: [{ id: 1, mintFeeUsd: 5 }]
    })
  });
  assert.strictEqual(nonAdminRes.status, 403, 'Non-admin rejected with HTTP 403');
  console.log('✅ [PASS] Unauthorized address rejected with HTTP 403 Forbidden');

  console.log('\n====================================================');
  console.log('🎉 ALL ON-CHAIN INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runOnChainIntegrationTests().catch(err => {
  console.error('❌ On-Chain Integration Test Error:', err);
  process.exit(1);
});
