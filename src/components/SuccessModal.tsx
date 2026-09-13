import React, { useState } from 'react';
import { MiningProof, EpochInfo } from '../types';
import { useWallet } from '../web3/WalletContext';
import { CheckCircle2, ShieldCheck, Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface SuccessModalProps {
  proof: MiningProof | null;
  mintFeeHype: number;
  currentEpoch?: EpochInfo;
  targetTokenId?: number;
  onClose: () => void;
  onMintSuccess: (tokenId: number, txHash: string) => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  proof,
  mintFeeHype,
  currentEpoch,
  targetTokenId,
  onClose,
  onMintSuccess,
}) => {
  const { mintNFTOnChain, nativeHypeBalance } = useWallet();
  const [isMinting, setIsMinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!proof) return null;

  const feeToPay = currentEpoch ? currentEpoch.mintFeeEth : 0.0020;
  const expectedToken = targetTokenId || (currentEpoch ? currentEpoch.startToken + (currentEpoch.minedInEpoch || 0) : 1);

  const handleMint = async () => {
    soundEffects.playClickSound();
    setIsMinting(true);
    setErrorMessage(null);
    try {
      const result = await mintNFTOnChain(proof.nonce, proof.challenge, feeToPay, expectedToken);
      if (result.success) {
        onMintSuccess(result.tokenId || expectedToken, result.txHash);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Mint transaction failed');
    } finally {
      setIsMinting(false);
    }
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const formattedBalance = nativeHypeBalance < 0.001 
    ? nativeHypeBalance.toFixed(6) 
    : nativeHypeBalance.toFixed(4);

  return (
    <div className="fixed inset-0 z-50 bg-[#24140a]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="paper-chassis max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150 bg-[#fdfbf7]">
        {/* Header */}
        <div className="paper-header-red px-4 py-2 flex items-center justify-between text-xs tracking-wider">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <h2 className="font-jersey text-lg text-white uppercase tracking-wider">
              MINING COMPLETE // PROOF VERIFIED
            </h2>
          </div>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClose();
            }}
            className="text-white hover:opacity-75 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-[#fdfbf7] font-dot">
          <div className="p-4 bg-[#eee2ca] border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
            <div className="text-xs text-[#2e7d32] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
              <span>VALID PROOF-OF-WORK DISCOVERED</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-[#fdfbf7] p-2 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[#6b5443] text-[10px] uppercase block font-bold">TIME</span>
                <span className="font-mono font-bold text-[#24140a]">{formatSecs(proof.elapsedSecs)}</span>
              </div>
              <div className="bg-[#fdfbf7] p-2 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[#6b5443] text-[10px] uppercase block font-bold">WORKERS</span>
                <span className="font-mono font-bold text-[#24140a]">{proof.workerId} / 5</span>
              </div>
              <div className="bg-[#fdfbf7] p-2 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[#6b5443] text-[10px] uppercase block font-bold">HASHRATE</span>
                <span className="font-mono font-bold text-[#2e7d32]">{proof.hashrate.toFixed(2)} MH/s</span>
              </div>
              <div className="bg-[#fdfbf7] p-2 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                <span className="text-[#6b5443] text-[10px] uppercase block font-bold">PROOF ID</span>
                <span className="text-[#24140a] font-bold">{proof.proofId}</span>
              </div>
            </div>

            <div className="mt-2.5 p-2 bg-[#fdfbf7] border border-[#24140a] text-[11px]">
              <span className="text-[#6b5443] text-[10px] uppercase block mb-0.5 font-bold">SOLUTION NONCE</span>
              <code className="text-[#19638b] break-all font-mono font-bold">{proof.nonce}</code>
            </div>
          </div>

          {/* Mint section */}
          <div className="p-4 bg-[#eee2ca] border-2 border-[#d83a2a] shadow-[2px_2px_0px_#24140a]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-jersey text-base text-[#24140a] uppercase flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-[#d83a2a]" />
                <span>MINT YOUR HASHAPE {currentEpoch ? `[ EPOCH #${currentEpoch.id} ]` : ''}</span>
              </span>
              <div className="text-right">
                <span className="text-[10px] text-[#6b5443] uppercase block font-bold">MINT FEE</span>
                <span className="text-sm font-jersey font-bold text-[#d83a2a]">
                  {currentEpoch ? `$${currentEpoch.mintFeeUsd} ETH (${currentEpoch.mintFeeEth.toFixed(4)} ETH)` : '$5 ETH (0.0020 ETH)'}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#6b5443] leading-relaxed font-medium">
              Your valid proof unlocks exactly 1 HashApe NFT mint entitlement in <strong className="text-[#24140a] font-bold">{currentEpoch?.name || 'Active Epoch'}</strong> (Token #{expectedToken}). Mint fee is strictly <strong className="text-[#d83a2a] font-bold">${currentEpoch?.mintFeeUsd || 5} ETH</strong> on Robinhood Chain Mainnet.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#eee2ca] border-2 border-[#d83a2a] text-xs text-[#d83a2a] flex items-center gap-2 font-bold shadow-[2px_2px_0px_#24140a]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#d83a2a]" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#eee2ca] border-t-2 border-[#24140a] flex items-center justify-between font-dot">
          <div className="text-xs text-[#6b5443] font-bold">
            Balance: <span className="text-[#2e7d32] font-bold">{formattedBalance} ETH</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                soundEffects.playClickSound();
                onClose();
              }}
              disabled={isMinting}
              className="paper-btn-kraft px-4 py-1.5 text-xs uppercase font-bold"
            >
              LATER
            </button>
            <button
              onClick={handleMint}
              disabled={isMinting}
              className="paper-btn-red px-5 py-2 text-xs flex items-center space-x-1.5 uppercase font-bold"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>BROADCASTING ON-CHAIN...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>MINT NFT NOW</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
