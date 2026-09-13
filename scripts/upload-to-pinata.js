/**
 * Pinata IPFS Uploader for Pixel Sentinels
 * Supports uploading metadata and preview images directly to Pinata IPFS.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const PINATA_JWT = process.env.PINATA_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiNzYyZDAxYy02ZTVkLTQ3ZjMtODZiMC01Y2MwNTFlYzA1M2QiLCJlbWFpbCI6InplbnZpY2FscGhhQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIxNDVlMmJhNzQyNTdjNWJkZGUxNyIsInNjb3BlZEtleVNlY3JldCI6ImRlNGUwOWVkZmMxNDVmYmRiMjgzOTM5ZjU2YTc1ODI1MzUzMzU5Mjk3Mjg1NjI0N2MxNDdiZDM3MjVmOTc3ZmEiLCJleHAiOjE4MjA3MjUzMTd9.88EIUIOeukVWBjXiOvTjZX0T3VD1dSYc7coIlrGsXR8';

const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://crimson-binding-reindeer-988.mypinata.cloud';
const COLLECTION_DIR = path.join(__dirname, '..', 'collection');

async function pinJSONToIPFS(body, name) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: name || 'HashApe-Data' },
      pinataContent: body
    });

    const req = https.request('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch(e) {
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testConnection() {
  console.log('⚡ Checking Pinata IPFS connection...');
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.pinata.cloud/data/testAuthentication', {
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Pinata Auth Result:', data);
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Upload Collection Storefront Metadata for OpenSea
async function uploadCollectionStorefront() {
  console.log('⚡ Uploading OpenSea Collection Storefront Metadata to Pinata IPFS...');
  const contractMetadata = {
    name: "HashApe",
    description: "10,000 unique algorithmic pixel-art apes mined strictly via in-browser WebGPU compute shaders on Robinhood EVM Layer 2. Zero pre-sales, zero allowlists, zero team reservations.",
    image: "https://hashape-mining.dazed-region.workers.dev/preview.png",
    external_link: "https://hashape-mining.dazed-region.workers.dev",
    seller_fee_basis_points: 500, // 5% royalty
    fee_recipient: "0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C"
  };

  const result = await pinJSONToIPFS(contractMetadata, 'HashApe-ContractURI.json');
  console.log('✅ OpenSea Collection Metadata Pinned to IPFS:');
  console.log(`📌 IPFS CID: ipfs://${result.IpfsHash}`);
  console.log(`🌐 Dedicated Gateway URL: ${PINATA_GATEWAY}/ipfs/${result.IpfsHash}`);
  return result;
}

if (require.main === module) {
  (async () => {
    try {
      await testConnection();
      await uploadCollectionStorefront();
    } catch(err) {
      console.error('Error:', err);
    }
  })();
}

module.exports = {
  PINATA_JWT,
  COLLECTION_DIR,
  pinJSONToIPFS,
  testConnection,
  uploadCollectionStorefront
};
