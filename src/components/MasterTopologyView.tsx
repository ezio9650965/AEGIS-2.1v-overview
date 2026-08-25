import React from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { MASTER_TOPOLOGY_MERMAID } from '../data/reportData';
import { Network, Server, Shield, Radio, Database } from 'lucide-react';

export const MasterTopologyView: React.FC = () => {
  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <h2 className="pro-title mb-2 flex items-center gap-2">
          <Network className="w-5 h-5 text-[#38BDF8]" />
          <span>Section 2: Master 4-Zone Architecture Topology</span>
        </h2>
        <p className="text-xs text-[#94A3B8] mb-6 font-sans">
          High-availability hybrid topology featuring local Zero-Trust Access Edge Gateway (Zone 3), Small Enterprise Domain Grid (Zone 2), Threatscape Red Team (Zone 1), and Remote 3-Node MSSP SOC Cluster (Zone 4).
        </p>

        {/* Mermaid Diagram Container */}
        <div className="mb-6 font-mono">
          <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Visual Flow Diagram (Mermaid.js)</span>
            <span className="text-[#38BDF8] text-[10px]">Interactive Canvas</span>
          </div>
          <div className="bg-[#0F172A] p-4 rounded border border-[#334155]">
            <MermaidDiagram chart={MASTER_TOPOLOGY_MERMAID} id="master-topology" title="Section 2: Master 4-Zone Architecture Topology" />
          </div>
        </div>

        {/* 4 Zone Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 font-mono">
          {/* Zone 1 */}
          <div className="bg-[#0F172A] border border-red-500/30 rounded-lg p-4">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Zone 1: Threatscape</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            </div>
            <p className="text-[11px] text-[#F1F5F9] font-semibold mb-2">Kali Linux APT & REMnux Sandbox</p>
            <div className="text-[10px] text-[#94A3B8] space-y-1">
              <div>• IP: 192.168.1.50 (External)</div>
              <div>• Tools: Sliver C2, sqlmap, mimikatz</div>
              <div>• Vectors: HTTPS Beacons, SQLi, LSASS Dump</div>
            </div>
          </div>

          {/* Zone 2 */}
          <div className="bg-[#0F172A] border border-[#FBBF24]/30 rounded-lg p-4">
            <div className="text-xs font-bold text-[#FBBF24] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Zone 2: Enterprise Grid</span>
              <span className="w-2 h-2 rounded-full bg-[#FBBF24]"></span>
            </div>
            <p className="text-[11px] text-[#F1F5F9] font-semibold mb-2">aegis.corp (192.168.20.0/24)</p>
            <div className="text-[10px] text-[#94A3B8] space-y-1">
              <div>• CORP-DC01: Win Server 2022 AD DS</div>
              <div>• CORP-PC01: Win10 Workstation + Sysmon</div>
              <div>• CORP-DB01: Ubuntu PostgreSQL PII</div>
            </div>
          </div>

          {/* Zone 3 */}
          <div className="bg-[#0F172A] border border-[#38BDF8]/30 rounded-lg p-4">
            <div className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Zone 3: ZTA Gateway</span>
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]"></span>
            </div>
            <p className="text-[11px] text-[#F1F5F9] font-semibold mb-2">192.168.19.173 (Ubuntu 24.04)</p>
            <div className="text-[10px] text-[#94A3B8] space-y-1">
              <div>• proxy_net (DMZ): Traefik, Coraza, Suricata</div>
              <div>• auth_net (internal): Authelia, KC, Postgres</div>
              <div>• Host NTA: Zeek (eth0 + br_proxy)</div>
            </div>
          </div>

          {/* Zone 4 */}
          <div className="bg-[#0F172A] border border-purple-500/30 rounded-lg p-4">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Zone 4: MSSP SOC</span>
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            </div>
            <p className="text-[11px] text-[#F1F5F9] font-semibold mb-2">10.16.64.0/24 AlmaLinux Cluster</p>
            <div className="text-[10px] text-[#94A3B8] space-y-1">
              <div>• minisoc1: Elasticsearch 8.19 (Vault)</div>
              <div>• minisoc2: Wazuh 4.7 + Kibana (Brain)</div>
              <div>• minisoc3: Shuffle SOAR + MISP (Executor)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
