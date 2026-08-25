import React, { useState } from 'react';
import { DEMO_ACTS } from '../data/reportData';
import { Play, Copy, Check, Terminal, Clock, ShieldAlert } from 'lucide-react';

export const JuryDemoView: React.FC = () => {
  const [activeActIndex, setActiveActIndex] = useState<number>(0);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const activeAct = DEMO_ACTS[activeActIndex];

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="pro-title flex items-center gap-2">
              <Play className="w-5 h-5 text-[#4ADE80]" />
              <span>Section 9: Jury Demo Script — "15 Minutes, Zero Failure"</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 font-sans">
              Step-by-step 5-act demonstration transcript with exact terminal commands, expected outputs, and spoken narrative transitions.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#0F172A] p-1 border border-[#334155] rounded font-mono">
            {DEMO_ACTS.map((act, idx) => (
              <button
                key={act.act}
                onClick={() => setActiveActIndex(idx)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeActIndex === idx
                    ? 'bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 shadow'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {act.act}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Act Execution Card */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-5 space-y-4 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#334155]">
            <div>
              <span className="text-[10px] font-bold text-[#4ADE80] uppercase tracking-widest">{activeAct.act}</span>
              <h3 className="text-sm font-bold text-[#F1F5F9] uppercase">{activeAct.title}</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-[#FBBF24] text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Allocated Time: {activeAct.duration}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Objective</span>
            <p className="text-xs text-[#F1F5F9]">{activeAct.objective}</p>
          </div>

          {/* Commands block */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Exact Terminal Execution Commands</span>
            {activeAct.commands.map((c, i) => (
              <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-md overflow-hidden">
                <div className="bg-[#0F172A] px-3 py-1.5 border-b border-[#334155] flex items-center justify-between">
                  <span className="text-[10px] text-[#38BDF8] font-semibold">{c.note || `Step ${i + 1}`}</span>
                  <button
                    onClick={() => handleCopy(c.cmd)}
                    className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-white cursor-pointer"
                  >
                    {copiedCmd === c.cmd ? (
                      <>
                        <Check className="w-3 h-3 text-[#4ADE80]" />
                        <span className="text-[#4ADE80] font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 text-xs font-mono">
                  <div className="text-[#4ADE80] select-all">$ {c.cmd}</div>
                  {c.output && (
                    <div className="mt-2 text-[11px] text-[#94A3B8] bg-[#0F172A] p-2 rounded border border-[#334155] whitespace-pre-wrap">
                      {c.output}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Narrative box */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-md p-4">
            <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1 flex items-center gap-1">
              <Terminal className="w-3 h-3" /> Spoken Presentation Narrative to Jury
            </span>
            <p className="text-xs text-purple-200 italic leading-relaxed">
              "{activeAct.narrative}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
