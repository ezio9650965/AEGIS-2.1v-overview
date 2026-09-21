import React from 'react';
import { Shield, Server, Download, Terminal, Network, Layers, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onExportMarkdown: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onExportMarkdown }) => {
  return (
    <header className="bg-[#0F172A]/95 border-b border-[#334155] terminal-panel-header sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1720px] mx-auto px-5 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#1E293B] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-sm glow-cyan-hover">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#38BDF8] tracking-widest uppercase font-mono flex items-center gap-2 glitch-header">
                <span>[AEGIS_v2.1]</span>
                <span className="text-[#94A3B8] font-normal text-xs uppercase tracking-wider hidden sm:inline">ARCHITECTURAL BLUEPRINT</span>
              </h1>
              <span className="status-badge-success font-mono uppercase text-[9px] tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
                [ONLINE]
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
              Sovereign Zero-Trust Gateway + MSSP SOC Architecture · Lead Architect: TAIBI MOHAMED ANIS (Ezio)
            </p>
          </div>
        </div>

        {/* Center / Top-level Primary Navigation */}
        <nav className="flex items-center gap-1.5 bg-[#1E293B]/80 border border-[#334155] p-1 rounded-lg font-mono text-xs">
          <button
            onClick={() => onTabChange('sec-1')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sec-1' || activeTab === 'sec-2'
                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => onTabChange('sec-3')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sec-3'
                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zones</span>
          </button>

          <button
            onClick={() => onTabChange('sec-11')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sec-11'
                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Governance</span>
          </button>

          <button
            onClick={() => onTabChange('sec-deployment')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              activeTab === 'sec-deployment'
                ? 'bg-[#38BDF8] text-slate-950 font-bold shadow-sky-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 font-semibold'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Deployment Guide</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase tracking-tight">
              New
            </span>
          </button>
        </nav>

        {/* Right status indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden 2xl:flex items-center gap-3 bg-[#1E293B] border border-[#334155] px-2.5 py-1 rounded text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#4ADE80]">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse"></span>
              <span>Gateway: [9/9 HEALTHY]</span>
            </div>
            <div className="w-px h-3 bg-[#334155]"></div>
            <div className="flex items-center gap-1.5 text-[#38BDF8]">
              <Server className="w-3.5 h-3.5" />
              <span>SOC: [3 NODES]</span>
            </div>
          </div>

          <button
            onClick={onExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer glow-cyan-hover"
            title="Download full AEGIS_v2.1_Report_and_Blueprint.md"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Markdown</span>
          </button>
        </div>
      </div>
    </header>
  );
};

