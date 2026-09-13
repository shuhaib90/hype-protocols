import React, { useState } from 'react';
import { soundEffects } from '../utils/soundEffects';
import { Sparkles, ChevronRight, Layers, ExternalLink } from 'lucide-react';
import { OPENSEA_COLLECTION_URL } from '../web3/WalletContext';

export const CollectionShowcase: React.FC = () => {
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);

  // Curated showcase tokens with difficulty bits and traits
  const syndicateOperatives = [
    { id: 1, name: 'Alpha Genesis', code: 'OP-0001', bits: 32, rarity: 'ARCHETYPE', traits: { head: 'Visor Matrix', eyes: 'Cyber Scan', clothes: 'Flight Jacket', fur: 'Obsidian' } },
    { id: 2, name: 'Shadow Samurai', code: 'OP-0002', bits: 32, rarity: 'VANGUARD', traits: { head: 'Officer Cap', eyes: 'Eye Patch', clothes: 'Tactical Vest', fur: 'Cobalt' } },
    { id: 3, name: 'Sovereign Apex', code: 'OP-0003', bits: 32, rarity: 'SOVEREIGN', traits: { head: 'Golden Crown', eyes: 'Cyan Shades', clothes: 'Navy Suit', fur: 'Espresso' } },
    { id: 4, name: 'Quantum Void', code: 'OP-0004', bits: 33, rarity: 'STEALTH', traits: { head: 'Combat Band', eyes: 'Purple Laser', clothes: 'Shinobi Gi', fur: 'Chrome' } },
    { id: 5, name: 'Zero-Day Hunter', code: 'OP-0005', bits: 33, rarity: 'NETRUNNER', traits: { head: 'Earrings', eyes: 'VR Visor', clothes: 'Lab Robe', fur: 'Midnight' } },
    { id: 6, name: 'Glitch Runner', code: 'OP-0006', bits: 34, rarity: 'CYBORG', traits: { head: 'Cyber Cap', eyes: 'Spectacles', clothes: 'Smoking Suit', fur: 'Onyx' } },
    { id: 7, name: 'Solaris Admiral', code: 'OP-0007', bits: 34, rarity: 'COMMANDER', traits: { head: 'Admiral Hat', eyes: 'Monocle', clothes: 'Epaulet Coat', fur: 'Carbon' } },
    { id: 8, name: 'Forge Machinist', code: 'OP-0008', bits: 35, rarity: 'ENGINEER', traits: { head: 'Goggles', eyes: 'Thermal Lens', clothes: 'Heavy Overalls', fur: 'Bronze' } },
    { id: 9, name: 'Neural Oracle', code: 'OP-0009', bits: 35, rarity: 'MYSTIC', traits: { head: 'Beret', eyes: 'Kaleidoscope', clothes: 'Tweed Jacket', fur: 'Emerald' } },
    { id: 10, name: 'Circuit King', code: 'OP-0010', bits: 36, rarity: 'TITAN', traits: { head: 'Neon Crown', eyes: 'Reflectors', clothes: 'Hoodie & Chain', fur: 'Deep Violet' } },
    { id: 11, name: 'Bio-Hacker', code: 'OP-0011', bits: 36, rarity: 'SPEC-OPS', traits: { head: 'Comm Beanie', eyes: 'Scope', clothes: 'Armor Plating', fur: 'Burgundy' } },
    { id: 12, name: 'Chrono Warden', code: 'OP-0012', bits: 37, rarity: 'TEMPORAL', traits: { head: 'Pilot Goggles', eyes: 'HUD Grid', clothes: 'Leather Trench', fur: 'Russet' } },
  ];

  const activeOperative = syndicateOperatives.find(op => op.id === selectedTokenId) || syndicateOperatives[0];

  const handleSelect = (id: number) => {
    soundEffects.playClickSound();
    setSelectedTokenId(id);
  };

  return (
    <section id="collection-section" className="py-12 border-b-4 border-[#24140a] bg-[#f5ebd7] paper-dot-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-dot text-[#d83a2a] uppercase mb-1 font-bold">
              <Layers className="w-3.5 h-3.5 text-[#d83a2a]" />
              <span>HASHAPE ARCHIVE // 10,000 DETERMINISTIC EDITIONS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-jersey font-bold tracking-tight text-[#24140a] uppercase leading-none">
              THE APE DOSSIER
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <a
              href={OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundEffects.playClickSound()}
              className="paper-btn-red px-4 py-2 text-xs uppercase flex items-center space-x-2 font-bold"
            >
              <span>VIEW ON OPENSEA</span>
              <ExternalLink className="w-3.5 h-3.5 text-white" />
            </a>
            <a
              href="/storefront.json"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundEffects.playClickSound()}
              className="paper-btn-gold px-4 py-2 text-xs uppercase flex items-center space-x-2 font-bold"
            >
              <span>ACCESS 10,000 METADATA</span>
              <ChevronRight className="w-4 h-4 text-[#24140a]" />
            </a>
          </div>
        </div>

        {/* Interactive Dossier Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Left: Active Spotlight Operative Card */}
          <div className="lg:col-span-5 paper-chassis p-5 bg-[#fdfbf7]">
            <div className="flex items-center justify-between text-xs font-dot mb-3 pb-2 border-b-2 border-[#24140a]">
              <span className="text-[#d83a2a] font-bold uppercase tracking-wider">{activeOperative.code}</span>
              <span className="paper-stamp-red text-[10px]">
                {activeOperative.rarity}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {/* Avatar Viewport */}
              <div className="relative aspect-square w-44 sm:w-48 bg-[#eee2ca] border-3 border-[#24140a] overflow-hidden flex-shrink-0 shadow-[2px_2px_0px_#24140a]">
                <img
                  src={`/images/${activeOperative.id}.png`}
                  alt={activeOperative.name}
                  className="w-full h-full object-cover pixelated"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/preview.png';
                  }}
                />
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-[#fdfbf7] border-2 border-[#24140a] text-[10px] font-dot font-bold text-[#d83a2a]">
                  #{activeOperative.id}
                </div>
              </div>

              {/* Dossier Specs */}
              <div className="flex flex-col justify-between space-y-2 w-full text-xs font-dot">
                <h3 className="text-xl font-jersey font-bold text-[#24140a] uppercase">
                  {activeOperative.name}
                </h3>

                <div className="space-y-1.5 text-[11px]">
                  <div className="p-1.5 bg-[#eee2ca] border-2 border-[#24140a] flex justify-between shadow-[1px_1px_0px_#24140a]">
                    <span className="text-[#6b5443] font-bold">HEADWEAR:</span>
                    <span className="text-[#24140a] font-bold">{activeOperative.traits.head}</span>
                  </div>
                  <div className="p-1.5 bg-[#eee2ca] border-2 border-[#24140a] flex justify-between shadow-[1px_1px_0px_#24140a]">
                    <span className="text-[#6b5443] font-bold">EYES:</span>
                    <span className="text-[#d83a2a] font-bold">{activeOperative.traits.eyes}</span>
                  </div>
                  <div className="p-1.5 bg-[#eee2ca] border-2 border-[#24140a] flex justify-between shadow-[1px_1px_0px_#24140a]">
                    <span className="text-[#6b5443] font-bold">CLOTHES:</span>
                    <span className="text-[#24140a] font-bold">{activeOperative.traits.clothes}</span>
                  </div>
                  <div className="p-1.5 bg-[#eee2ca] border-2 border-[#24140a] flex justify-between shadow-[1px_1px_0px_#24140a]">
                    <span className="text-[#6b5443] font-bold">FUR:</span>
                    <span className="text-[#19638b] font-bold">{activeOperative.traits.fur}</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-[#6b5443] flex items-center justify-between font-bold">
                  <span>TARGET DIFFICULTY:</span>
                  <span className="text-[#d83a2a] font-bold">{activeOperative.bits} LEADING BITS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Character Select Grid (12 Operatives) */}
          <div className="lg:col-span-7 paper-chassis p-4 bg-[#fdfbf7] flex flex-col justify-between">
            <div className="text-xs font-dot text-[#24140a] mb-3 flex items-center justify-between font-bold">
              <span className="uppercase text-[#d83a2a]">SELECT OPERATIVE TO INSPECT</span>
              <span>12 OF 10,000 DISPLAYED</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {syndicateOperatives.map((op) => {
                const isSelected = selectedTokenId === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => handleSelect(op.id)}
                    className={`cursor-pointer p-1 transition-all duration-100 flex flex-col items-center group ${
                      isSelected
                        ? 'bg-[#eee2ca] border-3 border-[#d83a2a] shadow-[3px_3px_0px_#24140a] scale-105'
                        : 'bg-[#eee2ca] border-2 border-[#24140a] hover:border-[#d83a2a] shadow-[2px_2px_0px_#24140a]'
                    }`}
                  >
                    <div className="relative aspect-square w-full bg-[#fdfbf7] border border-[#24140a] overflow-hidden">
                      <img
                        src={`/images/${op.id}.png`}
                        alt={op.name}
                        className="w-full h-full object-cover pixelated group-hover:scale-105 transition-transform duration-150"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/preview.png';
                        }}
                      />
                    </div>
                    <div className="w-full text-center text-[10px] font-dot mt-1 text-[#24140a] font-bold truncate">
                      #{op.id}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t-2 border-[#24140a] flex items-center justify-between text-[11px] font-dot text-[#6b5443] font-bold">
              <span>Procedural trait combinations determined by Proof-of-Work hash at discovery.</span>
              <span className="paper-stamp-green text-[10px]">100% PNG METADATA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
