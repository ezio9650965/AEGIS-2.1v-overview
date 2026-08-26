import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Cpu, Lock, Terminal } from 'lucide-react';

export const ExecutiveSummaryView: React.FC = () => {
  return (
    <div className="space-y-6 font-sans">
      {/* Identity Banner */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-[#38BDF8] to-[#4ADE80]"></div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-lg text-[#38BDF8] shrink-0 glow-cyan-hover">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-[#38BDF8] font-mono font-bold">[PROJECT_IDENTITY]</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#4ADE80] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-ping"></span>
                [ONLINE]
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#F1F5F9] mb-2 font-mono glitch-header flex items-center">
              AEGIS v2.1: The Achievable Resilient SOC
              <span className="terminal-cursor-cyan text-base">▊</span>
            </h2>
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

        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg glow-green-hover">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Zone 3 Gateway</span>
            <span className="text-[10px] text-[#4ADE80]">[VERIFIED]</span>
          </div>
          <div className="text-xl font-bold text-[#4ADE80] flex items-center">
            Sensors: Done
            <span className="terminal-cursor text-sm">▊</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">9 Containers · Dual-Bridge ZTA</p>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg glow-amber-hover">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Zone Status</span>
            <span className="text-[10px] text-[#F59E0B]">[STANDBY]</span>
          </div>
          <div className="text-xl font-bold text-[#F59E0B]">
            Z3 Done · Z2/4 Open
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Zone 2 grid + Zone 4 SOAR not started</p>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
          <div className="text-[#94A3B8] text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Hardening Suite</span>
            <span className="text-[10px] text-purple-400">[8/8]</span>
          </div>
          <div className="text-xl font-bold text-purple-400">
            8/8 Remediated
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Certs, Argon2id, Sessions, SQL</p>
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

