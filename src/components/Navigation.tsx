import React, { useState } from 'react';
import { useWallet, HASHAPE_DEX_URL } from '../web3/WalletContext';
import { Wallet, Shield, Volume2, VolumeX, ShoppingCart, ExternalLink, Menu, X } from 'lucide-react';
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
}) => {
  const { isConnected, address, isAdmin, connectWallet, disconnectWallet } = useWallet();
  const [soundOn, setSoundOn] = useState(soundEffects.isEnabled());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Clean Navigation Links (No brackets, no bulky boxes) */}
          <nav className="hidden md:flex items-center space-x-1 text-xs">
            <button
              onClick={() => {
                handleTabClick('mining');
                setTimeout(() => {
                  document.getElementById('miner-rig-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className={`px-3 py-1.5 uppercase tracking-wider font-bold transition-all ${
                activeTab === 'mining'
                  ? 'bg-[#24140a] text-[#fdfbf7] shadow-[2px_2px_0px_#24140a]'
                  : 'text-[#6b5443] hover:text-[#24140a] hover:bg-[#eee2ca]'
              }`}
            >
              Forge Rig
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
              className="px-3 py-1.5 text-[#6b5443] hover:text-[#24140a] hover:bg-[#eee2ca] uppercase tracking-wider font-bold transition-all"
            >
              Dossier
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
              className="px-3 py-1.5 text-[#6b5443] hover:text-[#24140a] hover:bg-[#eee2ca] uppercase tracking-wider font-bold transition-all"
            >
              10 Stages
            </button>
            <button
              onClick={() => handleTabClick('docs')}
              className={`px-3 py-1.5 uppercase tracking-wider font-bold transition-all ${
                activeTab === 'docs'
                  ? 'bg-[#24140a] text-[#fdfbf7] shadow-[2px_2px_0px_#24140a]'
                  : 'text-[#6b5443] hover:text-[#24140a] hover:bg-[#eee2ca]'
              }`}
            >
              Docs
            </button>
            {isAdmin && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-1.5 uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-[#d83a2a] text-white shadow-[2px_2px_0px_#24140a]'
                    : 'text-[#d48818] hover:text-[#24140a] hover:bg-[#eee2ca]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 fill-current" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Clean Action Suite on Right */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Buy $HASHAPE DEX button */}
          <a
            href={HASHAPE_DEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="paper-btn-red text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 font-bold uppercase no-underline shadow-[2px_2px_0px_#24140a]"
            title="Buy $HASHAPE on LetsCash DEX"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>BUY $HASHAPE</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-80 hidden sm:inline" />
          </a>

          {/* Compact Retro Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            className={`p-1.5 border-2 border-[#24140a] transition-all select-none shadow-[1px_1px_0px_#24140a] ${
              soundOn ? 'bg-[#eee2ca] text-[#2e7d32] hover:bg-[#e4d3b4]' : 'bg-[#fdfbf7] text-[#8c7460] hover:bg-[#eee2ca]'
            }`}
            title={soundOn ? 'Retro SFX On (Click to Mute)' : 'Retro SFX Off (Click to Enable)'}
            aria-label="Toggle retro sound effects"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-[#2e7d32]" /> : <VolumeX className="w-4 h-4 text-[#8c7460]" />}
          </button>

          {/* Connect / Connected Wallet Button */}
          {isConnected ? (
            <button
              onClick={disconnectWallet}
              className="paper-btn-gold px-2.5 sm:px-3 py-1.5 text-xs font-bold flex items-center space-x-1.5"
              title="Connected Wallet — Click to Disconnect"
            >
              <span className="w-2 h-2 rounded-full bg-[#2e7d32] inline-block shadow-[0_0_4px_#2e7d32]" />
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="paper-btn-red px-3 sm:px-4 py-1.5 text-xs font-bold flex items-center space-x-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>CONNECT</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 bg-[#eee2ca] border-2 border-[#24140a] text-[#24140a] shadow-[1px_1px_0px_#24140a] hover:bg-[#e4d3b4]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Clean Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#24140a] bg-[#fdfbf7] px-4 py-3 space-y-2 shadow-lg text-xs">
          <button
            onClick={() => {
              handleTabClick('mining');
              setTimeout(() => {
                document.getElementById('miner-rig-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className={`w-full text-left px-3 py-2 uppercase font-bold transition-all ${
              activeTab === 'mining'
                ? 'bg-[#24140a] text-[#fdfbf7]'
                : 'text-[#6b5443] hover:bg-[#eee2ca] text-[#24140a]'
            }`}
          >
            Forge Rig
          </button>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              setMobileMenuOpen(false);
              if (activeTab !== 'mining') {
                setActiveTab('mining');
                setTimeout(() => {
                  document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              } else {
                document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="w-full text-left px-3 py-2 text-[#6b5443] hover:bg-[#eee2ca] hover:text-[#24140a] uppercase font-bold transition-all"
          >
            Dossier
          </button>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              setMobileMenuOpen(false);
              if (activeTab !== 'mining') {
                setActiveTab('mining');
                setTimeout(() => {
                  document.getElementById('epochs-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              } else {
                document.getElementById('epochs-section')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="w-full text-left px-3 py-2 text-[#6b5443] hover:bg-[#eee2ca] hover:text-[#24140a] uppercase font-bold transition-all"
          >
            10 Stages
          </button>
          <button
            onClick={() => handleTabClick('docs')}
            className={`w-full text-left px-3 py-2 uppercase font-bold transition-all ${
              activeTab === 'docs'
                ? 'bg-[#24140a] text-[#fdfbf7]'
                : 'text-[#6b5443] hover:bg-[#eee2ca] text-[#24140a]'
            }`}
          >
            Docs
          </button>
          {isAdmin && (
            <button
              onClick={() => handleTabClick('admin')}
              className={`w-full text-left px-3 py-2 uppercase font-bold transition-all flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-[#d83a2a] text-white'
                  : 'text-[#d48818] hover:bg-[#eee2ca]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 fill-current" />
              <span>Admin Dashboard</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
