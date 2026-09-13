import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { WebGPUNotice } from './components/WebGPUNotice';
import { SupplyModule } from './components/SupplyModule';
import { MiningDashboard } from './components/MiningDashboard';
import { WorkerPanel } from './components/WorkerPanel';
import { SuccessModal } from './components/SuccessModal';
import { MintSuccessModal } from './components/MintSuccessModal';
import { MiningLedger, SolvedRecord } from './components/MiningLedger';
import { AdminModal } from './components/AdminModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CollectionShowcase } from './components/CollectionShowcase';
import { DocsContent } from './docs/DocsContent';
import { WebGPUMiningEngine, GPUInfo } from './mining/WebGPUEngine';
import { getAllWorkerRanges } from './mining/NoncePartition';
import { MiningStatus, DifficultyBand, WorkerInfo, SupplyInfo, MiningProof, MintReceipt, ProtocolConfig, EpochInfo } from './types';
import { useWallet, ADMIN_WALLET, OWNER_WALLET, CONTRACT_ADDRESS, RPC_URL } from './web3/WalletContext';
import { ethers } from 'ethers';
import { soundEffects } from './utils/soundEffects';

export const App: React.FC = () => {
  const { isConnected, address, activateWorkerOnChain } = useWallet();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'mining' | 'docs' | 'admin'>('mining');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Hardware detection
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);

  // Mining state
  const [miningStatus, setMiningStatus] = useState<MiningStatus>('READY');
  const [isMining, setIsMining] = useState(false);
  const [totalHashrate, setTotalHashrate] = useState(0);
  const [workerHashrates, setWorkerHashrates] = useState<Record<number, number>>({});
  const [noncesScanned, setNoncesScanned] = useState(0);
  const [currentHash, setCurrentHash] = useState('');
  const [currentNonce, setCurrentNonce] = useState('');

  // Modals & Receipts
  const [latestProof, setLatestProof] = useState<MiningProof | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<MintReceipt | null>(null);
  const [ledgerRefresh, setLedgerRefresh] = useState(0);

  // Per-Wallet Quota & Sequential Difficulty State
  const [walletMints, setWalletMints] = useState(0);
  const [walletQuotaCapped, setWalletQuotaCapped] = useState(false);
  const [walletDifficultyLabel, setWalletDifficultyLabel] = useState('HARD (NFT 1/5)');
  const [walletTargetHex, setWalletTargetHex] = useState('0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

  // Authoritative Protocol Supply
  const [supply, setSupply] = useState<SupplyInfo>({
    totalMined: 0,
    maxSupply: 10000,
    remaining: 10000,
    difficultyBand: 'HARD',
    currentTargetHex: '0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    percentMined: 0.0,
    walletCap: 5,
    currentEpoch: {
      id: 1,
      name: 'EPOCH 1 (GENESIS)',
      startToken: 1,
      endToken: 10,
      count: 10,
      mintFeeUsd: 1,
      mintFeeEth: 0.0004,
      mintFeeApe: 1,
      difficulty: 'HARD',
      target: '0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      nextToken: 1,
      minedInEpoch: 0,
      remainingInEpoch: 10,
      percentInEpoch: 0.0,
      nextEpoch: {
        id: 2,
        name: 'EPOCH 2 (ASCENSION)',
        startToken: 11,
        endToken: 30,
        mintFeeUsd: 6,
        mintFeeEth: 0.0024,
        mintFeeApe: 6,
      }
    }
  });

  // Protocol Config
  const [config, setConfig] = useState<ProtocolConfig>({
    maxSupply: 10000,
    maxMintsPerWallet: 5,
    mintFeeHype: 1,
    mintFeeEth: 0.0004,
    mintFeeUsd: 1,
    workerCosts: { 1: 0, 2: 1986377, 3: 3964875, 4: 5279520, 5: 6590698 },
    sessionDurationSeconds: 600,
    adminWallet: ADMIN_WALLET,
    royaltyBasisPoints: 500,
  });

  // 5-Worker Setup (Pre-configured with on-chain blade costs)
  const [workers, setWorkers] = useState<WorkerInfo[]>(() => {
    const ranges = getAllWorkerRanges();
    return [
      { id: 1, name: 'Miner 01', status: 'ACTIVE', hashrate: 0, costHype: 0, nonceRange: ranges[1], isFree: true },
      { id: 2, name: 'Miner 02', status: 'LOCKED', hashrate: 0, costHype: 1986377, nonceRange: ranges[2], isFree: false },
      { id: 3, name: 'Miner 03', status: 'LOCKED', hashrate: 0, costHype: 3964875, nonceRange: ranges[3], isFree: false },
      { id: 4, name: 'Miner 04', status: 'LOCKED', hashrate: 0, costHype: 5279520, nonceRange: ranges[4], isFree: false },
      { id: 5, name: 'Miner 05', status: 'LOCKED', hashrate: 0, costHype: 6590698, nonceRange: ranges[5], isFree: false },
    ];
  });

  const miningEngineRef = useRef<WebGPUMiningEngine | null>(null);

  // Sync Live On-Chain State from Smart Contract
  const syncOnChainState = useCallback(async (userAddr?: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          'function totalMined() view returns (uint256)',
          'function currentChallenge() view returns (bytes32)',
          'function getEpoch(uint256 tokenId) view returns (tuple(uint256 id, uint256 startToken, uint256 endToken, uint256 mintFeeWei, uint256 feeUsd, uint256 target, string name))',
          'function isWorkerActive(address user, uint8 workerIndex) view returns (bool)',
          'function workerActivationCost(uint256) view returns (uint256)',
          'function walletMints(address user) view returns (uint256)',
          'function balanceOf(address owner) view returns (uint256)'
        ],
        provider
      );

      const onChainMinedBig = await contract.totalMined();
      const onChainMined = Number(onChainMinedBig);
      const nextTokenId = onChainMined + 1;
      const onChainEpoch = await contract.getEpoch(nextTokenId <= 10000 ? nextTokenId : 10000);

      const feeEth = Number(parseFloat(ethers.formatEther(onChainEpoch.mintFeeWei)).toFixed(4));
      const feeUsd = Number(onChainEpoch.feeUsd);

      const epochId = Number(onChainEpoch.id);
      const epochStart = Number(onChainEpoch.startToken);
      const epochEnd = Number(onChainEpoch.endToken);
      const epochCount = Math.max(1, epochEnd - epochStart + 1);
      const minedInEpoch = Math.max(0, onChainMined - (epochStart - 1));
      const remainingInEpoch = Math.max(0, epochEnd - onChainMined);
      const percentInEpoch = Number(((minedInEpoch / epochCount) * 100).toFixed(1));
      const targetHex = '0x' + BigInt(onChainEpoch.target).toString(16).padStart(64, '0');

      // Query on-chain worker activation costs (Workers 2 to 5)
      let w2Cost = 1986377, w3Cost = 3964875, w4Cost = 5279520, w5Cost = 6590698;
      try {
        const [c2, c3, c4, c5] = await Promise.all([
          contract.workerActivationCost(2),
          contract.workerActivationCost(3),
          contract.workerActivationCost(4),
          contract.workerActivationCost(5),
        ]);
        if (c2 !== undefined && c2 > 0n) w2Cost = Number(ethers.formatEther(c2));
        if (c3 !== undefined && c3 > 0n) w3Cost = Number(ethers.formatEther(c3));
        if (c4 !== undefined && c4 > 0n) w4Cost = Number(ethers.formatEther(c4));
        if (c5 !== undefined && c5 > 0n) w5Cost = Number(ethers.formatEther(c5));
      } catch (we) {
        console.warn('Could not query on-chain worker activation costs:', we);
      }

      // Query on-chain epoch fees for all 10 stages
      const DEFAULT_EPOCH_STARTS = [1, 11, 31, 71, 151, 301, 601, 1201, 2501, 5001];
      const onChainEpochs: EpochInfo[] = [];
      for (const start of DEFAULT_EPOCH_STARTS) {
        try {
          const epData = await contract.getEpoch(start);
          const epId = Number(epData.id);
          const epFeeUsd = Number(epData.feeUsd);
          const epFeeEth = Number(parseFloat(ethers.formatEther(epData.mintFeeWei)).toFixed(4));
          onChainEpochs.push({
            id: epId,
            name: epData.name,
            startToken: Number(epData.startToken),
            endToken: Number(epData.endToken),
            count: Number(epData.endToken) - Number(epData.startToken) + 1,
            mintFeeUsd: epFeeUsd,
            mintFeeEth: epFeeEth,
            mintFeeApe: epFeeUsd,
            difficulty: epId === 1 ? 'HARD' : epId === 2 ? 'HARDER' : epId <= 4 ? 'VERY HARD' : 'EXTREME',
            target: '0x' + BigInt(epData.target).toString(16).padStart(64, '0'),
          });
        } catch (_) {}
      }

      setSupply((prev) => ({
        ...prev,
        totalMined: onChainMined,
        remaining: Math.max(0, 10000 - onChainMined),
        percentMined: Number(((onChainMined / 10000) * 100).toFixed(2)),
        epochs: onChainEpochs.length === 10 ? onChainEpochs : prev.epochs,
        currentEpoch: {
          id: epochId,
          name: onChainEpoch.name,
          startToken: epochStart,
          endToken: epochEnd,
          count: epochCount,
          mintFeeUsd: feeUsd,
          mintFeeEth: feeEth,
          mintFeeApe: feeUsd,
          difficulty: 'HARD',
          target: targetHex,
          nextToken: nextTokenId,
          minedInEpoch,
          remainingInEpoch,
          percentInEpoch,
        }
      }));

      setConfig((prev) => ({
        ...prev,
        mintFeeUsd: feeUsd,
        mintFeeEth: feeEth,
        mintFeeHype: feeUsd,
        workerCosts: { 1: 0, 2: w2Cost, 3: w3Cost, 4: w4Cost, 5: w5Cost },
        currentEpoch: {
          ...prev.currentEpoch,
          id: epochId,
          mintFeeUsd: feeUsd,
          mintFeeEth: feeEth,
        },
        epochs: onChainEpochs.length === 10 ? onChainEpochs : prev.epochs,
      }));

      const costMap: Record<number, number> = { 1: 0, 2: w2Cost, 3: w3Cost, 4: w4Cost, 5: w5Cost };

      // If user address is provided, sync on-chain wallet mint count & worker entitlements
      if (userAddr) {
        let onChainWalletMints = 0;
        let onChainBal = 0;
        try {
          const [mintsBig, balBig] = await Promise.all([
            contract.walletMints(userAddr),
            contract.balanceOf(userAddr)
          ]);
          onChainWalletMints = Number(mintsBig);
          onChainBal = Number(balBig);
        } catch (me) {
          console.warn('Could not query on-chain mint count:', me);
        }

        let localMintCount = 0;
        try {
          const stored = localStorage.getItem(`hashape_records_${userAddr.toLowerCase()}`);
          if (stored) {
            const records = JSON.parse(stored);
            if (Array.isArray(records)) {
              localMintCount = records.filter((r: any) => r.status === 'MINTED').length;
            }
          }
        } catch (_) {}

        if (userAddr.toLowerCase() === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c' && onChainWalletMints === 0) {
          onChainWalletMints = 1;
        }

        const effectiveMints = Math.max(onChainWalletMints, onChainBal, localMintCount);
        if (effectiveMints > 0) {
          setWalletMints(effectiveMints);
          setWalletQuotaCapped(effectiveMints >= 5);
          const TIERS = [
            { tier: 1, label: 'HARD (NFT 1/5)', target: '0x' + '00000f'.padEnd(64, 'f') },
            { tier: 2, label: 'HARDER (NFT 2/5)', target: '0x' + '000007'.padEnd(64, 'f') },
            { tier: 3, label: 'VERY HARD (NFT 3/5)', target: '0x' + '000003'.padEnd(64, 'f') },
            { tier: 4, label: 'EXTREME (NFT 4/5)', target: '0x' + '000001'.padEnd(64, 'f') },
            { tier: 5, label: 'LEGENDARY (NFT 5/5)', target: '0x' + '000000f'.padEnd(64, 'f') },
          ];
          if (effectiveMints >= 5) {
            setWalletDifficultyLabel('MAX QUOTA REACHED (5/5)');
            setWalletTargetHex('0x0000000000000000000000000000000000000000000000000000000000000000');
          } else {
            setWalletDifficultyLabel(TIERS[effectiveMints].label);
            setWalletTargetHex(TIERS[effectiveMints].target);
          }
        }

        const workerChecks = await Promise.all([
          contract.isWorkerActive(userAddr, 1),
          contract.isWorkerActive(userAddr, 2),
          contract.isWorkerActive(userAddr, 3),
          contract.isWorkerActive(userAddr, 4),
          contract.isWorkerActive(userAddr, 5),
        ]);

        setWorkers((prev) =>
          prev.map((w, idx) => ({
            ...w,
            costHype: costMap[w.id] !== undefined ? costMap[w.id] : w.costHype,
            status: workerChecks[idx] ? 'ACTIVE' : 'LOCKED'
          }))
        );
      } else {
        setWorkers((prev) =>
          prev.map((w) => ({
            ...w,
            costHype: costMap[w.id] !== undefined ? costMap[w.id] : w.costHype,
          }))
        );
      }
    } catch (err) {
      console.warn('Could not sync on-chain state:', err);
    }
  }, []);

  // Fetch wallet status and escalating tier from backend
  const fetchWalletStatus = async (addr: string) => {
    if (!addr) return;
    try {
      let localMints = 0;
      try {
        const stored = localStorage.getItem(`hashape_records_${addr.toLowerCase()}`);
        if (stored) {
          const recs = JSON.parse(stored);
          if (Array.isArray(recs)) {
            localMints = recs.filter((r: any) => r.status === 'MINTED').length;
          }
        }
      } catch (_) {}

      if (addr.toLowerCase() === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c') {
        localMints = Math.max(localMints, 1);
      }

      const res = await fetch('/api/mining/wallet-status?wallet=' + encodeURIComponent(addr));
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const resolvedMints = Math.max(data.walletMints || 0, localMints);
          setWalletMints(resolvedMints);
          setWalletQuotaCapped(resolvedMints >= 5);
          const TIERS = [
            { tier: 1, label: 'HARD (NFT 1/5)', target: '0x' + '00000f'.padEnd(64, 'f') },
            { tier: 2, label: 'HARDER (NFT 2/5)', target: '0x' + '000007'.padEnd(64, 'f') },
            { tier: 3, label: 'VERY HARD (NFT 3/5)', target: '0x' + '000003'.padEnd(64, 'f') },
            { tier: 4, label: 'EXTREME (NFT 4/5)', target: '0x' + '000001'.padEnd(64, 'f') },
            { tier: 5, label: 'LEGENDARY (NFT 5/5)', target: '0x' + '000000f'.padEnd(64, 'f') },
          ];
          if (resolvedMints >= 5) {
            setWalletDifficultyLabel('MAX QUOTA REACHED (5/5)');
            setWalletTargetHex('0x0000000000000000000000000000000000000000000000000000000000000000');
          } else if (resolvedMints > 0) {
            setWalletDifficultyLabel(TIERS[resolvedMints].label);
            setWalletTargetHex(TIERS[resolvedMints].target);
          } else if (data.currentTier) {
            setWalletDifficultyLabel(data.currentTier.label);
            if (data.currentTier.target && !data.isCapped) {
              setWalletTargetHex(data.currentTier.target);
            }
          }
        }
      } else if (localMints > 0) {
        setWalletMints(localMints);
        setWalletQuotaCapped(localMints >= 5);
        const TIERS = [
          { tier: 1, label: 'HARD (NFT 1/5)', target: '0x' + '00000f'.padEnd(64, 'f') },
          { tier: 2, label: 'HARDER (NFT 2/5)', target: '0x' + '000007'.padEnd(64, 'f') },
          { tier: 3, label: 'VERY HARD (NFT 3/5)', target: '0x' + '000003'.padEnd(64, 'f') },
          { tier: 4, label: 'EXTREME (NFT 4/5)', target: '0x' + '000001'.padEnd(64, 'f') },
          { tier: 5, label: 'LEGENDARY (NFT 5/5)', target: '0x' + '000000f'.padEnd(64, 'f') },
        ];
        if (localMints >= 5) {
          setWalletDifficultyLabel('MAX QUOTA REACHED (5/5)');
        } else {
          setWalletDifficultyLabel(TIERS[localMints].label);
          setWalletTargetHex(TIERS[localMints].target);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch wallet status:', e);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchWalletStatus(address);
      syncOnChainState(address);
    } else {
      const lastWallet = typeof window !== 'undefined' ? localStorage.getItem('hashape_last_wallet') : null;
      if (lastWallet) {
        fetchWalletStatus(lastWallet);
        syncOnChainState(lastWallet);
      } else {
        setWalletMints(0);
        setWalletQuotaCapped(false);
        setWalletDifficultyLabel('HARD (NFT 1/5)');
        setWalletTargetHex('0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        syncOnChainState();
      }
    }
  }, [isConnected, address, ledgerRefresh, syncOnChainState]);

  // Initialize WebGPU detection & backend fetch on mount
  useEffect(() => {
    WebGPUMiningEngine.detectGPU().then(setGpuInfo);
    syncOnChainState();

    // Fetch live supply and config from backend if available
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.config) {
          setConfig(data.config);
          if (data.config.workerCosts) {
            setWorkers(prev => prev.map(w => ({
              ...w,
              costHype: data.config.workerCosts[w.id] !== undefined ? data.config.workerCosts[w.id] : w.costHype,
            })));
          }
        }
      })
      .catch(() => {});

    fetch('/api/mining/supply')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.supply) {
          setSupply(prev => ({
            ...prev,
            ...data.supply,
            totalMined: prev.totalMined || data.supply.totalMined,
          }));
        }
      })
      .catch(() => {});
  }, [syncOnChainState]);

  // Initialize Mining Engine
  useEffect(() => {
    miningEngineRef.current = new WebGPUMiningEngine({
      onHashrateUpdate: (total, perWorker) => {
        setTotalHashrate(total);
        setWorkerHashrates(perWorker);
      },
      onNonceProgress: (count, hash, nonce) => {
        setNoncesScanned(count);
        setCurrentHash(hash);
        setCurrentNonce(nonce);
      },
      onSolutionFound: (proof) => {
        setIsMining(false);
        setMiningStatus('SUCCESS');
        setLatestProof(proof);

        // Save immediately to client localStorage so data is NEVER lost on page refresh
        if (proof.wallet) {
          try {
            const storageKey = `hashape_records_${proof.wallet.toLowerCase()}`;
            const local = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newRecord = {
              id: 'solv_' + Date.now(),
              wallet: proof.wallet.toLowerCase(),
              tokenId: supply.totalMined + 1,
              nonce: String(proof.nonce),
              solvedHash: proof.hash,
              difficulty: 4,
              gpuRenderer: gpuInfo?.name || 'WebGPU Compute Core',
              timeToSolve: proof.timeElapsedSeconds || 0,
              status: 'SOLVED',
              solvedAt: Date.now(),
              txHash: null,
            };
            if (!local.some((r: any) => String(r.nonce) === String(proof.nonce))) {
              local.unshift(newRecord);
              localStorage.setItem(storageKey, JSON.stringify(local));
            }
          } catch (e) {
            console.warn('LocalStorage save error:', e);
          }
        }

        // Record proof to backend
        fetch('/api/mining/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'solve',
            wallet: proof.wallet,
            tokenId: supply.totalMined + 1,
            nonce: proof.nonce,
            solvedHash: proof.hash,
            difficulty: 4,
            gpuRenderer: gpuInfo?.name || 'WebGPU Compute Core',
            timeToSolve: proof.timeElapsedSeconds || 0,
          }),
        }).then(() => setLedgerRefresh((prev) => prev + 1)).catch(() => {});
      },
      onError: (err) => {
        console.error('Mining engine error:', err);
        setIsMining(false);
        setMiningStatus('ERROR');
        soundEffects.stopGpuRunningSound();
      },
    });

    return () => {
      if (miningEngineRef.current) {
        miningEngineRef.current.stop();
      }
      soundEffects.stopGpuRunningSound();
    };
  }, [supply.totalMined, gpuInfo?.name]);

  const handleStartMining = async () => {
    if (!isConnected || !address) return;
    if (supply.totalMined >= supply.maxSupply) {
      setMiningStatus('SOLD OUT');
      return;
    }
    if (walletQuotaCapped) {
      setMiningStatus('QUOTA FULL');
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ['function currentChallenge() view returns (bytes32)'], provider);
      const onChainChallenge = await contract.currentChallenge();

      const sessionRes = await fetch('/api/mining/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address })
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.success) {
        if (sessionData.isCapped) {
          setWalletQuotaCapped(true);
          setMiningStatus('QUOTA FULL');
          return;
        }
      }

      const challenge = onChainChallenge || sessionData.session?.challenge || '0xb46af2c33fa24c1c27670e585a72800097d9a812bd959955973687b70334a26a';
      const targetHex = sessionData.session?.targetDifficulty || walletTargetHex;
      if (sessionData.session?.difficultyBand) {
        setWalletDifficultyLabel(sessionData.session.difficultyBand);
      }

      setIsMining(true);
      setMiningStatus('MINING');
      miningEngineRef.current?.start(
        challenge,
        address,
        targetHex,
        workers
      );
    } catch (err) {
      setIsMining(true);
      setMiningStatus('MINING');
      miningEngineRef.current?.start(
        '0xb46af2c33fa24c1c27670e585a72800097d9a812bd959955973687b70334a26a',
        address,
        walletTargetHex,
        workers
      );
    }
  };

  const handleStopMining = () => {
    setIsMining(false);
    setMiningStatus('READY');
    miningEngineRef.current?.stop();
    soundEffects.stopGpuRunningSound();
    setTotalHashrate(0);
    setWorkerHashrates({});
  };

  const handleActivateWorker = async (workerId: number, costHype: number) => {
    await activateWorkerOnChain(workerId, costHype);
    await syncOnChainState(address);

    // Sync to backend
    fetch('/api/workers/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: address, workerId }),
    }).catch(() => {});
  };

  const handleMintSuccess = async (tokenId: number, txHash: string) => {
    const solvedProof = latestProof;
    setLatestProof(null);
    setLatestReceipt({
      tokenId,
      txHash,
      owner: address,
      timestamp: Date.now(),
      proofDigest: solvedProof?.hash || '',
    });

    await syncOnChainState(address);

    // Immediately mark as MINTED in localStorage so client state is instantly persistent
    if (address) {
      try {
        const storageKey = `hashape_records_${address.toLowerCase()}`;
        const local = JSON.parse(localStorage.getItem(storageKey) || '[]');
        let updated = false;
        for (const item of local) {
          if (
            (solvedProof?.nonce && String(item.nonce) === String(solvedProof.nonce)) ||
            Number(item.tokenId) === Number(tokenId) ||
            (!updated && item.status === 'SOLVED')
          ) {
            item.status = 'MINTED';
            item.tokenId = tokenId;
            item.txHash = txHash;
            item.mintedAt = Date.now();
            updated = true;
          }
        }
        if (!updated) {
          local.unshift({
            id: 'mint_' + Date.now(),
            wallet: address.toLowerCase(),
            tokenId,
            nonce: solvedProof?.nonce || '0',
            status: 'MINTED',
            txHash,
            mintedAt: Date.now(),
          });
        }
        localStorage.setItem(storageKey, JSON.stringify(local));
      } catch (e) {
        console.warn('LocalStorage update error:', e);
      }
    }

    // Record mint on backend
    fetch('/api/mining/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mint',
        wallet: address,
        tokenId,
        txHash,
        nonce: solvedProof?.nonce,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setLedgerRefresh((prev) => prev + 1);
        if (address) fetchWalletStatus(address);
      })
      .catch(() => {});
  };

  const handleUpdateConfig = (newConfig: ProtocolConfig) => {
    setConfig(newConfig);
    if (newConfig.workerCosts) {
      setWorkers(prev => prev.map(w => ({
        ...w,
        costHype: newConfig.workerCosts[w.id] !== undefined ? newConfig.workerCosts[w.id] : w.costHype
      })));
    }
    if (newConfig.epochs && newConfig.epochs.length > 0) {
      setSupply(prev => ({
        ...prev,
        epochs: newConfig.epochs,
        currentEpoch: newConfig.currentEpoch || prev.currentEpoch
      }));
    }
  };

  const handleMintRecord = (rec: SolvedRecord) => {
    if (rec.status === 'MINTED') return;
    setLatestProof({
      proofId: rec.id || 'proof_' + Date.now(),
      sessionId: 'sess_manual',
      nonce: rec.nonce,
      hash: rec.solvedHash,
      challenge: '0xb46af2c33fa24c1c27670e585a72800097d9a812bd959955973687b70334a26a',
      wallet: rec.wallet,
      difficulty: String(rec.difficulty || 4),
      timeElapsedSeconds: rec.timeToSolve || 12,
      workersUsed: 1,
      averageHashrate: 12.5,
      timestamp: rec.solvedAt || Date.now(),
      workerId: 1,
    });
  };

  return (
    <div className="min-h-screen bg-[#f5ebd7] text-[#24140a] flex flex-col selection:bg-[#d83a2a] selection:text-white paper-dot-bg">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdmin={() => setIsAdminOpen(true)}
        totalMined={supply.totalMined}
        maxSupply={supply.maxSupply}
        currentEpochId={supply.currentEpoch?.id || 1}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {activeTab === 'admin' ? (
          <AdminDashboard
            config={config}
            onUpdateConfig={handleUpdateConfig}
            totalMined={supply.totalMined}
            maxSupply={supply.maxSupply}
            onBack={() => {
              setActiveTab('mining');
              syncOnChainState(address);
            }}
            onRefreshState={() => syncOnChainState(address)}
          />
        ) : activeTab === 'mining' ? (
          <div>
            {/* Hero Section */}
            <Hero
              onStartMining={handleStartMining}
              isMining={isMining}
              totalMined={supply.totalMined}
              currentEpochFeeUsd={supply.currentEpoch?.mintFeeUsd || 5}
              currentEpochId={supply.currentEpoch?.id || 1}
            />

            {/* Collection Showcase: Deterministic On-Chain Generation */}
            <CollectionShowcase />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
              {/* WebGPU Hardware Status Banner */}
              <WebGPUNotice gpuInfo={gpuInfo} />

              {/* Main Full-Width Cyber Mining Terminal */}
              <MiningDashboard
                status={walletQuotaCapped ? 'QUOTA FULL' : miningStatus}
                gpuInfo={gpuInfo}
                totalHashrate={totalHashrate}
                activeWorkerCount={workers.filter((w) => w.status === 'ACTIVE').length}
                difficultyBand={walletDifficultyLabel}
                noncesScanned={noncesScanned}
                currentHash={currentHash}
                currentNonce={currentNonce}
                isMining={isMining}
                walletMints={walletMints}
                maxMints={5}
                isCapped={walletQuotaCapped}
                currentEpoch={supply.currentEpoch}
                onStart={handleStartMining}
                onStop={handleStopMining}
              />

              {/* 5-Worker Cluster Management Panel */}
              <WorkerPanel
                workers={workers}
                onActivateWorker={handleActivateWorker}
                isMining={isMining}
                workerHashrates={workerHashrates}
              />

              {/* Collection Supply & 10-Epoch Roadmap Module */}
              <SupplyModule supply={supply} />

              {/* Solved Proofs & Mint History Ledger */}
              <MiningLedger
                onMintRecord={handleMintRecord}
                refreshTrigger={ledgerRefresh}
              />
            </div>
          </div>
        ) : (
          /* Technical Documentation Site */
          <DocsContent />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-[#24140a] bg-[#eee2ca] py-8 font-dot">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5c4636]">
          <div className="flex items-center space-x-3">
            <span className="text-[#24140a] font-jersey text-xl tracking-wider uppercase">HASHAPE</span>
            <span className="font-bold">© 2026 // WebGPU Proof-of-Work Protocol</span>
          </div>
          <div className="flex items-center space-x-4 flex-wrap text-[11px] font-bold">
            <span className="text-[#d83a2a] bg-[#f5ebd7] px-2 py-0.5 border border-[#24140a]">10,000 HARD CAP</span>
            <span className="text-[#24140a]">▪</span>
            <span className="text-[#19638b] bg-[#f5ebd7] px-2 py-0.5 border border-[#24140a]">10 ESCALATING EPOCHS</span>
            <span className="text-[#24140a]">▪</span>
            <span className="text-[#24140a] bg-[#f5ebd7] px-2 py-0.5 border border-[#24140a]">Robinhood EVM L2 (Native ETH)</span>
            <span className="text-[#24140a]">▪</span>
            <span className="text-[#9c6208] bg-[#f5ebd7] px-2 py-0.5 border border-[#24140a]">5.0% CREATOR ROYALTY</span>
          </div>
        </div>
      </footer>

      {/* Mining Complete Modal */}
      <SuccessModal
        proof={latestProof}
        mintFeeHype={config.mintFeeHype}
        currentEpoch={supply.currentEpoch}
        targetTokenId={supply.totalMined + 1}
        gpuName={gpuInfo?.name}
        onClose={() => setLatestProof(null)}
        onMintSuccess={handleMintSuccess}
      />

      {/* Mint Success Receipt Modal */}
      <MintSuccessModal
        receipt={latestReceipt}
        onClose={() => setLatestReceipt(null)}
      />

      {/* Admin Configuration Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        config={config}
        onUpdateConfig={setConfig}
        totalMined={supply.totalMined}
        maxSupply={supply.maxSupply}
      />
    </div>
  );
};
