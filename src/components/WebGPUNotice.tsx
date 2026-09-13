import React from 'react';
import { GPUInfo } from '../mining/WebGPUEngine';
import { ShieldCheck, AlertTriangle, Cpu } from 'lucide-react';

interface WebGPUNoticeProps {
  gpuInfo: GPUInfo | null;
}

export const WebGPUNotice: React.FC<WebGPUNoticeProps> = ({ gpuInfo }) => {
  if (!gpuInfo) return null;

  return (
    <div className="max-w-7xl mx-auto mb-6">
      {gpuInfo.supported ? (
        <div className="paper-chassis p-3 bg-[#eee2ca] flex items-center justify-between text-xs font-dot border-l-6 border-l-[#2e7d32] shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-[#2e7d32] flex-shrink-0" />
            <span className="text-[#2e7d32] font-bold">[ WEBGPU READY ]</span>
            <span className="text-[#6b5443]">::</span>
            <span className="text-[#24140a] font-bold">{gpuInfo.name}</span>
            <span className="text-[#6b5443]">({gpuInfo.vendor})</span>
          </div>
          <span className="hidden sm:inline text-[#6b5443] text-[11px] font-bold">
            WGSL compute shader acceleration active.
          </span>
        </div>
      ) : (
        <div className="paper-chassis p-3 bg-[#eee2ca] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-dot border-l-6 border-l-[#d48818] shadow-[2px_2px_0px_#24140a]">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-[#d48818] flex-shrink-0" />
            <span className="text-[#d48818] font-bold">[ WEBGPU FALLBACK ]</span>
            <span className="text-[#6b5443] hidden sm:inline">::</span>
            <span className="text-[#24140a] font-bold">WebGPU not detected. Using CPU WGSL emulation fallback.</span>
          </div>
          <span className="text-[#6b5443] text-[11px] font-bold">
            Device: {gpuInfo.name}
          </span>
        </div>
      )}
    </div>
  );
};
