import React, { useState, useEffect } from 'react';
import { ProtocolConfig } from '../types';
import { useWallet } from '../web3/WalletContext';
import {
  Shield, Check, AlertCircle, ArrowLeft, RefreshCw,
  Coins, Wrench, Flame, Zap, Database, Lock, CheckCircle2,
  ExternalLink, Layers
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
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  onUpdateConfig,
  totalMined = 3,
  maxSupply = 10000,
  onBack,
}) => {
  const { address, isAdmin } = useWallet();
  const adminAddress = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';

  // Treasury State
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [loadingTreasury, setLoadingTreasury] = useState(false);
  const [claimingMintFees, setClaimingMintFees] = useState(false);
  const [claimingRigFees, setClaimingRigFees] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);
  const [claimErrorMessage, setClaimErrorMessage] = useState<string | null>(null);

  // Epoch Fees State
  const DEFAULT_10_EPOCHS = [
    { id: 1, name: 'EPOCH 1 (GENESIS)', startToken: 1, endToken: 10, count: 10, mintFeeUsd: 5, mintFeeEth: 0.0020, mintFeeApe: 5, difficulty: 'HARD' },
    { id: 2, name: 'EPOCH 2 (ASCENSION)', startToken: 11, endToken: 30, count: 20, mintFeeUsd: 7, mintFeeEth: 0.0028, mintFeeApe: 7, difficulty: 'HARDER' },
    { id: 3, name: 'EPOCH 3 (EXPANSION)', startToken: 31, endToken: 70, count: 40, mintFeeUsd: 10, mintFeeEth: 0.0040, mintFeeApe: 10, difficulty: 'VERY HARD' },
    { id: 4, name: 'EPOCH 4 (SURGE)', startToken: 71, endToken: 150, count: 80, mintFeeUsd: 14, mintFeeEth: 0.0056, mintFeeApe: 14, difficulty: 'VERY HARD+' },
    { id: 5, name: 'EPOCH 5 (NEXUS)', startToken: 151, endToken: 300, count: 150, mintFeeUsd: 18, mintFeeEth: 0.0072, mintFeeApe: 18, difficulty: 'EXTREME' },
    { id: 6, name: 'EPOCH 6 (APEX)', startToken: 301, endToken: 600, count: 300, mintFeeUsd: 22, mintFeeEth: 0.0088, mintFeeApe: 22, difficulty: 'EXTREME+' },
    { id: 7, name: 'EPOCH 7 (SOVEREIGN)', startToken: 601, endToken: 1200, count: 600, mintFeeUsd: 26, mintFeeEth: 0.0104, mintFeeApe: 26, difficulty: 'LEGENDARY' },
    { id: 8, name: 'EPOCH 8 (TITAN)', startToken: 1201, endToken: 2500, count: 1300, mintFeeUsd: 30, mintFeeEth: 0.0120, mintFeeApe: 30, difficulty: 'LEGENDARY+' },
    { id: 9, name: 'EPOCH 9 (MYTHIC)', startToken: 2501, endToken: 5000, count: 2500, mintFeeUsd: 35, mintFeeEth: 0.0140, mintFeeApe: 35, difficulty: 'MYTHIC' },
    { id: 10, name: 'EPOCH 10 (OMEGA)', startToken: 5001, endToken: 10000, count: 5000, mintFeeUsd: 40, mintFeeEth: 0.0160, mintFeeApe: 40, difficulty: 'OMEGA' },
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
  const [epochSuccessMsg, setEpochSuccessMsg] = useState<string | null>(null);

  // Worker Cost Controls
  const [worker2Cost, setWorker2Cost] = useState(config.workerCosts[2] || 100);
  const [worker3Cost, setWorker3Cost] = useState(config.workerCosts[3] || 200);
  const [worker4Cost, setWorker4Cost] = useState(config.workerCosts[4] || 300);
  const [worker5Cost, setWorker5Cost] = useState(config.workerCosts[5] || 500);
  const [workerSavedMsg, setWorkerSavedMsg] = useState<string | null>(null);

  // Fetch Treasury Data
  const fetchTreasury = async () => {
    try {
      setLoadingTreasury(true);
      const res = await fetch('/api/admin/treasury');
      const data = await res.json();
      if (data.success) {
        setTreasury(data.treasury);
      }
    } catch (e) {
      console.error('Failed to load treasury:', e);
    } finally {
      setLoadingTreasury(false);
    }
  };

  useEffect(() => {
    fetchTreasury();
  }, []);

  // Update local epoch state if config updates
  useEffect(() => {
    if (config.epochs) {
      setEpochFees(prev => {
        const next = { ...prev };
        config.epochs?.forEach(e => {
          next[e.id] = e.mintFeeUsd;
        });
        return next;
      });
    }
  }, [config.epochs]);

  // Handle Claim Mint Fees (ETH)
  const handleClaimMintFees = async () => {
    soundEffects.playClickSound();
    setClaimSuccessMessage(null);
    setClaimErrorMessage(null);
    setClaimingMintFees(true);

    try {
      const res = await fetch('/api/admin/claim-mint-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundEffects.playProofFoundSound();
        setClaimSuccessMessage(`Successfully claimed ${data.claim.amount} ETH! Tx: ${data.claim.txHash.slice(0, 14)}...`);
        if (data.treasury) setTreasury(data.treasury);
      } else {
        setClaimErrorMessage(data.error || 'Failed to claim mint fees');
      }
    } catch (e: any) {
      setClaimErrorMessage(e.message || 'Network error claiming mint fees');
    } finally {
      setClaimingMintFees(false);
    }
  };

  // Handle Claim Rig Activation Fees (HASHAPE)
  const handleClaimRigFees = async () => {
    soundEffects.playClickSound();
    setClaimSuccessMessage(null);
    setClaimErrorMessage(null);
    setClaimingRigFees(true);

    try {
      const res = await fetch('/api/admin/claim-rig-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundEffects.playProofFoundSound();
        setClaimSuccessMessage(`Successfully claimed ${data.claim.amount} HASHAPE tokens! Tx: ${data.claim.txHash.slice(0, 14)}...`);
        if (data.treasury) setTreasury(data.treasury);
      } else {
        setClaimErrorMessage(data.error || 'Failed to claim rig activation fees');
      }
    } catch (e: any) {
      setClaimErrorMessage(e.message || 'Network error claiming rig activation fees');
    } finally {
      setClaimingRigFees(false);
    }
  };

  // Handle Batch Save All Epochs
  const handleSaveAllEpochs = async () => {
    soundEffects.playClickSound();
    setIsSavingAllEpochs(true);
    setEpochSuccessMsg(null);

    try {
      const updates = displayedEpochs.map(e => ({
        id: e.id,
        mintFeeUsd: Number(epochFees[e.id] || e.mintFeeUsd),
        mintFeeEth: Number(((epochFees[e.id] || e.mintFeeUsd) / 2500).toFixed(4)),
        mintFeeApe: Number(epochFees[e.id] || e.mintFeeUsd),
      }));

      const res = await fetch('/api/admin/epoch-fees-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address || adminAddress,
          epochs: updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEpochSuccessMsg('All 10 epoch mint fees successfully updated!');
        setTimeout(() => setEpochSuccessMsg(null), 4000);
        if (data.epochs) {
          onUpdateConfig({
            ...config,
            epochs: data.epochs,
            currentEpoch: data.currentEpoch || config.currentEpoch,
          });
        }
      }
    } catch (err) {
      console.error('Failed to batch update epoch fees:', err);
    } finally {
      setIsSavingAllEpochs(false);
    }
  };

  // Handle Save Worker Blade Costs
  const handleSaveWorkerCosts = () => {
    soundEffects.playClickSound();
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
    setWorkerSavedMsg('Worker blade activation pricing saved!');
    setTimeout(() => setWorkerSavedMsg(null), 3000);
  };

  const claimableEth = treasury?.mintFees?.claimableEth ?? 0;
  const claimableHashApe = treasury?.rigFees?.claimableHashApe ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Dispatch Navigation Banner */}
      <div className="paper-chassis bg-[#eee2ca] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onBack();
            }}
            className="paper-btn-kraft px-3 py-1.5 text-xs font-dot font-bold flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO MINING RIG</span>
          </button>
          <div className="h-6 w-[2px] bg-[#24140a]" />
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-[#d83a2a]" />
            <span className="font-jersey text-2xl text-[#24140a] uppercase tracking-wider">
              ADMIN PROTOCOL DASHBOARD
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-dot font-bold">
          <span className="text-[#24140a] bg-[#fdfbf7] px-2.5 py-1 border border-[#24140a] shadow-[1px_1px_0px_#24140a]">
            ROBINHOOD EVM L2
          </span>
          <span className="text-[#2e7d32] bg-[#fdfbf7] px-2.5 py-1 border border-[#24140a] shadow-[1px_1px_0px_#24140a] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2e7d32] inline-block animate-pulse" />
            SECURE MASTER DISPATCH
          </span>
        </div>
      </div>

      {/* Admin Authorization Status Bar */}
      <div className="p-3 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="bg-[#eee2ca] px-2 py-0.5 border border-[#24140a] font-bold text-[#24140a] uppercase font-dot">
            CREATOR & FEE RECIPIENT
          </span>
          <code className="text-[#d83a2a] font-bold select-all bg-[#eee2ca] px-2 py-0.5 border border-[#24140a]">
            {adminAddress}
          </code>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-dot font-bold">
          <span className="text-[#24140a]">OPEN_SEA ROYALTY:</span>
          <span className="text-[#d48818] bg-[#eee2ca] px-2 py-0.5 border border-[#24140a]">
            5.0% (500 BPS)
          </span>
          {isAdmin ? (
            <span className="text-[#2e7d32] bg-[#eee2ca] px-2 py-0.5 border border-[#24140a]">
              ✓ AUTHORIZED ADMIN
            </span>
          ) : (
            <span className="text-[#6b5443] bg-[#eee2ca] px-2 py-0.5 border border-[#24140a]">
              READ-ONLY MODE (CONNECTED: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'DISCONNECTED'})
            </span>
          )}
        </div>
      </div>

      {/* Notification Banners */}
      {claimSuccessMessage && (
        <div className="p-3.5 bg-[#eee2ca] border-2 border-[#2e7d32] text-xs font-dot text-[#2e7d32] font-bold flex items-center justify-between shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#2e7d32]" />
            <span>{claimSuccessMessage}</span>
          </div>
          <button
            onClick={() => setClaimSuccessMessage(null)}
            className="text-[#24140a] hover:text-[#d83a2a] text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {claimErrorMessage && (
        <div className="p-3.5 bg-[#eee2ca] border-2 border-[#d83a2a] text-xs font-dot text-[#d83a2a] font-bold flex items-center justify-between shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#d83a2a]" />
            <span>{claimErrorMessage}</span>
          </div>
          <button
            onClick={() => setClaimErrorMessage(null)}
            className="text-[#24140a] hover:text-[#d83a2a] text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: TREASURY FEE VAULTS */}
      <div className="paper-chassis overflow-hidden">
        <div className="paper-header-gold px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-[#24140a]" />
            <span className="font-jersey text-base text-[#24140a] tracking-wider uppercase">
              PROTOCOL TREASURY & ADMIN FEE CLAIM VAULTS
            </span>
          </div>
          <button
            onClick={fetchTreasury}
            disabled={loadingTreasury}
            className="paper-btn-kraft px-2 py-0.5 text-[11px] font-dot font-bold flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingTreasury ? 'animate-spin' : ''}`} />
            <span>REFRESH BALANCES</span>
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
                  <span className="text-[10px] font-dot font-bold bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a] text-[#19638b]">
                    ROBINHOOD L2
                  </span>
                </div>

                <p className="text-xs font-dot text-[#6b5443] font-medium leading-relaxed">
                  Accumulated from all PoW manual mint fees across Epochs 1 through 10. Automatically routed to the creator admin wallet on Robinhood EVM L2.
                </p>

                <div className="p-2 bg-[#fdfbf7] border border-[#24140a] text-[10px] font-mono">
                  <span className="text-[#6b5443] block uppercase font-dot font-bold">DEPLOYED NFT CONTRACT (CHAIN 4663):</span>
                  <code className="text-[#19638b] font-bold select-all">
                    0x7D959C29aa1098d93b307Ca40bEEEc0bF7bbfF85
                  </code>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#24140a]">
                    <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">TOTAL COLLECTED</span>
                    <span className="text-base font-jersey font-bold text-[#24140a]">
                      {treasury?.mintFees?.totalCollectedEth ?? '0.0060'} <span className="text-xs font-dot text-[#d83a2a]">ETH</span>
                    </span>
                  </div>

                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#24140a]">
                    <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">CLAIMED TO DATE</span>
                    <span className="text-base font-jersey font-bold text-[#6b5443]">
                      {treasury?.mintFees?.claimedEth ?? '0.0000'} <span className="text-xs font-dot text-[#6b5443]">ETH</span>
                    </span>
                  </div>

                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#2e7d32]">
                    <span className="text-[9px] font-dot text-[#2e7d32] block uppercase font-bold">CLAIMABLE BALANCE</span>
                    <span className="text-base font-jersey font-bold text-[#2e7d32]">
                      {claimableEth} <span className="text-xs font-dot text-[#2e7d32]">ETH</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t-2 border-[#24140a]">
                <button
                  onClick={handleClaimMintFees}
                  disabled={claimingMintFees || claimableEth <= 0}
                  className={`w-full py-2.5 text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                    claimableEth > 0
                      ? 'paper-btn-red text-white'
                      : 'paper-btn-kraft opacity-60 cursor-not-allowed text-[#6b5443]'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {claimingMintFees
                      ? 'TRANSFERRING ETH TO ADMIN...'
                      : claimableEth > 0
                      ? `CLAIM MINT FEES (${claimableEth} ETH)`
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
                  <span className="text-[10px] font-dot font-bold bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a] text-[#d48818]">
                    ERC-20 TOKEN
                  </span>
                </div>

                <p className="text-xs font-dot text-[#6b5443] font-medium leading-relaxed">
                  Collected whenever miners unlock additional hardware Blades #2–#5 using official HashApe token contract.
                </p>

                <div className="p-2 bg-[#fdfbf7] border border-[#24140a] text-[10px] font-mono">
                  <span className="text-[#6b5443] block uppercase font-dot font-bold">TOKEN CONTRACT FOR ACTIVE RIG:</span>
                  <code className="text-[#d83a2a] font-bold select-all">
                    0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc
                  </code>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#24140a]">
                    <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">TOTAL COLLECTED</span>
                    <span className="text-base font-jersey font-bold text-[#24140a]">
                      {treasury?.rigFees?.totalCollectedHashApe ?? 0} <span className="text-xs font-dot text-[#d48818]">$APE</span>
                    </span>
                  </div>

                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#24140a]">
                    <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">CLAIMED TO DATE</span>
                    <span className="text-base font-jersey font-bold text-[#6b5443]">
                      {treasury?.rigFees?.claimedHashApe ?? 0} <span className="text-xs font-dot text-[#6b5443]">$APE</span>
                    </span>
                  </div>

                  <div className="bg-[#fdfbf7] p-2.5 border-2 border-[#2e7d32]">
                    <span className="text-[9px] font-dot text-[#2e7d32] block uppercase font-bold">CLAIMABLE BALANCE</span>
                    <span className="text-base font-jersey font-bold text-[#2e7d32]">
                      {claimableHashApe} <span className="text-xs font-dot text-[#2e7d32]">$APE</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t-2 border-[#24140a]">
                <button
                  onClick={handleClaimRigFees}
                  disabled={claimingRigFees || claimableHashApe <= 0}
                  className={`w-full py-2.5 text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                    claimableHashApe > 0
                      ? 'paper-btn-gold text-[#24140a]'
                      : 'paper-btn-kraft opacity-60 cursor-not-allowed text-[#6b5443]'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {claimingRigFees
                      ? 'TRANSFERRING HASHAPE TO ADMIN...'
                      : claimableHashApe > 0
                      ? `CLAIM RIG ACTIVATION FEES (${claimableHashApe} HASHAPE)`
                      : 'ZERO CLAIMABLE RIG FEES'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Past Fee Claims Receipts Ledger */}
          <div className="border-t-2 border-[#24140a] pt-4">
            <div className="flex items-center justify-between mb-3 text-xs font-dot">
              <span className="font-bold text-[#24140a] uppercase">RECENT TREASURY DISPATCH RECEIPTS</span>
              <span className="text-[#6b5443]">{(treasury?.claims || []).length} DISPATCHES LOGGED</span>
            </div>

            {(treasury?.claims || []).length > 0 ? (
              <div className="overflow-x-auto border-2 border-[#24140a]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#eee2ca] border-b-2 border-[#24140a] text-[11px] font-dot font-bold">
                    <tr>
                      <th className="p-2">RECEIPT ID</th>
                      <th className="p-2">VAULT ASSET</th>
                      <th className="p-2">AMOUNT CLAIMED</th>
                      <th className="p-2">DESTINATION</th>
                      <th className="p-2">TRANSACTION HASH</th>
                      <th className="p-2">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24140a] bg-[#fdfbf7]">
                    {(treasury?.claims || []).map((c) => (
                      <tr key={c.id} className="hover:bg-[#f5ebd7]">
                        <td className="p-2 text-[#24140a] font-bold">{c.id}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                            c.type === 'MINT_FEES_ETH'
                              ? 'bg-[#19638b]/10 border-[#19638b] text-[#19638b]'
                              : 'bg-[#d48818]/10 border-[#d48818] text-[#d48818]'
                          }`}>
                            {c.currency}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-[#2e7d32]">
                          +{c.amount} {c.currency}
                        </td>
                        <td className="p-2 text-[#6b5443] truncate max-w-[120px]" title={c.recipient}>
                          {c.recipient.slice(0, 6)}...{c.recipient.slice(-4)}
                        </td>
                        <td className="p-2 text-[#d83a2a] truncate max-w-[140px]" title={c.txHash}>
                          {c.txHash.slice(0, 10)}...
                        </td>
                        <td className="p-2 text-[#6b5443] text-[11px]">
                          {new Date(c.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-[#eee2ca] border-2 border-dashed border-[#24140a] text-center text-xs font-dot text-[#6b5443]">
                No claims dispatched yet. All collected fees are securely held in the on-chain protocol vault.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: 10-EPOCH MINT PRICING SCHEDULE */}
      <div className="paper-chassis overflow-hidden">
        <div className="paper-header-red px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-white" />
            <span className="font-jersey text-base tracking-wider uppercase text-white">
              10-EPOCH ESCALATING MINT PRICING MATRIX (10,000 HARD CAP)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {epochSuccessMsg && (
              <span className="bg-[#2e7d32] text-white px-2 py-0.5 font-dot text-xs font-bold border border-[#24140a]">
                ✓ {epochSuccessMsg}
              </span>
            )}
            <button
              onClick={handleSaveAllEpochs}
              disabled={isSavingAllEpochs}
              className="paper-btn-gold px-3 py-1 text-xs font-dot font-bold flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSavingAllEpochs ? 'SAVING...' : 'SAVE ALL 10 EPOCHS'}</span>
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#fdfbf7] space-y-4">
          <p className="text-xs font-dot text-[#6b5443] font-medium leading-relaxed">
            Mint fees increase across epochs: Epoch 1 (Tokens 1–10) mines Hard at $5 ETH, Epoch 2 (Tokens 11–30) mines Harder at $7 ETH, escalating progressively up to 10,000 Hard Cap. Admins can configure the USD and ETH price per epoch below.
          </p>

          <div className="overflow-x-auto border-2 border-[#24140a]">
            <table className="w-full text-left text-xs font-dot">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24140a] bg-[#fdfbf7]">
                {displayedEpochs.map((epoch) => {
                  const isCurrent = totalMined >= epoch.startToken - 1 && totalMined < epoch.endToken;
                  const isPast = totalMined >= epoch.endToken;
                  const usdVal = epochFees[epoch.id] !== undefined ? epochFees[epoch.id] : epoch.mintFeeUsd;
                  const ethVal = (usdVal / 2500).toFixed(4);

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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: WORKER BLADES ALLOCATION & HARDENED POW TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worker Blades Pricing */}
        <div className="paper-chassis overflow-hidden">
          <div className="paper-header-gold px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-[#24140a]" />
              <span className="font-jersey text-base text-[#24140a] tracking-wider uppercase">
                GPU WORKER BLADE PRICING
              </span>
            </div>
            {workerSavedMsg && (
              <span className="bg-[#2e7d32] text-white px-2 py-0.5 font-dot text-[10px] font-bold">
                ✓ SAVED
              </span>
            )}
          </div>

          <div className="p-5 bg-[#fdfbf7] space-y-4">
            <p className="text-xs font-dot text-[#6b5443]">
              Worker #1 is 100% FREE. Workers #2–#5 require HashApe ($HASHAPE) tokens to activate.
            </p>

            <div className="space-y-3 font-dot text-xs">
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
              className="paper-btn-gold w-full py-2 text-xs font-dot font-bold flex items-center justify-center space-x-2"
            >
              <Check className="w-3.5 h-3.5" />
              <span>SAVE WORKER BLADE PRICING</span>
            </button>
          </div>
        </div>

        {/* Hardened PoW Weighting Controls */}
        <div className="paper-chassis overflow-hidden">
          <div className="paper-header-red px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-white" />
              <span className="font-jersey text-base tracking-wider uppercase text-white">
                HARDENED GPU POW CONSTANT WEIGHTING
              </span>
            </div>
            <span className="text-[10px] font-dot font-bold bg-[#fdfbf7] text-[#d83a2a] px-2 py-0.5 border border-[#24140a]">
              ENFORCED
            </span>
          </div>

          <div className="p-5 bg-[#fdfbf7] space-y-4">
            <div className="p-3 bg-[#eee2ca] border-2 border-[#24140a] text-xs font-dot space-y-2">
              <div className="flex items-center justify-between font-bold text-[#24140a]">
                <span>DIFFICULTY DILUTION PROTECTION</span>
                <span className="text-[#2e7d32]">ACTIVE (100% CONSTANT)</span>
              </div>
              <p className="text-[11px] text-[#6b5443] leading-relaxed">
                PoW difficulty is mathematically fixed to the active Epoch and user wallet quota. Low network rig counts never lower or dilute the cryptographic target.
              </p>
            </div>

            <div className="space-y-2 text-xs font-dot">
              <div className="flex items-center justify-between p-2 bg-[#eee2ca] border border-[#24140a]">
                <span className="text-[#6b5443] font-bold">ALGORITHM</span>
                <span className="font-mono font-bold text-[#24140a]">Keccak-256 (WGSL WebGPU)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#eee2ca] border border-[#24140a]">
                <span className="text-[#6b5443] font-bold">WALLET QUOTA DIFFICULTY SCALING</span>
                <span className="font-mono font-bold text-[#24140a]">32 bits (1/5) → 36 bits (5/5)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#eee2ca] border border-[#24140a]">
                <span className="text-[#6b5443] font-bold">EPOCH DIFFICULTY SCALING</span>
                <span className="font-mono font-bold text-[#24140a]">HARD (Ep 1) → OMEGA (Ep 10)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#eee2ca] border border-[#24140a]">
                <span className="text-[#6b5443] font-bold">ANTI-RACE REPLAY PROTECTION</span>
                <span className="font-mono font-bold text-[#2e7d32]">SHA3 Digest + Salt Nonce</span>
              </div>
            </div>

            <div className="p-3 bg-[#eee2ca] border-2 border-[#2e7d32] text-xs font-dot text-[#2e7d32] font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Full cryptographic parity maintained with EVM Robinhood L2 verification.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
