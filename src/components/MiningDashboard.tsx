import React, { useState, useEffect } from 'react';
import { MiningStatus, DifficultyBand, EpochInfo } from '../types';
import { useWallet } from '../web3/WalletContext';
import { GPUInfo } from '../mining/WebGPUEngine';
import { Pickaxe, Square, Cpu, Zap, Hash, Clock, CheckCircle2, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface MiningDashboardProps {
  status: MiningStatus;
  gpuInfo: GPUInfo | null;
  totalHashrate: number;
  activeWorkerCount: number;
  difficultyBand: DifficultyBand;
  noncesScanned: number;
  currentHash: string;
  currentNonce: string;
  isMining: boolean;
  walletMints?: number;
  maxMints?: number;
  isCapped?: boolean;
  currentEpoch?: EpochInfo;
  onStart: () => void;
  onStop: () => void;
}

export const MiningDashboard: React.FC<MiningDashboardProps> = ({
  status,
  gpuInfo,
  totalHashrate,
  activeWorkerCount,
  difficultyBand,
  noncesScanned,
  currentHash,
  currentNonce,
  isMining,
  walletMints = 0,
  maxMints = 5,
  isCapped = false,
  currentEpoch,
  onStart,
  onStop,
}) => {
  const { isConnected, connectWallet, address, tokenHypeBalance } = useWallet();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: any = null;
    if (isMining) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (status === 'READY') {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isMining, status]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStart = () => {
    if (isCapped) return;
    soundEffects.playClickSound();
    onStart();
  };

  const handleStop = () => {
    soundEffects.playClickSound();
    onStop();
  };

  const handleConnect = () => {
    soundEffects.playClickSound();
    connectWallet();
  };

  // Determine leading zero bits based on active epoch or difficulty band
  const getTargetBits = () => {
    if (currentEpoch) {
      // Genesis Epoch 1 = 32 bits, Epoch 2 = 33 bits, etc.
      return 31 + currentEpoch.id;
    }
    return 32;
  };

  const targetBits = getTargetBits();
  const nextTokenId = (currentEpoch?.nextToken) || 4;
  const currentFeeUsd = currentEpoch?.mintFeeUsd || 5;
  const ethEquiv = (currentFeeUsd / 2500).toFixed(4);

  // Compute animated active blocks in the 32-bit difficulty bar
  const totalBlocks = 32;
  const activeBlocksCount = Math.min(totalBlocks, Math.floor((targetBits / 40) * totalBlocks));

  return (
    <div id="miner-rig-section" className="paper-chassis mb-10 overflow-hidden bg-[#fdfbf7]">
      {/* Top Header Bar */}
      <div className="paper-header-red px-4 py-2 flex items-center justify-between text-xs tracking-wider">
        <div className="flex items-center space-x-2">
          <span className="font-jersey text-base tracking-wider">FORGE MAIN RIG // WEBGPU WGSL CORE</span>
          <span className="text-[10px] font-dot text-[#24140a] bg-[#f5ebd7] px-1.5 py-0.5 font-bold border border-[#24140a]">
            ROBINHOOD L2
          </span>
        </div>
        <div className="flex items-center space-x-3 font-dot text-[11px]">
          {isCapped ? (
            <span className="text-white font-bold bg-[#d83a2a] px-2 py-0.5 border border-[#24140a]">
              ● 5/5 WALLET QUOTA REACHED
            </span>
          ) : isMining ? (
            <span className="text-white font-bold bg-[#2e7d32] px-2 py-0.5 border border-[#24140a] animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white inline-block animate-ping" />
              MINING ACTIVE
            </span>
          ) : (
            <span className="text-white font-bold">
              ▪ RIG STANDBY
            </span>
          )}
        </div>
      </div>

      {/* Main Terminal Rig Split */}
      <div className="p-5 sm:p-7 bg-[#fdfbf7] space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Punch-Card / Paper Viewport */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="relative aspect-square w-full max-w-[280px] bg-[#eee2ca] border-3 border-[#24140a] overflow-hidden flex items-center justify-center group shadow-[2px_2px_0px_#24140a]">
              {/* Scanline Animation */}
              {isMining && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d83a2a]/20 to-transparent animate-scanline pointer-events-none z-10" />
              )}

              {/* Viewport Content */}
              <img
                src={`/images/${Math.max(1, nextTokenId - 1)}.png`}
                alt="Mining Target Ape"
                className={`w-full h-full object-cover pixelated transition-all duration-300 ${
                  isMining
                    ? 'opacity-95 filter contrast-125 saturate-150 animate-pulse'
                    : 'opacity-80 filter sepia'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/preview.png';
                }}
              />

              {/* Status Banner */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#d83a2a] shadow-[1px_1px_0px_#24140a]">
                {isMining ? 'HASHING...' : 'TARGET #000' + nextTokenId}
              </div>

              {/* Nonce HUD */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#24140a] truncate max-w-[180px] shadow-[1px_1px_0px_#24140a]">
                NONCE: {currentNonce || '0x00'}
              </div>
            </div>

            <div className="text-[11px] font-dot text-[#6b5443] mt-2 font-bold">
              {gpuInfo?.name ? gpuInfo.name : 'WebGPU Hardware Compute Core'}
            </div>
          </div>

          {/* Right: Telemetry, Target Bit-Meter, & Controls */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
            {/* Top Row: Target & Leading Zero Bits */}
            <div>
              <div className="flex items-center justify-between text-xs font-dot mb-1.5">
                <span className="text-[#24140a] font-bold uppercase tracking-wider">
                  TARGET TO BEAT: HASHAPE #{nextTokenId}
                </span>
                <span className="text-[#d83a2a] font-bold">
                  {targetBits} LEADING ZERO BITS ({difficultyBand})
                </span>
              </div>

              {/* Segmented 32-Block Bit Bar */}
              <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 mb-2">
                {Array.from({ length: totalBlocks }).map((_, idx) => {
                  const isActive = idx < activeBlocksCount;
                  return (
                    <div
                      key={idx}
                      className={`h-4 border-2 border-[#24140a] transition-all ${
                        isActive
                          ? 'bg-[#d83a2a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]'
                          : 'bg-[#eee2ca]'
                      }`}
                    />
                  );
                })}
              </div>

              <p className="text-xs font-dot text-[#6b5443] leading-relaxed font-medium">
                HashApe #{nextTokenId} unlocks for the first machine that discovers a hash strictly below the difficulty target. Your wallet address is pre-hashed into the challenge to prevent mempool front-running.
              </p>
            </div>

            {/* Middle Row: Live Telemetry Grid (6 Metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">COMPUTE SPEED</span>
                <span className="text-base font-jersey font-bold text-[#24140a]">
                  {totalHashrate.toFixed(1)} <span className="text-[10px] font-dot text-[#d83a2a]">MH/S</span>
                </span>
              </div>

              <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">HASHES COMPUTED</span>
                <span className="text-base font-jersey font-bold text-[#24140a]">
                  {noncesScanned.toLocaleString()}
                </span>
              </div>

              <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">GPU LOAD</span>
                <span className="text-sm font-jersey font-bold text-[#2e7d32] flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isMining ? 'bg-[#2e7d32] animate-ping' : 'bg-[#6b5443]'}`} />
                  {isMining ? '100% MAX' : 'IDLE 0%'}
                </span>
              </div>

              <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">GPU POWER</span>
                <span className="text-base font-jersey font-bold text-[#d83a2a]">
                  {isMining ? `~${160 + activeWorkerCount * 25}W` : '15W IDLE'}
                </span>
              </div>

              <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">SESSION TIME</span>
                <span className="text-base font-jersey font-bold text-[#19638b]">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>

              <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">WALLET LIMIT</span>
                <span className="text-base font-jersey font-bold text-[#24140a]">
                  {walletMints} <span className="text-[10px] font-dot text-[#6b5443]">/ {maxMints}</span>
                </span>
              </div>
            </div>

            {/* Bottom Controls Row: Worker Toggles, Price, and Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t-2 border-[#24140a]">
              {/* Left specs: Hardware & Fee */}
              <div className="flex items-center gap-4 text-xs font-dot">
                <div>
                  <span className="text-[#6b5443] block text-[10px] font-bold">NEXT HASHAPE MINT FEE</span>
                  <span className="text-[#d83a2a] font-bold text-sm sm:text-base">
                    ${currentFeeUsd} ETH <span className="text-xs text-[#6b5443]">({ethEquiv} ETH)</span>
                  </span>
                </div>
                <div className="h-8 w-[2px] bg-[#24140a]" />
                <div>
                  <span className="text-[#6b5443] block text-[10px] font-bold">GPU WORKERS</span>
                  <span className="text-[#24140a] font-bold text-sm">
                    {activeWorkerCount} ACTIVE / 5
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center space-x-3">
                {isCapped ? (
                  <button
                    disabled
                    className="paper-btn-kraft px-6 py-2.5 text-xs text-[#d83a2a] border-2 border-[#d83a2a] cursor-not-allowed opacity-60 font-bold"
                  >
                    MAX 5 NFTS REACHED
                  </button>
                ) : isMining ? (
                  <button
                    onClick={handleStop}
                    className="paper-btn-kraft px-6 py-2.5 text-sm sm:text-base text-[#d83a2a] border-2 border-[#d83a2a] flex items-center space-x-2 font-bold"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>STOP MINING</span>
                  </button>
                ) : isConnected ? (
                  <button
                    onClick={handleStart}
                    className="paper-btn-red px-8 py-2.5 text-base sm:text-lg flex items-center space-x-2"
                  >
                    <Pickaxe className="w-5 h-5" />
                    <span>START MINING</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="paper-btn-red px-8 py-2.5 text-base sm:text-lg flex items-center space-x-2"
                  >
                    <Zap className="w-5 h-5" />
                    <span>CONNECT WALLET</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip: Hardened PoW Telemetry & Constant Weight Status */}
        <div className="pt-3 border-t-2 border-[#24140a] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-dot">
            <div className="flex items-center space-x-2">
              <span className="bg-[#eee2ca] px-2 py-0.5 border border-[#24140a] text-[#2e7d32] font-bold shadow-[1px_1px_0px_#24140a]">
                ● CONSTANT GPU WEIGHT (100%)
              </span>
              <span className="text-[#6b5443] font-medium hidden md:inline">
                Difficulty strictly determined by Epoch #{currentEpoch?.id || 1} & Quota ({walletMints}/5) — zero dilution from idle rigs.
              </span>
            </div>
            <div className="flex items-center space-x-2 font-mono">
              <span className="text-[#6b5443] text-[10px] uppercase font-dot font-bold">LIVE HASH:</span>
              <span className="truncate max-w-[220px] text-[#19638b] font-bold bg-[#eee2ca] px-2 py-0.5 border border-[#24140a]">
                {currentHash ? currentHash.slice(0, 24) + '...' : '0x00000000...'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between shadow-[1px_1px_0px_#24140a]">
              <span className="text-[10px] font-dot text-[#6b5443] font-bold">ALGORITHM</span>
              <span className="font-bold text-[#24140a]">Keccak-256 WGSL</span>
            </div>
            <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between shadow-[1px_1px_0px_#24140a]">
              <span className="text-[10px] font-dot text-[#6b5443] font-bold">GPU PARALLEL NODES</span>
              <span className="font-bold text-[#2e7d32]">{activeWorkerCount} ONLINE (SAME WEIGHT)</span>
            </div>
            <div className="p-2 bg-[#eee2ca] border-2 border-[#24140a] flex items-center justify-between shadow-[1px_1px_0px_#24140a]">
              <span className="text-[10px] font-dot text-[#6b5443] font-bold">POW HARDENING</span>
              <span className="font-bold text-[#d83a2a]">{difficultyBand}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
