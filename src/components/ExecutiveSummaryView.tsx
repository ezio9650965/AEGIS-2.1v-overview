import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Cpu, Radio, Lock } from 'lucide-react';

export const ExecutiveSummaryView: React.FC = () => {
  return (
    <div className="space-y-6 font-sans">
      {/* Identity Banner */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-[#38BDF8] to-[#4ADE80]"></div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-lg text-[#38BDF8] shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-[#38BDF8] font-mono font-bold">Project Identity</span>
            <h2 className="text-xl font-bold text-[#F1F5F9] mt-1 mb-2">AEGIS v2.1: The Achievable Resilient SOC</h2>
            <p className="text-[#F1F5F9]/80 text-sm leading-relaxed">
              AEGIS is a sovereign, end-to-end cybersecurity architecture built on the fundamental{' '}
              <span className="text-[#38BDF8] font-bold font-mono">"Never Trust / Always Verify"</span> Zero-Trust Access (ZTA)
              paradigm. It bridges a local, hardened BeyondCorp-style Edge Gateway with a remote, multi-node Managed Security
              Service Provider (MSSP) Security Operations Center (SOC). Designed for enterprise resilience, AEGIS enforces strict
              identity verification, continuous behavioral telemetry, automated threat intelligence enrichment, and autonomous active
              response across a segmented four-zone hybrid topology.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1">Architecture State</div>
          <div className="text-xl font-bold text-[#38BDF8]">4 Zones Hybrid</div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Local Gateway + Remote SOC</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1">Gateway Health</div>
          <div className="text-xl font-bold text-[#4ADE80]">9/9 Containers</div>
          <p className="text-[11px] text-[#94A3B8] mt-1">0 Exposed Database Ports</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1">Jury Readiness</div>
          <div className="text-xl font-bold text-[#FBBF24]">8.5 / 10</div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Up from 4.0/10 in v2.0</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1">Hardening Status</div>
          <div className="text-xl font-bold text-purple-400">8/8 Fixed</div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Certs, Argon2id, Sessions, SQL</p>
        </div>
      </div>

      {/* Evolution Matrix */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <h3 className="pro-title mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#38BDF8]" />
          <span>Key v2.1 Architectural Transitions & Restructuring</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          <div className="bg-[#0F172A] border border-red-500/30 p-4 rounded">
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

          <div className="bg-[#0F172A] border border-[#4ADE80]/30 p-4 rounded">
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
