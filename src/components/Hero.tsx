import React from 'react';
import { useWallet } from '../web3/WalletContext';
import { Pickaxe, Eye, ShieldCheck, Sparkles, Zap, ArrowDown } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface HeroProps {
  onStartMining: () => void;
  isMining: boolean;
  totalMined?: number;
  currentEpochFeeUsd?: number;
  currentEpochId?: number;
}

export const Hero: React.FC<HeroProps> = ({
  onStartMining,
  isMining,
  totalMined = 3,
  currentEpochFeeUsd = 5,
  currentEpochId = 1,
}) => {
  const { isConnected, connectWallet } = useWallet();

  const handleStart = () => {
    soundEffects.playClickSound();
    onStartMining();
    const minerEl = document.getElementById('miner-rig-section');
    if (minerEl) {
      minerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleConnect = () => {
    soundEffects.playClickSound();
    connectWallet();
  };

  const ethEquiv = (currentEpochFeeUsd / 2500).toFixed(4);

  return (
    <section className="relative overflow-hidden py-10 md:py-16 border-b-4 border-[#24140a] paper-dot-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Command Station & Lore */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Tagline Badge - Stamped Ink */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#eee2ca] border-2 border-[#24140a] text-xs font-dot text-[#d83a2a] mb-5 shadow-[2px_2px_0_0_#24140a]">
              <Sparkles className="w-3.5 h-3.5 text-[#d83a2a]" />
              <span className="uppercase tracking-wider font-bold">WEBGPU COMPUTATIONAL FORGE // ON-CHAIN PROOF-OF-WORK</span>
            </div>

            {/* Original Syndicate Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-jersey font-bold tracking-tight uppercase leading-[0.92] text-[#24140a] mb-5">
              DECENTRALIZED<br />
              PROOF-OF-WORK.<br />
              <span className="text-[#d83a2a]">THE PIXEL APE FORGE.</span>
            </h1>

            {/* Original Explanatory Copy */}
            <p className="text-sm sm:text-base text-[#5c4636] font-dot max-w-xl mb-7 leading-relaxed font-medium">
              10,000 unique algorithmic pixel apes mined directly by your GPU compute shaders on Robinhood EVM Layer 2. No allowlists, no pre-sales, and zero team reservations: your machine solves cryptographic hashes below the network target, unlocks token minting, and permanently anchors your HashApe on-chain.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-8 w-full sm:w-auto">
              {isConnected ? (
                <button
                  onClick={handleStart}
                  disabled={isMining}
                  className="paper-btn-red px-6 py-3 text-base sm:text-lg flex items-center space-x-2.5"
                >
                  <Pickaxe className="w-5 h-5" />
                  <span>{isMining ? 'RIG COMPUTING HASHES...' : 'INITIALIZE MINER RIG'}</span>
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="paper-btn-red px-6 py-3 text-base sm:text-lg flex items-center space-x-2.5"
                >
                  <Zap className="w-5 h-5" />
                  <span>CONNECT TO MINE</span>
                </button>
              )}

              <a
                href="#collection-section"
                onClick={() => soundEffects.playClickSound()}
                className="paper-btn-gold px-5 py-3 text-base sm:text-lg flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 text-[#24140a]" />
                <span>ACCESS DOSSIER ARCHIVE</span>
              </a>
            </div>

            {/* 4-Tile Quick Telemetry HUD - Vintage Paper Tickets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              <div className="p-3 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
                <span className="text-[10px] font-dot text-[#6b5443] block uppercase font-bold">ACTIVE STAGE</span>
                <span className="text-sm sm:text-base font-jersey font-bold text-[#d83a2a]">
                  STAGE #{currentEpochId} <span className="text-xs font-dot text-[#6b5443]">(GENESIS)</span>
                </span>
              </div>
              <div className="p-3 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
                <span className="text-[10px] font-dot text-[#6b5443] block uppercase font-bold">MINT PRICE</span>
                <span className="text-sm sm:text-base font-jersey font-bold text-[#24140a]">
                  ${currentEpochFeeUsd} ETH <span className="text-xs font-dot text-[#6b5443]">({ethEquiv})</span>
                </span>
              </div>
              <div className="p-3 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
                <span className="text-[10px] font-dot text-[#6b5443] block uppercase font-bold">SUPPLY STATUS</span>
                <span className="text-sm sm:text-base font-jersey font-bold text-[#19638b]">
                  {totalMined} / 10,000
                </span>
              </div>
              <div className="p-3 bg-[#fdfbf7] border-2 border-[#24140a] shadow-[2px_2px_0px_#24140a]">
                <span className="text-[10px] font-dot text-[#6b5443] block uppercase font-bold">WALLET LIMIT</span>
                <span className="text-sm sm:text-base font-jersey font-bold text-[#d48818]">
                  5 MAX / WALLET
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Holo-Station Recon Display */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="paper-chassis w-full max-w-sm sm:max-w-md">
              {/* Header Bar */}
              <div className="paper-header-red px-3 py-2 flex items-center justify-between text-xs tracking-wider">
                <span className="font-jersey text-base tracking-wider">SYNDICATE GAZETTE // FORGED APE</span>
                <span className="font-dot text-[11px] text-white font-bold bg-[#24140a] px-2 py-0.5 border border-[#24140a]">
                  ● TOKEN #{totalMined}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 bg-[#fdfbf7] space-y-4">
                {/* Paper Print Viewport */}
                <div className="relative aspect-square w-full bg-[#eee2ca] border-3 border-[#24140a] flex items-center justify-center overflow-hidden group shadow-[2px_2px_0px_#24140a]">
                  <img
                    src={`/images/${Math.max(1, totalMined)}.png`}
                    alt={`HashApe #${totalMined}`}
                    className="w-full h-full object-cover pixelated transform group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/preview.png';
                    }}
                  />
                  
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#d83a2a] shadow-[1px_1px_0px_#24140a]">
                    STAGE #{currentEpochId}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#24140a] shadow-[1px_1px_0px_#24140a]">
                    HASHAPE #{totalMined.toString().padStart(4, '0')}
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs font-dot">
                  <div className="bg-[#eee2ca] p-2.5 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                    <span className="text-[#6b5443] block text-[10px] font-bold">ENTRY PRICE</span>
                    <span className="text-[#d83a2a] font-bold">${currentEpochFeeUsd} ETH ({ethEquiv} ETH)</span>
                  </div>
                  <div className="bg-[#eee2ca] p-2.5 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                    <span className="text-[#6b5443] block text-[10px] font-bold">DIFFICULTY</span>
                    <span className="text-[#24140a] font-bold">HARD • 32 BITS</span>
                  </div>
                </div>

                {/* Footer specs inside card */}
                <div className="pt-2 border-t-2 border-[#24140a] flex items-center justify-between text-[11px] font-dot text-[#6b5443] font-bold">
                  <span>MINER: 0xb8E3...c93C</span>
                  <span className="paper-stamp-green text-[10px]">
                    VERIFIED ON-CHAIN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
