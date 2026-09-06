import React from 'react';
import { SECURITY_DEBT } from '../data/reportData';
import { Bug, CheckCircle, ShieldAlert } from 'lucide-react';

export const SecurityDebtView: React.FC = () => {
  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <h2 className="pro-title flex items-center gap-2 mb-2">
          <Bug className="w-5 h-5 text-[#FBBF24]" />
          <span>Section 7: Security Debt Register — "What Was Wrong vs What Was Fixed"</span>
        </h2>
        <p className="text-xs text-[#94A3B8] mb-6 font-sans">
          Comprehensive cross-reference table contrasting original v2.0 architectural vulnerabilities with verified v2.1 hardening fixes and verification evidence.
        </p>

        <div className="overflow-x-auto font-mono">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-[#38BDF8] border-b border-[#334155]">
                <th className="p-3">Flaw (v2.0 State)</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Remediation Fix (v2.1)</th>
                <th className="p-3">Verification Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] text-[#F1F5F9]/80">
              {SECURITY_DEBT.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#0F172A]/50 transition-colors">
                  <td className="p-3 font-semibold text-[#F1F5F9]">{item.flaw}</td>
                  <td className="p-3">
                    {item.severity === 'Critical' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                        Critical
                      </span>
                    )}
                    {item.severity === 'High' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40">
                        High
                      </span>
                    )}
                    {item.severity === 'Medium' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">
                        Medium
                      </span>
                    )}
                    {item.severity === 'Low' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-500/20 text-slate-300 border border-slate-500/40">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-[#4ADE80] font-medium">{item.fix}</td>
                  <td className="p-3 text-[#94A3B8] text-[11px]">{item.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
