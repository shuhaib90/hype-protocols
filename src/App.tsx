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
import { MiningStatus, DifficultyBand, WorkerInfo, SupplyInfo, MiningProof, MintReceipt, ProtocolConfig } from './types';
import { useWallet, ADMIN_WALLET, OWNER_WALLET, CONTRACT_ADDRESS, RPC_URL } from './web3/WalletContext';
import { ethers } from 'ethers';

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
      mintFeeUsd: 5,
      mintFeeEth: 0.0020,
      mintFeeApe: 5,
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
        mintFeeUsd: 7,
        mintFeeEth: 0.0028,
        mintFeeApe: 7,
      }
    }
  });

  // Protocol Config
  const [config, setConfig] = useState<ProtocolConfig>({
    maxSupply: 10000,
    maxMintsPerWallet: 5,
    mintFeeHype: 5,
    mintFeeEth: 0.0020,
    mintFeeUsd: 5,
    workerCosts: { 1: 0, 2: 100, 3: 200, 4: 300, 5: 500 },
    sessionDurationSeconds: 600,
    adminWallet: ADMIN_WALLET,
    royaltyBasisPoints: 500,
  });

  // 5-Worker Setup
  const [workers, setWorkers] = useState<WorkerInfo[]>(() => {
    const ranges = getAllWorkerRanges();
    return [
      { id: 1, name: 'Miner 01', status: 'ACTIVE', hashrate: 0, costHype: 0, nonceRange: ranges[1], isFree: true },
      { id: 2, name: 'Miner 02', status: 'LOCKED', hashrate: 0, costHype: 100, nonceRange: ranges[2], isFree: false },
      { id: 3, name: 'Miner 03', status: 'LOCKED', hashrate: 0, costHype: 200, nonceRange: ranges[3], isFree: false },
      { id: 4, name: 'Miner 04', status: 'LOCKED', hashrate: 0, costHype: 300, nonceRange: ranges[4], isFree: false },
      { id: 5, name: 'Miner 05', status: 'LOCKED', hashrate: 0, costHype: 500, nonceRange: ranges[5], isFree: false },
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
          'function workerActivationCost(uint256) view returns (uint256)'
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

      setSupply((prev) => ({
        ...prev,
        totalMined: onChainMined,
        remaining: Math.max(0, 10000 - onChainMined),
        percentMined: Number(((onChainMined / 10000) * 100).toFixed(2)),
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

      // If user address is provided, sync worker entitlements from contract
      if (userAddr) {
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
            status: workerChecks[idx] ? 'ACTIVE' : 'LOCKED'
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
      const res = await fetch('/api/mining/wallet-status?wallet=' + encodeURIComponent(addr));
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWalletMints(data.walletMints);
          setWalletQuotaCapped(data.isCapped);
          if (data.currentTier) {
            setWalletDifficultyLabel(data.currentTier.label);
            if (data.currentTier.target && !data.isCapped) {
              setWalletTargetHex(data.currentTier.target);
            }
          }
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
      setWalletMints(0);
      setWalletQuotaCapped(false);
      setWalletDifficultyLabel('HARD (NFT 1/5)');
      setWalletTargetHex('0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      syncOnChainState();
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
      },
    });

    return () => {
      if (miningEngineRef.current) {
        miningEngineRef.current.stop();
      }
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

  const handleMintRecord = (rec: SolvedRecord) => {
    if (rec.status === 'MINTED') return;
    setLatestProof({
      nonce: rec.nonce,
      hash: rec.solvedHash,
      challenge: '0xb46af2c33fa24c1c27670e585a72800097d9a812bd959955973687b70334a26a',
      wallet: rec.wallet,
      difficulty: rec.difficulty || 4,
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
            onUpdateConfig={setConfig}
            totalMined={supply.totalMined}
            maxSupply={supply.maxSupply}
            onBack={() => setActiveTab('mining')}
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
