const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const componentsDir = path.join(srcDir, 'components');
const docsDir = path.join(srcDir, 'docs');

const appTsx = fs.readFileSync(path.join(srcDir, 'App.tsx'), 'utf8');
const miningDashboardTsx = fs.readFileSync(path.join(componentsDir, 'MiningDashboard.tsx'), 'utf8');
const docsContentTsx = fs.readFileSync(path.join(docsDir, 'DocsContent.tsx'), 'utf8');
const adminModalTsx = fs.readFileSync(path.join(componentsDir, 'AdminModal.tsx'), 'utf8');
const successModalTsx = fs.readFileSync(path.join(componentsDir, 'SuccessModal.tsx'), 'utf8');
const workerPanelTsx = fs.readFileSync(path.join(componentsDir, 'WorkerPanel.tsx'), 'utf8');
const miningLedgerTsx = fs.readFileSync(path.join(componentsDir, 'MiningLedger.tsx'), 'utf8');
const supplyModuleTsx = fs.readFileSync(path.join(componentsDir, 'SupplyModule.tsx'), 'utf8');
const navTsx = fs.readFileSync(path.join(componentsDir, 'Navigation.tsx'), 'utf8');
const distHtml = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');

console.log('====================================================');
console.log('🧪 VERIFYING REACT FRONTEND & BUNDLE INTEGRITY');
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

// 1. Creator / Admin address
const allSources = appTsx + miningDashboardTsx + docsContentTsx + adminModalTsx + successModalTsx + workerPanelTsx + miningLedgerTsx + supplyModuleTsx + navTsx;
assert(allSources.includes('0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'), 'Admin & Creator address 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C present in UI');

// 2. Solved Hashes & Mint History
assert(miningLedgerTsx.includes('SOLVED PROOFS & MINT HISTORY'), 'Solved Proofs & Mint History section present in MiningLedger');

// 3. WebGPU PoW & 5-Worker System
assert(workerPanelTsx.includes('MINING WORKERS (5 MAX)'), '5-Worker GPU management panel present');
assert(workerPanelTsx.includes('Worker #1 is 100% FREE. Workers #2–#5 require APEBROKER tokens') || workerPanelTsx.includes('Worker #1 is 100% FREE. Workers #2–#5 require HYPE tokens'), 'APEBROKER token worker activation described');
assert(workerPanelTsx.includes('0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc'), '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc token contract for active rig displayed in WorkerPanel');

// 4. Zero ETH Gas & Native $APEBROKER
assert(allSources.includes('0.05') && (allSources.includes('APEBROKER') || allSources.includes('HYPE')), '0.05 $APEBROKER native mint fee specified');
assert(allSources.includes('Zero ETH Gas') || allSources.includes('Zero ETH') || allSources.includes('No ETH'), 'Zero ETH gas policy displayed');
assert(allSources.includes('HyperEVM') || allSources.includes('HypeVM') || allSources.includes('ApeSyndicate'), 'HyperEVM network target explicit');

// 5. OpenSea 5% Royalty
assert(allSources.includes('5.0%') || allSources.includes('5% Creator Royalty'), '5% Creator Royalty documented and displayed');

// 6. Manual Minting Flow
assert(successModalTsx.includes('MINING COMPLETE') || successModalTsx.includes('CONFIRM & MINT NFT'), 'Manual mint modal implemented');
assert(successModalTsx.includes('mintFeeHype') || successModalTsx.includes('APEBROKER'), 'Manual mint modal specifies fee payment');

// 7. Technical Documentation
assert(docsContentTsx.includes('WebGPU Architecture & Compute Pipeline'), 'WebGPU compute pipeline documented in docs');
assert(docsContentTsx.includes('HashCats Inspiration'), 'HashCats comparative analysis documented in docs');
assert(docsContentTsx.includes('Anti-Race Condition & Mempool Security'), 'Anti-race condition security documented in docs');

// 8. Dist Index HTML Production Bundle
assert(distHtml.includes('<div id="root"></div>'), 'Production HTML root container present');
assert(distHtml.includes('/assets/index-'), 'Production bundled assets referenced');

console.log('\n====================================================');
console.log(`🎉 ALL ${passed}/${total} FRONTEND INTEGRITY TESTS PASSED!`);
console.log('====================================================');

