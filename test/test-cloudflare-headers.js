const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

function fetchRaw(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(url, reqOptions, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

async function runCloudflareTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING CLOUDFLARE PRODUCTION HEADERS & SECURITY');
  console.log('====================================================\n');

  // Test 1: Global Security Headers
  console.log('--- Test 1: Cloudflare Global Security Headers ---');
  const healthRes = await fetchRaw('/api/system/health', {
    headers: {
      'CF-Connecting-IP': '203.0.113.195',
      'CF-Ray': '8931b26f5a31a97c-IAD',
      'CF-IPCountry': 'DE'
    }
  });

  assert.strictEqual(healthRes.statusCode, 200, 'Health endpoint must return 200');
  console.log('✅ [PASS] /api/system/health responds with HTTP 200');

  assert.strictEqual(healthRes.headers['x-content-type-options'], 'nosniff', 'Must include nosniff');
  console.log('✅ [PASS] X-Content-Type-Options: nosniff enforced');

  assert.strictEqual(healthRes.headers['x-frame-options'], 'SAMEORIGIN', 'Must include SAMEORIGIN');
  console.log('✅ [PASS] X-Frame-Options: SAMEORIGIN enforced');

  assert.ok(healthRes.headers['strict-transport-security'], 'Must include HSTS');
  console.log('✅ [PASS] Strict-Transport-Security header present');

  assert.strictEqual(healthRes.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  console.log('✅ [PASS] Referrer-Policy: strict-origin-when-cross-origin enforced');

  // Test 2: Cloudflare Real IP & Header Extraction
  console.log('\n--- Test 2: Cloudflare Real-IP Resolution ---');
  assert.strictEqual(healthRes.json.clientIp, '203.0.113.195', 'Must resolve CF-Connecting-IP');
  console.log('✅ [PASS] Client IP successfully resolved from CF-Connecting-IP');

  assert.strictEqual(healthRes.json.cloudflare.isCloudflare, true);
  assert.strictEqual(healthRes.json.cloudflare.cfRay, '8931b26f5a31a97c-IAD');
  assert.strictEqual(healthRes.json.cloudflare.cfCountry, 'DE');
  console.log('✅ [PASS] Cloudflare Ray ID and Country metadata extracted');

  // Test 3: Edge CDN Caching Headers for 10,000 NFTs
  console.log('\n--- Test 3: Cloudflare Edge Cache-Control Headers ---');

  // 3a. Images
  const imgRes = await fetchRaw('/images/1.png');
  assert.strictEqual(imgRes.statusCode, 200);
  const imgCache = imgRes.headers['cache-control'] || '';
  assert.ok(imgCache.includes('s-maxage=31536000'), 'Image must have 1-year Cloudflare s-maxage');
  assert.ok(imgCache.includes('immutable'), 'Image must be immutable');
  console.log('✅ [PASS] /images/1.png specifies s-maxage=31536000, immutable');

  // 3b. Metadata
  const metaRes = await fetchRaw('/metadata/1.json');
  assert.strictEqual(metaRes.statusCode, 200);
  const metaCache = metaRes.headers['cache-control'] || '';
  assert.ok(metaCache.includes('s-maxage=86400'), 'Metadata must have 24h Cloudflare s-maxage');
  assert.ok(metaCache.includes('stale-while-revalidate=86400'), 'Metadata must support stale-while-revalidate');
  console.log('✅ [PASS] /metadata/1.json specifies s-maxage=86400, stale-while-revalidate');

  // 3c. Storefront & Preview
  const storeRes = await fetchRaw('/storefront.json');
  assert.strictEqual(storeRes.statusCode, 200);
  const storeCache = storeRes.headers['cache-control'] || '';
  assert.ok(storeCache.includes('s-maxage=604800'), 'Storefront must have 7-day s-maxage');
  console.log('✅ [PASS] /storefront.json specifies s-maxage=604800');

  const prevRes = await fetchRaw('/preview.png');
  assert.strictEqual(prevRes.statusCode, 200);
  const prevCache = prevRes.headers['cache-control'] || '';
  assert.ok(prevCache.includes('s-maxage=2592000'), 'Preview must have 30-day s-maxage');
  console.log('✅ [PASS] /preview.png specifies s-maxage=2592000');

  // 3d. Dynamic Mining API No-Store
  const supplyRes = await fetchRaw('/api/mining/supply');
  assert.strictEqual(supplyRes.statusCode, 200);
  const apiCache = supplyRes.headers['cache-control'] || '';
  assert.ok(apiCache.includes('no-store'), 'Dynamic mining API must have no-store');
  assert.ok(apiCache.includes('no-cache'), 'Dynamic mining API must have no-cache');
  console.log('✅ [PASS] /api/mining/supply enforces no-store, no-cache for CDN');

  // 3e. HTML Root
  const htmlRes = await fetchRaw('/');
  assert.strictEqual(htmlRes.statusCode, 200);
  const htmlCache = htmlRes.headers['cache-control'] || '';
  assert.ok(htmlCache.includes('must-revalidate'), 'HTML must revalidate to reflect deploys');
  console.log('✅ [PASS] Root HTML specifies must-revalidate');

  // Test 4: Origin Rate Limiter (Anti-Flood Protection)
  console.log('\n--- Test 4: In-Memory Origin Rate Limiter ---');
  const floodIp = '198.51.100.99';
  let rejected = false;

  for (let i = 0; i < 65; i++) {
    const res = await fetchRaw('/api/mining/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': floodIp
      },
      body: { wallet: '0x1111222233334444555566667777888899990000' }
    });

    if (res.statusCode === 429) {
      rejected = true;
      assert.ok(res.headers['retry-after'], 'HTTP 429 must include Retry-After header');
      break;
    }
  }

  assert.strictEqual(rejected, true, 'Rate limiter must reject floods with HTTP 429');
  console.log('✅ [PASS] Flood requests from mock IP rejected with HTTP 429 Too Many Requests');
  console.log('✅ [PASS] Retry-After header provided in rate-limit response');

  console.log('\n====================================================');
  console.log('🎉 ALL 17/17 CLOUDFLARE PRODUCTION TESTS PASSED!');
  console.log('====================================================');
}

runCloudflareTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
