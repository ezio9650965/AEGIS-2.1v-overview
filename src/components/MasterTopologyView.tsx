import React from 'react';
import { InteractiveTopologyDiagram } from './InteractiveTopologyDiagram';
import { Network, ShieldCheck } from 'lucide-react';

export const MasterTopologyView: React.FC = () => {
  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#334155]">
          <div>
            <h2 className="pro-title mb-1.5 flex items-center gap-2">
              <Network className="w-5 h-5 text-[#38BDF8]" />
              <span>Section 2: Master 4-Zone Architecture Topology</span>
            </h2>
            <p className="text-xs text-[#94A3B8] font-sans">
              High-availability hybrid topology featuring local Zero-Trust Access Edge Gateway (Zone 3), Small Enterprise Domain Grid (Zone 2), Threatscape Red Team (Zone 1), and Remote 3-Node MSSP SOC Cluster (Zone 4).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] bg-[#0F172A] px-3 py-1.5 rounded border border-[#334155]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[#F1F5F9]">Zero-Trust Perimeter Validated</span>
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
