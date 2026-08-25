import React from 'react';
import { Shield, Radio, Terminal, Server, CheckCircle2, Download, ExternalLink } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onExportMarkdown: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onExportMarkdown }) => {
  return (
    <header className="bg-[#0F172A]/95 border-b border-[#334155] sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-[1720px] mx-auto px-5 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#1E293B] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#38BDF8] tracking-widest uppercase font-mono flex items-center gap-2">
                <span>AEGIS v2.1</span>
                <span className="text-[#94A3B8] font-normal text-xs uppercase tracking-wider">ARCHITECTURAL BLUEPRINT</span>
              </h1>
              <span className="status-badge-success font-mono uppercase text-[9px] tracking-wider">
                SOC LEVEL: MATURE
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
              Sovereign Zero-Trust Gateway + MSSP SOC Architecture · Lead Architect: TAIBI MOHAMED ANIS (Ezio)
            </p>
          </div>
        </div>

        {/* Right status indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-4 bg-[#1E293B] border border-[#334155] px-3 py-1.5 rounded text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#4ADE80]">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse"></span>
              <span>Gateway: 9/9 Healthy</span>
            </div>
            <div className="w-px h-3 bg-[#334155]"></div>
            <div className="flex items-center gap-1.5 text-[#38BDF8]">
              <Server className="w-3.5 h-3.5" />
              <span>SOC: 3 Nodes Active</span>
            </div>
            <div className="w-px h-3 bg-[#334155]"></div>
            <div className="text-right">
              <span className="text-[#94A3B8] text-[9px] block uppercase leading-none">JURY READINESS</span>
              <span className="text-[#38BDF8] font-bold text-xs">82% COMPLETE</span>
            </div>
          </div>

          <button
            onClick={onExportMarkdown}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer"
            title="Download full AEGIS_v2.1_Report_and_Blueprint.md"
          >
            <Download className="w-4 h-4" />
            <span>Export Markdown</span>
          </button>
        </div>
      </div>
    </header>
  );
};
