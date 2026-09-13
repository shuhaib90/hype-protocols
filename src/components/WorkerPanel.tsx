import React, { useState } from 'react';
import { WorkerInfo } from '../types';
import { useWallet } from '../web3/WalletContext';
import { Users, CheckCircle2, Zap, AlertCircle } from 'lucide-react';

interface WorkerPanelProps {
  workers: WorkerInfo[];
  onActivateWorker: (workerId: number, costHype: number) => Promise<void>;
  isMining: boolean;
  workerHashrates?: Record<number, number>;
}

export const WorkerPanel: React.FC<WorkerPanelProps> = ({
  workers,
  onActivateWorker,
  isMining,
  workerHashrates,
}) => {
  const { isConnected, tokenHypeBalance, connectWallet, rigActivationTokenAddress } = useWallet();
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleActivate = async (worker: WorkerInfo) => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (tokenHypeBalance < worker.costHype) {
      setErrorMessage(`Insufficient HashApe ($HASHAPE) balance. Need ${worker.costHype} $HASHAPE to activate Miner 0${worker.id}.`);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setActivatingId(worker.id);
    setErrorMessage(null);
    try {
      await onActivateWorker(worker.id, worker.costHype);
    } catch (err: any) {
      setErrorMessage(err.message || 'Worker activation failed.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="paper-chassis mb-10 overflow-hidden">
      {/* Header Bar */}
      <div className="paper-header-gold px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-jersey text-base text-[#24140a] tracking-wider">MINING WORKERS (5 MAX) // GPU CLUSTER</span>
          <span className="text-[10px] font-dot text-[#24140a] bg-[#f5ebd7] px-1.5 py-0.5 border border-[#24140a] font-bold">
            DISJOINT PARTITIONS (A–E)
          </span>
        </div>
        <div className="text-xs font-dot text-[#24140a] font-bold flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#2e7d32] border border-[#24140a] inline-block shadow-[1px_1px_0px_#24140a]" />
          <span>NODES ONLINE: {workers.filter((w) => w.status === 'ACTIVE').length} / 5</span>
        </div>
      </div>

      <div className="p-5 bg-[#fdfbf7] space-y-4">
        <p className="text-xs font-dot text-[#6b5443] font-medium">
          Worker #1 is 100% FREE. Workers #2–#5 require HashApe ($HASHAPE) tokens to activate. Each worker computes nonces across dedicated, non-overlapping 64-bit address intervals.
        </p>

        {/* Token Contract for Active Rig */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#eee2ca] border-2 border-[#24140a] text-xs font-mono shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#24140a] font-display font-bold text-[10px] uppercase bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
              TOKEN CONTRACT FOR ACTIVE RIG
            </span>
            <code className="text-[#d83a2a] font-bold font-mono text-[11px] select-all bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
              {rigActivationTokenAddress || '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc'}
            </code>
          </div>
          <span className="text-[10px] text-[#2e7d32] font-bold bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
            ROBINHOOD EVM L2
          </span>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-[#eee2ca] border-2 border-[#d83a2a] text-xs font-dot text-[#d83a2a] flex items-center gap-2 font-bold shadow-[2px_2px_0px_#24140a]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#d83a2a]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 5 Rack Blade Server Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {workers.map((worker) => {
            const isActive = worker.status === 'ACTIVE';
            const isProcessing = activatingId === worker.id;
            const rangeLetter = String.fromCharCode(65 + worker.id - 1);
            const speed = isMining && isActive ? (workerHashrates?.[worker.id] || worker.hashrate || 12.25) : 0;
            const bladeNames = ['CORE', 'VECTOR', 'MATRIX', 'TENSOR', 'QUANTUM'];

            return (
              <div
                key={worker.id}
                className={`p-3.5 border-2 flex flex-col justify-between transition-all relative ${
                  isActive
                    ? 'bg-[#eee2ca] border-[#2e7d32] shadow-[3px_3px_0px_#24140a]'
                    : 'bg-[#eee2ca] border-[#24140a] shadow-[2px_2px_0px_#24140a] hover:border-[#d83a2a]'
                }`}
              >
                <div>
                  {/* Blade Header */}
                  <div className="flex items-center justify-between gap-1 mb-2 text-xs font-dot">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full border border-[#24140a] ${isActive ? 'bg-[#2e7d32]' : 'bg-[#a38e78]'}`} />
                      <span className="font-bold text-[#24140a] font-jersey text-base">
                        BLADE-0{worker.id}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 border border-[#24140a] ${
                      worker.isFree 
                        ? 'bg-[#fdfbf7] text-[#2e7d32]' 
                        : 'bg-[#d48818] text-[#24140a]'
                    }`}>
                      {worker.isFree ? 'FREE' : `${worker.costHype} $HASHAPE`}
                    </span>
                  </div>

                  {/* Blade Architecture Tag */}
                  <div className="text-[10px] font-dot text-[#6b5443] font-bold uppercase mb-2 flex items-center justify-between">
                    <span>UNIT [{bladeNames[worker.id - 1]}]</span>
                    {isActive && isMining && (
                      <span className="text-[#2e7d32] font-bold">
                        {speed.toFixed(1)} MH/s
                      </span>
                    )}
                  </div>

                  {/* Nonce Range Box */}
                  <div className="bg-[#fdfbf7] p-2 text-[10px] font-dot text-[#6b5443] mb-3 border-2 border-[#24140a] shadow-[1px_1px_0px_#24140a]">
                    <div className="text-[#19638b] mb-0.5 uppercase font-bold flex items-center justify-between">
                      <span>PARTITION {rangeLetter}</span>
                      <span className="text-[9px] text-[#6b5443]">64-BIT</span>
                    </div>
                    <div className="truncate text-[#24140a] font-mono font-bold" title={worker.nonceRange.formatted}>
                      {worker.nonceRange.formatted}
                    </div>
                  </div>
                </div>

                {/* Blade Action Button */}
                <div>
                  {isActive ? (
                    <div className="w-full py-1.5 bg-[#fdfbf7] border-2 border-[#2e7d32] text-[#2e7d32] text-xs font-dot font-bold flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#24140a]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                      <span>{isMining ? 'COMPUTING...' : 'NODE ONLINE'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleActivate(worker)}
                      disabled={isProcessing || isMining}
                      className="paper-btn-red w-full py-1.5 text-xs flex items-center justify-center gap-1 font-bold"
                    >
                      {isProcessing ? (
                        <span>SYNCING...</span>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>ACTIVATE BLADE</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-[11px] font-dot text-[#6b5443] pt-1 font-bold">
          Non-overlapping nonce partitioning ensures zero duplicated search iterations across GPU nodes.
        </div>
      </div>
    </div>
  );
};
