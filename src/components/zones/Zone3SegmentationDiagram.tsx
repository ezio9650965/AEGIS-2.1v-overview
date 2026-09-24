import React, { useState } from 'react';
import {
  AlertTriangle,
  Network,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const Zone3SegmentationDiagram: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'intended' | 'side-by-side'>('current');
  const [showTerminalOutput, setShowTerminalOutput] = useState<boolean>(false);
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false);

  const realTerminalData = `ezio@ztagateway:~/zerotrust-network$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:c0:53:32 brd ff:ff:ff:ff:ff:ff
    altname enp2s1
    inet 192.168.19.173/24 metric 100 brd 192.168.19.255 scope global dynamic ens33
       valid_lft 1667sec preferred_lft 1667sec
    inet6 fe80::20c:29ff:fec0:5332/64 scope link
       valid_lft forever preferred_lft forever
3: ens34: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:c0:53:3c brd ff:ff:ff:ff:ff:ff
    altname enp2s2
    inet 192.168.50.1/24 brd 192.168.50.255 scope global ens34
       valid_lft forever preferred_lft forever
    inet6 fe80::20c:29ff:fec0:533c/64 scope link
       valid_lft forever preferred_lft forever
4: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether be:2f:1b:97:f1:78 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
5: br_auth: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 82:4c:2c:71:d7:82 brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.1/16 brd 172.18.255.255 scope global br_auth
       valid_lft forever preferred_lft forever
    inet6 fe80::804c:2cff:fe71:d782/64 scope link
       valid_lft forever preferred_lft forever
6: br_proxy: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether f6:19:82:10:34:a3 brd ff:ff:ff:ff:ff:ff
    inet 172.19.0.1/16 brd 172.19.255.255 scope global br_proxy
       valid_lft forever preferred_lft forever
    inet6 fe80::f419:82ff:fe10:34a3/64 scope link
       valid_lft forever preferred_lft forever

ezio@ztagateway:~/zerotrust-network$ ip route
default via 192.168.19.2 dev ens33 proto dhcp src 192.168.19.173 metric 100
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown
172.18.0.0/16 dev br_auth proto kernel scope link src 172.18.0.1
172.19.0.0/16 dev br_proxy proto kernel scope link src 172.19.0.1
192.168.19.0/24 dev ens33 proto kernel scope link src 192.168.19.173 metric 100
192.168.19.2 dev ens33 proto dhcp scope link src 192.168.19.173 metric 100
192.168.50.0/24 dev ens34 proto kernel scope link src 192.168.50.1`;

  const copyTerminalOutput = () => {
    navigator.clipboard.writeText(realTerminalData);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  return (
    <div className="bg-[#0F172A] border border-[#38BDF8]/30 rounded-lg p-5 font-mono space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-2">
              <span>Zone 3 Network Segmentation Topology</span>
              <span className="text-[10px] bg-sky-500/20 text-[#38BDF8] px-2 py-0.5 rounded border border-sky-500/30">
                L2/L3 Physical Interface Model
              </span>
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              Comparison between live audited host interfaces and architecture blueprint segmentation
            </p>
          </div>
        </div>

        {/* State Toggle Tabs */}
        <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-lg border border-[#334155] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Current (Verified)</span>
          </button>

          <button
            onClick={() => setActiveTab('intended')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'intended'
                ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]"></span>
            <span>Intended Design</span>
          </button>

          <button
            onClick={() => setActiveTab('side-by-side')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer hidden lg:flex items-center gap-1.5 ${
              activeTab === 'side-by-side'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <span>Side-by-Side</span>
          </button>
        </div>
      </div>

      {/* SVG Diagram Canvas Area */}
      <div className="space-y-4">
        {/* View 1: Current (Verified) */}
        {(activeTab === 'current' || activeTab === 'side-by-side') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-amber-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>STATE A: Current (Verified Live Audit) — Flat Subnet Broadcast Domain</span>
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                ens34 Unused · Flat 192.168.19.0/24
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#30363d] bg-[#0d1117] p-2 shadow-inner">
              <svg
                viewBox="0 0 940 370"
                className="w-full min-w-[760px] h-auto select-none font-mono"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Marker arrows */}
                  <marker
                    id="z3-arrow-cyan"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#38BDF8" />
                  </marker>
                  <marker
                    id="z3-arrow-amber"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#FBBF24" />
                  </marker>
                  <marker
                    id="z3-arrow-red"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#F87171" />
                  </marker>
                  <pattern id="z3-grid-cur" width="44" height="44" patternUnits="userSpaceOnUse">
                    <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#21262d" strokeWidth="1" opacity="0.6" />
                  </pattern>
                </defs>

                <rect width="940" height="370" fill="url(#z3-grid-cur)" rx="8" />

                {/* ================================================================= */}
                {/* 1. FLAT 192.168.19.0/24 BROADCAST DOMAIN */}
                {/* ================================================================= */}
                <rect
                  x="20"
                  y="20"
                  width="330"
                  height="330"
                  rx="8"
                  fill="#161b22"
                  stroke="#F87171"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <rect x="20" y="20" width="330" height="3.5" rx="2" fill="#F87171" />
                <rect x="20" y="23.5" width="330" height="26" fill="rgba(248, 113, 113, 0.12)" />
                <text x="32" y="40" fill="#F87171" fontSize="9.5" fontWeight="bold">
                  ⚠️ FLAT SUBNET: 192.168.19.0/24 (Single Broadcast Domain)
                </text>
                <text x="32" y="52" fill="#94A3B8" fontSize="7.5">
                  All endpoints and services co-exist on the same L2 subnet without L3 isolation
                </text>

                {/* Default Gateway Router Node */}
                <g transform="translate(35, 65)">
                  <rect width="140" height="52" rx="5" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                  <text x="10" y="16" fill="#38BDF8" fontSize="8.5" fontWeight="bold">Upstream Gateway</text>
                  <text x="10" y="27" fill="#F1F5F9" fontSize="7.5">192.168.19.2 (Default Route)</text>
                  <rect x="10" y="32" width="55" height="12" rx="2" fill="#2d333b" stroke="#30363d" />
                  <text x="14" y="41" fill="#4ADE80" fontSize="7">WAN UPLINK</text>
                </g>

                {/* Windows 10 Endpoint Node (Co-located on flat network) */}
                <g transform="translate(35, 130)">
                  <rect width="295" height="72" rx="6" fill="#21262d" stroke="#F87171" strokeWidth="1.5" />
                  <text x="12" y="17" fill="#F87171" fontSize="9" fontWeight="bold">Windows 10 Workstation (CORP-PC01)</text>
                  <text x="12" y="29" fill="#F1F5F9" fontSize="8">IP: 192.168.19.x/24 (Co-located on flat subnet)</text>
                  <rect x="12" y="36" width="95" height="13" rx="2" fill="rgba(248, 113, 113, 0.15)" stroke="rgba(248, 113, 113, 0.4)" />
                  <text x="16" y="46" fill="#F87171" fontSize="7" fontWeight="bold">NO L3 GATEWAY BARRIER</text>
                  <text x="12" y="62" fill="#94A3B8" fontSize="7.5">• Direct Layer 2 access to gateway ens33 IP</text>
                </g>

                {/* OWASP Juice Shop Storefront / Client Access */}
                <g transform="translate(35, 220)">
                  <rect width="295" height="70" rx="6" fill="#21262d" stroke="#FBBF24" strokeWidth="1" />
                  <text x="12" y="17" fill="#FBBF24" fontSize="9" fontWeight="bold">CORP-WEB01 Client Traffic (Juice Shop)</text>
                  <text x="12" y="29" fill="#F1F5F9" fontSize="8">Destination: shop.zerotrust.lan:443</text>
                  <rect x="12" y="36" width="80" height="13" rx="2" fill="rgba(251, 191, 36, 0.1)" stroke="rgba(251, 191, 36, 0.3)" />
                  <text x="16" y="46" fill="#FBBF24" fontSize="7">FLAT INGRESS</text>
                  <text x="12" y="61" fill="#94A3B8" fontSize="7.5">• Traffic reaches ens33 directly over 192.168.19.0/24</text>
                </g>

                {/* Flat Warning Pill inside Flat Subnet */}
                <rect x="35" y="300" width="295" height="24" rx="4" fill="rgba(248, 113, 113, 0.1)" stroke="#F87171" strokeWidth="1" />
                <text x="45" y="316" fill="#F87171" fontSize="8" fontWeight="bold">
                  ⚠️ LATERAL RISK: Broadcast packets & ARP visible between endpoints
                </text>

                {/* Flow lines from Flat Subnet into ens33 */}
                <path
                  d="M 330 166 L 390 166"
                  stroke="#F87171"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#z3-arrow-red)"
                />
                <path
                  d="M 330 255 L 360 255 L 360 178 L 390 178"
                  stroke="#FBBF24"
                  strokeWidth="2"
                  markerEnd="url(#z3-arrow-amber)"
                />

                {/* ================================================================= */}
                {/* 2. GATEWAY HOST (ztagateway) */}
                {/* ================================================================= */}
                <rect
                  x="395"
                  y="20"
                  width="310"
                  height="330"
                  rx="8"
                  fill="#0F172A"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <rect x="395" y="20" width="310" height="3.5" rx="2" fill="#38BDF8" />
                <rect x="395" y="23.5" width="310" height="26" fill="rgba(56, 189, 248, 0.12)" />
                <text x="407" y="40" fill="#38BDF8" fontSize="9.5" fontWeight="bold">
                  🛡️ GATEWAY HOST: ztagateway (Host Engine)
                </text>
                <text x="407" y="52" fill="#94A3B8" fontSize="7.5">
                  Linux Kernel Routing · Dual Physical Interfaces · Docker Bridge Networks
                </text>

                {/* Physical Interface 1: ens33 (ACTIVE) */}
                <g transform="translate(410, 65)">
                  <rect width="280" height="60" rx="5" fill="#1E293B" stroke="#4ADE80" strokeWidth="1.5" />
                  <circle cx="16" cy="18" r="4" fill="#4ADE80" />
                  <text x="26" y="20" fill="#4ADE80" fontSize="9" fontWeight="bold">ens33 (Primary Host Interface)</text>
                  <text x="26" y="32" fill="#F1F5F9" fontSize="8">IP: 192.168.19.173/24 (metric 100, dynamic DHCP)</text>
                  <text x="26" y="44" fill="#94A3B8" fontSize="7.5">Default route via 192.168.19.2 · Active traffic carrier</text>
                  <rect x="200" y="8" width="68" height="14" rx="2" fill="rgba(74, 222, 128, 0.15)" stroke="rgba(74, 222, 128, 0.4)" />
                  <text x="205" y="18" fill="#4ADE80" fontSize="7" fontWeight="bold">ACTIVE INGRESS</text>
                </g>

                {/* Physical Interface 2: ens34 (PROVISIONED BUT UNUSED) */}
                <g transform="translate(410, 135)">
                  <rect width="280" height="65" rx="5" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="5 3" />
                  <circle cx="16" cy="18" r="4" fill="#FBBF24" />
                  <text x="26" y="20" fill="#FBBF24" fontSize="9" fontWeight="bold">ens34 (Static Provisioned Interface)</text>
                  <text x="26" y="32" fill="#F1F5F9" fontSize="8">IP: 192.168.50.1/24 (Static kernel route assigned)</text>
                  <text x="26" y="45" fill="#FBBF24" fontSize="7.5" fontWeight="bold">STATUS: PROVISIONED BUT UNUSED (0 Downstream Peers)</text>
                  <text x="26" y="56" fill="#94A3B8" fontSize="7">• No cables/endpoints routed here in current state</text>
                  <rect x="195" y="8" width="73" height="14" rx="2" fill="rgba(251, 191, 36, 0.15)" stroke="rgba(251, 191, 36, 0.4)" />
                  <text x="199" y="18" fill="#FBBF24" fontSize="6.5" fontWeight="bold">NO PEERS CONNECTED</text>
                </g>

                {/* Gateway Internal Bridges */}
                <g transform="translate(410, 210)">
                  <rect width="280" height="125" rx="5" fill="#131D31" stroke="#334155" strokeWidth="1" />
                  <text x="12" y="16" fill="#38BDF8" fontSize="8.5" fontWeight="bold">Internal Docker Bridge Networks</text>
                  
                  {/* br_proxy */}
                  <rect x="12" y="25" width="256" height="42" rx="4" fill="#1E293B" stroke="#38BDF8" strokeWidth="1" />
                  <text x="20" y="39" fill="#38BDF8" fontSize="8" fontWeight="bold">br_proxy (172.19.0.1/16) — DMZ Bridge</text>
                  <text x="20" y="50" fill="#94A3B8" fontSize="7">• Traefik v3.6.1 (:443/:80) · Coraza WAF · Suricata IDS</text>
                  <text x="20" y="60" fill="#4ADE80" fontSize="6.5">Bound to ens33 host exposure</text>

                  {/* br_auth */}
                  <rect x="12" y="73" width="256" height="42" rx="4" fill="#1E293B" stroke="#A855F7" strokeWidth="1" />
                  <text x="20" y="87" fill="#A855F7" fontSize="8" fontWeight="bold">br_auth (172.18.0.1/16) — internal: true</text>
                  <text x="20" y="98" fill="#94A3B8" fontSize="7">• Authelia (:9091) · Keycloak (:8080) · Postgres · Redis</text>
                  <text x="20" y="108" fill="#A855F7" fontSize="6.5">Kernel-isolated from external WAN</text>
                </g>

                {/* ================================================================= */}
                {/* 3. DISCONNECTED / UNUSED SEGMENT (192.168.50.0/24) */}
                {/* ================================================================= */}
                <rect
                  x="725"
                  y="20"
                  width="195"
                  height="330"
                  rx="8"
                  fill="#161b22"
                  stroke="#64748B"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.7"
                />
                <rect x="725" y="20" width="195" height="3.5" rx="2" fill="#64748B" />
                <rect x="725" y="23.5" width="195" height="26" fill="rgba(100, 116, 139, 0.15)" />
                <text x="735" y="40" fill="#94A3B8" fontSize="9" fontWeight="bold">
                  UNPOPULATED SEGMENT
                </text>
                <text x="735" y="52" fill="#64748B" fontSize="7.5">
                  192.168.50.0/24 (Pending Targets)
                </text>

                {/* Broken line from ens34 to empty segment */}
                <path
                  d="M 690 166 L 735 166"
                  stroke="#FBBF24"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  markerEnd="url(#z3-arrow-amber)"
                />

                {/* Empty Node Placeholders */}
                <g transform="translate(738, 70)">
                  <rect width="170" height="60" rx="5" fill="#21262d" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="10" y="18" fill="#94A3B8" fontSize="8" fontWeight="bold">Intended: Windows 10</text>
                  <text x="10" y="30" fill="#64748B" fontSize="7.5">Target IP: 192.168.50.10</text>
                  <text x="10" y="44" fill="#F87171" fontSize="7" fontWeight="bold">NOT HERE (Currently on .19.x)</text>
                </g>

                <g transform="translate(738, 145)">
                  <rect width="170" height="60" rx="5" fill="#21262d" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="10" y="18" fill="#94A3B8" fontSize="8" fontWeight="bold">Intended: CORP-WEB01 (Juice Shop)</text>
                  <text x="10" y="30" fill="#64748B" fontSize="7.5">Target IP: 192.168.50.20</text>
                  <text x="10" y="44" fill="#F87171" fontSize="7" fontWeight="bold">NOT HERE (Served via .19.x)</text>
                </g>

                <g transform="translate(738, 220)">
                  <rect width="170" height="85" rx="5" fill="#1e293b" stroke="#FBBF24" strokeWidth="1" />
                  <text x="10" y="18" fill="#FBBF24" fontSize="8" fontWeight="bold">Interface ens34 Summary</text>
                  <text x="10" y="32" fill="#F1F5F9" fontSize="7">• IP: 192.168.50.1/24</text>
                  <text x="10" y="44" fill="#F1F5F9" fontSize="7">• Device: ens34 (UP)</text>
                  <text x="10" y="56" fill="#FBBF24" fontSize="7">• No downstream ARP entries</text>
                  <text x="10" y="68" fill="#94A3B8" fontSize="6.5">Ready for workstation cutover</text>
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* View 2: Intended Design */}
        {(activeTab === 'intended' || activeTab === 'side-by-side') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-[#38BDF8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]"></span>
                <span>STATE B: Intended Architecture Blueprint — Dual-Homed Kernel Boundary Enforcement</span>
              </span>
              <span className="text-[10px] text-[#38BDF8] bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 rounded">
                Strict Physical & L3 Segment Isolation
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#30363d] bg-[#0d1117] p-2 shadow-inner">
              <svg
                viewBox="0 0 940 370"
                className="w-full min-w-[760px] h-auto select-none font-mono"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker
                    id="z3-arrow-green"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#4ADE80" />
                  </marker>
                  <pattern id="z3-grid-int" width="44" height="44" patternUnits="userSpaceOnUse">
                    <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#21262d" strokeWidth="1" opacity="0.6" />
                  </pattern>
                </defs>

                <rect width="940" height="370" fill="url(#z3-grid-int)" rx="8" />

                {/* ================================================================= */}
                {/* 1. UPSTREAM PERIMETER SUBNET (192.168.19.0/24) */}
                {/* ================================================================= */}
                <rect
                  x="20"
                  y="20"
                  width="250"
                  height="330"
                  rx="8"
                  fill="#161b22"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <rect x="20" y="20" width="250" height="3.5" rx="2" fill="#38BDF8" />
                <rect x="20" y="23.5" width="250" height="26" fill="rgba(56, 189, 248, 0.12)" />
                <text x="30" y="40" fill="#38BDF8" fontSize="9.5" fontWeight="bold">
                  PERIMETER INGRESS SUBNET
                </text>
                <text x="30" y="52" fill="#94A3B8" fontSize="7.5">
                  192.168.19.0/24 (WAN & Ingress Inbound)
                </text>

                {/* Upstream WAN Router */}
                <g transform="translate(35, 75)">
                  <rect width="220" height="60" rx="5" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                  <text x="12" y="18" fill="#38BDF8" fontSize="8.5" fontWeight="bold">Upstream Router / Gateway</text>
                  <text x="12" y="30" fill="#F1F5F9" fontSize="8">192.168.19.2 (Default Uplink)</text>
                  <text x="12" y="45" fill="#94A3B8" fontSize="7.5">• Routes all inbound client HTTP/TLS</text>
                </g>

                {/* External Adversary / Client */}
                <g transform="translate(35, 155)">
                  <rect width="220" height="75" rx="5" fill="#21262d" stroke="#F87171" strokeWidth="1" />
                  <text x="12" y="18" fill="#F87171" fontSize="8.5" fontWeight="bold">Zone 1 Adversary & External Clients</text>
                  <text x="12" y="30" fill="#F1F5F9" fontSize="8">Origination: External Network</text>
                  <rect x="12" y="36" width="90" height="13" rx="2" fill="rgba(248, 113, 113, 0.15)" stroke="rgba(248, 113, 113, 0.4)" />
                  <text x="16" y="46" fill="#F87171" fontSize="7" fontWeight="bold">NO DIRECT ACCESS</text>
                  <text x="12" y="64" fill="#94A3B8" fontSize="7.5">• Forced through Gateway ens33 inspection</text>
                </g>

                <g transform="translate(35, 250)">
                  <rect width="220" height="75" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
                  <text x="12" y="18" fill="#4ADE80" fontSize="8" fontWeight="bold">Ingress Security Rule</text>
                  <text x="12" y="32" fill="#F1F5F9" fontSize="7.5">All packets terminate at ens33</text>
                  <text x="12" y="46" fill="#94A3B8" fontSize="7">Zero direct Layer 2 routing to internal PCs</text>
                  <text x="12" y="60" fill="#38BDF8" fontSize="7">Requires Traefik TLS & WAF validation</text>
                </g>

                {/* Ingress Arrow to Gateway */}
                <path
                  d="M 270 105 L 340 105"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  markerEnd="url(#z3-arrow-cyan)"
                />

                {/* ================================================================= */}
                {/* 2. CENTRAL GATEWAY SECURITY CORE (ztagateway) */}
                {/* ================================================================= */}
                <rect
                  x="345"
                  y="20"
                  width="310"
                  height="330"
                  rx="8"
                  fill="#0F172A"
                  stroke="#38BDF8"
                  strokeWidth="2"
                />
                <rect x="345" y="20" width="310" height="3.5" rx="2" fill="#38BDF8" />
                <rect x="345" y="23.5" width="310" height="26" fill="rgba(56, 189, 248, 0.15)" />
                <text x="357" y="40" fill="#38BDF8" fontSize="9.5" fontWeight="bold">
                  🛡️ ZTA GATEWAY: L3 KERNEL BOUNDARY ENFORCEMENT
                </text>
                <text x="357" y="52" fill="#4ADE80" fontSize="7.5">
                  Dual-Homed Router · Kernel iptables/nftables · Zero Direct Bridge
                </text>

                {/* Physical Ingress Interface ens33 */}
                <g transform="translate(360, 65)">
                  <rect width="135" height="50" rx="4" fill="#1E293B" stroke="#38BDF8" strokeWidth="1" />
                  <text x="8" y="16" fill="#38BDF8" fontSize="8" fontWeight="bold">ens33 (Ingress)</text>
                  <text x="8" y="28" fill="#F1F5F9" fontSize="7">192.168.19.173/24</text>
                  <text x="8" y="40" fill="#4ADE80" fontSize="6.5">Perimeter DMZ Facing</text>
                </g>

                {/* Physical Egress Interface ens34 */}
                <g transform="translate(505, 65)">
                  <rect width="135" height="50" rx="4" fill="#1E293B" stroke="#4ADE80" strokeWidth="1" />
                  <text x="8" y="16" fill="#4ADE80" fontSize="8" fontWeight="bold">ens34 (Isolated)</text>
                  <text x="8" y="28" fill="#F1F5F9" fontSize="7">192.168.50.1/24</text>
                  <text x="8" y="40" fill="#4ADE80" fontSize="6.5">Internal Secure Gateway</text>
                </g>

                {/* Kernel Boundary Firewall Barrier */}
                <g transform="translate(360, 125)">
                  <rect width="280" height="60" rx="4" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.5" />
                  <text x="10" y="16" fill="#FBBF24" fontSize="8.5" fontWeight="bold">
                    Kernel Routing & Firewall Enforcement Engine
                  </text>
                  <text x="10" y="29" fill="#F1F5F9" fontSize="7.5">
                    • iptables / nftables: Default FORWARD policy = DROP
                  </text>
                  <text x="10" y="41" fill="#F1F5F9" fontSize="7.5">
                    • Only Traefik reverse proxy & Suricata IDS traffic permitted
                  </text>
                  <text x="10" y="52" fill="#4ADE80" fontSize="7">
                    • Zero raw IP packet transit between ens33 and ens34
                  </text>
                </g>

                {/* Inspection Nodes inside Gateway */}
                <g transform="translate(360, 195)">
                  <rect width="135" height="65" rx="4" fill="#161b22" stroke="#38BDF8" strokeWidth="1" />
                  <text x="8" y="16" fill="#38BDF8" fontSize="8" fontWeight="bold">Traefik & Coraza</text>
                  <text x="8" y="28" fill="#94A3B8" fontSize="7">TLS Termination</text>
                  <text x="8" y="40" fill="#94A3B8" fontSize="7">OWASP CRS Filter</text>
                  <text x="8" y="54" fill="#4ADE80" fontSize="6.5">Inline L7 Inspection</text>
                </g>

                <g transform="translate(505, 195)">
                  <rect width="135" height="65" rx="4" fill="#161b22" stroke="#A855F7" strokeWidth="1" />
                  <text x="8" y="16" fill="#A855F7" fontSize="8" fontWeight="bold">Authelia & Keycloak</text>
                  <text x="8" y="28" fill="#94A3B8" fontSize="7">Argon2id + OIDC</text>
                  <text x="8" y="40" fill="#94A3B8" fontSize="7">MFA Verification</text>
                  <text x="8" y="54" fill="#A855F7" fontSize="6.5">RBAC Step-Up Policy</text>
                </g>

                <g transform="translate(360, 270)">
                  <rect width="280" height="65" rx="4" fill="#131D31" stroke="#334155" strokeWidth="1" />
                  <text x="10" y="16" fill="#38BDF8" fontSize="8" fontWeight="bold">Telemetry & SOC Linkage</text>
                  <text x="10" y="30" fill="#94A3B8" fontSize="7">• Suricata & Zeek monitor interface traffic</text>
                  <text x="10" y="42" fill="#94A3B8" fontSize="7">• Filebeat forwards alert logs to Wazuh Manager (minisoc2)</text>
                  <text x="10" y="54" fill="#4ADE80" fontSize="7">• Automated IP blocking via Shuffle SOAR</text>
                </g>

                {/* Egress Arrow from ens34 to Isolated Network */}
                <path
                  d="M 655 90 L 710 90"
                  stroke="#4ADE80"
                  strokeWidth="2.5"
                  markerEnd="url(#z3-arrow-green)"
                />

                {/* ================================================================= */}
                {/* 3. ISOLATED TARGET NETWORK (192.168.50.0/24) */}
                {/* ================================================================= */}
                <rect
                  x="715"
                  y="20"
                  width="205"
                  height="330"
                  rx="8"
                  fill="#161b22"
                  stroke="#4ADE80"
                  strokeWidth="1.5"
                />
                <rect x="715" y="20" width="205" height="3.5" rx="2" fill="#4ADE80" />
                <rect x="715" y="23.5" width="205" height="26" fill="rgba(74, 222, 128, 0.12)" />
                <text x="725" y="40" fill="#4ADE80" fontSize="9.5" fontWeight="bold">
                  ISOLATED ZONE 2 NETWORK
                </text>
                <text x="725" y="52" fill="#94A3B8" fontSize="7.5">
                  192.168.50.0/24 (Enforced via ens34)
                </text>

                {/* Isolated Windows 10 Endpoint */}
                <g transform="translate(725, 65)">
                  <rect width="185" height="70" rx="5" fill="#21262d" stroke="#4ADE80" strokeWidth="1" />
                  <text x="10" y="17" fill="#4ADE80" fontSize="8.5" fontWeight="bold">Windows 10 (CORP-PC01)</text>
                  <text x="10" y="29" fill="#F1F5F9" fontSize="8">IP: 192.168.50.10/24</text>
                  <text x="10" y="42" fill="#94A3B8" fontSize="7.5">Gateway: 192.168.50.1 (ens34)</text>
                  <rect x="10" y="48" width="90" height="13" rx="2" fill="rgba(74, 222, 128, 0.15)" stroke="rgba(74, 222, 128, 0.4)" />
                  <text x="14" y="58" fill="#4ADE80" fontSize="7" fontWeight="bold">L3 ENFORCED ISOLATION</text>
                </g>

                {/* Isolated CORP-WEB01 (OWASP Juice Shop) */}
                <g transform="translate(725, 145)">
                  <rect width="185" height="70" rx="5" fill="#21262d" stroke="#FBBF24" strokeWidth="1" />
                  <text x="10" y="17" fill="#FBBF24" fontSize="8.5" fontWeight="bold">CORP-WEB01 (Juice Shop)</text>
                  <text x="10" y="29" fill="#F1F5F9" fontSize="8">IP: 192.168.50.20/24:3000</text>
                  <text x="10" y="42" fill="#94A3B8" fontSize="7.5">Shielded behind Traefik & WAF</text>
                  <rect x="10" y="48" width="85" height="13" rx="2" fill="rgba(251, 191, 36, 0.15)" stroke="rgba(251, 191, 36, 0.4)" />
                  <text x="14" y="58" fill="#FBBF24" fontSize="7">NO DIRECT WAN PATH</text>
                </g>

                {/* Active Directory Domain Grid & Federation */}
                <g transform="translate(725, 225)">
                  <rect width="185" height="105" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
                  <text x="10" y="17" fill="#A855F7" fontSize="8.5" fontWeight="bold">Zone 2 Target Grid & Federation</text>
                  <text x="10" y="31" fill="#F1F5F9" fontSize="7.5">• CORP-DC01 (AD DS aegis.corp)</text>
                  <text x="10" y="44" fill="#F1F5F9" fontSize="7.5">• Keycloak ↔ AD Federation (LDAP/OIDC)</text>
                  <text x="10" y="57" fill="#94A3B8" fontSize="7">• Primary Identity Store + Agent Sync</text>
                  <rect x="10" y="70" width="165" height="22" rx="3" fill="rgba(74, 222, 128, 0.1)" stroke="#4ADE80" strokeWidth="0.8" />
                  <text x="16" y="85" fill="#4ADE80" fontSize="7" fontWeight="bold">
                    ✓ ZERO LATERAL HOP FROM WAN
                  </text>
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Amber / Orange Segmentation Gap Notice Box */}
      <div className="bg-amber-950/20 border-l-4 border-amber-500 border-y border-r border-amber-500/30 p-4 rounded-r-lg font-mono">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <span>Segmentation Status — Zone 2 Subnet Active & Cross-Zone Routing Verified</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40">
                ZONE 2 ACTIVE
              </span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed font-sans">
              Layer 3 physical micro-segmentation is active: gateway interface <code className="text-amber-300 font-mono">ens34</code> (<code className="text-amber-300 font-mono">192.168.50.1/24</code>) connects to Zone 2 (<code className="text-amber-300 font-mono">VMnet3</code>). DC01 (<code className="text-amber-300 font-mono">192.168.50.10</code>), PC01 (<code className="text-amber-300 font-mono">192.168.50.100</code>), and CORP-WEB01 (<code className="text-amber-300 font-mono">192.168.50.20</code>) are all deployed on the <code className="text-amber-300 font-mono">192.168.50.0/24</code> subnet with verified routing to Zone 3. Docker-bridge iptables FORWARD rules (<code className="text-amber-300 font-mono">br_proxy &lt;-&gt; ens34</code>, <code className="text-amber-300 font-mono">br_auth &lt;-&gt; ens34</code>) are persisted via <code className="text-amber-300 font-mono">netfilter-persistent</code>. Ingress path (<code className="text-amber-300 font-mono">browser -&gt; Traefik -&gt; Coraza -&gt; CORP-WEB01@192.168.50.20</code>) returns HTTP/2 200 with Coraza WAF security headers.
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Live Terminal Ground Truth (`ip a` & `ip route` on ztagateway) */}
      <div className="border border-[#334155] rounded bg-[#161b22] text-xs">
        <div
          onClick={() => setShowTerminalOutput(!showTerminalOutput)}
          className="p-3 bg-[#1E293B] hover:bg-[#283548] cursor-pointer flex items-center justify-between transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#38BDF8]" />
            <span className="font-bold text-[#F1F5F9]">Terminal Ground Truth: <code className="text-[#38BDF8]">ztagateway</code> Interface State</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              `ip a` & `ip route`
            </span>
          </div>

          <div className="flex items-center gap-2 text-[#94A3B8]">
            <span className="text-[11px] hidden sm:inline">
              {showTerminalOutput ? 'Hide terminal output' : 'Inspect raw interface dump'}
            </span>
            {showTerminalOutput ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>

        {showTerminalOutput && (
          <div className="p-3 border-t border-[#334155] space-y-2 bg-[#090D16]">
            <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
              <span>Real Interface Dump from <code className="text-[#38BDF8]">ezio@ztagateway:~/zerotrust-network$</code>:</span>
              <button
                onClick={copyTerminalOutput}
                className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
              >
                {copiedTerminal ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTerminal ? 'Copied' : 'Copy Output'}</span>
              </button>
            </div>
            <pre className="p-3 rounded bg-black/60 border border-[#334155] text-[11px] font-mono text-[#38BDF8] overflow-x-auto leading-relaxed max-h-64">
              {realTerminalData}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
