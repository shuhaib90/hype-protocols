import React, { useState, useEffect } from 'react';
import { useWallet } from '../web3/WalletContext';
import { ShieldCheck, Hash, CheckCircle2, ExternalLink, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export interface SolvedRecord {
  id: string;
  wallet: string;
  tokenId: number;
  nonce: string;
  solvedHash: string;
  difficulty: number;
  gpuRenderer?: string;
  status: 'SOLVED' | 'MINTED';
  solvedAt: number;
  mintedAt?: number;
  txHash?: string;
}

interface MiningLedgerProps {
  onMintRecord?: (record: SolvedRecord) => void;
  refreshTrigger?: number;
}

export const MiningLedger: React.FC<MiningLedgerProps> = ({ onMintRecord, refreshTrigger }) => {
  const { isConnected, address, connectWallet } = useWallet();
  const [records, setRecords] = useState<SolvedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setRecords([]);
      return;
    }

    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/mining/records?wallet=' + encodeURIComponent(address));
        if (res.ok) {
          const data = await res.json();
          if (data.records) {
            setRecords(data.records);
          }
        }
      } catch (err) {
        console.error('Failed to fetch mining records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address, refreshTrigger]);

  const solvedCount = records.filter(r => r.status === 'SOLVED').length;
  const mintedCount = records.filter(r => r.status === 'MINTED').length;

  return (
    <div className="paper-chassis mb-10 overflow-hidden bg-[#fdfbf7]">
      <div className="paper-header-gold px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-jersey text-base text-[#24140a] tracking-wider">SOLVED PROOFS & MINT HISTORY</span>
          <span className="text-[10px] font-dot text-[#24140a] bg-[#f5ebd7] px-1.5 py-0.5 border border-[#24140a] font-bold">
            CRYPTOGRAPHIC RECORD
          </span>
        </div>
        {isConnected && (
          <div className="flex items-center gap-2 font-dot text-xs font-bold">
            <span className="text-[#19638b]">
              SOLVED: {solvedCount}
            </span>
            <span className="text-[#24140a]">|</span>
            <span className="text-[#d83a2a] font-bold">
              MINTED: {mintedCount} / 5
            </span>
          </div>
        )}
      </div>

      <div className="p-5 bg-[#fdfbf7]">
        {!isConnected ? (
          <div className="bg-[#eee2ca] border-2 border-dashed border-[#24140a] p-8 text-center shadow-[2px_2px_0px_#24140a]">
            <Hash className="w-8 h-8 text-[#6b5443] mx-auto mb-3 opacity-60" />
            <h4 className="font-jersey text-lg text-[#24140a] mb-2">
              WALLET NOT CONNECTED
            </h4>
            <p className="text-xs font-dot text-[#6b5443] max-w-md mx-auto mb-4 font-medium">
              Connect your Web3 wallet to view your cryptographic nonces and claimable HashApe editions.
            </p>
            <button
              onClick={() => {
                soundEffects.playClickSound();
                connectWallet();
              }}
              className="paper-btn-red px-6 py-2 text-sm font-bold"
            >
              CONNECT WALLET
            </button>
          </div>
        ) : loading && records.length === 0 ? (
          <div className="text-center py-8 text-xs font-dot text-[#6b5443] animate-pulse font-bold">
            Retrieving ledger for {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
          </div>
        ) : records.length === 0 ? (
          <div className="bg-[#eee2ca] border-2 border-[#24140a] p-8 text-center shadow-[2px_2px_0px_#24140a]">
            <Sparkles className="w-8 h-8 text-[#d83a2a] mx-auto mb-3 opacity-80" />
            <h4 className="font-jersey text-lg text-[#24140a] mb-2">
              NO PROOFS FOUND YET
            </h4>
            <p className="text-xs font-dot text-[#6b5443] max-w-md mx-auto font-medium">
              Engage your GPU mining rig above. When a valid Keccak-256 target solution is discovered, it will be automatically recorded here for on-chain minting.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => {
              const isMinted = rec.status === 'MINTED';
              const dateStr = new Date(rec.solvedAt || Date.now()).toLocaleTimeString();

              return (
                <div
                  key={rec.id || rec.nonce}
                  className={`p-3.5 border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isMinted
                      ? 'bg-[#fdfbf7] border-[#24140a] shadow-[1px_1px_0px_#24140a]'
                      : 'bg-[#eee2ca] border-[#d83a2a] shadow-[2px_2px_0px_#24140a]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 flex-shrink-0 border-2 border-[#24140a] bg-[#fdfbf7] overflow-hidden shadow-[1px_1px_0px_#24140a]">
                      <img
                        src={`/images/${rec.tokenId}.png`}
                        alt={`HashApe #${rec.tokenId}`}
                        className="w-full h-full object-cover pixelated"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/preview.png';
                        }}
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-dot">
                        <span className="font-bold text-[#24140a]">
                          HASHAPE #{rec.tokenId}
                        </span>
                        {isMinted ? (
                          <span className="paper-stamp-gold text-[10px]">
                            MINTED
                          </span>
                        ) : (
                          <span className="paper-stamp-green text-[10px]">
                            READY TO MINT
                          </span>
                        )}
                        <span className="text-[10px] text-[#6b5443] font-medium">
                          {dateStr}
                        </span>
                      </div>

                      <div className="font-dot text-xs space-y-0.5">
                        <div className="text-[#6b5443] flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold">HASH:</span>
                          <code className="text-[#19638b] break-all font-bold">
                            {rec.solvedHash || '0x' + '0'.repeat(64)}
                          </code>
                        </div>
                        <div className="text-[#6b5443] flex items-center gap-2 text-[11px] font-bold">
                          <span>NONCE: <strong className="text-[#24140a]">{rec.nonce}</strong></span>
                          {rec.gpuRenderer && (
                            <span>• CORE: <span className="text-[#2e7d32]">{rec.gpuRenderer}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
                    {isMinted ? (
                      rec.txHash ? (
                        <a
                          href={`https://explorer.hyperliquid.xyz/tx/${rec.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => soundEffects.playClickSound()}
                          className="paper-btn-kraft px-3 py-1.5 text-xs flex items-center gap-1 font-bold"
                        >
                          <span>TX: {rec.txHash.slice(0, 6)}...{rec.txHash.slice(-4)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs font-dot text-[#2e7d32] font-bold">Mint Confirmed ✓</span>
                      )
                    ) : (
                      <button
                        onClick={() => {
                          soundEffects.playClickSound();
                          if (onMintRecord) onMintRecord(rec);
                        }}
                        className="paper-btn-red px-4 py-2 text-xs flex items-center gap-1.5 font-bold"
                      >
                        <span>MINT NFT (NATIVE ETH)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
