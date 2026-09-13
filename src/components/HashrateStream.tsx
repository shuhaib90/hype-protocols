import React from 'react';
import { WorkerInfo } from '../types';
import { Activity, Cpu } from 'lucide-react';

interface HashrateStreamProps {
  totalHashrate: number;
  workers: WorkerInfo[];
  workerHashrates: Record<number, number>;
  isMining: boolean;
}

export const HashrateStream: React.FC<HashrateStreamProps> = ({
  totalHashrate,
  workers,
  workerHashrates,
  isMining,
}) => {
  return (
    <div className="pixel-card-violet p-5 relative overflow-hidden">
      <div className="flex items-center justify-between pb-3.5 border-b border-purple-900/60 mb-4">
        <div className="flex items-center space-x-2 text-xs font-display font-bold text-white uppercase">
          <Activity className="w-4 h-4 text-cyber-mint" />
          <span>HASHRATE TELEMETRY</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-purple-300 uppercase block">TOTAL HASHRATE</span>
          <span className="font-display font-black text-xl text-cyan-300">
            {isMining ? Number(totalHashrate || 0).toFixed(2) : '0.00'}{' '}
            <span className="text-xs font-mono text-purple-300 font-normal">MH/s</span>
          </span>
        </div>
      </div>

      {/* Individual Worker Hashrate Breakdown */}
      <div className="space-y-2.5">
        {workers.map((worker) => {
          const isWorkerActive = worker.status === 'ACTIVE';
          const speed = isMining && isWorkerActive ? (workerHashrates[worker.id] || worker.hashrate || 0) : 0;
          const pct = totalHashrate > 0 && isMining ? Math.min(100, Math.round((speed / totalHashrate) * 100)) : 0;

          return (
            <div
              key={worker.id}
              className={`p-3 border-2 transition-all ${
                isWorkerActive
                  ? 'bg-[#08031a] border-purple-800/70 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                  : 'bg-[#05010d] border-purple-950/40 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <div className="flex items-center space-x-2">
                  <Cpu className={`w-3.5 h-3.5 ${isWorkerActive ? 'text-cyber-mint' : 'text-purple-400'}`} />
                  <span className="font-bold text-white">Miner 0{worker.id}</span>
                  <span className={`text-[9px] px-2 py-0.5 font-display ${
                    isWorkerActive ? 'bg-[#00ff88]/15 text-cyber-mint border border-emerald-500/40' : 'bg-white/5 text-purple-400 border border-purple-900/40'
                  }`}>
                    {isWorkerActive ? 'ACTIVE' : 'LOCKED'}
                  </span>
                </div>
                <div className="font-mono font-bold text-cyan-300">
                  {Number(speed || 0).toFixed(2)} MH/s {isMining && isWorkerActive && <span className="text-[10px] text-purple-300 font-normal">({pct}%)</span>}
                </div>
              </div>

              {/* Progress bar per worker */}
              <div className="w-full bg-[#05010d] h-2 border border-purple-900/60 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_#00ff88]"
                  style={{ width: `${isMining && isWorkerActive ? Math.max(5, pct) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-purple-900/50 text-[11px] font-mono text-purple-400 text-center">
        Informational WebGPU telemetry. Proof validity is independently enforced on-chain.
      </div>
    </div>
  );
};
