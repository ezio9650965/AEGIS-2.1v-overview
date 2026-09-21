import React, { useState, useMemo } from 'react';
import { OIDC_BUG_CHAIN, LESSONS_LEARNED } from '../data/reportData';
import {
  GraduationCap,
  GitMerge,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Server,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Cpu,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';

export const EngineeringReflectionsView: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBugId, setExpandedBugId] = useState<string | null>('bug-5');
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>('lesson-1');

  const handshakeChain = useMemo(() => {
    return OIDC_BUG_CHAIN.filter((b) => b.inChainOrder !== undefined).sort(
      (a, b) => (a.inChainOrder ?? 0) - (b.inChainOrder ?? 0)
    );
  }, []);

  const filteredBugs = useMemo(() => {
    return OIDC_BUG_CHAIN.filter((bug) => {
      const matchStage = selectedStage === 'All' || bug.stage === selectedStage;
      const matchCategory = selectedCategory === 'All' || bug.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        bug.title.toLowerCase().includes(q) ||
        bug.symptom.toLowerCase().includes(q) ||
        bug.rootCause.toLowerCase().includes(q) ||
        bug.remediation.toLowerCase().includes(q);
      return matchStage && matchCategory && matchSearch;
    });
  }, [selectedStage, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-5 h-5 text-[#38BDF8]" />
              <h2 className="text-xl font-bold tracking-tight text-[#F1F5F9]">
                Section 8: Engineering Reflections & OIDC Federation Bug Chain
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Post-mortem analysis of the Stages 1–3 centralized identity migration (OpenLDAP → Authelia → Keycloak) and group-based access control.
              Documents {OIDC_BUG_CHAIN.length} distinct resolved failure points, the 4-bug cascaded handshake chain, and core lessons learned for the PFE 2026 defense jury.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#0F172A] border border-[#334155] rounded px-3 py-1.5 text-right font-mono text-[11px]">
              <span className="text-[#94A3B8] block text-[10px]">TOTAL INCIDENTS RESOLVED</span>
              <span className="text-emerald-400 font-bold">{OIDC_BUG_CHAIN.length} Production Bugs</span>
            </div>
            <div className="bg-[#0F172A] border border-sky-500/30 rounded px-3 py-1.5 text-right font-mono text-[11px]">
              <span className="text-[#94A3B8] block text-[10px]">CASCADE CHAIN</span>
              <span className="text-sky-400 font-bold">4 Linked Handshake Steps</span>
            </div>
          </div>
        </div>

        {/* Handshake Cascade Deep Dive Card */}
        <div className="mt-6 bg-[#0F172A] border border-[#334155] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-[#F1F5F9] font-mono tracking-wide uppercase">
                The Keycloak-Authelia OIDC Broker Handshake Cascade (4 Interlinked Failures)
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
              High-Complexity Root Cause Chain
            </span>
          </div>

          <p className="text-xs text-[#94A3B8] mb-4 leading-relaxed">
            During Stage 3 identity federation, connecting Keycloak (acting as OIDC Relying Party) to Authelia (Identity Provider) on the internal <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded">auth_net</code> bridge triggered an intricate chain reaction where resolving each standard symptom immediately unmasked a deeper underlying constraint.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {handshakeChain.map((step, idx) => (
              <div
                key={step.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-3.5 flex flex-col justify-between relative group hover:border-sky-400 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-bold">
                      CHAIN STEP #{step.inChainOrder}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-mono">{step.category}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#F1F5F9] mb-1.5 line-clamp-2">{step.title}</h4>
                  <div className="text-[11px] text-[#94A3B8] mb-2 bg-[#0F172A] p-2 rounded border border-slate-800 font-mono">
                    <span className="text-rose-400 block font-semibold text-[10px] uppercase">Trap:</span>
                    {step.symptom}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[#334155] text-[11px]">
                  <span className="text-emerald-400 block font-mono text-[10px] uppercase font-bold">Breakthrough:</span>
                  <p className="text-[#CBD5E1] text-[11px] leading-tight mt-0.5">{step.remediation}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Architectural Resolution Diagram Box */}
          <div className="mt-4 p-3.5 bg-slate-900/90 rounded border border-sky-500/40 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span className="font-mono font-bold text-sky-300 text-xs uppercase tracking-wide">
                Permanent Solution: The `oidc-proxy` Sidecar Architecture
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono text-[11px] text-[#CBD5E1]">
              <div className="bg-[#0F172A] p-2.5 rounded border border-slate-800">
                <span className="text-sky-400 font-bold block mb-1">1. Protocol Alignment</span>
                Keycloak discovers OIDC metadata and initiates token exchange targeting <code className="text-amber-300">http://oidc-proxy:8080</code>.
              </div>
              <div className="bg-[#0F172A] p-2.5 rounded border border-slate-800">
                <span className="text-sky-400 font-bold block mb-1">2. Header Rewriting</span>
                Caddy sidecar rewrites <code className="text-amber-300">Host: authelia.zerotrust.lan</code> and transparently relays to <code className="text-amber-300">http://authelia:9091</code>.
              </div>
              <div className="bg-[#0F172A] p-2.5 rounded border border-slate-800">
                <span className="text-sky-400 font-bold block mb-1">3. Zero-Trust Intact</span>
                All inter-service traffic stays enclosed on <code className="text-emerald-400">auth_net (internal: true)</code> with zero host port exposure; edge traffic maintains 100% TLS 1.3 at Traefik.
              </div>
            </div>
          </div>
        </div>

        {/* Authelia Access Control Fallthrough Deep Dive Card */}
        <div className="mt-6 bg-[#0F172A] border border-[#334155] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-[#F1F5F9] font-mono tracking-wide uppercase">
                Authelia access_control Rule Fallthrough on Subject Mismatch (Real Bug Caught During Testing)
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded">
              Access Control Enforcement Gap
            </span>
          </div>

          <p className="text-xs text-[#94A3B8] mb-4 leading-relaxed">
            Authelia evaluates <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">access_control</code> rules top-to-bottom and applies the first FULL match (domain + resources + subject) — but a subject mismatch alone does not deny; it falls through to later matching rules, including a permissive wildcard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">
                    THE TRAP
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">Silent Pass-Through</span>
                </div>
                <h4 className="text-xs font-bold text-[#F1F5F9] mb-1.5">Zero Enforcement Effect</h4>
                <div className="text-[11px] text-[#94A3B8] bg-[#0F172A] p-2 rounded border border-slate-800 font-mono">
                  Restricting <code className="text-rose-300">keycloak.zerotrust.lan</code> and <code className="text-rose-300">traefik.zerotrust.lan</code> to <code className="text-rose-300">subject: group:admins</code> had zero actual enforcement effect at first, because non-admin users still matched the later wildcard rule (<code className="text-amber-300">*.zerotrust.lan</code>, policy: two_factor, no subject restriction) and were granted access regardless.
                </div>
              </div>
            </div>

            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    ROOT CAUSE
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">Evaluation Logic</span>
                </div>
                <h4 className="text-xs font-bold text-[#F1F5F9] mb-1.5">No Implicit Deny on Subject</h4>
                <div className="text-[11px] text-[#94A3B8] bg-[#0F172A] p-2 rounded border border-slate-800 font-mono">
                  Authelia does not implicitly deny on subject mismatch alone. If domain matches but subject fails, the engine continues downward through the rule list until finding another rule that satisfies all criteria.
                </div>
              </div>
            </div>

            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    REMEDIATION
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">Explicit Deny Rule</span>
                </div>
                <h4 className="text-xs font-bold text-[#F1F5F9] mb-1.5">Immediate Block Rule</h4>
                <div className="text-[11px] text-[#94A3B8] bg-[#0F172A] p-2 rounded border border-slate-800 font-mono">
                  An explicit <code className="text-emerald-300">policy: deny</code> rule was added immediately after each group-restricted rule, for the same domain, before the wildcard rule is reached.
                </div>
              </div>
            </div>
          </div>

          {/* Live Verification Box */}
          <div className="mt-4 p-3.5 bg-slate-900/90 rounded border border-emerald-500/40 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-300 text-xs uppercase tracking-wide">
                Live Verification Matrix (testuser — LDAP groups: it_ops, users)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="bg-[#0F172A] p-2 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-[#CBD5E1]">keycloak.zerotrust.lan</span>
                <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">403 DENIED</span>
              </div>
              <div className="bg-[#0F172A] p-2 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-[#CBD5E1]">traefik.zerotrust.lan</span>
                <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">403 DENIED</span>
              </div>
              <div className="bg-[#0F172A] p-2 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-[#CBD5E1]">portainer.zerotrust.lan</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">2FA ALLOWED (it_ops)</span>
              </div>
              <div className="bg-[#0F172A] p-2 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-[#CBD5E1]">juiceshop.zerotrust.lan</span>
                <span className="text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">BYPASSED (WAF-only)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Lessons Learned */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#334155]">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-[#F1F5F9]">
            Architectural Lessons Learned & Jury Defense Justifications
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LESSONS_LEARNED.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-[#0F172A] border border-[#334155] rounded-lg p-4 flex flex-col justify-between hover:border-slate-500 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                    {lesson.domain}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#F1F5F9] mb-2 leading-snug">{lesson.takeaway}</h4>
                <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">{lesson.architecturalContext}</p>
              </div>

              <div className="mt-2 bg-slate-900/90 border-l-2 border-sky-400 p-2.5 rounded-r text-xs">
                <div className="flex items-center gap-1.5 text-sky-300 font-mono text-[10px] font-bold uppercase mb-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Anticipated Jury Defense Defense Q&A
                </div>
                <p className="text-[11px] text-[#CBD5E1] italic leading-normal">
                  {lesson.juryDefenseTalkingPoint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Incident Catalog */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#334155]">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#FBBF24]" />
              <h3 className="text-base font-bold text-[#F1F5F9]">
                Complete Incident Catalog: {OIDC_BUG_CHAIN.length} Resolved Identity & Access Bugs
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Field-by-field breakdown of bugs encountered during LDAP schema provisioning, Authelia integration, Keycloak Relying Party configuration, and group-based access control.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search bugs, symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded pl-8 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 font-mono text-xs">
          <div className="flex items-center gap-1 text-[#94A3B8] text-[11px] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Stage:</span>
          </div>
          {['All', 'Stage 1: OpenLDAP', 'Stage 2: Authelia', 'Stage 3: Keycloak OIDC Federation', 'Post-Migration Cleanup'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStage(st)}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                selectedStage === st
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                  : 'bg-[#0F172A] text-[#94A3B8] border border-[#334155] hover:text-white'
              }`}
            >
              {st === 'Stage 3: Keycloak OIDC Federation' ? 'Stage 3: Keycloak' : st}
            </button>
          ))}
        </div>

        {/* Bug Cards List */}
        <div className="space-y-3">
          {filteredBugs.map((bug) => {
            const isExpanded = expandedBugId === bug.id;
            return (
              <div
                key={bug.id}
                className="bg-[#0F172A] border border-[#334155] rounded-lg transition-colors overflow-hidden"
              >
                <div
                  onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                          {bug.stage}
                        </span>
                        <span className="text-[10px] font-mono text-sky-400">
                          [{bug.category}]
                        </span>
                        {bug.inChainOrder && (
                          <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40">
                            Handshake #{bug.inChainOrder}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[#F1F5F9]">{bug.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline">RESOLVED</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[#334155] bg-slate-900/50 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-[#1E293B] p-3 rounded border border-slate-800">
                        <div className="text-[10px] font-mono uppercase text-rose-400 font-bold mb-1">
                          Reported Symptom & Error
                        </div>
                        <p className="text-[#CBD5E1] font-mono text-[11px] leading-relaxed">
                          {bug.symptom}
                        </p>
                      </div>

                      <div className="bg-[#1E293B] p-3 rounded border border-slate-800">
                        <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1">
                          Underlying Root Cause
                        </div>
                        <p className="text-[#CBD5E1] text-[11px] leading-relaxed">
                          {bug.rootCause}
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded">
                      <div className="text-[10px] font-mono uppercase text-emerald-300 font-bold mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Technical Remediation & Verification
                      </div>
                      <p className="text-[#D1FAE5] text-[11px] leading-relaxed">
                        {bug.remediation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
