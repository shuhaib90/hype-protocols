/**
 * Background Multi-Threaded Proof of Work Worker
 * Computes Solidity-equivalent Keccak-256 hashes concurrently without blocking browser UI.
 */
importScripts('ethers.umd.min.js', 'keccak.js');

let isRunning = false;

self.onmessage = function (e) {
  const data = e.data;
  const type = data.type;

  if (type === 'START') {
    isRunning = true;
    mineBatch(data);
  } else if (type === 'STOP') {
    isRunning = false;
  }
};

function mineBatch(config) {
  const { challenge, miner, startNonce, batchSize, targetDifficulty, workerId } = config;
  const targetBigInt = BigInt(targetDifficulty);
  let currentNonce = BigInt(startNonce);
  const endNonce = currentNonce + BigInt(batchSize);

  const startTime = performance.now();
  let noncesChecked = 0;

  while (isRunning && currentNonce < endNonce) {
    const powResult = KeccakEngine.hashPoW(challenge, miner, currentNonce);
    noncesChecked++;

    if (powResult.hashBigInt < targetBigInt) {
      // SOLUTION FOUND!
      self.postMessage({
        type: 'SOLUTION_FOUND',
        workerId,
        nonce: currentNonce.toString(),
        hash: powResult.hashHex,
        target: targetDifficulty,
        noncesChecked,
        durationMs: performance.now() - startTime
      });
      isRunning = false;
      return;
    }

    currentNonce++;
  }

  const durationMs = performance.now() - startTime;
  self.postMessage({
    type: 'BATCH_DONE',
    workerId,
    noncesChecked,
    durationMs,
    nextNonce: currentNonce.toString()
  });
}
