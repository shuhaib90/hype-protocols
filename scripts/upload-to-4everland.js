/**
 * 4EVERLAND IPFS Uploader for HashApe 10,000 NFT Collection
 * Uses AWS S3 SDK with 4EVERLAND IPFS endpoint
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const ACCESS_KEY_ID = process.env.FOREVERLAND_KEY || 'MPTWE6087K5KJ9HCLFIS';
const SECRET_ACCESS_KEY = process.env.FOREVERLAND_SECRET || 'dFSFRxvrhzu8vWL1pK2JgOxr5RfVvYEnhzWX1FRL';
const BUCKET_NAME = process.env.FOREVERLAND_BUCKET || 'hashape';
const ENDPOINT = 'https://endpoint.4everland.co';

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  },
  forcePathStyle: true
});

const COLLECTION_DIR = path.join(__dirname, '..', 'collection');
const IMAGES_DIR = path.join(COLLECTION_DIR, 'images');
const METADATA_DIR = path.join(COLLECTION_DIR, 'metadata');
const PREVIEW_FILE = path.join(COLLECTION_DIR, 'preview.png');
const MANIFEST_FILE = path.join(__dirname, '..', 'data', '4everland-manifest.json');

const CONCURRENCY = 25;

async function uploadStorefront() {
  console.log('\n======================================================');
  console.log('⚡ STEP 1: Uploading OpenSea Storefront & Preview Image');
  console.log('======================================================');

  // 1. Upload preview.png
  if (fs.existsSync(PREVIEW_FILE)) {
    const previewData = fs.readFileSync(PREVIEW_FILE);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'preview.png',
      Body: previewData,
      ContentType: 'image/png'
    }));
    console.log('✅ Uploaded preview.png -> https://endpoint.4everland.co/' + BUCKET_NAME + '/preview.png');
  }

  // 2. Upload storefront.json
  const storefront = {
    name: 'HashApe',
    description: '10,000 unique algorithmic pixel-art apes mined strictly via in-browser WebGPU compute shaders on Robinhood EVM Layer 2. Zero pre-sales, zero allowlists, zero team reservations.',
    image: `https://endpoint.4everland.co/${BUCKET_NAME}/preview.png`,
    external_link: 'https://hashape-mining.dazed-region.workers.dev',
    seller_fee_basis_points: 500,
    fee_recipient: '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'
  };

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: 'storefront.json',
    Body: JSON.stringify(storefront, null, 2),
    ContentType: 'application/json'
  }));
  console.log('✅ Uploaded storefront.json -> https://endpoint.4everland.co/' + BUCKET_NAME + '/storefront.json');
}

async function uploadFolderBatch(items, totalCount, label) {
  let completed = 0;
  let active = 0;
  let index = 0;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    function next() {
      if (completed >= items.length) {
        return resolve();
      }

      while (active < CONCURRENCY && index < items.length) {
        const item = items[index++];
        active++;

        s3.send(new PutObjectCommand(item))
          .then(() => {
            completed++;
            active--;

            if (completed % 250 === 0 || completed === items.length) {
              const elapsedSec = (Date.now() - startTime) / 1000;
              const rate = (completed / elapsedSec).toFixed(1);
              const pct = ((completed / items.length) * 100).toFixed(1);
              const remainingSec = ((items.length - completed) / (completed / elapsedSec)).toFixed(0);
              console.log(`🚀 [${label}] ${completed}/${items.length} (${pct}%) - ${rate} files/sec - Est. remaining: ${remainingSec}s`);
            }

            next();
          })
          .catch((err) => {
            console.error(`❌ Failed to upload ${item.Key}:`, err.message);
            // Retry once
            s3.send(new PutObjectCommand(item))
              .then(() => { completed++; active--; next(); })
              .catch(e => { active--; next(); });
          });
      }
    }

    next();
  });
}

async function uploadImages(limit) {
  console.log('\n======================================================');
  console.log(`⚡ STEP 2: Uploading Artwork Images to 4EVERLAND IPFS`);
  console.log('======================================================');

  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.png'));
  // Sort numerically
  files.sort((a, b) => parseInt(a) - parseInt(b));

  const targetFiles = limit ? files.slice(0, limit) : files;
  console.log(`Preparing ${targetFiles.length} images for upload...`);

  const items = targetFiles.map(file => {
    const filePath = path.join(IMAGES_DIR, file);
    return {
      Bucket: BUCKET_NAME,
      Key: `images/${file}`,
      Body: fs.readFileSync(filePath),
      ContentType: 'image/png'
    };
  });

  await uploadFolderBatch(items, targetFiles.length, 'Images');
  console.log(`✅ All ${targetFiles.length} images uploaded successfully to 4EVERLAND IPFS!`);
}

async function uploadMetadata(limit) {
  console.log('\n======================================================');
  console.log(`⚡ STEP 3: Uploading Metadata JSON to 4EVERLAND IPFS`);
  console.log('======================================================');

  const files = fs.readdirSync(METADATA_DIR).filter(f => f.endsWith('.json'));
  files.sort((a, b) => parseInt(a) - parseInt(b));

  const targetFiles = limit ? files.slice(0, limit) : files;
  console.log(`Preparing ${targetFiles.length} metadata files for upload...`);

  const items = targetFiles.map(file => {
    const filePath = path.join(METADATA_DIR, file);
    let content = {};
    try { content = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) {}

    const tokenId = file.replace('.json', '');
    // Ensure absolute image URL points to the 4EVERLAND bucket CDN
    content.image = `https://endpoint.4everland.co/${BUCKET_NAME}/images/${tokenId}.png`;

    return {
      Bucket: BUCKET_NAME,
      Key: `metadata/${file}`,
      Body: JSON.stringify(content, null, 2),
      ContentType: 'application/json'
    };
  });

  await uploadFolderBatch(items, targetFiles.length, 'Metadata');
  console.log(`✅ All ${targetFiles.length} metadata JSON files uploaded successfully!`);
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  console.log('======================================================');
  console.log('🦍 HASHAPE 4EVERLAND IPFS BATCH UPLOADER');
  console.log('======================================================');
  console.log('Bucket:', BUCKET_NAME);
  console.log('Endpoint:', ENDPOINT);
  console.log('Upload target:', limit ? `First ${limit} items (test mode)` : 'Full 10,000 Collection');

  const startTime = Date.now();

  await uploadStorefront();
  await uploadImages(limit);
  await uploadMetadata(limit);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log(`🎉 4EVERLAND IPFS UPLOAD COMPLETE in ${totalTime}s!`);
  console.log('======================================================');
  console.log('Storefront URI: https://endpoint.4everland.co/' + BUCKET_NAME + '/storefront.json');
  console.log('Base Token URI: https://endpoint.4everland.co/' + BUCKET_NAME + '/metadata/');
  console.log('Sample Token #1: https://endpoint.4everland.co/' + BUCKET_NAME + '/metadata/1.json');
  console.log('Sample Image #1: https://endpoint.4everland.co/' + BUCKET_NAME + '/images/1.png');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error during 4EVERLAND upload:', err);
    process.exit(1);
  });
}

module.exports = {
  s3,
  BUCKET_NAME,
  uploadStorefront,
  uploadImages,
  uploadMetadata
};
