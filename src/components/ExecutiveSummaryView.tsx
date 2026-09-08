import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Lock,
  Download,
  Printer,
  FileText,
  Loader2,
  Check,
  Sparkles,
  Sliders,
  Layers,
} from 'lucide-react';
import { exportAegisPdf, PdfExportOptions } from '../utils/pdfExport';

export const ExecutiveSummaryView: React.FC = () => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<'full' | 'executive'>('full');
  const [exportTheme, setExportTheme] = useState<'print' | 'soc'>('print');
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [lastExportedFilename, setLastExportedFilename] = useState<string | null>(null);

  const handleDownloadPdf = async (customOptions?: Partial<PdfExportOptions>) => {
    if (isExporting) return;
    setIsExporting(true);
    setExportSuccess(false);

    const activeMode = customOptions?.mode || exportMode;
    const activeTheme = customOptions?.theme || exportTheme;

    try {
      await exportAegisPdf({
        mode: activeMode,
        theme: activeTheme,
      });

      const filename =
        activeMode === 'full'
          ? `AEGIS_v2.1_Master_Architecture_Report_${activeTheme}.pdf`
          : `AEGIS_v2.1_Executive_Summary_${activeTheme}.pdf`;

      setLastExportedFilename(filename);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 6000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Identity Banner with Download as PDF Action */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-[#38BDF8] to-[#4ADE80]"></div>
        
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-lg text-[#38BDF8] shrink-0 glow-cyan-hover">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-widest text-[#38BDF8] font-mono font-bold">[PROJECT_IDENTITY]</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#4ADE80] font-mono font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-ping"></span>
                  [ONLINE: v2.1]
                </span>
                <span className="text-[10px] text-[#94A3B8] font-mono px-2 py-0.5 rounded bg-[#0F172A] border border-[#334155]">
                  PFE 2026 Sovereign Blueprint
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#F1F5F9] mb-2 font-mono glitch-header flex items-center">
                AEGIS v2.1: The Achievable Resilient SOC
                <span className="terminal-cursor-cyan text-base">▊</span>
              </h2>
              <p className="text-[#F1F5F9]/80 text-sm leading-relaxed max-w-4xl">
                AEGIS is a sovereign, end-to-end cybersecurity architecture built on the fundamental{' '}
                <span className="text-[#38BDF8] font-bold font-mono">"Never Trust / Always Verify"</span> Zero-Trust Access (ZTA)
                paradigm. It bridges a local, hardened BeyondCorp-style Edge Gateway with a remote, multi-node Managed Security
                Service Provider (MSSP) Security Operations Center (SOC). Designed for enterprise resilience, AEGIS enforces strict
                identity verification, continuous behavioral telemetry, automated threat intelligence enrichment, and autonomous active
                response across a segmented four-zone hybrid topology.
              </p>
            </div>
          </div>

          {/* Quick PDF Download Widget */}
          <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-2.5">
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isExporting}
              className={`w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg font-mono text-xs font-bold transition-all shadow-md cursor-pointer border ${
                exportSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#38BDF8] hover:bg-[#0284C7] text-black hover:text-white border-[#38BDF8] glow-cyan-active'
              }`}
              title="Generate printable vector PDF using jsPDF"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                  <span>Compiling PDF Report...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Report Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download as PDF</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowOptions(!showOptions)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#334155] text-xs font-mono transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{showOptions ? 'Hide PDF Settings' : 'PDF Export Settings'}</span>
            </button>
          </div>
        </div>

        {/* Expandable PDF Configuration Bar */}
        {showOptions && (
          <div className="mt-5 pt-4 border-t border-[#334155] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-[#0F172A] p-3 rounded border border-[#334155]">
              <div className="text-[#38BDF8] font-bold mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Document Scope</span>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[#F1F5F9] cursor-pointer">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={exportMode === 'full'}
                    onChange={() => setExportMode('full')}
                    className="accent-[#38BDF8]"
                  />
                  <span>Full Master Report (All 10 Sections)</span>
                </label>
                <label className="flex items-center gap-2 text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={exportMode === 'executive'}
                    onChange={() => setExportMode('executive')}
                    className="accent-[#38BDF8]"
                  />
                  <span>Executive Brief (Summary & KPIs)</span>
                </label>
              </div>
            </div>

            <div className="bg-[#0F172A] p-3 rounded border border-[#334155]">
              <div className="text-[#4ADE80] font-bold mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Color & Styling Theme</span>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[#F1F5F9] cursor-pointer">
                  <input
                    type="radio"
                    name="exportTheme"
                    checked={exportTheme === 'print'}
                    onChange={() => setExportTheme('print')}
                    className="accent-[#4ADE80]"
                  />
                  <span>Print-Ready (Ink-Saving White)</span>
                </label>
                <label className="flex items-center gap-2 text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer">
                  <input
                    type="radio"
                    name="exportTheme"
                    checked={exportTheme === 'soc'}
                    onChange={() => setExportTheme('soc')}
                    className="accent-[#4ADE80]"
                  />
                  <span>SOC Terminal (Dark High-Contrast)</span>
                </label>
              </div>
            </div>

            <div className="bg-[#0F172A] p-3 rounded border border-[#334155] flex flex-col justify-between">
              <div>
                <div className="text-[#FBBF24] font-bold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Printable Standard</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed font-sans">
                  Standard ISO A4 vector pagination with exact margins, headers, running footers, and page numbers (Page X of Y).
                </p>
              </div>
              <button
                onClick={() => handleDownloadPdf()}
                disabled={isExporting}
                className="mt-2 text-center py-1.5 px-2 bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 rounded text-xs transition-colors cursor-pointer"
              >
                Apply & Download ({exportMode.toUpperCase()} · {exportTheme.toUpperCase()})
              </button>
            </div>
          </div>
        )}

        {/* Feedback message upon successful export */}
        {exportSuccess && lastExportedFilename && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg flex items-center justify-between gap-3 text-xs font-mono text-emerald-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Document generated successfully: <strong className="text-white">{lastExportedFilename}</strong>
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider hidden sm:inline">
              ISO A4 Vector Layout · Ready for Printing
            </span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg glow-cyan-hover">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Architecture State</span>
            <span className="text-[10px] text-[#38BDF8]">[HYBRID]</span>
          </div>
          <div className="text-xl font-bold text-[#38BDF8] flex items-center">
            4 Zones Grid
            <span className="terminal-cursor-cyan text-sm">▊</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Local Gateway + Remote SOC</p>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg glow-green-hover relative group">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Zone 3 Gateway</span>
            <span className="text-[10px] text-[#4ADE80] font-bold">[AUDIT-VERIFIED]</span>
          </div>
          <div className="text-xl font-bold text-[#4ADE80] flex items-center">
            Sensors: Done
            <span className="terminal-cursor text-sm">▊</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            9 Containers · Dual-Bridge ZTA
          </p>
          <div className="mt-2 text-[10px] text-[#4ADE80]/90 bg-[#4ADE80]/10 px-2 py-1 rounded border border-[#4ADE80]/30 leading-snug">
            Verified via live audit as of September 8, 2026 — reflects recent live re-check.
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg glow-cyan-hover">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Zone Status</span>
            <span className="text-[10px] text-[#38BDF8] font-bold">[PIPELINE VERIFIED]</span>
          </div>
          <div className="text-xl font-bold text-[#38BDF8]">
            Z3/Z4 Ingest Live*
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Zone 4 Detection Pipeline Verified</p>
          <div className="mt-2 text-[10px] text-[#38BDF8]/90 bg-[#38BDF8]/10 px-2 py-1.5 rounded border border-[#38BDF8]/30 leading-snug">
            Zone 4 detection pipeline (Zeek/Suricata/Authelia → Wazuh agent → MITRE-tagged rules on minisoc2) verified end-to-end via wazuh-logtest as of September 8, 2026. Still outstanding: Shuffle SOAR workflow graph (containers healthy, workflow logic not yet built) and OpenLDAP pipeline (not started).
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Hardening Suite</span>
            <span className="text-[10px] text-purple-400">[LIVE-VERIFIED]</span>
          </div>
          <div className="text-xl font-bold text-purple-400">
            Remediated
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Argon2id, sessions, secrets, Keycloak</p>
          <div className="mt-2 text-[10px] text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/30 leading-snug">
            Regressions audited & terminal-fixed tonight.
          </div>
        </div>
      </div>

      {/* Regression Risk & Hardening Assurance Notice */}
      <div className="bg-amber-950/20 border-l-4 border-amber-500 border-y border-r border-amber-500/30 p-4 rounded-r-lg font-mono">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
              <span>Regression Risk & Hardening Assurance Notice</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                LIVE AUDIT CAVEAT
              </span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed font-sans">
              Gateway hardening (Argon2id parameters, session policy, Keycloak mode, orphaned secret files) has previously regressed silently between work sessions on this project — likely due to config files being reverted from an older snapshot. Status in this report reflects the most recent live verification (September 8, 2026), not a permanent guarantee. Recommend periodic live re-audits rather than trusting checklist state alone.
            </p>
          </div>
        </div>
      </div>

      {/* Printable Report Dossier Card */}
      <div className="pro-card p-5 border-[#38BDF8]/30 relative overflow-hidden font-mono">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8]">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Official Architecture Synthesis Dossier (PDF Export)</span>
                <span className="text-[10px] text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  jsPDF Engine
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
                Generate and export the formal academic and defense evaluation document, formatted for physical printing or digital submission.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDownloadPdf({ mode: 'full', theme: 'print' })}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#334155] text-xs font-mono transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Print Ready (A4)</span>
            </button>
            <button
              onClick={() => handleDownloadPdf({ mode: 'full', theme: 'soc' })}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Full Master PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 bg-[#0F172A] rounded border border-[#334155]/60">
            <div className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">Pagination & Layout</div>
            <div className="text-white font-bold">A4 Standard Format</div>
            <div className="text-[11px] text-[#94A3B8] font-sans mt-0.5">14mm margins, headers & footers with page counts</div>
          </div>
          <div className="p-3 bg-[#0F172A] rounded border border-[#334155]/60">
            <div className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">Zero-Trust Specifications</div>
            <div className="text-[#38BDF8] font-bold">4-Zone Subnets & Enclaves</div>
            <div className="text-[11px] text-[#94A3B8] font-sans mt-0.5">Dual-bridge DMZ, auth_net, and MSSP endpoints</div>
          </div>
          <div className="p-3 bg-[#0F172A] rounded border border-[#334155]/60">
            <div className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">Defense Evidence</div>
            <div className="text-[#4ADE80] font-bold">21 Hardened Milestones</div>
            <div className="text-[11px] text-[#94A3B8] font-sans mt-0.5">Security debt register & verified fixes</div>
          </div>
          <div className="p-3 bg-[#0F172A] rounded border border-[#334155]/60">
            <div className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">Operational Demo</div>
            <div className="text-[#FBBF24] font-bold">5-Act Jury Script</div>
            <div className="text-[11px] text-[#94A3B8] font-sans mt-0.5">Verifiable terminal commands & objectives</div>
          </div>
        </div>
      </div>

      {/* Section 1.4 Project Description */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 font-mono text-xs">
        <h3 className="pro-title mb-3 flex items-center gap-2 text-sm glitch-header">
          <Lock className="w-4 h-4 text-[#38BDF8]" />
          <span>Section 1.4: Project Description & Zero-Trust Traffic Routing</span>
        </h3>
        <p className="text-[#F1F5F9]/80 leading-relaxed font-sans text-sm mb-4">
          AEGIS implements a sovereign BeyondCorp-style zero-trust reverse-proxy architecture protecting corporate resources and isolating telemetry pipelines.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#0F172A] border border-[#334155] p-3 rounded glow-cyan-hover">
            <div className="font-bold text-[#38BDF8] mb-1 flex items-center justify-between">
              <span>1. User Ingress & MFA</span>
              <span className="text-[9px] text-[#38BDF8]">[EDGE_ROUTER]</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">
              All user traffic enters through Traefik v3.6.1 edge router on ports 80/443. Traefik queries Authelia v4.39.20 via Forward-Auth middleware (<code className="text-[#38BDF8]">/api/authz/forward-auth</code>) before allowing access to internal resources.
            </p>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] p-3 rounded glow-green-hover">
            <div className="font-bold text-[#4ADE80] mb-1 flex items-center justify-between">
              <span>2. Kernel Network Enclaves</span>
              <span className="text-[9px] text-[#4ADE80]">[INTERNAL_NET]</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">
              Internal identity services (PostgreSQL 16, Redis 7, Keycloak v26.6.2) reside strictly inside <code className="text-[#4ADE80]">auth_net</code> (<code className="text-[#4ADE80]">internal: true</code>) with zero exposed host ports, completely inaccessible from external networks.
            </p>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] p-3 rounded">
            <div className="font-bold text-purple-400 mb-1 flex items-center justify-between">
              <span>3. Telemetry Stream & SOAR</span>
              <span className="text-[9px] text-purple-400">[MSSP_CLUSTER]</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">
              Wazuh agent telemetry from endpoints is routed through Traefik TCP proxy pass-through to Wazuh Manager (<code className="text-purple-400">minisoc2:1514</code>). NTA and IDS telemetry (Zeek 5-node cluster and Suricata) stream to Elasticsearch (<code className="text-purple-400">minisoc1:9200</code>) for Shuffle SOAR automation and MISP threat intelligence enrichment.
            </p>
          </div>
        </div>
      </div>

      {/* Evolution Matrix */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <h3 className="pro-title mb-4 flex items-center gap-2 glitch-header">
          <Cpu className="w-4 h-4 text-[#38BDF8]" />
          <span>Key v2.1 Architectural Transitions & Restructuring</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          <div className="bg-[#0F172A] border border-red-500/30 p-4 rounded glow-red-hover">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Deprecated / Replaced (v2.0 Defects)</span>
            </div>
            <ul className="text-xs text-[#F1F5F9]/80 space-y-2 list-disc list-inside">
              <li>
                <span className="font-bold text-white">GNS3 Virtual Router Retired:</span> Nested hypervisor routing caused severe I/O contention under concurrent telemetry load.
              </li>
              <li>
                <span className="font-bold text-white">Theoretical Custom ML Scikit-Learn Pipeline:</span> Unverified black box replaced with deterministic Shuffle SOAR.
              </li>
              <li>
                <span className="font-bold text-white">Single Flat Docker Network:</span> Breached ZTA; converted to kernel-isolated dual bridge.
              </li>
              <li>
                <span className="font-bold text-white">Traefik Insecure API (Port 8090):</span> Closed management plane exposure (`api.insecure: false`).
              </li>
            </ul>
          </div>

          <div className="bg-[#0F172A] border border-[#4ADE80]/30 p-4 rounded glow-green-hover">
            <div className="flex items-center gap-2 text-[#4ADE80] font-bold text-xs uppercase mb-2">
              <CheckCircle className="w-4 h-4" />
              <span>Implemented & Hardened (v2.1 State)</span>
            </div>
            <ul className="text-xs text-[#F1F5F9]/80 space-y-2 list-disc list-inside">
              <li>
                <span className="font-bold text-white">Kernel Dual-Bridge Isolation:</span> `proxy_net` (DMZ) + `auth_net` (`internal: true`).
              </li>
              <li>
                <span className="font-bold text-white">Active Edge Defenses:</span> Coraza WAF (Caddy + OWASP CRS) + Suricata IDS + Host Zeek NTA.
              </li>
              <li>
                <span className="font-bold text-white">Zone 2 Small Enterprise Grid:</span> `CORP-DC01` Active Directory + `CORP-PC01` Sysmon + `CORP-DB01` PostgreSQL PII.
              </li>
              <li>
                <span className="font-bold text-white">Shuffle SOAR ("Mahoraga v2.1"):</span> Logstash + MISP Threat Intel + Wazuh Active Response.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


