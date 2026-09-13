/**
 * Keccak-256 Engine for Proof-of-Work NFT Mining
 * Uses standard ethers.keccak256 with Solidity packed encoding:
 * keccak256(abi.encodePacked(bytes32 challenge, address miner, uint256 nonce))
 */
(function (global) {
  'use strict';

  let ethersLib = null;
  if (typeof require !== 'undefined') {
    try {
      ethersLib = require('ethers');
    } catch(e) {}
  }
  if (!ethersLib && typeof global.ethers !== 'undefined') {
    ethersLib = global.ethers;
  }

  function normalizeAddress(addr) {
    if (!addr) return '0x0000000000000000000000000000000000000000';
    let clean = addr.startsWith('0x') ? addr.slice(2) : addr;
    clean = clean.padStart(40, '0').slice(-40);
    return ('0x' + clean).toLowerCase();
  }

  function hashPoW(challengeHex, minerHex, nonce) {
    if (!ethersLib) {
      if (typeof global.ethers !== 'undefined') {
        ethersLib = global.ethers;
      } else {
        throw new Error('ethers library not loaded');
      }
    }

    const safeMiner = normalizeAddress(minerHex);
    // abi.encodePacked(['bytes32', 'address', 'uint256'], [challenge, miner, nonce])
    const nonceBigInt = BigInt(nonce);
    const packed = ethersLib.solidityPacked(
      ['bytes32', 'address', 'uint256'],
      [challengeHex, safeMiner, nonceBigInt]
    );

    const hashHex = ethersLib.keccak256(packed);
    const hashBigInt = BigInt(hashHex);

    return {
      hashHex,
      hashBigInt,
      nonce: nonceBigInt.toString()
    };
  }

  const KeccakEngine = {
    hashPoW,
    getEthers: () => ethersLib
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeccakEngine;
  } else {
    global.KeccakEngine = KeccakEngine;
  }
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : global));
