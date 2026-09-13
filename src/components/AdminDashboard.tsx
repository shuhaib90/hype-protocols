import React, { useState, useEffect, useCallback } from 'react';
import { ProtocolConfig } from '../types';
import {
  useWallet,
  CONTRACT_ADDRESS,
  RIG_ACTIVATION_TOKEN_ADDRESS,
  RPC_URL,
  EXPLORER_URL
} from '../web3/WalletContext';
import { ethers } from 'ethers';
import {
  Shield, Check, AlertCircle, ArrowLeft, RefreshCw,
  Coins, Wrench, Flame, Zap, Database, Lock, CheckCircle2,
  ExternalLink, Layers, Loader2
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface TreasuryData {
  adminWallet: string;
  activationTokenContract: string;
  network: string;
  mintFees: {
    totalCollectedEth: number;
    claimedEth: number;
    claimableEth: number;
    mintedCount: number;
    currency: string;
  };
  rigFees: {
    totalCollectedHashApe: number;
    claimedHashApe: number;
    claimableHashApe: number;
    activatedRigCount: number;
    currency: string;
  };
  claims: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    tokenContract?: string;
    network: string;
    recipient: string;
    txHash: string;
    timestamp: number;
  }>;
}

interface AdminDashboardProps {
  config: ProtocolConfig;
  onUpdateConfig: (newConfig: ProtocolConfig) => void;
  totalMined?: number;
  maxSupply?: number;
  onBack: () => void;
  onRefreshState?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  onUpdateConfig,
  totalMined = 0,
  maxSupply = 10000,
  onBack,
  onRefreshState,
}) => {
  const {
    address,
    isAdmin,
    setEpochMintFeesBatchOnChain,
    setEpochMintFeeOnChain,
    setWorkerActivationCostOnChain,
    claimNativeMintFeesOnChain,
    claimTokenActivationFeesOnChain,
  } = useWallet();

  const adminAddress = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';

  // Treasury State
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [loadingTreasury, setLoadingTreasury] = useState(false);
  const [claimingMintFees, setClaimingMintFees] = useState(false);
  const [claimingRigFees, setClaimingRigFees] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);
  const [claimErrorMessage, setClaimErrorMessage] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Epoch Fees State
  const DEFAULT_10_EPOCHS = [
    { id: 1, name: 'EPOCH 1 (GENESIS)', startToken: 1, endToken: 10, count: 10, mintFeeUsd: 1, mintFeeEth: 0.0004, mintFeeApe: 1, difficulty: 'HARD', target: '0x' + '0003'.padEnd(64, 'f') },
    { id: 2, name: 'EPOCH 2 (ASCENSION)', startToken: 11, endToken: 30, count: 20, mintFeeUsd: 6, mintFeeEth: 0.0024, mintFeeApe: 6, difficulty: 'HARDER', target: '0x' + '0001'.padEnd(64, 'f') },
    { id: 3, name: 'EPOCH 3 (EXPANSION)', startToken: 31, endToken: 70, count: 40, mintFeeUsd: 20, mintFeeEth: 0.0080, mintFeeApe: 20, difficulty: 'VERY HARD', target: '0x' + '0000ff'.padEnd(64, 'f') },
    { id: 4, name: 'EPOCH 4 (SURGE)', startToken: 71, endToken: 150, count: 80, mintFeeUsd: 40, mintFeeEth: 0.0160, mintFeeApe: 40, difficulty: 'VERY HARD+', target: '0x' + '00007f'.padEnd(64, 'f') },
    { id: 5, name: 'EPOCH 5 (NEXUS)', startToken: 151, endToken: 300, count: 150, mintFeeUsd: 60, mintFeeEth: 0.0240, mintFeeApe: 60, difficulty: 'EXTREME', target: '0x' + '00003f'.padEnd(64, 'f') },
    { id: 6, name: 'EPOCH 6 (APEX)', startToken: 301, endToken: 600, count: 300, mintFeeUsd: 88, mintFeeEth: 0.0352, mintFeeApe: 88, difficulty: 'EXTREME+', target: '0x' + '00001f'.padEnd(64, 'f') },
    { id: 7, name: 'EPOCH 7 (SOVEREIGN)', startToken: 601, endToken: 1200, count: 600, mintFeeUsd: 120, mintFeeEth: 0.0480, mintFeeApe: 120, difficulty: 'LEGENDARY', target: '0x' + '00000f'.padEnd(64, 'f') },
    { id: 8, name: 'EPOCH 8 (TITAN)', startToken: 1201, endToken: 2500, count: 1300, mintFeeUsd: 160, mintFeeEth: 0.0640, mintFeeApe: 160, difficulty: 'LEGENDARY+', target: '0x' + '000007'.padEnd(64, 'f') },
    { id: 9, name: 'EPOCH 9 (MYTHIC)', startToken: 2501, endToken: 5000, count: 2500, mintFeeUsd: 180, mintFeeEth: 0.0720, mintFeeApe: 180, difficulty: 'MYTHIC', target: '0x' + '000003'.padEnd(64, 'f') },
    { id: 10, name: 'EPOCH 10 (OMEGA)', startToken: 5001, endToken: 10000, count: 5000, mintFeeUsd: 220, mintFeeEth: 0.0880, mintFeeApe: 220, difficulty: 'OMEGA', target: '0x' + '000001'.padEnd(64, 'f') },
  ];

  const displayedEpochs = (config.epochs && config.epochs.length > 0) ? config.epochs : DEFAULT_10_EPOCHS;

  const [epochFees, setEpochFees] = useState<{ [id: number]: number }>(() => {
    const map: { [id: number]: number } = {};
    displayedEpochs.forEach(e => {
      map[e.id] = e.mintFeeUsd;
    });
    return map;
  });

  const [isSavingAllEpochs, setIsSavingAllEpochs] = useState(false);
  const [savingSingleEpochId, setSavingSingleEpochId] = useState<number | null>(null);
  const [epochSuccessMsg, setEpochSuccessMsg] = useState<string | null>(null);
  const [epochErrorMsg, setEpochErrorMsg] = useState<string | null>(null);

  // Worker Cost Controls (Initialized with live on-chain values)
  const [worker2Cost, setWorker2Cost] = useState(config.workerCosts[2] || 1986377);
  const [worker3Cost, setWorker3Cost] = useState(config.workerCosts[3] || 3964875);
  const [worker4Cost, setWorker4Cost] = useState(config.workerCosts[4] || 5279520);
  const [worker5Cost, setWorker5Cost] = useState(config.workerCosts[5] || 6590698);
  const [isSavingWorkerCosts, setIsSavingWorkerCosts] = useState(false);
  const [workerSavedMsg, setWorkerSavedMsg] = useState<string | null>(null);
  const [workerErrorMsg, setWorkerErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (config.workerCosts) {
      if (config.workerCosts[2]) setWorker2Cost(config.workerCosts[2]);
      if (config.workerCosts[3]) setWorker3Cost(config.workerCosts[3]);
      if (config.workerCosts[4]) setWorker4Cost(config.workerCosts[4]);
      if (config.workerCosts[5]) setWorker5Cost(config.workerCosts[5]);
    }
  }, [config.workerCosts]);

  // Fetch Live On-Chain Treasury & Contract State
  const fetchTreasury = useCallback(async () => {
    try {
      setLoadingTreasury(true);
      const provider = new ethers.JsonRpcProvider(RPC_URL);

      // 1. Live on-chain ETH contract balance
      const ethBalWei = await provider.getBalance(CONTRACT_ADDRESS);
      const claimableEth = Number(parseFloat(ethers.formatEther(ethBalWei)).toFixed(4));

      // 2. Live on-chain HASHAPE token contract balance
      const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
      const tokenContract = new ethers.Contract(RIG_ACTIVATION_TOKEN_ADDRESS, tokenAbi, provider);
      let claimableHashApe = 0;
      try {
        const tokenBalWei = await tokenContract.balanceOf(CONTRACT_ADDRESS);
        claimableHashApe = Number(parseFloat(ethers.formatEther(tokenBalWei)).toFixed(2));
      } catch (_) {}

      // 3. Live on-chain worker costs
      const nftAbi = [
        'function workerActivationCost(uint256) view returns (uint256)',
        'function getEpoch(uint256 tokenId) view returns (tuple(uint256 id, uint256 startToken, uint256 endToken, uint256 mintFeeWei, uint256 feeUsd, uint256 target, string name))',
        'function totalMined() view returns (uint256)'
      ];
      const nftContract = new ethers.Contract(CONTRACT_ADDRESS, nftAbi, provider);

      try {
        const [w2, w3, w4, w5] = await Promise.all([
          nftContract.workerActivationCost(2),
          nftContract.workerActivationCost(3),
          nftContract.workerActivationCost(4),
          nftContract.workerActivationCost(5),
        ]);
        if (w2) setWorker2Cost(Number(ethers.formatEther(w2)));
        if (w3) setWorker3Cost(Number(ethers.formatEther(w3)));
        if (w4) setWorker4Cost(Number(ethers.formatEther(w4)));
        if (w5) setWorker5Cost(Number(ethers.formatEther(w5)));
      } catch (_) {}

      // 4. Live on-chain epoch mint fees
      try {
        const loadedEpochMap: { [id: number]: number } = {};
        for (const ep of displayedEpochs) {
          try {
            const onChainEp = await nftContract.getEpoch(ep.startToken);
            if (onChainEp && onChainEp.feeUsd) {
              loadedEpochMap[ep.id] = Number(onChainEp.feeUsd);
            }
          } catch (_) {}
        }
        if (Object.keys(loadedEpochMap).length > 0) {
          setEpochFees(prev => ({ ...prev, ...loadedEpochMap }));
        }
      } catch (_) {}

      // 5. Query historical claims from backend API
      let historicalClaims = [];
      try {
        const res = await fetch('/api/admin/treasury');
        const data = await res.json();
        if (data.success && data.treasury?.claims) {
          historicalClaims = data.treasury.claims;
        }
      } catch (_) {}

      setTreasury({
        adminWallet: adminAddress,
        activationTokenContract: RIG_ACTIVATION_TOKEN_ADDRESS,
        network: 'Robinhood Chain Mainnet (Chain ID 4663)',
        mintFees: {
          totalCollectedEth: claimableEth,
          claimedEth: 0,
          claimableEth,
          mintedCount: totalMined,
          currency: 'ETH',
        },
        rigFees: {
          totalCollectedHashApe: claimableHashApe,
          claimedHashApe: 0,
          claimableHashApe,
          activatedRigCount: 0,
          currency: 'HASHAPE',
        },
        claims: historicalClaims,
      });
    } catch (e) {
      console.error('Failed to load on-chain treasury:', e);
    } finally {
      setLoadingTreasury(false);
    }
  }, [adminAddress, displayedEpochs, totalMined]);

  useEffect(() => {
    fetchTreasury();
  }, [fetchTreasury]);

  // Handle On-Chain Claim Mint Fees (ETH)
  const handleClaimMintFees = async () => {
    soundEffects.playClickSound();
    setClaimSuccessMessage(null);
    setClaimErrorMessage(null);
    setClaimingMintFees(true);

    try {
      const txHash = await claimNativeMintFeesOnChain();
      setLastTxHash(txHash);
      soundEffects.playProofFoundSound();
      setClaimSuccessMessage(`On-Chain Claim Confirmed! Tx: ${txHash.slice(0, 14)}...`);

      // Notify backend to log receipt
      await fetch('/api/admin/claim-mint-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
          txHash,
        }),
      }).catch(() => {});

      await fetchTreasury();
    } catch (e: any) {
      setClaimErrorMessage(e.message || 'On-chain claim transaction failed');
    } finally {
      setClaimingMintFees(false);
    }
  };

  // Handle On-Chain Claim Rig Activation Fees (HASHAPE)
  const handleClaimRigFees = async () => {
    soundEffects.playClickSound();
    setClaimSuccessMessage(null);
    setClaimErrorMessage(null);
    setClaimingRigFees(true);

    try {
      const txHash = await claimTokenActivationFeesOnChain();
      setLastTxHash(txHash);
      soundEffects.playProofFoundSound();
      setClaimSuccessMessage(`On-Chain Token Claim Confirmed! Tx: ${txHash.slice(0, 14)}...`);

      // Notify backend to log receipt
      await fetch('/api/admin/claim-rig-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
          txHash,
        }),
      }).catch(() => {});

      await fetchTreasury();
    } catch (e: any) {
      setClaimErrorMessage(e.message || 'On-chain token claim transaction failed');
    } finally {
      setClaimingRigFees(false);
    }
  };

  // Handle On-Chain Batch Save All 10 Epochs
  const handleSaveAllEpochs = async () => {
    soundEffects.playClickSound();
    setIsSavingAllEpochs(true);
    setEpochSuccessMsg(null);
    setEpochErrorMsg(null);

    try {
      const epochIds = displayedEpochs.map(e => e.id);
      const newFeesUsd = displayedEpochs.map(e => Math.round(Number(epochFees[e.id] || e.mintFeeUsd || 5)));
      const newFeesWei = displayedEpochs.map(e => {
        const usd = Number(epochFees[e.id] || e.mintFeeUsd || 5);
        const ethVal = (usd / 2500).toFixed(6);
        return ethers.parseEther(ethVal);
      });

      const txHash = await setEpochMintFeesBatchOnChain(epochIds, newFeesWei, newFeesUsd);
      setLastTxHash(txHash);
      soundEffects.playProofFoundSound();
      setEpochSuccessMsg(`All 10 epochs confirmed on-chain! Tx: ${txHash.slice(0, 14)}...`);

      // Synchronize backend state with verified on-chain update
      const updates = displayedEpochs.map(e => ({
        ...e,
        mintFeeUsd: Number(epochFees[e.id] || e.mintFeeUsd || 5),
        mintFeeEth: Number((((epochFees[e.id] || e.mintFeeUsd || 5)) / 2500).toFixed(4)),
        mintFeeApe: Number(epochFees[e.id] || e.mintFeeUsd || 5),
      }));

      await fetch('/api/admin/epoch-fees-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
          epochs: updates,
          txHash,
        }),
      }).catch(() => {});

      onUpdateConfig({
        ...config,
        epochs: updates,
      });

      await fetchTreasury();
      onRefreshState?.();
    } catch (err: any) {
      setEpochErrorMsg(err.message || 'On-chain batch epoch fee update failed');
    } finally {
      setIsSavingAllEpochs(false);
    }
  };

  // Handle On-Chain Save Single Epoch
  const handleSaveSingleEpoch = async (epochId: number) => {
    soundEffects.playClickSound();
    setSavingSingleEpochId(epochId);
    setEpochSuccessMsg(null);
    setEpochErrorMsg(null);

    try {
      const usdVal = Math.round(epochFees[epochId] || 5);
      const ethVal = (usdVal / 2500).toFixed(6);
      const feeWei = ethers.parseEther(ethVal);

      const txHash = await setEpochMintFeeOnChain(epochId, feeWei, usdVal);
      setLastTxHash(txHash);
      soundEffects.playProofFoundSound();
      setEpochSuccessMsg(`Epoch #${epochId} updated on-chain to $${usdVal} ETH! Tx: ${txHash.slice(0, 14)}...`);

      await fetch('/api/admin/epoch-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
          epochId,
          mintFeeUsd: usdVal,
          mintFeeEth: Number(ethVal),
          txHash,
        }),
      }).catch(() => {});

      const updatedEpochs = displayedEpochs.map(e => e.id === epochId ? {
        ...e,
        mintFeeUsd: usdVal,
        mintFeeEth: Number(ethVal),
        mintFeeApe: usdVal,
      } : e);

      onUpdateConfig({
        ...config,
        epochs: updatedEpochs,
      });

      await fetchTreasury();
      onRefreshState?.();
    } catch (err: any) {
      setEpochErrorMsg(err.message || `On-chain fee update failed for Epoch #${epochId}`);
    } finally {
      setSavingSingleEpochId(null);
    }
  };

  // Handle On-Chain Save Worker Blade Costs
  const handleSaveWorkerCosts = async () => {
    soundEffects.playClickSound();
    setIsSavingWorkerCosts(true);
    setWorkerSavedMsg(null);
    setWorkerErrorMsg(null);

    try {
      const bladeCosts = [
        { index: 2, cost: worker2Cost },
        { index: 3, cost: worker3Cost },
        { index: 4, cost: worker4Cost },
        { index: 5, cost: worker5Cost },
      ];

      for (const blade of bladeCosts) {
        const txHash = await setWorkerActivationCostOnChain(blade.index, blade.cost);
        setLastTxHash(txHash);
      }

      soundEffects.playProofFoundSound();
      setWorkerSavedMsg('Worker blade activation costs confirmed on-chain!');

      // Synchronize with backend API and persistent database
      await fetch('/api/admin/worker-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
          costs: {
            1: 0,
            2: worker2Cost,
            3: worker3Cost,
            4: worker4Cost,
            5: worker5Cost,
          },
        }),
      }).catch(() => {});

      onUpdateConfig({
        ...config,
        workerCosts: {
          1: 0,
          2: worker2Cost,
          3: worker3Cost,
          4: worker4Cost,
          5: worker5Cost,
        },
      });

      await fetchTreasury();
      onRefreshState?.();
    } catch (err: any) {
      setWorkerErrorMsg(err.message || 'Failed to update worker blade pricing on-chain');
    } finally {
      setIsSavingWorkerCosts(false);
    }
  };

  const claimableEth = treasury?.mintFees?.claimableEth ?? 0;
  const claimableHashApe = treasury?.rigFees?.claimableHashApe ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200 font-dot">
      {/* Top Dispatch Navigation Banner */}
      <div className="paper-chassis bg-[#eee2ca] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onBack();
            }}
            className="paper-btn-kraft px-3 py-1.5 text-xs font-bold flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO RIG</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-[#d83a2a]" />
              <h1 className="font-jersey text-2xl text-[#24140a] uppercase tracking-wider">
                HYPEVM PROTOCOL ADMIN & TREASURY
              </h1>
            </div>
            <p className="text-xs text-[#6b5443]">
              Robinhood Chain Mainnet (Chain ID 4663) // Real On-Chain Contract Controls
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-bold">
          <span className="text-[#24140a]">ROYALTY:</span>
          <span className="text-[#d48818] bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
            5.0% (500 BPS)
          </span>
          {isAdmin ? (
            <span className="text-[#2e7d32] bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
              ✓ AUTHORIZED ADMIN ({address.slice(0, 6)}...{address.slice(-4)})
            </span>
          ) : (
            <span className="text-[#d83a2a] bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
              READ-ONLY MODE (CONNECT ADMIN WALLET)
            </span>
          )}
        </div>
      </div>

      {/* Explorer Link & Last Tx Banner */}
      {lastTxHash && (
        <div className="p-3 bg-[#eee2ca] border-2 border-[#19638b] text-xs text-[#19638b] font-bold flex items-center justify-between shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-4 h-4 text-[#19638b]" />
            <span>Last On-Chain Transaction: <code className="text-[#24140a]">{lastTxHash}</code></span>
          </div>
          <a
            href={`${EXPLORER_URL}/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#24140a] flex items-center space-x-1"
          >
            <span>VIEW ON EXPLORER</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Notification Banners */}
      {claimSuccessMessage && (
        <div className="p-3.5 bg-[#eee2ca] border-2 border-[#2e7d32] text-xs text-[#2e7d32] font-bold flex items-center justify-between shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#2e7d32]" />
            <span>{claimSuccessMessage}</span>
          </div>
          <button onClick={() => setClaimSuccessMessage(null)} className="text-[#24140a] hover:text-[#d83a2a] text-xs">✕</button>
        </div>
      )}

      {claimErrorMessage && (
        <div className="p-3.5 bg-[#eee2ca] border-2 border-[#d83a2a] text-xs text-[#d83a2a] font-bold flex items-center justify-between shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#d83a2a]" />
            <span>{claimErrorMessage}</span>
          </div>
          <button onClick={() => setClaimErrorMessage(null)} className="text-[#24140a] hover:text-[#d83a2a] text-xs">✕</button>
        </div>
      )}

      {/* SECTION 1: TREASURY FEE VAULTS */}
      <div className="paper-chassis overflow-hidden">
        <div className="paper-header-gold px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-[#24140a]" />
            <span className="font-jersey text-base text-[#24140a] tracking-wider uppercase">
              PROTOCOL TREASURY & ON-CHAIN FEE CLAIM VAULTS
            </span>
          </div>
          <button
            onClick={fetchTreasury}
            disabled={loadingTreasury}
            className="paper-btn-kraft px-2 py-0.5 text-[11px] font-bold flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingTreasury ? 'animate-spin' : ''}`} />
            <span>REFRESH ON-CHAIN STATE</span>
          </button>
        </div>

        <div className="p-6 bg-[#fdfbf7] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VAULT 1: Mint Fee Vault (ETH) */}
            <div className="bg-[#eee2ca] border-3 border-[#24140a] p-5 flex flex-col justify-between shadow-[3px_3px_0px_#24140a] relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#24140a]">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">💰</span>
                    <span className="font-jersey text-xl text-[#24140a] uppercase tracking-wider">
                      MINT FEE VAULT (ETH)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a] text-[#19638b]">
                    ROBINHOOD MAINNET
                  </span>
                </div>

                <p className="text-xs text-[#6b5443] font-medium leading-relaxed">
                  Direct contract balance accumulated from PoW mint fees across Epochs 1 through 10. Claiming executes <code className="text-[#24140a] font-bold">claimNativeMintFees()</code> directly on-chain.
                </p>

                <div className="p-2 bg-[#fdfbf7] border border-[#24140a] text-[10px] font-mono">
                  <span className="text-[#6b5443] block uppercase font-bold">DEPLOYED NFT CONTRACT (CHAIN 4663):</span>
                  <code className="text-[#19638b] font-bold select-all">{CONTRACT_ADDRESS}</code>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#24140a]">
                    <span className="text-[9px] text-[#6b5443] block uppercase font-bold">CONTRACT ON-CHAIN BALANCE</span>
                    <span className="text-base font-jersey font-bold text-[#24140a]">
                      {claimableEth} <span className="text-xs text-[#d83a2a]">ETH</span>
                    </span>
                  </div>

                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#2e7d32]">
                    <span className="text-[9px] text-[#2e7d32] block uppercase font-bold">CLAIMABLE BY ADMIN</span>
                    <span className="text-base font-jersey font-bold text-[#2e7d32]">
                      {claimableEth} <span className="text-xs text-[#2e7d32]">ETH</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t-2 border-[#24140a]">
                <button
                  onClick={handleClaimMintFees}
                  disabled={claimingMintFees || claimableEth <= 0 || !isAdmin}
                  className={`w-full py-2.5 text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                    claimableEth > 0 && isAdmin
                      ? 'paper-btn-red text-white'
                      : 'paper-btn-kraft opacity-60 cursor-not-allowed text-[#6b5443]'
                  }`}
                >
                  {claimingMintFees ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  <span>
                    {claimingMintFees
                      ? 'CONFIRMING ON-CHAIN TRANSACTION...'
                      : claimableEth > 0
                      ? `CLAIM MINT FEES ON-CHAIN (${claimableEth} ETH)`
                      : 'ZERO CLAIMABLE MINT FEES'}
                  </span>
                </button>
              </div>
            </div>

            {/* VAULT 2: Rig Activation Fee Vault (HASHAPE) */}
            <div className="bg-[#eee2ca] border-3 border-[#24140a] p-5 flex flex-col justify-between shadow-[3px_3px_0px_#24140a] relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#24140a]">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">⛏️</span>
                    <span className="font-jersey text-xl text-[#24140a] uppercase tracking-wider">
                      RIG ACTIVATION VAULT (HASHAPE)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a] text-[#d48818]">
                    ERC-20 TOKEN
                  </span>
                </div>

                <p className="text-xs text-[#6b5443] font-medium leading-relaxed">
                  Collected on-chain when users unlock Workers #2 through #5. Claiming executes <code className="text-[#24140a] font-bold">claimTokenActivationFees()</code> to dispatch tokens to admin.
                </p>

                <div className="p-2 bg-[#fdfbf7] border border-[#24140a] text-[10px] font-mono">
                  <span className="text-[#6b5443] block uppercase font-bold">ACTIVATION TOKEN CONTRACT:</span>
                  <code className="text-[#19638b] font-bold select-all">{RIG_ACTIVATION_TOKEN_ADDRESS}</code>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#24140a]">
                    <span className="text-[9px] text-[#6b5443] block uppercase font-bold">CONTRACT TOKEN HOLDINGS</span>
                    <span className="text-base font-jersey font-bold text-[#24140a]">
                      {claimableHashApe} <span className="text-xs text-[#d48818]">$HASHAPE</span>
                    </span>
                  </div>

                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#2e7d32]">
                    <span className="text-[9px] text-[#2e7d32] block uppercase font-bold">CLAIMABLE BY ADMIN</span>
                    <span className="text-base font-jersey font-bold text-[#2e7d32]">
                      {claimableHashApe} <span className="text-xs text-[#2e7d32]">$HASHAPE</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t-2 border-[#24140a]">
                <button
                  onClick={handleClaimRigFees}
                  disabled={claimingRigFees || claimableHashApe <= 0 || !isAdmin}
                  className={`w-full py-2.5 text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                    claimableHashApe > 0 && isAdmin
                      ? 'paper-btn-gold text-[#24140a]'
                      : 'paper-btn-kraft opacity-60 cursor-not-allowed text-[#6b5443]'
                  }`}
                >
                  {claimingRigFees ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  <span>
                    {claimingRigFees
                      ? 'CONFIRMING ON-CHAIN TRANSACTION...'
                      : claimableHashApe > 0
                      ? `CLAIM RIG FEES ON-CHAIN (${claimableHashApe} HASHAPE)`
                      : 'ZERO CLAIMABLE RIG FEES'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 10-EPOCH MINT PRICING SCHEDULE */}
      <div className="paper-chassis overflow-hidden">
        <div className="paper-header-red px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-white" />
            <span className="font-jersey text-base tracking-wider uppercase text-white">
              10-EPOCH ESCALATING MINT PRICING MATRIX (ON-CHAIN ENFORCED)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {epochSuccessMsg && (
              <span className="bg-[#2e7d32] text-white px-2 py-0.5 text-xs font-bold border border-[#24140a]">
                ✓ {epochSuccessMsg}
              </span>
            )}
            {epochErrorMsg && (
              <span className="bg-[#d83a2a] text-white px-2 py-0.5 text-xs font-bold border border-[#24140a]">
                ⚠ {epochErrorMsg}
              </span>
            )}
            <button
              onClick={handleSaveAllEpochs}
              disabled={isSavingAllEpochs || !isAdmin}
              className="paper-btn-gold px-3 py-1 text-xs font-bold flex items-center space-x-1"
            >
              {isSavingAllEpochs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSavingAllEpochs ? 'BROADCASTING ON-CHAIN...' : 'SAVE ALL 10 EPOCHS ON-CHAIN'}</span>
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#fdfbf7] space-y-4">
          <p className="text-xs text-[#6b5443] font-medium leading-relaxed">
            Mint fees are enforced directly by the smart contract on Robinhood Chain Mainnet via <code className="text-[#24140a] font-bold">setEpochMintFeesBatch()</code> or <code className="text-[#24140a] font-bold">setEpochMintFee()</code>. Modifying values below and clicking save sends an on-chain transaction signed by your connected admin wallet.
          </p>

          <div className="overflow-x-auto border-2 border-[#24140a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#eee2ca] border-b-2 border-[#24140a] text-[11px] font-bold">
                <tr>
                  <th className="p-2.5">STAGE</th>
                  <th className="p-2.5">NAME</th>
                  <th className="p-2.5">TOKEN RANGE</th>
                  <th className="p-2.5">SUPPLY</th>
                  <th className="p-2.5">POW DIFFICULTY</th>
                  <th className="p-2.5">MINT FEE (USD)</th>
                  <th className="p-2.5">ETH VALUE</th>
                  <th className="p-2.5">STATUS</th>
                  <th className="p-2.5">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24140a] bg-[#fdfbf7]">
                {displayedEpochs.map((epoch) => {
                  const isCurrent = totalMined >= epoch.startToken - 1 && totalMined < epoch.endToken;
                  const isPast = totalMined >= epoch.endToken;
                  const usdVal = Number(epochFees[epoch.id] !== undefined ? epochFees[epoch.id] : (epoch.mintFeeUsd || 5));
                  const ethVal = (usdVal / 2500).toFixed(4);
                  const isSavingThis = savingSingleEpochId === epoch.id;

                  return (
                    <tr
                      key={epoch.id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-[#d83a2a]/10 font-bold'
                          : isPast
                          ? 'bg-[#eee2ca]/50 text-[#6b5443]'
                          : 'hover:bg-[#f5ebd7]'
                      }`}
                    >
                      <td className="p-2.5 font-bold text-[#24140a]">#{epoch.id}</td>
                      <td className="p-2.5 font-bold uppercase">{epoch.name}</td>
                      <td className="p-2.5 font-mono text-[11px]">
                        #{epoch.startToken} - #{epoch.endToken}
                      </td>
                      <td className="p-2.5 font-bold">{epoch.count.toLocaleString()}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 bg-[#eee2ca] border border-[#24140a] text-[10px] font-bold">
                          {epoch.difficulty}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center space-x-1">
                          <span className="text-[#24140a] font-bold">$</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            disabled={!isAdmin || isSavingAllEpochs}
                            value={usdVal}
                            onChange={(e) => {
                              const val = Math.max(1, parseFloat(e.target.value) || 1);
                              setEpochFees(prev => ({ ...prev, [epoch.id]: val }));
                            }}
                            className="w-16 p-1 bg-[#eee2ca] border-2 border-[#24140a] font-mono text-xs font-bold text-[#24140a] focus:bg-[#fdfbf7]"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-[#d83a2a] font-bold text-[11px]">
                        {ethVal} ETH
                      </td>
                      <td className="p-2.5">
                        {isCurrent ? (
                          <span className="px-2 py-0.5 bg-[#2e7d32] text-white border border-[#24140a] text-[10px] font-bold animate-pulse">
                            ACTIVE
                          </span>
                        ) : isPast ? (
                          <span className="px-2 py-0.5 bg-[#eee2ca] text-[#6b5443] border border-[#24140a] text-[10px] font-bold">
                            CONCLUDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#fdfbf7] text-[#6b5443] border border-[#24140a] text-[10px] font-bold">
                            UPCOMING
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <button
                          onClick={() => handleSaveSingleEpoch(epoch.id)}
                          disabled={!isAdmin || isSavingThis || isSavingAllEpochs}
                          className="paper-btn-kraft px-2 py-1 text-[10px] font-bold flex items-center space-x-1"
                        >
                          {isSavingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3 text-[#2e7d32]" />
                          )}
                          <span>{isSavingThis ? 'SAVING...' : 'SAVE ON-CHAIN'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: WORKER BLADES PRICING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worker Blades Pricing */}
        <div className="paper-chassis overflow-hidden">
          <div className="paper-header-gold px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-[#24140a]" />
              <span className="font-jersey text-base text-[#24140a] tracking-wider uppercase">
                GPU WORKER BLADE PRICING (ON-CHAIN)
              </span>
            </div>
            {workerSavedMsg && (
              <span className="bg-[#2e7d32] text-white px-2 py-0.5 text-[10px] font-bold">
                ✓ {workerSavedMsg}
              </span>
            )}
            {workerErrorMsg && (
              <span className="bg-[#d83a2a] text-white px-2 py-0.5 text-[10px] font-bold">
                ⚠ {workerErrorMsg}
              </span>
            )}
          </div>

          <div className="p-5 bg-[#fdfbf7] space-y-4">
            <p className="text-xs text-[#6b5443]">
              Worker #1 is hardcoded FREE in the contract. Workers #2 through #5 costs are written on-chain via <code className="text-[#24140a] font-bold">setWorkerActivationCost()</code>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between">
                <span className="font-bold">BLADE #1 (CORE - PARTITION A)</span>
                <span className="px-2 py-0.5 bg-[#fdfbf7] border border-[#24140a] text-[#2e7d32] font-bold">
                  FREE (0 $HASHAPE)
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between">
                <span className="font-bold">BLADE #2 (VECTOR - PARTITION B)</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={!isAdmin || isSavingWorkerCosts}
                    value={worker2Cost}
                    onChange={(e) => setWorker2Cost(Number(e.target.value))}
                    className="w-20 p-1 bg-[#fdfbf7] border border-[#24140a] font-mono text-right font-bold text-xs"
                  />
                  <span className="font-bold">$HASHAPE</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between">
                <span className="font-bold">BLADE #3 (MATRIX - PARTITION C)</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={!isAdmin || isSavingWorkerCosts}
                    value={worker3Cost}
                    onChange={(e) => setWorker3Cost(Number(e.target.value))}
                    className="w-20 p-1 bg-[#fdfbf7] border border-[#24140a] font-mono text-right font-bold text-xs"
                  />
                  <span className="font-bold">$HASHAPE</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between">
                <span className="font-bold">BLADE #4 (TENSOR - PARTITION D)</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={!isAdmin || isSavingWorkerCosts}
                    value={worker4Cost}
                    onChange={(e) => setWorker4Cost(Number(e.target.value))}
                    className="w-20 p-1 bg-[#fdfbf7] border border-[#24140a] font-mono text-right font-bold text-xs"
                  />
                  <span className="font-bold">$HASHAPE</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between">
                <span className="font-bold">BLADE #5 (QUANTUM - PARTITION E)</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={!isAdmin || isSavingWorkerCosts}
                    value={worker5Cost}
                    onChange={(e) => setWorker5Cost(Number(e.target.value))}
                    className="w-20 p-1 bg-[#fdfbf7] border border-[#24140a] font-mono text-right font-bold text-xs"
                  />
                  <span className="font-bold">$HASHAPE</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveWorkerCosts}
              disabled={isSavingWorkerCosts || !isAdmin}
              className="paper-btn-gold w-full py-2 text-xs font-bold flex items-center justify-center space-x-2"
            >
              {isSavingWorkerCosts ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isSavingWorkerCosts ? 'BROADCASTING ON-CHAIN...' : 'SAVE WORKER PRICING ON-CHAIN'}</span>
            </button>
          </div>
        </div>

        {/* Hardened PoW Weighting Controls */}
        <div className="paper-chassis overflow-hidden">
          <div className="paper-header-red px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-white" />
              <span className="font-jersey text-base tracking-wider uppercase text-white">
                HARDENED GPU POW PROTOCOL CONSTANTS
              </span>
            </div>
            <span className="text-[10px] font-bold bg-[#fdfbf7] text-[#d83a2a] px-2 py-0.5 border border-[#24140a]">
              ENFORCED
            </span>
          </div>

          <div className="p-5 bg-[#fdfbf7] space-y-4">
            <div className="p-3 bg-[#eee2ca] border-2 border-[#24140a] text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#24140a]/20 pb-1.5">
                <span className="text-[#6b5443]">CRYPTOGRAPHIC HASH:</span>
                <span className="font-mono font-bold text-[#24140a]">KECCAK-256 (SOLIDITY PACKED)</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#24140a]/20 pb-1.5">
                <span className="text-[#6b5443]">ANTI-MEV FRONT-RUNNING:</span>
                <span className="text-[#2e7d32] font-bold">MSG.SENDER BOUND IN HASH</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#24140a]/20 pb-1.5">
                <span className="text-[#6b5443]">CHALLENGE ROTATION:</span>
                <span className="font-bold text-[#19638b]">AUTOMATIC EVERY MINT ROUND</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#24140a]/20 pb-1.5">
                <span className="text-[#6b5443]">PER-WALLET MINT CAP:</span>
                <span className="font-bold text-[#d83a2a]">STRICT 5 NFTS PER ADDRESS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b5443]">TOTAL SUPPLY HARD CAP:</span>
                <span className="font-bold text-[#24140a]">10,000 NFTS (ZERO PRE-MINT)</span>
              </div>
            </div>

            <div className="p-3 bg-[#fdfbf7] border border-[#24140a] text-[11px] text-[#6b5443] leading-relaxed">
              Mining proofs require: <code className="text-[#24140a] font-bold">keccak256(challenge, miner, nonce) &lt; effectiveTarget</code>. Because <code className="text-[#24140a] font-bold">msg.sender</code> is part of the packed preimage, other actors or MEV searchers cannot extract and submit a discovered nonce.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
