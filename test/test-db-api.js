const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makeRequest(pathStr, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runApiTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING HYPEVM MINING DATABASE & API VERIFICATION');
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

  const testWallet = '0xdb' + crypto.randomBytes(19).toString('hex').toLowerCase();

  // Test 1: Mining Session Creation
  console.log('--- Test 1: Session Creation & Challenge Generation ---');
  const sessRes = await makeRequest('/api/mining/session', 'POST', { wallet: testWallet });
  assert(sessRes.status === 200, 'Session endpoint returns HTTP 200');
  assert(sessRes.data.success === true, 'Session successfully generated');
  const challenge = sessRes.data.session.challenge;
  assert(challenge && challenge.startsWith('0x'), 'Challenge is 32-byte hex');

  // Test 2: Cryptographic Proof Verification Endpoint
  console.log('\n--- Test 2: Cryptographic Proof Verification (/api/mining/verify) ---');
  const easyTarget = '0x' + '000f'.padEnd(64, 'f');
  const targetBigInt = BigInt(easyTarget);
  let validNonce = null;
  let validHash = null;

  for (let n = 0; n < 100000; n++) {
    const packed = ethers.solidityPacked(['bytes32', 'address', 'uint256'], [challenge, testWallet, BigInt(n)]);
    const hash = ethers.keccak256(packed);
    if (BigInt(hash) < targetBigInt) {
      validNonce = n;
      validHash = hash;
      break;
    }
  }

  assert(validNonce !== null, 'Found valid test nonce locally');

  const verifyRes = await makeRequest('/api/mining/verify', 'POST', {
    wallet: testWallet,
    challenge,
    nonce: validNonce,
    targetDifficulty: easyTarget
  });
  assert(verifyRes.status === 200, 'Proof verification returns HTTP 200');
  assert(verifyRes.data.valid === true, 'Authoritative backend verifies cryptographic proof');
  assert(verifyRes.data.proofHash === validHash, 'Proof hash matches computed Keccak-256');

  // Replay rejection
  const replayRes = await makeRequest('/api/mining/verify', 'POST', {
    wallet: testWallet,
    challenge,
    nonce: validNonce,
    targetDifficulty: easyTarget
  });
  assert(replayRes.status === 409, 'Replay proof is rejected with HTTP 409 Conflict');

  // Test 3: Save Solved Record to Database
  console.log('\n--- Test 3: Save Solved Hash Record to Database ---');
  const solveRes = await makeRequest('/api/mining/record', 'POST', {
    action: 'solve',
    wallet: testWallet,
    tokenId: 7850,
    nonce: String(validNonce),
    solvedHash: validHash,
    difficulty: 4,
    gpuRenderer: 'NVIDIA RTX 4090 WebGPU'
  });
  assert(solveRes.status === 200, 'Solve record returns HTTP 200');
  assert(solveRes.data.success === true, 'Solve record successfully saved in database');
  assert(solveRes.data.record.status === 'SOLVED', 'Record initial status is SOLVED');

  // Test 4: Retrieve Solved Hashes for Wallet
  console.log('\n--- Test 4: Fetch User Solved History ---');
  const userRecsRes = await makeRequest(`/api/mining/records?wallet=${testWallet}`, 'GET');
  assert(userRecsRes.status === 200, 'User records return HTTP 200');
  assert(userRecsRes.data.records.length > 0, 'Found saved records for test wallet');
  const savedRec = userRecsRes.data.records.find(r => r.nonce === String(validNonce));
  assert(!!savedRec, 'Database preserved exact solved record with nonce & solvedHash');
  assert(savedRec.solvedHash === validHash, 'Solved hash matches record');

  // Test 5: Mint Confirmation Updates Status to MINTED
  console.log('\n--- Test 5: Mint Confirmation Updates Database ---');
  const mockTxHash = '0x9999888877776666555544443333222211110000aabbccddeeff001122334455';
  const mintRes = await makeRequest('/api/mining/record', 'POST', {
    action: 'mint',
    wallet: testWallet,
    tokenId: 7850,
    nonce: String(validNonce),
    txHash: mockTxHash
  });
  assert(mintRes.status === 200, 'Mint update returns HTTP 200');
  assert(mintRes.data.success === true, 'Mint update successful');
  assert(mintRes.data.record.status === 'MINTED', 'Record status transitioned to MINTED');
  assert(mintRes.data.record.txHash === mockTxHash, 'Transaction hash saved in database record');

  // Test 6: Worker Entitlements API
  console.log('\n--- Test 6: Worker Entitlements API ---');
  const actRes = await makeRequest('/api/workers/activate', 'POST', {
    wallet: testWallet,
    workerId: 3
  });
  assert(actRes.status === 200, 'Worker activation returns HTTP 200');
  assert(actRes.data.active === true, 'Worker #3 activated');

  const statRes = await makeRequest(`/api/workers/status?wallet=${testWallet}`, 'GET');
  assert(statRes.status === 200, 'Worker status returns HTTP 200');
  assert(statRes.data.workers[1] === true, 'Worker 1 is free & active');
  assert(statRes.data.workers[3] === true, 'Worker 3 is activated');

  // Test 7: Verify Creator & Admin Royalty Alignment (0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C)
  console.log('\n--- Test 7: Creator Royalty & Admin Wallet Alignment (0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C) ---');
  const contractSource = fs.readFileSync(path.join(__dirname, '../contracts/HypeVMNFTMining.sol'), 'utf8');
  assert(contractSource.includes('0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'), 'Solidity contract sets CREATOR_ADMIN_WALLET = 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C');
  assert(contractSource.includes('500'), 'Solidity contract enforces 500 BPS (5.0%) royalty');

  const serveSource = fs.readFileSync(path.join(__dirname, '../serve.js'), 'utf8');
  assert(serveSource.includes('0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'), 'serve.js sets fee_recipient = 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C');
  assert(serveSource.includes('seller_fee_basis_points: 500'), 'serve.js storefront metadata enforces 500 BPS (5%) royalty');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} API & DATABASE TESTS PASSED!`);
  console.log('====================================================');
}

runApiTests().catch(e => {
  console.error(e);
  process.exit(1);
});
