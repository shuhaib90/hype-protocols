import React, { useState, useEffect } from 'react';
import { MiningProof, EpochInfo } from '../types';
import { Sparkles, Clock, ShieldCheck, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface PendingMintBannerProps {
  proof: MiningProof | null;
  currentEpoch?: EpochInfo;
  targetTokenId?: number;
  onMintNow: () => void;
  onDismiss: () => void;
}

export const PendingMintBanner: React.FC<PendingMintBannerProps> = ({
  proof,
  currentEpoch,
  targetTokenId,
  onMintNow,
  onDismiss,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!proof) return null;

  const solvedAt = proof.timestamp || (proof as any).solvedAt || now;
  const expiresAt = (proof as any).expiresAt || (solvedAt + 2 * 3600 * 1000);
  const remainingMs = Math.max(0, expiresAt - now);
  const isExpired = remainingMs <= 0;

  const totalSecs = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSecs % 60).toString().padStart(2, '0');
  const countdownStr = `${hours}h ${minutes}m ${seconds}s`;

  // Percent of 2 hours remaining
  const twoHoursMs = 2 * 3600 * 1000;
  const percentRemaining = Math.min(100, Math.max(0, (remainingMs / twoHoursMs) * 100));

  const tokenId = (proof as any).tokenId || targetTokenId || (currentEpoch ? currentEpoch.startToken + (currentEpoch.minedInEpoch || 0) : 1);
  const feeUsd = currentEpoch?.mintFeeUsd ?? 5;
  const feeEthStr = typeof currentEpoch?.mintFeeEth === 'number' && currentEpoch.mintFeeEth > 0
    ? `${currentEpoch.mintFeeEth} ETH`
    : (feeUsd <= 0 ? '0.0000 ETH (FREE)' : `${(feeUsd / 2500).toFixed(4)} ETH`);

  const isUrgent = totalSecs > 0 && totalSecs < 15 * 60; // < 15 mins

  if (isExpired) {
    return (
      <div className="paper-chassis bg-[#eee2ca] border-2 border-[#d83a2a] p-4 shadow-[2px_2px_0px_#24140a] font-dot text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-[#d83a2a]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">
              2-HOUR MINT DEADLINE EXPIRED // TOKEN #{tokenId}
            </span>
            <span className="text-[#6b5443] text-[11px] font-medium">
              The 2-hour reservation window for this solved proof has passed. Start the mining rig to solve a new block.
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            soundEffects.playClickSound();
            onDismiss();
          }}
          className="paper-btn-kraft px-4 py-1.5 text-xs uppercase font-bold flex-shrink-0"
        >
          DISMISS
        </button>
      </div>
    );
  }

  return (
    <div className={`paper-chassis overflow-hidden border-2 border-[#d83a2a] shadow-[3px_3px_0px_#24140a] font-dot transition-all ${
      isUrgent ? 'bg-[#fff5f5]' : 'bg-[#fdfbf7]'
    }`}>
      {/* Top Banner Ribbon */}
      <div className="paper-header-red px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="font-jersey text-base text-white tracking-wider">
            MINT ENTITLEMENT RESERVED // TOKEN #{tokenId}
          </span>
          <span className="bg-[#f5ebd7] text-[#d83a2a] px-2 py-0.2 border border-[#24140a] text-[10px] font-bold uppercase tracking-wider">
            2-HR WINDOW ACTIVE
          </span>
        </div>

        {/* Live Countdown Clock */}
        <div className="flex items-center space-x-2 bg-[#24140a] text-white px-2.5 py-1 border border-[#24140a]">
          <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-[#ff4444] animate-ping' : 'text-[#e5a93c]'}`} />
          <span className="text-[10px] text-[#eee2ca] uppercase font-bold">DEADLINE:</span>
          <span className={`font-mono font-bold text-sm tracking-wider ${isUrgent ? 'text-[#ff4444]' : 'text-[#e5a93c]'}`}>
            {countdownStr}
          </span>
        </div>
      </div>

      {/* Progress Bar for the 2-Hour Window */}
      <div className="w-full bg-[#eee2ca] h-1.5 border-b border-[#24140a] overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-[#d83a2a]' : 'bg-[#2e7d32]'
          }`}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>

      {/* Main Content Details */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[#24140a] font-bold text-sm">
              HashApe #{tokenId}
            </span>
            <span className="text-[#6b5443]">|</span>
            <span className="text-[#19638b] font-bold">
              Epoch #{currentEpoch?.id || 1} ({feeEthStr})
            </span>
            <span className="text-[#6b5443]">|</span>
            <span className="text-[#2e7d32] font-bold">
              Solved Nonce: <code className="font-mono">{proof.nonce}</code>
            </span>
          </div>

          <p className="text-xs text-[#6b5443] font-medium leading-relaxed max-w-2xl">
            You successfully solved this block! Your cryptographic proof is securely held for <strong className="text-[#24140a] font-bold">2 hours</strong> from solve time. You can claim it now or come back anytime before the timer runs out.
          </p>

          <div className="text-[11px] text-[#6b5443] flex items-center gap-3 flex-wrap">
            <span>Proof Hash: <code className="text-[#19638b] font-mono font-bold">{proof.hash ? proof.hash.slice(0, 16) + '...' + proof.hash.slice(-8) : 'Verified'}</code></span>
            <span>• Solved with: <strong className="text-[#24140a]">{(proof as any).gpuName || 'WebGPU'}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0 self-end lg:self-center">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              if (window.confirm('Are you sure you want to discard this solved proof? You will forfeit your reserved mint entitlement.')) {
                onDismiss();
              }
            }}
            className="paper-btn-kraft px-3 py-2 text-xs flex items-center gap-1.5 uppercase font-bold text-[#6b5443] hover:text-[#d83a2a]"
            title="Discard this solution and clear reservation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>DISCARD</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClickSound();
              onMintNow();
            }}
            className="paper-btn-red px-6 py-2.5 text-xs flex items-center space-x-2 uppercase font-bold shadow-[2px_2px_0px_#24140a] animate-pulse"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>MINT RESERVED NFT NOW</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
