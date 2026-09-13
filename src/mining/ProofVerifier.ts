import { ethers } from 'ethers';

/**
 * ProofVerifier: Cryptographic validation of HypeVM Proof-of-Work solutions.
 * Implements deterministic Keccak-256 verification:
 * keccak256(abi.encodePacked(bytes32 challenge, address miner, uint256 nonce))
 */

export function normalizeAddress(addr: string): string {
  if (!addr) return '0x0000000000000000000000000000000000000000';
  let clean = addr.startsWith('0x') ? addr.slice(2) : addr;
  clean = clean.padStart(40, '0').slice(-40);
  return ('0x' + clean).toLowerCase();
}

export interface VerifyResult {
  valid: boolean;
  hashHex: string;
  hashBigInt: bigint;
  targetBigInt: bigint;
  error?: string;
}

export function computePoWHash(challengeHex: string, minerAddress: string, nonce: bigint | string): {
  hashHex: string;
  hashBigInt: bigint;
} {
  const safeMiner = normalizeAddress(minerAddress);
  const nonceBigInt = BigInt(nonce);

  const packed = ethers.solidityPacked(
    ['bytes32', 'address', 'uint256'],
    [challengeHex, safeMiner, nonceBigInt]
  );

  const hashHex = ethers.keccak256(packed);
  const hashBigInt = BigInt(hashHex);

  return { hashHex, hashBigInt };
}

export function verifyProof(
  challengeHex: string,
  minerAddress: string,
  nonce: bigint | string,
  targetDifficultyHex: string
): VerifyResult {
  try {
    const { hashHex, hashBigInt } = computePoWHash(challengeHex, minerAddress, nonce);
    const targetBigInt = BigInt(targetDifficultyHex);

    const valid = hashBigInt < targetBigInt;
    return {
      valid,
      hashHex,
      hashBigInt,
      targetBigInt,
      error: valid ? undefined : 'Hash does not meet target difficulty',
    };
  } catch (err: any) {
    return {
      valid: false,
      hashHex: '0x0',
      hashBigInt: 0n,
      targetBigInt: 0n,
      error: err.message || 'Verification error',
    };
  }
}
