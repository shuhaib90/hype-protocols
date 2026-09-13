import { NonceRange } from '../types';

/**
 * Nonce Partitioning System for HypeVM 5-Worker System
 * Partitions the 64-bit integer nonce space into 5 distinct, non-overlapping segments.
 * Each worker exclusively searches its assigned segment to maximize total aggregate throughput
 * and prevent redundant duplicate computation.
 */

const SEGMENT_SIZE = 4294967296n; // 2^32 (4.29 billion nonces per worker segment)

export function getWorkerNonceRange(workerId: number): NonceRange {
  if (workerId < 1 || workerId > 5) {
    throw new Error(`Invalid worker ID: ${workerId}. Must be between 1 and 5.`);
  }

  const index = BigInt(workerId - 1);
  const start = index * SEGMENT_SIZE;
  const end = start + SEGMENT_SIZE - 1n;

  const startFormatted = `0x${start.toString(16).padStart(10, '0')}`;
  const endFormatted = `0x${end.toString(16).padStart(10, '0')}`;

  return {
    start,
    end,
    formatted: `${startFormatted} … ${endFormatted}`,
  };
}

export function getAllWorkerRanges(): Record<number, NonceRange> {
  const ranges: Record<number, NonceRange> = {};
  for (let i = 1; i <= 5; i++) {
    ranges[i] = getWorkerNonceRange(i);
  }
  return ranges;
}
