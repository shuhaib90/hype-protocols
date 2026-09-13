import React, { useState } from 'react';
import { SupplyInfo, EpochInfo } from '../types';
import { Layers, Activity, AlertTriangle, ChevronDown, ChevronUp, Sparkles, TrendingUp, Hash, ArrowUpRight } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface SupplyModuleProps {
  supply: SupplyInfo;
}

export const SupplyModule: React.FC<SupplyModuleProps> = ({ supply }) => {
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'ETH'>('USD');
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(true);

  const isSoldOut = supply.totalMined >= supply.maxSupply;

  // Fallback / default current epoch
  const activeEpoch: EpochInfo = supply.currentEpoch || {
    id: 1,
    name: 'EPOCH 1 (GENESIS)',
    startToken: 1,
    endToken: 10,
    count: 10,
    mintFeeUsd: 5,
    mintFeeEth: 0.0020,
    mintFeeApe: 5,
    difficulty: 'HARD',
    target: '0x0003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    nextToken: supply.totalMined + 1,
    minedInEpoch: Math.min(10, supply.totalMined),
    remainingInEpoch: Math.max(0, 10 - supply.totalMined),
    percentInEpoch: Number(((Math.min(10, supply.totalMined) / 10) * 100).toFixed(1)),
    nextEpoch: {
      id: 2,
      name: 'EPOCH 2 (ASCENSION)',
      startToken: 11,
      endToken: 30,
      mintFeeUsd: 7,
      mintFeeEth: 0.0028,
      mintFeeApe: 7
    }
  };

  const defaultEpochs: EpochInfo[] = supply.epochs && supply.epochs.length > 0 ? supply.epochs : [
    { id: 1, name: 'EPOCH 1 (GENESIS)', startToken: 1, endToken: 10, count: 10, mintFeeUsd: 5, mintFeeEth: 0.0020, mintFeeApe: 5, difficulty: 'HARD', target: '0x0003ffff...' },
    { id: 2, name: 'EPOCH 2 (ASCENSION)', startToken: 11, endToken: 30, count: 20, mintFeeUsd: 7, mintFeeEth: 0.0028, mintFeeApe: 7, difficulty: 'HARDER', target: '0x0001ffff...' },
    { id: 3, name: 'EPOCH 3 (EXPANSION)', startToken: 31, endToken: 70, count: 40, mintFeeUsd: 10, mintFeeEth: 0.0040, mintFeeApe: 10, difficulty: 'VERY HARD', target: '0x0000ffff...' },
    { id: 4, name: 'EPOCH 4 (SURGE)', startToken: 71, endToken: 150, count: 80, mintFeeUsd: 14, mintFeeEth: 0.0056, mintFeeApe: 14, difficulty: 'VERY HARD+', target: '0x00007fff...' },
    { id: 5, name: 'EPOCH 5 (NEXUS)', startToken: 151, endToken: 300, count: 150, mintFeeUsd: 18, mintFeeEth: 0.0072, mintFeeApe: 18, difficulty: 'EXTREME', target: '0x00003fff...' },
    { id: 6, name: 'EPOCH 6 (APEX)', startToken: 301, endToken: 600, count: 300, mintFeeUsd: 22, mintFeeEth: 0.0088, mintFeeApe: 22, difficulty: 'EXTREME+', target: '0x00001fff...' },
    { id: 7, name: 'EPOCH 7 (SOVEREIGN)', startToken: 601, endToken: 1200, count: 600, mintFeeUsd: 26, mintFeeEth: 0.0104, mintFeeApe: 26, difficulty: 'LEGENDARY', target: '0x00000fff...' },
    { id: 8, name: 'EPOCH 8 (TITAN)', startToken: 1201, endToken: 2500, count: 1300, mintFeeUsd: 30, mintFeeEth: 0.0120, mintFeeApe: 30, difficulty: 'LEGENDARY+', target: '0x000007ff...' },
    { id: 9, name: 'EPOCH 9 (MYTHIC)', startToken: 2501, endToken: 5000, count: 2500, mintFeeUsd: 35, mintFeeEth: 0.0140, mintFeeApe: 35, difficulty: 'MYTHIC', target: '0x000003ff...' },
    { id: 10, name: 'EPOCH 10 (OMEGA)', startToken: 5001, endToken: 10000, count: 5000, mintFeeUsd: 40, mintFeeEth: 0.0160, mintFeeApe: 40, difficulty: 'OMEGA', target: '0x000001ff...' },
  ];

  const toggleCurrency = () => {
    soundEffects.playClickSound();
    setCurrencyMode(prev => prev === 'USD' ? 'ETH' : 'USD');
  };

  const toggleRoadmap = () => {
    soundEffects.playClickSound();
    setIsRoadmapOpen(prev => !prev);
  };

  return (
    <section id="epochs-section" className="mb-10 space-y-6">
      {/* Top Bar: Network Difficulty Ticker */}
      <div className="paper-chassis p-4 bg-[#eee2ca] flex flex-wrap items-center justify-between gap-4 text-xs font-dot border-l-6 border-l-[#d83a2a]">
        <div className="flex items-center space-x-6 flex-wrap gap-y-2">
          <div>
            <span className="text-[#6b5443] block text-[10px] uppercase font-bold">NETWORK DIFFICULTY</span>
            <span className="text-[#24140a] font-bold text-sm">
              {31 + activeEpoch.id} BITS ({activeEpoch.difficulty})
            </span>
          </div>
          <div>
            <span className="text-[#6b5443] block text-[10px] uppercase font-bold">EST. HASHES / MINT</span>
            <span className="text-[#d83a2a] font-bold text-sm">
              {activeEpoch.id === 1 ? '~65,536' : activeEpoch.id === 2 ? '~131,072' : '~524,288+'}
            </span>
          </div>
          <div>
            <span className="text-[#6b5443] block text-[10px] uppercase font-bold">STAGE ENTRY FEE</span>
            <span className="text-[#24140a] font-bold text-sm">
              {currencyMode === 'USD' ? `$${activeEpoch.mintFeeUsd} USD` : `${activeEpoch.mintFeeEth} ETH`}
              <span className="text-[10px] text-[#6b5443] font-normal ml-1">
                ({currencyMode === 'USD' ? `${activeEpoch.mintFeeEth} ETH` : `$${activeEpoch.mintFeeUsd} USD`})
              </span>
            </span>
          </div>
          <div>
            <span className="text-[#6b5443] block text-[10px] uppercase font-bold">CURRENT STAGE</span>
            <span className="text-[#19638b] font-bold text-sm">
              STAGE #{activeEpoch.id} OF 10
            </span>
          </div>
        </div>

        {/* Currency Switcher */}
        <button
          onClick={toggleCurrency}
          className="paper-btn-kraft px-3 py-1 text-xs flex items-center space-x-1.5 font-bold"
          title="Toggle USD / ETH display"
        >
          <span>1 ETH ≈ $2,500</span>
          <span className="text-[#24140a]">|</span>
          <span className={currencyMode === 'USD' ? 'text-[#d83a2a] font-bold' : 'text-[#6b5443]'}>USD</span>
          <span>/</span>
          <span className={currencyMode === 'ETH' ? 'text-[#19638b] font-bold' : 'text-[#6b5443]'}>ETH</span>
        </button>
      </div>

      {/* Two-Column Matrix: DUAL HARDENING & 10-STAGE ROADMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: DUAL HARDENING (Ladder & Quota) */}
        <div className="lg:col-span-5 paper-chassis overflow-hidden flex flex-col justify-between bg-[#fdfbf7]">
          <div>
            <div className="paper-header px-4 py-2 flex items-center justify-between text-xs">
              <span className="font-jersey text-base text-white tracking-wider">PROTOCOL HARDENING // DUAL DIFFICULTY</span>
              <span className="font-dot text-[10px] text-[#d83a2a] font-bold bg-[#f5ebd7] px-1.5 py-0.2 border border-[#24140a]">
                SEQUENTIAL PROOF SCALING
              </span>
            </div>

            <div className="p-4 space-y-4 text-xs font-dot text-[#6b5443]">
              <p className="leading-relaxed font-medium">
                As the 10,000 HashApe supply is claimed, leading zero bit requirements step up across stages.
                Furthermore, each individual wallet experiences sequential hardening for every consecutive mint.
              </p>

              {/* Sequential Difficulty Visual Ladder */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase text-[#24140a] font-bold tracking-wider">
                  PER-WALLET DIFFICULTY LADDER (5 NFTS MAX)
                </div>
                {[
                  { tier: 1, label: 'NFT #1', diff: 'HARD', bits: 32, est: '~65K Hashes' },
                  { tier: 2, label: 'NFT #2', diff: 'HARDER', bits: 33, est: '~131K Hashes' },
                  { tier: 3, label: 'NFT #3', diff: 'VERY HARD', bits: 34, est: '~524K Hashes' },
                  { tier: 4, label: 'NFT #4', diff: 'EXTREME', bits: 35, est: '~1.05M Hashes' },
                  { tier: 5, label: 'NFT #5', diff: 'LEGENDARY', bits: 36, est: '~4.19M Hashes' },
                ].map((item) => (
                  <div
                    key={item.tier}
                    className="flex items-center justify-between p-2.5 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-[#24140a] font-bold">{item.label}</span>
                      <span className="text-[10px] text-[#d83a2a] font-bold">{item.diff}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] font-bold">
                      <span className="text-[#19638b]">{item.bits} BITS</span>
                      <span className="text-[#6b5443]">{item.est}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t-2 border-[#24140a] bg-[#eee2ca] text-[11px] font-dot text-[#6b5443] font-bold">
            Strict maximum of 5 NFTs per wallet hard-coded in smart contract and API ledger.
          </div>
        </div>

        {/* Right: 10-STAGE ROADMAP & PROGRESSION */}
        <div className="lg:col-span-7 paper-chassis overflow-hidden bg-[#fdfbf7]">
          <div className="paper-header-red px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-jersey text-base text-white tracking-wider">
              10-STAGE ASCENT MATRIX // ALLOCATIONS & FEES
            </span>
            <span className="font-dot text-[11px] text-white font-bold bg-[#24140a] px-2 py-0.5 border border-[#24140a]">
              10,000 HARD CAP
            </span>
          </div>

          <div className="p-4 space-y-4 bg-[#fdfbf7]">
            {/* Global Supply Progress Bar */}
            <div>
              <div className="flex justify-between text-[11px] font-dot text-[#6b5443] mb-1.5 font-bold">
                <span>0 (GENESIS)</span>
                <span className="text-[#d83a2a] font-bold">
                  {(supply.totalMined ?? 0).toLocaleString()} / 10,000 ({Number(supply.percentMined || 0).toFixed(1)}%) CLAIMED
                </span>
                <span>10,000 MAX</span>
              </div>
              <div className="w-full bg-[#eee2ca] h-4 border-2 border-[#24140a] p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
                <div
                  className="h-full bg-[#d83a2a] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(1, supply.percentMined || 0))}%` }}
                />
              </div>
            </div>

            {/* 10-Stage Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-dot">
              {defaultEpochs.map((ep) => {
                const isActive = ep.id === activeEpoch.id;
                const isPast = ep.id < activeEpoch.id;
                const effectiveUsd = isActive ? (activeEpoch.mintFeeUsd ?? 5) : (ep.mintFeeUsd ?? 5);
                const effectiveEth = isActive 
                  ? (activeEpoch.mintFeeEth ?? (effectiveUsd <= 0 ? 0 : Number((effectiveUsd / 2500).toFixed(4)))) 
                  : (ep.mintFeeEth ?? (effectiveUsd <= 0 ? 0 : Number((effectiveUsd / 2500).toFixed(4))));

                return (
                  <div
                    key={ep.id}
                    className={`p-2.5 border-2 transition-all ${
                      isActive
                        ? 'bg-[#eee2ca] border-[#d83a2a] shadow-[2px_2px_0px_#24140a]'
                        : isPast
                        ? 'bg-[#eee2ca]/60 border-[#24140a]/40 opacity-70'
                        : 'bg-[#fdfbf7] border-[#24140a] shadow-[1px_1px_0px_#24140a]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px]">
                      <span className={`font-bold ${isActive ? 'text-[#d83a2a]' : 'text-[#24140a]'}`}>
                        STAGE #{ep.id}
                      </span>
                      {isActive && (
                        <span className="paper-stamp-red text-[8px] animate-pulse">
                          ACTIVE
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[#6b5443] text-[8px] font-bold">
                          DONE ✓
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6b5443] truncate mb-1 font-bold">
                      #{ep.startToken}–#{ep.endToken}
                    </div>
                    <div className="font-bold text-xs mb-0.5">
                      {isActive ? (
                        <span className="text-[#d83a2a]">
                          {effectiveUsd <= 0
                            ? (currencyMode === 'USD' ? '$0 USD (FREE)' : '0.0000 ETH (FREE)')
                            : (currencyMode === 'USD' ? `$${effectiveUsd} USD` : `${effectiveEth} ETH`)}
                        </span>
                      ) : isPast ? (
                        <span className="text-[#6b5443]/60 text-[10px] font-mono">CONCLUDED</span>
                      ) : (
                        <span className="text-[#6b5443]/50 text-[10px] font-mono uppercase tracking-wider">LOCKED FEE</span>
                      )}
                    </div>
                    <div className="text-[9px] text-[#6b5443] font-medium">
                      {isActive ? activeEpoch.difficulty : ep.difficulty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
