import React from 'react';
import { InteractiveTopologyDiagram } from './InteractiveTopologyDiagram';
import { Network, ShieldCheck } from 'lucide-react';

export const MasterTopologyView: React.FC = () => {
  return (
    <div className="space-y-6 font-mono text-[13px]">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 aegis-grid-bg shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#30363d]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[rgba(0,212,255,0.13)] border border-[#00d4ff]/30 text-[#00d4ff] text-[10px] uppercase font-bold tracking-wider mb-2">
              <Network className="w-3.5 h-3.5" />
              <span>Section 2 Architecture</span>
            </div>
            <h2 className="text-lg font-bold text-[#c9d1d9] tracking-tight flex items-center gap-2">
              <span>Master 4-Zone Enterprise Architecture Topology</span>
            </h2>
            <p className="text-xs text-[#8b949e] mt-1 max-w-3xl leading-relaxed">
              High-availability hybrid topology featuring local Zero-Trust Access Edge Gateway (Zone 3), Small Enterprise Domain Grid (Zone 2), Threatscape Red Team (Zone 1), and Remote 3-Node MSSP SOC Cluster (Zone 4).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs bg-[#21262d] px-3.5 py-2 rounded-md border border-[#30363d]">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] pulse-indicator-gn" />
            <ShieldCheck className="w-4 h-4 text-[#00ff41]" />
            <span className="text-[#c9d1d9] font-bold">Zero-Trust Perimeter Validated</span>
          </div>
        </div>

        {/* Interactive Custom SVG/JS Topology System (Constraints A-E) */}
        <InteractiveTopologyDiagram
          initialExpandedZone="none"
          showTraceControls={true}
        />
      </div>
    </div>
  );
};
