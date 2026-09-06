import React, { useState, useMemo } from 'react';
import { SECURITY_DEBT } from '../data/reportData';
import { Bug, CheckCircle2, ShieldAlert, AlertTriangle, Search, Filter, RefreshCw } from 'lucide-react';

export const SecurityDebtView: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    return {
      total: SECURITY_DEBT.length,
      critical: SECURITY_DEBT.filter((i) => i.severity === 'Critical').length,
      high: SECURITY_DEBT.filter((i) => i.severity === 'High').length,
      medium: SECURITY_DEBT.filter((i) => i.severity === 'Medium').length,
      low: SECURITY_DEBT.filter((i) => i.severity === 'Low').length,
    };
  }, []);

  const filteredDebt = useMemo(() => {
    return SECURITY_DEBT.filter((item) => {
      const matchesSeverity = severityFilter === 'All' || item.severity === severityFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.flaw.toLowerCase().includes(q) ||
        item.fix.toLowerCase().includes(q) ||
        item.evidence.toLowerCase().includes(q);
      return matchesSeverity && matchesSearch;
    });
  }, [severityFilter, searchQuery]);

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#334155]">
          <div>
            <h2 className="pro-title flex items-center gap-2 mb-1.5">
              <Bug className="w-5 h-5 text-[#FBBF24]" />
              <span>Section 7: Security Debt Register — "What Was Wrong vs What Was Fixed"</span>
            </h2>
            <p className="text-xs text-[#94A3B8] font-sans">
              Comprehensive cross-reference table contrasting original v2.0 architectural vulnerabilities with verified v2.1 hardening fixes and verification evidence. Pulls directly from the single source of truth in <code className="text-cyan-400 font-mono">reportData.ts</code>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] bg-[#0F172A] px-3 py-1.5 rounded border border-[#334155]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[#F1F5F9] font-bold">{stats.total} Remediated Flaws</span>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5 font-mono text-xs">
          <button
            onClick={() => setSeverityFilter('All')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              severityFilter === 'All'
                ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">All Debt</div>
            <div className="text-base font-bold text-white mt-0.5">{stats.total}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('Critical')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              severityFilter === 'Critical'
                ? 'bg-red-950/40 border-red-500 text-red-200 shadow-sm'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-red-500/50'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-red-400">Critical</div>
            <div className="text-base font-bold text-red-400 mt-0.5">{stats.critical}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('High')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              severityFilter === 'High'
                ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-sm'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-amber-500/50'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#FBBF24]">High</div>
            <div className="text-base font-bold text-[#FBBF24] mt-0.5">{stats.high}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('Medium')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              severityFilter === 'Medium'
                ? 'bg-sky-950/40 border-sky-500 text-sky-200 shadow-sm'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-sky-500/50'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#38BDF8]">Medium</div>
            <div className="text-base font-bold text-[#38BDF8] mt-0.5">{stats.medium}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('Low')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              severityFilter === 'Low'
                ? 'bg-slate-800/80 border-slate-400 text-white shadow-sm'
                : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Low</div>
            <div className="text-base font-bold text-slate-300 mt-0.5">{stats.low}</div>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-[#0F172A] p-3 rounded-lg border border-[#334155]">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Showing <strong className="text-white">{filteredDebt.length}</strong> of {stats.total} items</span>
            {severityFilter !== 'All' && (
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-500/30">
                Filter: {severityFilter}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flaw, fix, or evidence..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#1E293B] border border-[#334155] rounded text-xs text-[#F1F5F9] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#38BDF8] font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#94A3B8] hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto font-mono">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-[#38BDF8] border-b border-[#334155]">
                <th className="p-3 w-1/4">Flaw (v2.0 State)</th>
                <th className="p-3 w-24">Severity</th>
                <th className="p-3 w-1/3">Remediation Fix (v2.1)</th>
                <th className="p-3">Verification Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] text-[#F1F5F9]/80 font-sans">
              {filteredDebt.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#94A3B8] font-mono">
                    No security debt items match filter.
                  </td>
                </tr>
              ) : (
                filteredDebt.map((item, idx) => {
                  const isRegressionRefix =
                    item.fix.includes('live audit regression') ||
                    item.fix.includes('re-confirmed and purged') ||
                    item.fix.includes('--optimized was attempted');

                  return (
                    <tr key={idx} className="hover:bg-[#0F172A]/50 transition-colors">
                      <td className="p-3 font-semibold text-[#F1F5F9] align-top">
                        <div className="space-y-1">
                          <div>{item.flaw}</div>
                          {isRegressionRefix && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40">
                              <RefreshCw className="w-2.5 h-2.5" />
                              Re-verified Fix
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-top font-mono">
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
                      <td className="p-3 text-[#4ADE80] font-medium align-top leading-relaxed">
                        {item.fix}
                      </td>
                      <td className="p-3 text-[#94A3B8] text-[11px] align-top leading-relaxed font-mono">
                        {item.evidence}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

