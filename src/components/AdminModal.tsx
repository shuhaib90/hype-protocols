import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ProtocolConfig } from '../types';
import { useWallet } from '../web3/WalletContext';
import { Shield, Check, X, Loader2, Play, Pause, Save, Sparkles } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProtocolConfig;
  onUpdateConfig: (newConfig: ProtocolConfig) => void;
  totalMined?: number;
  maxSupply?: number;
}

interface PendingAction {
  title: string;
  field: string;
  oldValue: string;
  newValue: string;
  applyFn: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  totalMined = 7842,
  maxSupply = 10000,
}) => {
  const { address, isAdmin, setEpochMintFeeOnChain, setEpochMintFeesBatchOnChain } = useWallet();
  const [mintFee, setMintFee] = useState(config.mintFeeHype || 0.05);
  const [worker2Cost, setWorker2Cost] = useState(config.workerCosts[2] || 100);
  const [worker3Cost, setWorker3Cost] = useState(config.workerCosts[3] || 200);
  const [worker4Cost, setWorker4Cost] = useState(config.workerCosts[4] || 300);
  const [worker5Cost, setWorker5Cost] = useState(config.workerCosts[5] || 500);
  const [feeRecipient] = useState(config.adminWallet || '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C');
  const [isMiningPaused, setIsMiningPaused] = useState(false);
  const [difficultyMode, setDifficultyMode] = useState('Dynamic');
  const [difficultyTier] = useState('VERY HARD');

  const DEFAULT_10_EPOCHS = [
    { id: 1, name: 'EPOCH 1 (GENESIS)', startToken: 1, endToken: 10, count: 10, mintFeeUsd: 1, mintFeeEth: 0.0004, mintFeeApe: 1, difficulty: 'HARD (20M CAP)' },
    { id: 2, name: 'EPOCH 2 (ASCENSION)', startToken: 11, endToken: 30, count: 20, mintFeeUsd: 6, mintFeeEth: 0.0024, mintFeeApe: 6, difficulty: 'HARDER (20M CAP)' },
    { id: 3, name: 'EPOCH 3 (EXPANSION)', startToken: 31, endToken: 70, count: 40, mintFeeUsd: 20, mintFeeEth: 0.0080, mintFeeApe: 20, difficulty: 'VERY HARD' },
    { id: 4, name: 'EPOCH 4 (SURGE)', startToken: 71, endToken: 150, count: 80, mintFeeUsd: 40, mintFeeEth: 0.0160, mintFeeApe: 40, difficulty: 'VERY HARD+' },
    { id: 5, name: 'EPOCH 5 (NEXUS)', startToken: 151, endToken: 300, count: 150, mintFeeUsd: 60, mintFeeEth: 0.0240, mintFeeApe: 60, difficulty: 'EXTREME' },
    { id: 6, name: 'EPOCH 6 (APEX)', startToken: 301, endToken: 600, count: 300, mintFeeUsd: 88, mintFeeEth: 0.0352, mintFeeApe: 88, difficulty: 'EXTREME+' },
    { id: 7, name: 'EPOCH 7 (SOVEREIGN)', startToken: 601, endToken: 1200, count: 600, mintFeeUsd: 120, mintFeeEth: 0.0480, mintFeeApe: 120, difficulty: 'LEGENDARY' },
    { id: 8, name: 'EPOCH 8 (TITAN)', startToken: 1201, endToken: 2500, count: 1300, mintFeeUsd: 160, mintFeeEth: 0.0640, mintFeeApe: 160, difficulty: 'LEGENDARY+' },
    { id: 9, name: 'EPOCH 9 (MYTHIC)', startToken: 2501, endToken: 5000, count: 2500, mintFeeUsd: 180, mintFeeEth: 0.0720, mintFeeApe: 180, difficulty: 'MYTHIC' },
    { id: 10, name: 'EPOCH 10 (OMEGA)', startToken: 5001, endToken: 10000, count: 5000, mintFeeUsd: 220, mintFeeEth: 0.0880, mintFeeApe: 220, difficulty: 'OMEGA' },
  ];

  const displayedEpochs = (config.epochs && config.epochs.length > 0) ? config.epochs : DEFAULT_10_EPOCHS;

  // 10-Epoch mint prices state dictionary
  const [epochFees, setEpochFees] = useState<{ [id: number]: number | string }>(() => {
    const map: { [id: number]: number | string } = {};
    displayedEpochs.forEach(e => {
      map[e.id] = e.mintFeeUsd !== undefined ? e.mintFeeUsd : 5;
    });
    return map;
  });
  const [savingEpochId, setSavingEpochId] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [epochSuccessMsg, setEpochSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (config.epochs && config.epochs.length > 0) {
      setEpochFees(prev => {
        const next = { ...prev };
        config.epochs?.forEach(e => {
          if (e.mintFeeUsd !== undefined) {
            next[e.id] = e.mintFeeUsd;
          }
        });
        return next;
      });
    }
  }, [config.epochs]);

  // Confirmation modal state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [txState, setTxState] = useState<'idle' | 'pending' | 'confirmed'>('idle');
  const [confirmedTxHash, setConfirmedTxHash] = useState('');

  if (!isOpen) return null;

  const triggerConfirmation = (action: PendingAction) => {
    soundEffects.playClickSound();
    setPendingAction(action);
    setTxState('idle');
  };

  const handleConfirmTransaction = async () => {
    soundEffects.playClickSound();
    if (!pendingAction) return;
    setTxState('pending');

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const fakeTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setConfirmedTxHash(fakeTx);
    setTxState('confirmed');
    soundEffects.playProofFoundSound();

    pendingAction.applyFn();

    fetch('/api/admin/update-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: address,
        mintFeeHype: mintFee,
        workerCosts: { 1: 0, 2: worker2Cost, 3: worker3Cost, 4: worker4Cost, 5: worker5Cost },
        feeRecipient,
        isMiningPaused,
      }),
    }).catch(() => {});
  };

  const handleSaveMintPrice = () => {
    triggerConfirmation({
      title: 'Mint Price',
      field: 'NFT Mint Fee',
      oldValue: `${config.mintFeeHype || 0.0020} ETH`,
      newValue: `${mintFee} ETH`,
      applyFn: () => {
        onUpdateConfig({
          ...config,
          mintFeeHype: mintFee,
        });
      },
    });
  };

  const handleSaveSingleEpoch = (epochId: number) => {
    const raw = epochFees[epochId];
    const usd = Math.max(0, parseFloat(String(raw)) || 0);
    const prevUsd = config.epochs?.find(e => e.id === epochId)?.mintFeeUsd ?? 5;
    const ethDisplay = usd <= 0 ? '0.0000 ETH (FREE)' : `${usd < 1 ? (usd / 2500).toFixed(5) : (usd / 2500).toFixed(4)} ETH`;
    triggerConfirmation({
      title: `Update Epoch #${epochId} Mint Fee`,
      field: `Epoch #${epochId} Fee`,
      oldValue: `$${prevUsd} ETH`,
      newValue: `$${usd} ETH (${ethDisplay})`,
      applyFn: async () => {
        setSavingEpochId(epochId);
        try {
          let txHash: string | undefined;
          if (isAdmin && setEpochMintFeeOnChain) {
            try {
              let feeWei = 1n;
              if (usd > 0) {
                const ethStr = (usd / 2500).toFixed(8);
                const parsed = ethers.parseEther(ethStr);
                feeWei = parsed > 0n ? parsed : 1n;
              }
              const usdUint = Math.max(0, Math.round(usd));
              txHash = await setEpochMintFeeOnChain(epochId, feeWei, usdUint);
            } catch (onChainErr) {
              console.warn('On-chain fee update skipped/failed in modal:', onChainErr);
            }
          }

          const res = await fetch('/api/admin/epoch-fee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet: address || '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
              epochId,
              mintFeeUsd: usd,
              mintFeeEth: usd <= 0 ? 0 : Number((usd / 2500).toFixed(6)),
              mintFeeApe: usd,
              txHash,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setEpochSuccessMsg(`Epoch #${epochId} mint fee updated to $${usd} ETH!`);
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
          console.error('Failed to update epoch fee:', err);
        } finally {
          setSavingEpochId(null);
        }
      },
    });
  };

  const handleSaveAllEpochs = () => {
    triggerConfirmation({
      title: 'Batch Update All 10 Epochs',
      field: 'All 10 Epoch Mint Fees',
      oldValue: 'Current Fee Schedule',
      newValue: 'Custom 10-Epoch Schedule',
      applyFn: async () => {
        setIsSavingAll(true);
        try {
          const updates = displayedEpochs.map(e => {
            const raw = epochFees[e.id] !== undefined ? epochFees[e.id] : (e.mintFeeUsd ?? 5);
            const usd = Math.max(0, parseFloat(String(raw)) || 0);
            return {
              id: e.id,
              mintFeeUsd: usd,
              mintFeeEth: usd <= 0 ? 0 : Number((usd / 2500).toFixed(6)),
              mintFeeApe: usd,
            };
          });

          let txHash: string | undefined;
          if (isAdmin && setEpochMintFeesBatchOnChain) {
            try {
              const epochIds = updates.map(u => u.id);
              const newFeesWei = updates.map(u => {
                if (u.mintFeeUsd <= 0) return 1n;
                const ethStr = (u.mintFeeUsd / 2500).toFixed(8);
                const parsed = ethers.parseEther(ethStr);
                return parsed > 0n ? parsed : 1n;
              });
              const newFeesUsd = updates.map(u => Math.max(0, Math.round(u.mintFeeUsd)));
              txHash = await setEpochMintFeesBatchOnChain(epochIds, newFeesWei, newFeesUsd);
            } catch (onChainErr) {
              console.warn('Batch on-chain fee update skipped/failed in modal:', onChainErr);
            }
          }

          const res = await fetch('/api/admin/epoch-fees-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet: address || '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
              epochs: updates,
              txHash,
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
          setIsSavingAll(false);
        }
      },
    });
  };

  const handleSaveWorkerFees = () => {
    triggerConfirmation({
      title: 'Mining Worker Fees',
      field: 'Worker 2–5 Activation Costs',
      oldValue: `W2:${config.workerCosts[2]} | W3:${config.workerCosts[3]} | W4:${config.workerCosts[4]} | W5:${config.workerCosts[5]} HASHAPE`,
      newValue: `W2:${worker2Cost} | W3:${worker3Cost} | W4:${worker4Cost} | W5:${worker5Cost} HASHAPE`,
      applyFn: () => {
        onUpdateConfig({
          ...config,
          workerCosts: { 1: 0, 2: worker2Cost, 3: worker3Cost, 4: worker4Cost, 5: worker5Cost },
        });
      },
    });
  };

  const handleToggleMiningStatus = () => {
    const nextStatus = !isMiningPaused;
    triggerConfirmation({
      title: 'Mining Status',
      field: 'Protocol Mining State',
      oldValue: isMiningPaused ? 'PAUSED' : 'LIVE',
      newValue: nextStatus ? 'PAUSED' : 'LIVE',
      applyFn: () => {
        setIsMiningPaused(nextStatus);
      },
    });
  };

  const remaining = Math.max(0, maxSupply - totalMined);

  return (
    <div className="fixed inset-0 z-50 bg-[#24140a]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="paper-chassis max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#fdfbf7] shadow-[4px_4px_0px_#24140a] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-5 border-b-4 border-[#24140a] flex items-center justify-between bg-[#eee2ca] sticky top-0 z-10">
          <div>
            <div className="text-[10px] font-display text-[#d83a2a] font-bold uppercase tracking-widest mb-1">
              Admin → NFT Mining Settings
            </div>
            <h2 className="font-display font-black text-sm sm:text-base text-[#24140a] uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#d83a2a]" />
              <span>HASHAPE ADMIN / NFT MINING</span>
            </h2>
          </div>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClose();
            }}
            className="text-[#6b5443] hover:text-[#24140a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 text-xs font-mono bg-[#fdfbf7] text-[#24140a]">
          {/* SECTION 1: COLLECTION */}
          <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
            <h3 className="text-[#24140a] font-display font-bold uppercase tracking-wider mb-3 text-xs flex items-center justify-between">
              <span>[ COLLECTION ]</span>
              <span className={`px-2 py-0.5 border text-[10px] font-bold ${isMiningPaused ? 'bg-[#d83a2a] border-[#24140a] text-white' : 'bg-[#2e7d32] border-[#24140a] text-white'}`}>
                {isMiningPaused ? '● PAUSED' : '● LIVE'}
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
              <div className="bg-[#fdfbf7] p-2.5 border border-[#24140a]">
                <span className="text-[#6b5443] text-[10px] font-display block uppercase">Max Supply</span>
                <span className="text-[#24140a] font-bold">{maxSupply.toLocaleString()}</span>
              </div>
              <div className="bg-[#fdfbf7] p-2.5 border border-[#24140a]">
                <span className="text-[#6b5443] text-[10px] font-display block uppercase">Minted</span>
                <span className="text-[#19638b] font-bold">{totalMined.toLocaleString()}</span>
              </div>
              <div className="bg-[#fdfbf7] p-2.5 border border-[#24140a]">
                <span className="text-[#6b5443] text-[10px] font-display block uppercase">Remaining</span>
                <span className="text-[#24140a] font-bold">{remaining.toLocaleString()}</span>
              </div>
              <div className="bg-[#fdfbf7] p-2.5 border border-[#24140a]">
                <span className="text-[#6b5443] text-[10px] font-display block uppercase">Status</span>
                <span className={isMiningPaused ? 'text-[#d83a2a] font-bold' : 'text-[#2e7d32] font-bold'}>
                  {isMiningPaused ? 'PAUSED' : 'LIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: 10-EPOCH MINT PRICING MATRIX */}
          <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-[#24140a] font-display font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#d83a2a]" />
                  <span>[ 10-EPOCH MINT PRICING MATRIX ]</span>
                </h3>
                <p className="text-[10px] text-[#6b5443] font-mono mt-0.5 font-medium">
                  Admin-editable mint fee per epoch ($X USD / ETH). Changes update live across contract, backend, & UI.
                </p>
              </div>
              <button
                onClick={handleSaveAllEpochs}
                disabled={isSavingAll}
                className="paper-btn-red px-3 py-1.5 text-[11px] flex items-center gap-1.5 self-start sm:self-auto font-bold"
              >
                {isSavingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>[ SAVE ALL 10 EPOCHS ]</span>
              </button>
            </div>

            {epochSuccessMsg && (
              <div className="mb-3 p-2 bg-[#2e7d32]/15 border-2 border-[#2e7d32] text-[#2e7d32] text-[11px] font-mono flex items-center gap-2 font-bold">
                <Check className="w-4 h-4" />
                <span>{epochSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayedEpochs.map((ep) => {
                const currentVal = epochFees[ep.id] !== undefined ? epochFees[ep.id] : (ep.mintFeeUsd ?? 5);
                const numVal = parseFloat(String(currentVal)) || 0;
                const ethVal = numVal <= 0 ? '0.0000 ETH (FREE)' : `${numVal < 1 ? (numVal / 2500).toFixed(5) : (numVal / 2500).toFixed(4)} ETH`;
                const isActive = config.currentEpoch?.id === ep.id;

                return (
                  <div
                    key={ep.id}
                    className={`p-2.5 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#fdfbf7] border-[#d83a2a] shadow-[2px_2px_0px_#d83a2a]'
                        : 'bg-[#eee2ca] border-[#24140a]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`font-display font-black text-xs ${isActive ? 'text-[#d83a2a]' : 'text-[#24140a]'}`}>
                        #{ep.id.toString().padStart(2, '0')}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-bold text-[11px] text-[#24140a]">
                            {ep.name}
                          </span>
                          {isActive && (
                            <span className="bg-[#d83a2a] border border-[#24140a] text-white px-1.5 py-0.5 text-[9px] font-display font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#6b5443] font-mono">
                          Tokens #{ep.startToken}–#{ep.endToken} ({ep.count} NFTs) • {ep.difficulty}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      <div className="flex items-center gap-1 bg-[#fdfbf7] border-2 border-[#24140a] px-2 py-1 shadow-[1px_1px_0px_#24140a]">
                        <span className="text-[#d48818] font-bold font-display text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEpochFees(prev => ({ ...prev, [ep.id]: val }));
                          }}
                          className="w-14 bg-transparent text-right text-[#24140a] font-mono font-bold text-xs outline-none"
                        />
                        <span className="text-[#6b5443] text-[10px] font-mono">USD</span>
                      </div>
                      <span className="text-[10px] text-[#19638b] font-mono whitespace-nowrap font-bold">
                        ≈ {ethVal}
                      </span>
                      <button
                        onClick={() => handleSaveSingleEpoch(ep.id)}
                        disabled={savingEpochId === ep.id}
                        className="paper-btn-gold px-2.5 py-1 text-[10px] flex items-center gap-1 font-bold"
                      >
                        {savingEpochId === ep.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>SAVE</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: MINING WORKERS */}
          <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[#24140a] font-display font-bold uppercase tracking-wider text-xs">
                [ MINING WORKERS ]
              </h3>
              <span className="text-[10px] text-[#6b5443] font-mono font-medium">Independently configurable</span>
            </div>

            <div className="mb-3 p-2 bg-[#fdfbf7] border border-[#24140a] flex items-center justify-between text-[10px] font-mono flex-wrap gap-1">
              <span className="text-[#6b5443] uppercase font-bold">Deployed NFT Contract (Chain 4663):</span>
              <code className="text-[#19638b] font-bold select-all">0x7D959C29aa1098d93b307Ca40bEEEc0bF7bbfF85</code>
            </div>

            <div className="mb-3 p-2 bg-[#fdfbf7] border border-[#24140a] flex items-center justify-between text-[10px] font-mono flex-wrap gap-1">
              <span className="text-[#6b5443] uppercase font-bold">Rig Activation Token Contract:</span>
              <code className="text-[#d83a2a] font-bold select-all">0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc</code>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] border-2 border-[#24140a]">
                <span className="text-[#24140a] font-bold font-display text-[11px]">Worker 01</span>
                <span className="text-[#2e7d32] font-bold font-display text-[11px]">[ FREE ]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] border-2 border-[#24140a]">
                <span className="text-[#24140a] font-bold font-display text-[11px]">Worker 02</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={worker2Cost}
                    onChange={(e) => setWorker2Cost(parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#fdfbf7] border-2 border-[#24140a] px-2 py-1 text-right text-[#24140a] font-mono font-bold"
                  />
                  <span className="text-[#6b5443] text-xs font-bold">HASHAPE</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] border-2 border-[#24140a]">
                <span className="text-[#24140a] font-bold font-display text-[11px]">Worker 03</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={worker3Cost}
                    onChange={(e) => setWorker3Cost(parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#fdfbf7] border-2 border-[#24140a] px-2 py-1 text-right text-[#24140a] font-mono font-bold"
                  />
                  <span className="text-[#6b5443] text-xs font-bold">HASHAPE</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] border-2 border-[#24140a]">
                <span className="text-[#24140a] font-bold font-display text-[11px]">Worker 04</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={worker4Cost}
                    onChange={(e) => setWorker4Cost(parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#fdfbf7] border-2 border-[#24140a] px-2 py-1 text-right text-[#24140a] font-mono font-bold"
                  />
                  <span className="text-[#6b5443] text-xs font-bold">HASHAPE</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] border-2 border-[#24140a]">
                <span className="text-[#24140a] font-bold font-display text-[11px]">Worker 05</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={worker5Cost}
                    onChange={(e) => setWorker5Cost(parseInt(e.target.value) || 0)}
                    className="w-20 bg-[#fdfbf7] border-2 border-[#24140a] px-2 py-1 text-right text-[#24140a] font-mono font-bold"
                  />
                  <span className="text-[#6b5443] text-xs font-bold">HASHAPE</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveWorkerFees}
              className="paper-btn-gold w-full py-2.5 text-xs flex items-center justify-center gap-1.5 font-bold"
            >
              <Save className="w-3.5 h-3.5" />
              <span>[ SAVE WORKER FEES ]</span>
            </button>
          </div>

          {/* SECTION 4: DIFFICULTY & MINING CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a] space-y-3">
              <h3 className="text-[#24140a] font-display font-bold uppercase tracking-wider text-xs">
                [ DIFFICULTY ]
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-[#6b5443]">Mode:</span>
                <span className="text-[#19638b] font-bold font-display text-[11px]">[ {difficultyMode} ]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b5443]">Current Difficulty:</span>
                <span className="text-[#24140a] font-bold font-display text-[11px]">{difficultyTier}</span>
              </div>
              <button
                onClick={() => {
                  const modes = ['Dynamic', 'Manual Fixed', 'Emergency Easy'];
                  const nextIdx = (modes.indexOf(difficultyMode) + 1) % modes.length;
                  const newMode = modes[nextIdx];
                  triggerConfirmation({
                    title: 'Update Mining Difficulty Mode',
                    field: 'Difficulty Mode',
                    oldValue: difficultyMode,
                    newValue: newMode,
                    applyFn: () => setDifficultyMode(newMode),
                  });
                }}
                className="paper-btn-kraft w-full py-2 text-[10px] font-bold"
              >
                [ EDIT CONFIGURATION ]
              </button>
            </div>

            <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a] space-y-3">
              <h3 className="text-[#24140a] font-display font-bold uppercase tracking-wider text-xs">
                [ MINING ]
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-[#6b5443]">Status:</span>
                <span className={isMiningPaused ? 'text-[#d83a2a] font-bold font-display text-[11px]' : 'text-[#2e7d32] font-bold font-display text-[11px]'}>
                  {isMiningPaused ? 'PAUSED' : 'LIVE'}
                </span>
              </div>
              <button
                onClick={handleToggleMiningStatus}
                className={`w-full py-2 text-[10px] font-display font-bold border-2 transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#24140a] ${
                  isMiningPaused
                    ? 'paper-btn-green'
                    : 'paper-btn-red'
                }`}
              >
                {isMiningPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>[ RESUME MINING ]</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>[ PAUSE MINING ]</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 5: FEE RECIPIENT & METADATA */}
          <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
            <h3 className="text-[#24140a] font-display font-bold uppercase tracking-wider mb-2 text-xs">
              [ FEE RECIPIENT & METADATA ]
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-[#6b5443] text-[10px] font-display block mb-1 font-bold">FEE RECIPIENT</span>
                <code className="text-[#24140a] font-bold break-all bg-[#fdfbf7] p-1.5 border border-[#24140a] block">{feeRecipient}</code>
              </div>
              <div className="text-[10px] text-[#19638b] font-mono font-medium">
                5% Secondary OpenSea Creator Royalty Enforced via ERC-2981 to this address.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#eee2ca] border-t-4 border-[#24140a] flex items-center justify-between sticky bottom-0 z-10">
          <div className="text-[10px] font-mono text-[#6b5443] font-bold">
            Admin wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0xb8E3...c93C'}
          </div>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClose();
            }}
            className="paper-btn-kraft px-5 py-2 text-xs font-bold"
          >
            [ CLOSE ]
          </button>
        </div>
      </div>

      {/* SECTION 11: ADMIN TRANSACTION CONFIRMATION MODAL */}
      {pendingAction && (
        <div className="fixed inset-0 z-60 bg-[#24140a]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="paper-chassis max-w-md w-full p-6 shadow-[4px_4px_0px_#24140a] font-mono text-xs space-y-5 animate-in zoom-in duration-150 bg-[#fdfbf7]">
            {txState === 'idle' && (
              <>
                <div className="flex items-center justify-between pb-3 border-b-2 border-[#24140a]">
                  <h3 className="font-display font-black text-xs text-[#24140a] uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#d83a2a]" />
                    <span>[ CONFIRM ADMIN ACTION ]</span>
                  </h3>
                  <button onClick={() => setPendingAction(null)} className="text-[#6b5443] hover:text-[#24140a]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] text-center space-y-2 shadow-[2px_2px_0px_#24140a]">
                  <span className="text-[#6b5443] uppercase text-[10px] font-display block font-bold">{pendingAction.title}</span>
                  <div className="text-[#6b5443] line-through text-sm font-bold">
                    {pendingAction.oldValue}
                  </div>
                  <div className="text-[#d83a2a] text-xs font-black">↓</div>
                  <div className="text-[#24140a] text-base font-black font-display">
                    {pendingAction.newValue}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      soundEffects.playClickSound();
                      setPendingAction(null);
                    }}
                    className="paper-btn-kraft px-4 py-2 text-xs font-bold"
                  >
                    [ CANCEL ]
                  </button>
                  <button
                    onClick={handleConfirmTransaction}
                    className="paper-btn-red px-6 py-2 text-xs flex items-center gap-1.5 font-bold"
                  >
                    <span>[ CONFIRM TRANSACTION ]</span>
                  </button>
                </div>
              </>
            )}

            {txState === 'pending' && (
              <div className="text-center py-6 space-y-3">
                <Loader2 className="w-8 h-8 text-[#d83a2a] animate-spin mx-auto" />
                <h4 className="font-display font-black text-xs text-[#24140a] uppercase tracking-wider">
                  TRANSACTION PENDING...
                </h4>
                <p className="text-[#6b5443] text-[11px] font-mono">
                  Broadcasting authoritative parameter update to Robinhood EVM L2 verifier...
                </p>
              </div>
            )}

            {txState === 'confirmed' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#eee2ca] border-2 border-[#2e7d32] text-center space-y-2 shadow-[2px_2px_0px_#2e7d32]">
                  <Check className="w-8 h-8 text-[#2e7d32] mx-auto" />
                  <h4 className="font-display font-black text-xs text-[#24140a] uppercase tracking-wider">
                    ✓ SETTINGS UPDATED
                  </h4>
                  <div className="text-[11px] text-[#6b5443] font-mono font-medium">
                    Protocol configuration state synchronized successfully.
                  </div>
                </div>

                <div className="p-3 bg-[#fdfbf7] border-2 border-[#24140a] space-y-1">
                  <span className="text-[#6b5443] text-[10px] font-display block uppercase font-bold">Transaction:</span>
                  <code className="text-[#19638b] text-[10px] break-all block font-bold">
                    {confirmedTxHash}
                  </code>
                </div>

                <button
                  onClick={() => {
                    soundEffects.playClickSound();
                    setPendingAction(null);
                    setTxState('idle');
                  }}
                  className="paper-btn-green w-full py-2.5 text-xs font-bold"
                >
                  [ DONE ]
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
