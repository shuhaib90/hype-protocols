const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'ethers', 'dist', 'ethers.umd.min.js');
const dest = path.join(__dirname, 'ethers.umd.min.js');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('✅ Copied ethers.umd.min.js to miner/ successfully!');
} else {
  console.error('❌ Source ethers file not found:', src);
}
