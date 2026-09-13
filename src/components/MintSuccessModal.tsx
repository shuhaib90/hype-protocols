import React, { useEffect } from 'react';
import { MintReceipt } from '../types';
import { CheckCircle2, ExternalLink, Sparkles, X, ShieldCheck } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface MintSuccessModalProps {
  receipt: MintReceipt | null;
  onClose: () => void;
}

export const MintSuccessModal: React.FC<MintSuccessModalProps> = ({ receipt, onClose }) => {
  useEffect(() => {
    if (receipt) {
      soundEffects.playMintSuccessSound();
    }
  }, [receipt]);

  if (!receipt) return null;

  const explorerUrl = `https://hyperscan.xyz/tx/${receipt.txHash}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#07070a]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="terminal-frame-lime max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="terminal-header-lime px-4 py-2 flex items-center justify-between text-xs tracking-wider">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#07070a]" />
            <h2 className="font-jersey text-lg text-[#07070a] uppercase tracking-wider">
              NFT MINTED // RECEIPT
            </h2>
          </div>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClose();
            }}
            className="text-[#07070a] hover:opacity-75 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-[#0d0e15] font-dot">
          <div className="text-center py-4 bg-[#10121b] border border-[#232738]">
            <div className="text-[10px] text-[#8b9bb4] uppercase tracking-widest mb-2">
              HASHAPE NFT MINTED
            </div>
            <div className="relative mx-auto w-36 h-36 mb-3 border-2 border-[#a3e635] bg-[#07070a] shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              <img
                src={`/images/${receipt.tokenId}.png`}
                alt={`HashApe #${receipt.tokenId}`}
                className="w-full h-full object-cover pixelated"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/preview.png';
                }}
              />
            </div>
            <div className="font-jersey text-3xl text-white tracking-tight">
              #{receipt.tokenId.toString().padStart(4, '0')}
            </div>
            <div className="inline-flex items-center space-x-1.5 mt-2 text-[10px] text-[#a3e635] bg-[#a3e635]/10 border border-[#a3e635]/40 px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>MINING PROOF: ON-CHAIN VERIFIED</span>
            </div>
          </div>

          <div className="p-2.5 bg-[#10121b] border border-[#232738] flex justify-between items-center text-xs">
            <span className="text-[#64748b]">TOKEN ID:</span>
            <span className="text-white font-bold font-jersey text-base">#{receipt.tokenId}</span>
          </div>
          {receipt.epochId && (
            <div className="p-2.5 bg-[#10121b] border border-[#232738] flex justify-between items-center text-xs">
              <span className="text-[#64748b]">EPOCH & FEE:</span>
              <span className="text-[#a3e635] font-bold">EPOCH #{receipt.epochId} (${receipt.feeUsd || 5} ETH)</span>
            </div>
          )}
          <div className="p-2.5 bg-[#10121b] border border-[#232738] flex justify-between items-center text-xs">
            <span className="text-[#64748b]">OWNER:</span>
            <code className="text-white font-mono">{receipt.owner.slice(0, 8)}...{receipt.owner.slice(-6)}</code>
          </div>
          <div className="p-2.5 bg-[#10121b] border border-[#232738] flex justify-between items-center text-xs">
            <span className="text-[#64748b]">TRANSACTION:</span>
            <code className="text-[#00f0ff] font-mono">{receipt.txHash.slice(0, 10)}...{receipt.txHash.slice(-8)}</code>
          </div>
          <div className="p-2.5 bg-[#10121b] border border-[#232738] flex justify-between items-center text-xs">
            <span className="text-[#64748b]">PROOF STATUS:</span>
            <span className="text-[#a3e635] font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>VALID & SETTLED</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#10121b] border-t border-[#232738] flex items-center justify-end space-x-3 font-dot">
          <a
            href={`/images/${receipt.tokenId}.png`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundEffects.playClickSound()}
            className="pixel-btn-slate px-4 py-1.5 text-xs flex items-center space-x-1.5 uppercase"
          >
            <span>VIEW NFT</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundEffects.playClickSound()}
            className="pixel-btn-lime px-4 py-1.5 text-xs flex items-center space-x-1.5 uppercase font-bold"
          >
            <span>EXPLORER</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
