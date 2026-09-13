export type DifficultyBand =
  | 'EASY'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY HARD'
  | 'EXTREME'
  | 'MAXIMUM'
  | 'HARD (NFT 1/5)'
  | 'HARDER (NFT 2/5)'
  | 'VERY HARD (NFT 3/5)'
  | 'EXTREME (NFT 4/5)'
  | 'LEGENDARY (NFT 5/5)'
  | 'MAX QUOTA REACHED (5/5)'
  | string;

export type MiningStatus = 'READY' | 'MINING' | 'SUCCESS' | 'EXPIRED' | 'SOLD OUT' | 'ERROR' | 'QUOTA FULL';

export interface WalletDifficultyTier {
  tier: number;
  label: string;
  target: string;
  estHashes: string;
  isCapped?: boolean;
}

export interface WalletQuotaInfo {
  walletMints: number;
  maxMints: number;
  remainingQuota: number;
  isCapped: boolean;
  currentTier: WalletDifficultyTier;
}

export interface NonceRange {
  start: bigint;
  end: bigint;
  formatted: string;
}

export interface WorkerInfo {
  id: number; // 1 to 5
  name: string;
  status: 'LOCKED' | 'AVAILABLE' | 'ACTIVATING' | 'ACTIVE' | 'STOPPED' | 'FOUND PROOF';
  hashrate: number; // in MH/s
  costHype: number; // 0 for Worker 1, 100/200/300/500 for Workers 2-5
  nonceRange: NonceRange;
  isFree: boolean;
}

export interface MiningSession {
  sessionId: string;
  challenge: string;
  wallet: string;
  targetDifficulty: string; // hex string
  difficultyBand: DifficultyBand;
  startTime: number;
  expiresAt: number;
  workerRanges: Record<number, { start: string; end: string; formatted: string }>;
  walletMints?: number;
  maxMints?: number;
}

export interface MiningProof {
  proofId: string;
  sessionId: string;
  wallet: string;
  challenge: string;
  nonce: string;
  hash: string;
  difficulty: string;
  timeElapsedSeconds: number;
  workersUsed: number;
  averageHashrate: number;
  timestamp: number;
}

export interface EpochInfo {
  id: number;
  name: string;
  startToken: number;
  endToken: number;
  count: number;
  mintFeeUsd: number;
  mintFeeEth: number;
  mintFeeApe: number;
  difficulty: string;
  target: string;
  nextToken?: number;
  minedInEpoch?: number;
  remainingInEpoch?: number;
  percentInEpoch?: number;
  nextEpoch?: {
    id: number;
    name: string;
    startToken: number;
    endToken: number;
    mintFeeUsd: number;
    mintFeeEth: number;
    mintFeeApe: number;
  } | null;
}

export interface SupplyInfo {
  totalMined: number;
  maxSupply: number;
  remaining: number;
  difficultyBand: DifficultyBand;
  currentTargetHex: string;
  percentMined: number;
  walletCap?: number;
  escalatingTiers?: WalletDifficultyTier[];
  currentEpoch?: EpochInfo;
  epochs?: EpochInfo[];
}

export interface MintReceipt {
  tokenId: number;
  txHash: string;
  owner: string;
  timestamp: number;
  proofDigest: string;
  epochId?: number;
  feeUsd?: number;
  feeEth?: number;
}

export interface ProtocolConfig {
  maxSupply: number;
  maxMintsPerWallet?: number;
  mintFeeHype: number;
  mintFeeEth?: number;
  mintFeeUsd?: number;
  currentEpoch?: EpochInfo;
  epochs?: EpochInfo[];
  workerCosts: Record<number, number>;
  sessionDurationSeconds: number;
  adminWallet: string;
  royaltyBasisPoints: number;
  difficultyTiers?: WalletDifficultyTier[];
  activationTokenContract?: string;
}
