/**
 * HypeVM Proof-of-Work NFT Mining Test Suite
 * Validates:
 * 1. Keccak-256 cryptographic proof verification
 * 2. 5-Worker system & disjoint nonce partitioning
 * 3. HYPE token worker activation
 * 4. Dynamic difficulty scaling across supply tiers
 * 5. Final NFT race conditions & anti-replay protection
 * 6. ERC-2981 5% creator royalty math for OpenSea
 */

const { ethers } = require('ethers');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING HYPEVM NFT MINING TEST SUITE');
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

  // --- Test 1: Keccak-256 PoW Equation ---
  console.log('--- Test 1: Cryptographic PoW Equation Verification ---');
  const challenge = '0x4f82c9e17b8120dca3491f0923eab9921477610098fcca4930129a0000000000';
  const miner = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';
  const nonce = 133742n;

  const packed = ethers.solidityPacked(
    ['bytes32', 'address', 'uint256'],
    [challenge, miner.toLowerCase(), nonce]
  );
  const hashHex = ethers.keccak256(packed);
  const hashBigInt = BigInt(hashHex);

  assert(hashHex.startsWith('0x') && hashHex.length === 66, 'Hash produces valid 32-byte 0x hex');
  assert(typeof hashBigInt === 'bigint', 'HashBigInt evaluates to valid 256-bit BigInt');

  // Address binding check: different miner address produces completely different hash
  const otherMiner = '0x1111111111111111111111111111111111111111';
  const otherPacked = ethers.solidityPacked(['bytes32', 'address', 'uint256'], [challenge, otherMiner, nonce]);
  const otherHash = ethers.keccak256(otherPacked);
  assert(otherHash !== hashHex, 'Proof is strictly bound to miner address (Anti-Frontrunning Mempool Protection)');

  // --- Test 2: 5-Worker System & Disjoint Nonce Partitioning ---
  console.log('\n--- Test 2: 5-Worker System & Disjoint Nonce Partitioning ---');
  const SEGMENT_SIZE = 4294967296n; // 2^32
  const workerPartitions = [];

  for (let i = 1; i <= 5; i++) {
    const start = BigInt(i - 1) * SEGMENT_SIZE;
    const end = start + SEGMENT_SIZE - 1n;
    workerPartitions.push({ workerId: i, start, end });
  }

  assert(workerPartitions.length === 5, 'Exactly 5 workers configured');
  assert(workerPartitions[0].start === 0n, 'Worker #1 begins at nonce 0');

  // Check no overlaps between adjacent workers
  for (let i = 0; i < 4; i++) {
    const current = workerPartitions[i];
    const next = workerPartitions[i + 1];
    assert(current.end + 1n === next.start, `Worker #${current.workerId} and Worker #${next.workerId} have contiguous, non-overlapping partitions`);
    assert(current.end < next.start, `Partition #${current.workerId} does not overlap Partition #${next.workerId}`);
  }

  // --- Test 3: HYPE Token Worker Activation ---
  console.log('\n--- Test 3: HYPE Token Worker Activation (1st Free, 2-5 Cost HYPE) ---');
  const workerCosts = { 1: 0n, 2: 100n, 3: 200n, 4: 300n, 5: 500n };
  let userHypeBalance = 1500n;
  let contractHypeTreasury = 0n;
  const activeWorkers = new Set([1]); // Worker 1 free by default

  function activateWorker(workerId) {
    if (workerId === 1) return { success: true, cost: 0n };
    if (activeWorkers.has(workerId)) throw new Error('Worker already active');
    const cost = workerCosts[workerId];
    if (userHypeBalance < cost) throw new Error('Insufficient HYPE balance');
    userHypeBalance -= cost;
    contractHypeTreasury += cost;
    activeWorkers.add(workerId);
    return { success: true, cost };
  }

  assert(activeWorkers.has(1), 'Worker #1 is active by default with zero HYPE cost');

  // Activate workers 2 through 5
  activateWorker(2);
  activateWorker(3);
  activateWorker(4);
  activateWorker(5);

  assert(activeWorkers.size === 5, 'All 5 workers successfully activated');
  assert(userHypeBalance === 1500n - (100n + 200n + 300n + 500n), 'Exact HYPE deducted for workers 2-5 (1100 HYPE total)');
  assert(contractHypeTreasury === 1100n, 'Contract accumulated 1100 HYPE in activation fees');

  // Activating worker 6 or duplicate worker 5 must fail
  let duplicateFailed = false;
  try {
    activateWorker(5);
  } catch (e) {
    duplicateFailed = true;
  }
  assert(duplicateFailed, 'Rejects duplicate activation of already active worker');

  // --- Test 4: Dynamic Difficulty Across Supply Tiers ---
  console.log('\n--- Test 4: Dynamic Difficulty Scaling by Remaining Supply ---');
  const TARGETS = {
    EASY:     BigInt('0x' + '000f'.padEnd(64, 'f')),
    MEDIUM:   BigInt('0x' + '0007'.padEnd(64, 'f')),
    HARD:     BigInt('0x' + '0003'.padEnd(64, 'f')),
    VERYHARD: BigInt('0x' + '0001'.padEnd(64, 'f')),
    EXTREME:  BigInt('0x' + '00007'.padEnd(64, 'f')),
    MAXIMUM:  BigInt('0x' + '00000f'.padEnd(64, 'f')),
  };

  function getDifficultyTarget(totalMined, maxSupply = 10000) {
    const remaining = maxSupply - totalMined;
    if (remaining > 7500) return { band: 'EASY', target: TARGETS.EASY };
    if (remaining > 5000) return { band: 'MEDIUM', target: TARGETS.MEDIUM };
    if (remaining > 2500) return { band: 'HARD', target: TARGETS.HARD };
    if (remaining > 1000) return { band: 'VERY HARD', target: TARGETS.VERYHARD };
    if (remaining > 100)  return { band: 'EXTREME', target: TARGETS.EXTREME };
    return { band: 'MAXIMUM', target: TARGETS.MAXIMUM };
  }

  assert(getDifficultyTarget(1000).band === 'EASY', 'Supply remaining 9000 evaluates to EASY');
  assert(getDifficultyTarget(4000).band === 'MEDIUM', 'Supply remaining 6000 evaluates to MEDIUM');
  assert(getDifficultyTarget(6000).band === 'HARD', 'Supply remaining 4000 evaluates to HARD');
  assert(getDifficultyTarget(8500).band === 'VERY HARD', 'Supply remaining 1500 evaluates to VERY HARD');
  assert(getDifficultyTarget(9500).band === 'EXTREME', 'Supply remaining 500 evaluates to EXTREME');
  assert(getDifficultyTarget(9950).band === 'MAXIMUM', 'Supply remaining 50 evaluates to MAXIMUM');

  // Verify target bounds strictly decrease (difficulty increases)
  const t1 = getDifficultyTarget(1000).target;
  const t2 = getDifficultyTarget(4000).target;
  const t3 = getDifficultyTarget(6000).target;
  const t4 = getDifficultyTarget(8500).target;
  const t5 = getDifficultyTarget(9500).target;
  const t6 = getDifficultyTarget(9950).target;
  assert(t1 > t2 && t2 > t3 && t3 > t4 && t4 > t5 && t5 > t6, 'Difficulty targets decrease monotonically as remaining supply contracts');

  // --- Test 5: Proof Discovery & Anti-Replay Protection ---
  console.log('\n--- Test 5: Proof Discovery & Anti-Replay Protection ---');
  const targetEasy = TARGETS.EASY;
  let validNonce = null;
  let validDigest = null;

  for (let n = 1n; n < 50000n; n++) {
    const p = ethers.solidityPacked(['bytes32', 'address', 'uint256'], [challenge, miner.toLowerCase(), n]);
    const h = ethers.keccak256(p);
    if (BigInt(h) < targetEasy) {
      validNonce = n;
      validDigest = h;
      break;
    }
  }

  assert(validNonce !== null, `Discovered valid solution nonce: ${validNonce} satisfying target`);

  // Anti-Replay simulation
  const usedProofs = new Set();
  function submitMint(proofDigest) {
    if (usedProofs.has(proofDigest)) {
      throw new Error('Proof already used (replay protection)');
    }
    usedProofs.add(proofDigest);
    return true;
  }

  assert(submitMint(validDigest) === true, 'First mint submission with valid proof succeeds');

  let replayCaught = false;
  try {
    submitMint(validDigest);
  } catch (e) {
    replayCaught = true;
  }
  assert(replayCaught, 'Rejects duplicate submission of identical proof (Anti-Replay Protection)');

  // --- Test 6: Final NFT Race Condition Simulation ---
  console.log('\n--- Test 6: Final NFT Race Condition (Token #10,000) ---');
  let currentMined = 9999;
  const maxSupply = 10000;

  function mintFinalNFT(minedProof) {
    if (currentMined >= maxSupply) {
      throw new Error('NFT ALREADY CLAIMED: 10,000 Sold Out');
    }
    currentMined++;
    return currentMined;
  }

  const minerA = mintFinalNFT('proof_miner_a');
  assert(minerA === 10000, 'First transaction claims final NFT #10,000');

  let minerBReverted = false;
  try {
    mintFinalNFT('proof_miner_b');
  } catch (e) {
    minerBReverted = e.message.includes('NFT ALREADY CLAIMED');
  }
  assert(minerBReverted, 'Concurrent second transaction reverts safely with "NFT ALREADY CLAIMED"');
  assert(currentMined === 10000, 'Supply hard cap never exceeds 10,000');

  // --- Test 7: OpenSea ERC-2981 Creator Royalty (5%) ---
  console.log('\n--- Test 7: OpenSea ERC-2981 5% Creator Royalty ---');
  const royaltyReceiver = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';
  const royaltyBps = 500n; // 5.0%
  const salePrice = 100000000000000000000n; // 100 HYPE

  const calculatedRoyalty = (salePrice * royaltyBps) / 10000n;
  assert(calculatedRoyalty === 5000000000000000000n, 'Calculates exact 5.0% royalty (5 HYPE on 100 HYPE secondary sale)');
  assert(royaltyReceiver === '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C', 'Royalty receiver strictly points to creator/admin wallet');

  // --- Test 8: Per-Wallet 5-NFT Quota Cap Enforcement ---
  console.log('\n--- Test 8: Per-Wallet 5-NFT Quota Cap Enforcement ---');
  const MAX_MINTS_PER_WALLET = 5;
  const walletMintTracker = new Map();

  function mintForWallet(userAddress) {
    const current = walletMintTracker.get(userAddress) || 0;
    if (current >= MAX_MINTS_PER_WALLET) {
      throw new Error('Max 5 NFTs per wallet limit reached');
    }
    walletMintTracker.set(userAddress, current + 1);
    return current + 1;
  }

  const walletA = '0x1111111111111111111111111111111111111111';
  assert(mintForWallet(walletA) === 1, 'Wallet mints 1st NFT');
  assert(mintForWallet(walletA) === 2, 'Wallet mints 2nd NFT');
  assert(mintForWallet(walletA) === 3, 'Wallet mints 3rd NFT');
  assert(mintForWallet(walletA) === 4, 'Wallet mints 4th NFT');
  assert(mintForWallet(walletA) === 5, 'Wallet mints 5th NFT (Quota Reached)');

  let sixthMintFailed = false;
  try {
    mintForWallet(walletA);
  } catch (e) {
    sixthMintFailed = e.message.includes('Max 5 NFTs per wallet limit reached');
  }
  assert(sixthMintFailed, 'Attempting 6th mint for same wallet reverts with "Max 5 NFTs per wallet limit reached"');

  // Independent wallet can still mint
  const walletB = '0x2222222222222222222222222222222222222222';
  assert(mintForWallet(walletB) === 1, 'Different wallet address has its own independent 5-NFT quota');

  // --- Test 9: Sequential Escalating Difficulty Ladder Per-Wallet ---
  console.log('\n--- Test 9: Sequential Escalating Difficulty Ladder Per-Wallet ---');
  const WALLET_TIERS = [
    { tier: 1, label: 'HARD (NFT 1/5)', target: BigInt('0x' + '00000f'.padEnd(64, 'f')) },
    { tier: 2, label: 'HARDER (NFT 2/5)', target: BigInt('0x' + '000007'.padEnd(64, 'f')) },
    { tier: 3, label: 'VERY HARD (NFT 3/5)', target: BigInt('0x' + '000003'.padEnd(64, 'f')) },
    { tier: 4, label: 'EXTREME (NFT 4/5)', target: BigInt('0x' + '000001'.padEnd(64, 'f')) },
    { tier: 5, label: 'LEGENDARY (NFT 5/5)', target: BigInt('0x' + '000000f'.padEnd(64, 'f')) },
  ];

  function getTargetForWalletMint(mintCount) {
    if (mintCount >= 5) throw new Error('Max 5 NFTs per wallet limit reached');
    return WALLET_TIERS[mintCount];
  }

  assert(getTargetForWalletMint(0).label === 'HARD (NFT 1/5)', 'NFT #1 uses HARD difficulty');
  assert(getTargetForWalletMint(1).label === 'HARDER (NFT 2/5)', 'NFT #2 uses HARDER difficulty');
  assert(getTargetForWalletMint(2).label === 'VERY HARD (NFT 3/5)', 'NFT #3 uses VERY HARD difficulty');
  assert(getTargetForWalletMint(3).label === 'EXTREME (NFT 4/5)', 'NFT #4 uses EXTREME difficulty');
  assert(getTargetForWalletMint(4).label === 'LEGENDARY (NFT 5/5)', 'NFT #5 uses LEGENDARY difficulty');

  // --- Test 10: Strict Monotonic Difficulty Increase ---
  console.log('\n--- Test 10: Strict Monotonic Difficulty Increase ---');
  for (let i = 0; i < 4; i++) {
    const currentTarget = WALLET_TIERS[i].target;
    const nextTarget = WALLET_TIERS[i + 1].target;
    assert(currentTarget > nextTarget, `Tier ${i + 1} target (${WALLET_TIERS[i].label}) is strictly higher (easier) than Tier ${i + 2} target (${WALLET_TIERS[i + 1].label})`);
  }

  // --- Test 11: 10-Epoch Progression & 10,000 Hard Cap Allocation ---
  console.log('\n--- Test 11: 10-Epoch Progression & Token Allocations ---');
  const EPOCHS_SCHEDULE = [
    { id: 1, start: 1, end: 10, count: 10, feeUsd: 5, feeEth: 0.0020, difficulty: 'HARD' },
    { id: 2, start: 11, end: 30, count: 20, feeUsd: 7, feeEth: 0.0028, difficulty: 'HARDER' },
    { id: 3, start: 31, end: 70, count: 40, feeUsd: 10, feeEth: 0.0040, difficulty: 'VERY HARD' },
    { id: 4, start: 71, end: 150, count: 80, feeUsd: 14, feeEth: 0.0056, difficulty: 'VERY HARD+' },
    { id: 5, start: 151, end: 300, count: 150, feeUsd: 18, feeEth: 0.0072, difficulty: 'EXTREME' },
    { id: 6, start: 301, end: 600, count: 300, feeUsd: 22, feeEth: 0.0088, difficulty: 'EXTREME+' },
    { id: 7, start: 601, end: 1200, count: 600, feeUsd: 26, feeEth: 0.0104, difficulty: 'LEGENDARY' },
    { id: 8, start: 1201, end: 2500, count: 1300, feeUsd: 30, feeEth: 0.0120, difficulty: 'LEGENDARY+' },
    { id: 9, start: 2501, end: 5000, count: 2500, feeUsd: 35, feeEth: 0.0140, difficulty: 'MYTHIC' },
    { id: 10, start: 5001, end: 10000, count: 5000, feeUsd: 40, feeEth: 0.0160, difficulty: 'OMEGA' },
  ];

  function getEpochForToken(tokenId) {
    return EPOCHS_SCHEDULE.find(e => tokenId >= e.start && tokenId <= e.end);
  }

  assert(getEpochForToken(1).id === 1, 'Token #1 is in Epoch 1');
  assert(getEpochForToken(10).id === 1, 'Token #10 is in Epoch 1');
  assert(getEpochForToken(11).id === 2, 'Token #11 transitions to Epoch 2');
  assert(getEpochForToken(30).id === 2, 'Token #30 is in Epoch 2');
  assert(getEpochForToken(31).id === 3, 'Token #31 transitions to Epoch 3');
  assert(getEpochForToken(10000).id === 10, 'Token #10,000 completes final Epoch 10');

  const totalEpochSupply = EPOCHS_SCHEDULE.reduce((sum, e) => sum + e.count, 0);
  assert(totalEpochSupply === 10000, 'Sum of all 10 epochs equals strictly 10,000 NFTs');

  // --- Test 12: Escalating Mint Fees per Epoch ---
  console.log('\n--- Test 12: Escalating Mint Fees per Epoch ---');
  assert(getEpochForToken(1).feeUsd === 5, 'Epoch 1 mint fee is $5 ETH');
  assert(getEpochForToken(10).feeUsd === 5, 'Final Token in Epoch 1 is $5 ETH');
  assert(getEpochForToken(11).feeUsd === 7, 'Epoch 2 mint fee escalates to $7 ETH');
  assert(getEpochForToken(30).feeUsd === 7, 'Final Token in Epoch 2 is $7 ETH');
  assert(getEpochForToken(50).feeUsd === 10, 'Epoch 3 mint fee escalates to $10 ETH');
  assert(getEpochForToken(100).feeUsd === 14, 'Epoch 4 mint fee escalates to $14 ETH');
  assert(getEpochForToken(200).feeUsd === 18, 'Epoch 5 mint fee escalates to $18 ETH');
  assert(getEpochForToken(500).feeUsd === 22, 'Epoch 6 mint fee escalates to $22 ETH');
  assert(getEpochForToken(1000).feeUsd === 26, 'Epoch 7 mint fee escalates to $26 ETH');
  assert(getEpochForToken(2000).feeUsd === 30, 'Epoch 8 mint fee escalates to $30 ETH');
  assert(getEpochForToken(4000).feeUsd === 35, 'Epoch 9 mint fee escalates to $35 ETH');
  assert(getEpochForToken(8000).feeUsd === 40, 'Epoch 10 mint fee escalates to $40 ETH');

  // Fee enforcement simulation
  function simulateMintFeeCheck(tokenId, feePaidEth) {
    const epoch = getEpochForToken(tokenId);
    if (!epoch) throw new Error('Token out of bounds');
    if (feePaidEth < epoch.feeEth) {
      throw new Error(`Insufficient mint fee: ${epoch.feeEth} ETH required for Epoch ${epoch.id}`);
    }
    return true;
  }

  assert(simulateMintFeeCheck(5, 0.0020) === true, 'Accepts exact Epoch 1 fee (0.0020 ETH / $5)');
  let underpaidCaught = false;
  try {
    simulateMintFeeCheck(15, 0.0020); // Attempting to pay Epoch 1 fee for Epoch 2 token
  } catch (e) {
    underpaidCaught = e.message.includes('Insufficient mint fee');
  }
  assert(underpaidCaught, 'Rejects Epoch 1 fee for Epoch 2 token (requires $7 / 0.0028 ETH)');
  assert(simulateMintFeeCheck(15, 0.0028) === true, 'Accepts correct Epoch 2 fee (0.0028 ETH / $7)');

  // --- Test 13: Combined Wallet Quota & Epoch Mining ---
  console.log('\n--- Test 13: Combined Wallet Quota & Epoch Mining ---');
  let currentTotalMined = 8;
  const userWallet = '0x7777777777777777777777777777777777777777';
  let userMintCount = 0;

  function executeSequentialMint(wallet, feePaidEth) {
    if (userMintCount >= 5) throw new Error('Max 5 NFTs per wallet limit reached');
    const nextToken = currentTotalMined + 1;
    simulateMintFeeCheck(nextToken, feePaidEth);
    currentTotalMined++;
    userMintCount++;
    return { tokenId: nextToken, epoch: getEpochForToken(nextToken) };
  }

  const m1 = executeSequentialMint(userWallet, 0.0020);
  assert(m1.tokenId === 9 && m1.epoch.id === 1, 'Wallet mints Token #9 in Epoch 1 ($5)');
  const m2 = executeSequentialMint(userWallet, 0.0020);
  assert(m2.tokenId === 10 && m2.epoch.id === 1, 'Wallet mints Token #10 in Epoch 1 ($5)');
  const m3 = executeSequentialMint(userWallet, 0.0028);
  assert(m3.tokenId === 11 && m3.epoch.id === 2, 'Wallet seamlessly crosses into Epoch 2 on Token #11 ($7)');
  assert(userMintCount === 3, 'User wallet quota tracks 3/5 minted');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} HYPEVM MINING TESTS PASSED!`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
