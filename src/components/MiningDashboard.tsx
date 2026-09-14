import React, { useState, useEffect } from 'react';
import { MiningStatus, DifficultyBand, EpochInfo, NetworkMiningStats } from '../types';
import { useWallet } from '../web3/WalletContext';
import { GPUInfo } from '../mining/WebGPUEngine';
import { Pickaxe, Square, Cpu, Zap, Hash, Clock, CheckCircle2, ShieldAlert, Sparkles, Layers, Users, Activity, Radio, Gauge, Terminal } from 'lucide-react';
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
  activeMinersCount?: number;
  unsolvedCount?: number;
  networkStats?: NetworkMiningStats;
  onStart: () => void;
  onStop: () => void;
}

export const MiningDashboard: React.FC<MiningDashboardProps> = ({
  status,
  gpuInfo,
  totalHashrate = 0,
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
  activeMinersCount,
  unsolvedCount,
  networkStats,
  onStart,
  onStop,
}) => {
  const { isConnected, connectWallet, address, tokenHypeBalance } = useWallet();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [collectionLoopId, setCollectionLoopId] = useState(1);

  // Animated collection preview loop
  useEffect(() => {
    const speedMs = isMining ? 350 : 1500;
    const interval = setInterval(() => {
      setCollectionLoopId((prev) => (prev % 100) + 1);
    }, speedMs);
    return () => clearInterval(interval);
  }, [isMining]);

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

  // Internal hard target for ALL epochs: (30 + epochId) leading zero bits
  // This matches the engine's hardTarget formula exactly
  // Epoch 1: 31 bits (~3 min @12 MH/s), Epoch 2: 32 bits (~6 min),
  // Epoch 3: 33 bits (~12 min), Epoch 4+: progressively harder, 20-min cap
  const getTargetBits = () => {
    if (currentEpoch) return 30 + currentEpoch.id;
    return 31;
  };

  const targetBits = getTargetBits();
  const nextTokenId = (currentEpoch?.nextToken) || 4;
  const currentFeeUsd = currentEpoch?.mintFeeUsd ?? 5;
  const ethEquiv = currentFeeUsd <= 0 
    ? '0.0000' 
    : (currentFeeUsd < 1 ? (currentFeeUsd / 2500).toFixed(5) : (currentFeeUsd / 2500).toFixed(4));

  const effectiveDifficultyBand = difficultyBand + ' • 20 MIN CAP';

  // Compute probability, odds, and estimated time to solve
  const expectedHashes = 2 ** targetBits;
  const effectiveHashrateMH = totalHashrate > 0 ? totalHashrate : activeWorkerCount * 2.5;
  const effectiveHashrateHps = effectiveHashrateMH * 1_000_000;

  // GPU-dependent ETA: faster GPUs show shorter ETA, capped at 20 min (1200s) for ALL epochs
  const rawEstSeconds = Math.max(1, Math.round(expectedHashes / effectiveHashrateHps));
  const estSecondsToSolve = Math.min(rawEstSeconds, 1200);
  const formatEstTime = (secs: number) => {
    if (secs < 60) return `~${secs}s`;
    if (secs < 3600) {
      const m = Math.floor(secs / 60);
      const s = Math.round(secs % 60);
      return `~${m}m ${s > 0 ? s + 's' : ''}`.trim();
    }
    const h = (secs / 3600).toFixed(1);
    return `~${h}h`;
  };
  const estTimeToSolveStr = formatEstTime(estSecondsToSolve);

  const formatOdds = (n: number) => {
    if (n >= 1e9) return `1 in ${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `1 in ${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `1 in ${(n / 1e3).toFixed(1)}K`;
    return `1 in ${Math.round(n)}`;
  };
  const winOddsStr = formatOdds(expectedHashes);

  const hashesPerMin = effectiveHashrateHps * 60;
  // GPU-dependent win chance: faster hashrate = higher chance per minute
  const winChancePerMin = Math.min(100, (hashesPerMin / expectedHashes) * 100);
  const winChanceStr = winChancePerMin >= 1 
    ? `${winChancePerMin.toFixed(1)}%` 
    : winChancePerMin >= 0.01 
    ? `${winChancePerMin.toFixed(2)}%` 
    : `<0.01%`;

  const gpuDisplayName = gpuInfo?.name || 'WebGPU Compute Core';

  // Compute animated active blocks in the 32-bit difficulty bar
  const totalBlocks = 32;
  const activeBlocksCount = Math.min(totalBlocks, Math.floor((targetBits / 40) * totalBlocks));

  const displayActiveMiners = activeMinersCount || networkStats?.activeMinersCount || (isMining ? 4 : 3);
  const displayUnsolvedMiners = unsolvedCount || networkStats?.unsolvedCount || displayActiveMiners;
  const networkHashrateDisplay = networkStats?.networkHashrateMH || (displayActiveMiners * 14.5);

  return (
    <div id="miner-rig-section" className="paper-chassis mb-10 overflow-hidden bg-[#fdfbf7]">
      {/* Top Header Bar */}
      <div className="paper-header-red px-4 py-2 flex items-center justify-between text-xs tracking-wider">
        <div className="flex items-center space-x-2">
          <span className="font-jersey text-base tracking-wider truncate max-w-[320px] sm:max-w-none">
            FORGE MAIN RIG // {gpuDisplayName.toUpperCase()}
          </span>
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

      {/* LIVE MINING COCKPIT HUD (Active when mining starts) */}
      {isMining ? (
        <div className="border-b-3 border-[#24140a] bg-[#eee2ca] p-4 sm:p-5 relative overflow-hidden animate-fadeIn">
          {/* Scanline texture */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d83a2a]/10 to-transparent pointer-events-none animate-scanline" />

          {/* Top Status & Network Competition Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-2 border-[#24140a]">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-[#2e7d32] animate-ping shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-dot font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-1">
                    ● MINING ACTIVE // LIVE WGSL COMPUTE PIPELINE
                  </span>
                  <span className="text-[10px] font-dot font-bold bg-[#fdfbf7] text-[#24140a] px-1.5 py-0.5 border border-[#24140a]">
                    EPOCH {currentEpoch?.id || 1}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-jersey font-bold text-[#24140a] flex items-center gap-2 mt-0.5">
                  <span>UNSOLVED TARGET: HASHAPE #{nextTokenId}</span>
                  <span className="text-xs font-dot text-white bg-[#d83a2a] px-2 py-0.5 font-bold border border-[#24140a] animate-pulse">
                    0/1 PROOF FOUND
                  </span>
                </div>
              </div>
            </div>

            {/* Network Users & Unsolved Competition Counters */}
            <div className="flex items-center gap-2 sm:gap-3 font-dot text-xs flex-wrap">
              <div className="bg-[#fdfbf7] border-2 border-[#24140a] px-3 py-1.5 shadow-[2px_2px_0px_#24140a]">
                <span className="text-[9px] text-[#6b5443] uppercase block font-bold flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 text-[#2e7d32]" />
                  ACTIVE USERS RUNNING
                </span>
                <span className="text-sm sm:text-base font-jersey font-bold text-[#2e7d32] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2e7d32] animate-pulse" />
                  {displayActiveMiners} MACHINES ONLINE
                </span>
              </div>
              <div className="bg-[#fdfbf7] border-2 border-[#24140a] px-3 py-1.5 shadow-[2px_2px_0px_#24140a]">
                <span className="text-[9px] text-[#6b5443] uppercase block font-bold flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-[#d83a2a]" />
                  RUNNING & NOT SOLVED
                </span>
                <span className="text-sm sm:text-base font-jersey font-bold text-[#d83a2a]">
                  {displayUnsolvedMiners} RIGS RACING
                </span>
              </div>
            </div>
          </div>

          {/* Live Telemetry HUD Grid (6 Detailed Badges: GPU, Session Time, Solve ETA, Deltas) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3">
            {/* 1. GPU Name & Driver Backend */}
            <div className="p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
              <span className="text-[9px] font-dot text-[#6b5443] uppercase block font-bold">GPU HARDWARE</span>
              <span className="text-xs sm:text-sm font-jersey font-bold text-[#24140a] truncate block" title={gpuDisplayName}>
                {gpuDisplayName}
              </span>
              <span className="text-[9px] font-dot text-[#2e7d32] font-bold block truncate">
                {gpuInfo?.backend || 'WebGPU Compute Core'}
              </span>
            </div>

            {/* 2. Session Time Elapsed (Live Counter) */}
            <div className="p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
              <span className="text-[9px] font-dot text-[#6b5443] uppercase block font-bold">SESSION TIME</span>
              <span className="text-sm sm:text-base font-jersey font-bold text-[#24140a] block">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-[9px] font-dot text-[#2e7d32] font-bold block truncate">
                ● LIVE CLOCK RUNNING
              </span>
            </div>

            {/* 3. Estimated Time to Solve */}
            <div className="p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
              <span className="text-[9px] font-dot text-[#6b5443] uppercase block font-bold">EST. TIME TO SOLVE</span>
              <span className="text-sm sm:text-base font-jersey font-bold text-[#19638b] block">
                {estTimeToSolveStr}
              </span>
              <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                ETA @ {effectiveHashrateMH.toFixed(1)} MH/s
              </span>
            </div>

            {/* 4. Speed / Hashrate Delta */}
            <div className="p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
              <span className="text-[9px] font-dot text-[#6b5443] uppercase block font-bold">COMPUTE HASHRATE</span>
              <span className="text-sm sm:text-base font-jersey font-bold text-[#d83a2a] block">
                {effectiveHashrateMH.toFixed(1)} <span className="text-[10px] font-dot text-[#24140a]">MH/S</span>
              </span>
              <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                {activeWorkerCount} Blades Active
              </span>
            </div>

            {/* 5. Nonces Scanned Delta */}
            <div className="p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
              <span className="text-[9px] font-dot text-[#6b5443] uppercase block font-bold">NONCES TESTED</span>
              <span className="text-sm sm:text-base font-jersey font-bold text-[#24140a] block">
                {noncesScanned.toLocaleString()}
              </span>
              <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                +{(effectiveHashrateHps / 1000).toFixed(0)}k cycles/sec
              </span>
            </div>

            {/* 6. Win Probability & Target */}
            <div className="p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
              <span className="text-[9px] font-dot text-[#6b5443] uppercase block font-bold">CHANCE OF WIN</span>
              <span className="text-sm sm:text-base font-jersey font-bold text-[#2e7d32] block">
                {winChanceStr} <span className="text-[10px] font-dot text-[#24140a]">/ MIN</span>
              </span>
              <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                {winOddsStr} per hash
              </span>
            </div>
          </div>

          {/* Live Candidate Pre-image & Nonce Ticker */}
          <div className="mt-3 p-2.5 bg-[#fdfbf7] border-2 border-[#24140a] font-dot text-[11px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-[1px_1px_0px_#24140a]">
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <span className="text-[#d83a2a] font-bold shrink-0">CANDIDATE HASH:</span>
              <span className="font-mono text-[#24140a] truncate max-w-[260px] sm:max-w-[480px]">
                {currentHash || '0x0000000000000000000000000000000000000000000000000000000000000000'}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <span className="text-[#6b5443] font-bold">
                NONCE: <span className="text-[#24140a] font-mono">{currentNonce || '0x00'}</span>
              </span>
              <span className="text-[#2e7d32] font-bold">
                TARGET: {targetBits} ZERO BITS
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* STANDBY HARDWARE & NETWORK STATUS HUD */
        <div className="border-b-2 border-[#24140a] bg-[#f5ebd7] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-dot text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#6b5443]" />
            <span className="text-[#6b5443] font-bold uppercase">
              STANDBY // PENDING BLOCK #{nextTokenId} (UNSOLVED)
            </span>
            <span className="text-[#24140a] font-bold">
              ▪ HARDWARE: <span className="text-[#19638b]">{gpuDisplayName}</span>
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-bold">
            <span className="text-[#2e7d32] bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
              ● {displayActiveMiners} MINERS RUNNING IN NETWORK
            </span>
            <span className="text-[#d83a2a] bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
              {displayUnsolvedMiners} USERS UNSOLVED
            </span>
          </div>
        </div>
      )}

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

              {/* Animated Collection Viewport Content */}
              <img
                src={`/images/${collectionLoopId}.png`}
                alt={`HashApe #${collectionLoopId}`}
                className={`w-full h-full object-cover pixelated transition-all duration-200 ${
                  isMining
                    ? 'opacity-95 filter contrast-125 saturate-150 animate-pulse'
                    : 'opacity-90 hover:opacity-100'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />

              {/* Animated Loop Status Banner */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#d83a2a] shadow-[1px_1px_0px_#24140a] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d83a2a] animate-ping" />
                <span>{isMining ? `SCANNING #${collectionLoopId}` : `COLLECTION #${collectionLoopId}`}</span>
              </div>

              {/* Nonce HUD */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#24140a] truncate max-w-[180px] shadow-[1px_1px_0px_#24140a]">
                NONCE: {currentNonce || '0x00'}
              </div>
            </div>

            <div className="text-[11px] font-dot text-[#6b5443] mt-2 font-bold text-center">
              <span className="text-[#24140a]">GPU:</span> {gpuDisplayName}
            </div>
          </div>

          {/* Right: Telemetry, Target Bit-Meter, & Controls */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
            {/* Top Row: Target & Leading Zero Bits */}
            <div>
              <div className="flex items-center justify-between text-xs font-dot mb-1.5">
                <span className="text-[#24140a] font-bold uppercase tracking-wider">
                  DIFFICULTY TARGET // NEXT HASHAPE #{nextTokenId}
                </span>
                <span className="text-[#d83a2a] font-bold">
                  {targetBits} LEADING ZERO BITS ({effectiveDifficultyBand})
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

            {/* Middle Row: Live Telemetry Grid (8 Metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">ACTIVE GPU</span>
                <span className="text-sm font-jersey font-bold text-[#24140a] block truncate" title={gpuDisplayName}>
                  {gpuDisplayName}
                </span>
                <span className="text-[9px] font-dot text-[#2e7d32] font-bold block truncate">
                  {gpuInfo?.backend || 'WebGPU Core'}
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">CHANCE OF WIN</span>
                <span className="text-base font-jersey font-bold text-[#d83a2a] block">
                  {winChanceStr} <span className="text-[10px] font-dot text-[#24140a]">/ MIN</span>
                </span>
                <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                  {winOddsStr} per hash
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">TIME OF SOLVE (EST)</span>
                <span className="text-base font-jersey font-bold text-[#19638b] block">
                  {estTimeToSolveStr}
                </span>
                <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                  ETA @ {effectiveHashrateMH.toFixed(1)} MH/s
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">SESSION TIME</span>
                <span className="text-base font-jersey font-bold text-[#24140a] block">
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                  {isMining ? 'Active Session' : 'Standby'}
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">COMPUTE SPEED</span>
                <span className="text-base font-jersey font-bold text-[#24140a] block">
                  {Number(totalHashrate || 0).toFixed(1)} <span className="text-[10px] font-dot text-[#d83a2a]">MH/S</span>
                </span>
                <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                  {activeWorkerCount} Active Workers
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">NONCES SCANNED</span>
                <span className="text-base font-jersey font-bold text-[#24140a] block">
                  {noncesScanned.toLocaleString()}
                </span>
                <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                  Keccak-256 cycles
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">GPU LOAD</span>
                <span className="text-sm font-jersey font-bold text-[#2e7d32] flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isMining ? 'bg-[#2e7d32] animate-ping' : 'bg-[#6b5443]'}`} />
                  {isMining ? '100% MAX' : 'IDLE 0%'}
                </span>
                <span className="text-[9px] font-dot text-[#d83a2a] font-bold block truncate">
                  {isMining ? `~${160 + activeWorkerCount * 25}W Power` : '15W Standby'}
                </span>
              </div>

              <div className="p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[9px] font-dot text-[#6b5443] block uppercase font-bold">WALLET QUOTA</span>
                <span className="text-base font-jersey font-bold text-[#24140a] block">
                  {walletMints} <span className="text-[10px] font-dot text-[#6b5443]">/ {maxMints}</span>
                </span>
                <span className="text-[9px] font-dot text-[#6b5443] font-bold block truncate">
                  {Math.max(0, maxMints - walletMints)} Available
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
                    {currentFeeUsd <= 0 ? (
                      <span>$0 ETH <span className="text-xs text-[#6b5443]">(0.0000 ETH / FREE)</span></span>
                    ) : (
                      <span>${currentFeeUsd} ETH <span className="text-xs text-[#6b5443]">({ethEquiv} ETH)</span></span>
                    )}
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
              <span className="font-bold text-[#d83a2a]">{effectiveDifficultyBand}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
