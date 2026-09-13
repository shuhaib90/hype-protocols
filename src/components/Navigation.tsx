import React, { useState } from 'react';
import { useWallet, HASHAPE_DEX_URL } from '../web3/WalletContext';
import { Cpu, FileText, Wallet, Shield, Volume2, VolumeX, ShoppingCart, ExternalLink } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface NavigationProps {
  activeTab: 'mining' | 'docs' | 'admin';
  setActiveTab: (tab: 'mining' | 'docs' | 'admin') => void;
  onOpenAdmin: () => void;
  totalMined?: number;
  maxSupply?: number;
  currentEpochId?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdmin,
  totalMined = 3,
  maxSupply = 10000,
  currentEpochId = 1,
}) => {
  const { isConnected, address, nativeHypeBalance, tokenHypeBalance, isAdmin, connectWallet, disconnectWallet } = useWallet();
  const [soundOn, setSoundOn] = useState(soundEffects.isEnabled());

  const handleTabClick = (tab: 'mining' | 'docs' | 'admin') => {
    soundEffects.playClickSound();
    setActiveTab(tab);
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSoundToggle = () => {
    const nextState = soundEffects.toggle();
    setSoundOn(nextState);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#fdfbf7]/95 backdrop-blur-md border-b-4 border-[#24140a] shadow-[0_4px_12px_rgba(36,20,10,0.12)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center space-x-6">
          <div
            className="flex items-center space-x-3 cursor-pointer select-none group"
            onClick={() => handleTabClick('mining')}
          >
            {/* 8-Bit Ape Icon */}
            <div className="w-10 h-10 bg-[#eee2ca] border-3 border-[#24140a] overflow-hidden flex items-center justify-center shadow-[2px_2px_0px_#24140a]">
              <img src="/logo.png" alt="HashApe Logo" className="w-full h-full object-cover pixelated" />
            </div>
            <div className="flex flex-col">
              <div className="font-jersey text-2xl font-bold tracking-wider text-[#24140a] uppercase flex items-center gap-1.5 leading-none">
                <span>HASHAPE</span>
                <span className="text-[10px] font-dot text-white border border-[#24140a] px-1 py-0.2 bg-[#d83a2a] shadow-[1px_1px_0px_#24140a]">
                  FORGE
                </span>
              </div>
              <span className="text-[9px] font-dot text-[#6b5443] uppercase tracking-widest mt-0.5 font-bold">
                WEBGPU PROOF-OF-WORK // L2
              </span>
            </div>
          </div>

          {/* Arcade Navigation Links */}
          <nav className="hidden md:flex items-center space-x-2 text-xs font-dot">
            <button
              onClick={() => {
                handleTabClick('mining');
                setTimeout(() => {
                  const el = document.getElementById('miner-rig-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className={`px-3 py-1 uppercase tracking-wider transition-all border-2 border-[#24140a] ${
                activeTab === 'mining'
                  ? 'bg-[#d83a2a] text-white font-bold shadow-[2px_2px_0px_#24140a]'
                  : 'bg-[#eee2ca] text-[#24140a] hover:bg-[#e4d3b4] shadow-[1px_1px_0px_#24140a]'
              }`}
            >
              [ FORGE RIG ]
            </button>
            <button
              onClick={() => {
                soundEffects.playClickSound();
                if (activeTab !== 'mining') {
                  setActiveTab('mining');
                  setTimeout(() => {
                    document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                } else {
                  document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3 py-1 bg-[#eee2ca] text-[#24140a] hover:bg-[#e4d3b4] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a] uppercase tracking-wider transition-all cursor-pointer"
            >
              [ DOSSIER ]
            </button>
            <button
              onClick={() => {
                soundEffects.playClickSound();
                if (activeTab !== 'mining') {
                  setActiveTab('mining');
                  setTimeout(() => {
                    document.getElementById('epochs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                } else {
                  document.getElementById('epochs-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3 py-1 bg-[#eee2ca] text-[#24140a] hover:bg-[#e4d3b4] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a] uppercase tracking-wider transition-all cursor-pointer"
            >
              [ 10 STAGES ]
            </button>
            <button
              onClick={() => handleTabClick('docs')}
              className={`px-3 py-1 uppercase tracking-wider transition-all border-2 border-[#24140a] ${
                activeTab === 'docs'
                  ? 'bg-[#d83a2a] text-white font-bold shadow-[2px_2px_0px_#24140a]'
                  : 'bg-[#eee2ca] text-[#24140a] hover:bg-[#e4d3b4] shadow-[1px_1px_0px_#24140a]'
              }`}
            >
              [ DOCS ]
            </button>
            {isAdmin && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-1 uppercase tracking-wider transition-all border-2 border-[#24140a] ${
                  activeTab === 'admin'
                    ? 'bg-[#d83a2a] text-white font-bold shadow-[2px_2px_0px_#24140a]'
                    : 'bg-[#d48818] text-[#24140a] hover:bg-[#bb7410] font-bold shadow-[1px_1px_0px_#24140a]'
                }`}
              >
                [ ADMIN ]
              </button>
            )}
          </nav>
        </div>

        {/* Right: Live Network Badge, Admin, SFX, & Connect Button */}
        <div className="flex items-center space-x-2.5">
          {/* Live Network Ticker Box */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-[#eee2ca] border-2 border-[#24140a] text-xs font-dot text-[#24140a] shadow-[2px_2px_0px_#24140a]">
            <span className="w-2.5 h-2.5 bg-[#2e7d32] border border-[#24140a] inline-block shadow-[1px_1px_0px_#24140a]" />
            <span className="text-[#24140a] font-bold">{totalMined.toLocaleString()}</span>
            <span>/</span>
            <span className="font-bold">{maxSupply.toLocaleString()} MINED</span>
            <span className="text-[#6b5443]">|</span>
            <span className="text-[#d83a2a] font-bold">STAGE #{currentEpochId}</span>
          </div>

          {/* Buy $HASHAPE DEX button */}
          <a
            href={HASHAPE_DEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="paper-btn-red hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-dot font-bold uppercase no-underline shadow-[2px_2px_0px_#24140a]"
            title="Buy $HASHAPE on LetsCash DEX"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>BUY $HASHAPE</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          {/* 8-Bit SFX Toggle */}
          <button
            onClick={handleSoundToggle}
            className={`px-2.5 py-1.5 border-2 border-[#24140a] text-xs font-dot flex items-center space-x-1.5 transition-all select-none shadow-[2px_2px_0px_#24140a] ${
              soundOn
                ? 'bg-[#eee2ca] text-[#2e7d32] font-bold'
                : 'bg-[#e4d3b4] text-[#6b5443]'
            }`}
            title="Toggle Retro Sound Effects"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#2e7d32]" /> : <VolumeX className="w-3.5 h-3.5 text-[#6b5443]" />}
            <span className="hidden sm:inline">{soundOn ? 'SFX ON' : 'SFX OFF'}</span>
          </button>

          {/* Admin Shield Button */}
          {isAdmin && (
            <button
              onClick={() => {
                soundEffects.playClickSound();
                handleTabClick('admin');
              }}
              className={`px-2.5 py-1.5 border-2 border-[#24140a] text-xs font-dot font-bold flex items-center space-x-1 transition-all shadow-[2px_2px_0px_#24140a] ${
                activeTab === 'admin'
                  ? 'bg-[#d83a2a] text-white'
                  : 'bg-[#d48818] hover:bg-[#bb7410] text-[#24140a]'
              }`}
              title="Admin Dashboard & 10-Epoch Matrix"
            >
              <Shield className="w-3.5 h-3.5 fill-current" />
              <span>ADMIN</span>
            </button>
          )}

          {/* Connect / Connected Wallet Button */}
          {isConnected ? (
            <button
              onClick={disconnectWallet}
              className="paper-btn-gold px-3 py-1.5 text-xs sm:text-sm flex items-center space-x-2"
              title="Connected Wallet — Click to Disconnect"
            >
              <span className="w-2 h-2 bg-[#2e7d32] border border-[#24140a]" />
              <span className="font-dot font-bold">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="paper-btn-red px-4 py-1.5 text-sm sm:text-base flex items-center space-x-2"
            >
              <Wallet className="w-4 h-4" />
              <span>CONNECT WALLET</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
