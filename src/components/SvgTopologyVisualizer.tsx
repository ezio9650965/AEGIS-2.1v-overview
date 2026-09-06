import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Server,
  Zap,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Lock,
  Radio,
  AlertTriangle,
  Info,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

export interface SvgTopologyVisualizerProps {
  isTraceMode: boolean;
  onToggleTrace: () => void;
  currentStepIndex: number;
  onStepSelect: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetTrace: () => void;
  onZoneClick?: (zoneKey: 'z1' | 'z2' | 'z3' | 'z4') => void;
  expandedZones?: Record<string, boolean>;
}

export const SvgTopologyVisualizer: React.FC<SvgTopologyVisualizerProps> = ({
  isTraceMode,
  onToggleTrace,
  currentStepIndex,
  onStepSelect,
  isPlaying,
  onTogglePlay,
  onResetTrace,
  onZoneClick,
  expandedZones = { z1: false, z2: false, z3: false, z4: false },
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // SQLi Attack Step definitions for the AEGIS defense flow
  const sqliSteps = [
    {
      step: 1,
      name: 'SQLi Launch',
      source: 'kali',
      target: 'traefik',
      pathId: 'path-z1-z3',
      description: 'Adversary executes automated sqlmap injection payload against shop.zerotrust.lan across external network.',
      status: 'Payload In-Flight',
      statusColor: 'text-red-400',
      involvedNodes: ['kali', 'traefik'],
      involvedZones: ['z1', 'z3'],
    },
    {
      step: 2,
      name: 'TLS & Proxy',
      source: 'traefik',
      target: 'coraza',
      pathId: 'path-traefik-coraza',
      description: 'Traefik terminates edge TLS (:443) and proxies raw HTTP query to Coraza WAF container via proxy_net.',
      status: 'TLS Terminated',
      statusColor: 'text-cyan-400',
      involvedNodes: ['traefik', 'coraza'],
      involvedZones: ['z3'],
    },
    {
      step: 3,
      name: 'WAF 403 Block',
      source: 'coraza',
      target: 'coraza',
      pathId: 'block-coraza',
      description: 'Coraza WAF matches OWASP CRS 942100 (SQLi) rule and terminates request with HTTP 403 Forbidden.',
      status: 'BLOCKED (HTTP 403)',
      statusColor: 'text-red-400 font-bold',
      involvedNodes: ['coraza'],
      involvedZones: ['z3'],
    },
    {
      step: 4,
      name: 'Telemetry Stream',
      source: 'suricata',
      target: 'minisoc2',
      pathId: 'path-z3-z4',
      description: 'Suricata IDS flags ET SQLi signature; Filebeat ships event logs to Wazuh Manager (minisoc2) and Elasticsearch.',
      status: 'Alert Forwarded',
      statusColor: 'text-purple-400',
      involvedNodes: ['suricata', 'minisoc2', 'minisoc1'],
      involvedZones: ['z3', 'z4'],
    },
    {
      step: 5,
      name: 'SOAR Auto-Drop',
      source: 'minisoc3',
      target: 'traefik',
      pathId: 'path-z4-response',
      description: 'Shuffle SOAR triggers Active Response: adversary IP 192.168.1.50 banned; Zone 2 Target remains 100% protected.',
      status: 'IP Auto-Banned (<47s)',
      statusColor: 'text-emerald-400 font-bold',
      involvedNodes: ['minisoc3', 'traefik', 'dc01'],
      involvedZones: ['z4', 'z3', 'z2'],
    },
  ];

  const currentStep = sqliSteps[currentStepIndex] || sqliSteps[0];

  // Helper to determine whether a node is dimmed during trace mode
  const isNodeDimmed = (nodeId: string) => {
    if (!isTraceMode) return false;
    return !currentStep.involvedNodes.includes(nodeId);
  };

  // Helper to determine whether a zone is dimmed during trace mode
  const isZoneDimmed = (zoneId: string) => {
    if (!isTraceMode) return false;
    return !currentStep.involvedZones.includes(zoneId);
  };

  // Helper to determine if a path is active
  const isPathActive = (pathId: string) => {
    if (!isTraceMode) return false;
    return currentStep.pathId === pathId;
  };

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Top Banner & Trace a Request Toggle */}
      <div className="bg-[#0B1120] border border-[#334155] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-xs tracking-wide">
                AEGIS Network Vector Topology
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-[9px]">
                Interactive SVG
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">
              Real-time vector map of the 4 AEGIS security zones and verified packet routing paths.
            </p>
          </div>
        </div>

        {/* 'Trace a Request' Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTrace}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              isTraceMode
                ? 'bg-red-500 text-white shadow-red-500/30 shadow-md ring-2 ring-red-400/40'
                : 'bg-[#1E293B] text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/20'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isTraceMode ? 'animate-bounce text-yellow-300' : 'text-cyan-400'}`} />
            <span>{isTraceMode ? 'Tracing Active: SQLi Defense' : 'Trace a Request (SQLi)'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isTraceMode ? 'bg-white animate-ping' : 'bg-cyan-400'
              }`}
            ></span>
          </button>
        </div>
      </div>

      {/* Trace Mode Interactive Playback Bar (When Active) */}
      {isTraceMode && (
        <div className="bg-[#0F172A] border-2 border-red-500/50 rounded-lg p-3.5 font-mono shadow-xl transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#334155]/70 mb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
              <span className="text-white font-bold text-xs">
                Active Request Path: <span className="text-red-400">OWASP SQL Injection Attempt</span>
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] ${currentStep.statusColor}`}>
                {currentStep.status}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-1.5 bg-[#1E293B] p-1 rounded border border-[#334155]">
              <button
                onClick={onTogglePlay}
                className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title={isPlaying ? 'Pause auto-play' : 'Auto-play sequence'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => onStepSelect(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="p-1 rounded text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-[10px] text-[#94A3B8] px-1 font-mono">
                {currentStepIndex + 1}/{sqliSteps.length}
              </span>

              <button
                onClick={() => onStepSelect(Math.min(sqliSteps.length - 1, currentStepIndex + 1))}
                disabled={currentStepIndex === sqliSteps.length - 1}
                className="p-1 rounded text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onResetTrace}
                className="p-1 rounded text-[#94A3B8] hover:text-white cursor-pointer ml-1"
                title="Restart sequence"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Step Timeline Pills */}
          <div className="grid grid-cols-5 gap-2 mb-2.5">
            {sqliSteps.map((st, i) => (
              <button
                key={st.step}
                onClick={() => onStepSelect(i)}
                className={`px-2 py-1.5 rounded text-left transition-all cursor-pointer font-mono text-[10px] border ${
                  i === currentStepIndex
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-sm'
                    : i < currentStepIndex
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Step {st.step}</span>
                  {i === currentStepIndex && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>}
                </div>
                <div className="truncate font-sans font-medium text-[11px]">{st.name}</div>
              </button>
            ))}
          </div>

          {/* Current Step Description Banner */}
          <div className="p-2.5 rounded bg-[#0B1120] border border-cyan-500/30 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-white">Step {currentStep.step}: {currentStep.name} — </strong>
              <span className="text-[#94A3B8]">{currentStep.description}</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas Container with Absolute Corner Legend */}
      <div className="relative bg-[#0B1120] border border-[#334155] rounded-lg overflow-hidden shadow-2xl">
        {/* Actual Responsive SVG Topology Map */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 1020 460"
            className="w-full min-w-[850px] h-auto select-none"
            style={{ maxHeight: '520px' }}
          >
            <defs>
              {/* Glow Filters */}
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Arrow Markers */}
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#06B6D4" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#F59E0B" />
              </marker>
              <marker
                id="arrow-purple"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#A855F7" />
              </marker>
              <marker
                id="arrow-red"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#EF4444" />
              </marker>
              <marker
                id="barrier-red"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="8"
                markerHeight="8"
              >
                <circle cx="5" cy="5" r="4" fill="#EF4444" />
                <path d="M 3 3 L 7 7 M 7 3 L 3 7" stroke="#FFFFFF" strokeWidth="1.5" />
              </marker>
            </defs>

            {/* Background Grid Pattern */}
            <pattern id="bg-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.5" />
            </pattern>
            <rect width="1020" height="460" fill="url(#bg-grid)" opacity="0.6" />

            {/* ================================================================= */}
            {/* ZONE 1: THREATSCAPE (STEP 1) */}
            {/* ================================================================= */}
            <g
              id="zone-1"
              className={`transition-all duration-300 cursor-pointer ${
                isZoneDimmed('z1') ? 'opacity-20' : 'opacity-100'
              }`}
              onClick={() => onZoneClick && onZoneClick('z1')}
            >
              {/* Zone Box */}
              <rect
                x="20"
                y="35"
                width="190"
                height="390"
                rx="10"
                fill="#1E1E2E"
                stroke="#EF4444"
                strokeWidth="1.8"
                className="hover:stroke-red-400"
              />
              {/* Step 1 Header Badge */}
              <rect x="20" y="35" width="190" height="34" rx="10" fill="#EF4444" fillOpacity="0.15" />
              <circle cx="38" cy="52" r="10" fill="#EF4444" />
              <text x="38" y="56" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">1</text>
              <text x="56" y="49" fill="#FCA5A5" fontSize="10" fontWeight="bold" fontFamily="monospace">ZONE 1: THREATSCAPE</text>
              <text x="56" y="61" fill="#94A3B8" fontSize="8" fontFamily="monospace">External Subnet / Origin</text>

              {/* Node 1: Kali Linux */}
              <g
                id="node-kali"
                transform="translate(35, 95)"
                className={`transition-all duration-300 ${isNodeDimmed('kali') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="160"
                  height="70"
                  rx="6"
                  fill="#0F172A"
                  stroke={currentStep.involvedNodes.includes('kali') && isTraceMode ? '#EF4444' : '#334155'}
                  strokeWidth={currentStep.involvedNodes.includes('kali') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('kali') && isTraceMode ? 'url(#glow-red)' : undefined}
                />
                <circle cx="20" cy="22" r="8" fill="#EF4444" fillOpacity="0.2" stroke="#EF4444" />
                <text x="20" y="25" fill="#EF4444" fontSize="9" textAnchor="middle" fontFamily="monospace">&#9876;</text>
                <text x="35" y="21" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">Kali Linux (APT)</text>
                <text x="35" y="33" fill="#EF4444" fontSize="8" fontFamily="monospace">192.168.1.50</text>
                <text x="12" y="55" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• sqlmap injection agent</text>
              </g>

              {/* Node 2: REMnux Sandbox */}
              <g
                id="node-remnux"
                transform="translate(35, 195)"
                className={`transition-all duration-300 ${isNodeDimmed('remnux') ? 'opacity-25' : 'opacity-100'}`}
              >
                <rect width="160" height="65" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <circle cx="20" cy="20" r="8" fill="#FBBF24" fillOpacity="0.2" stroke="#FBBF24" />
                <text x="20" y="24" fill="#FBBF24" fontSize="9" textAnchor="middle" fontFamily="monospace">&#9881;</text>
                <text x="35" y="21" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">REMnux Sandbox</text>
                <text x="35" y="33" fill="#FBBF24" fontSize="8" fontFamily="monospace">Isolated Analysis</text>
                <text x="12" y="52" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• PCAP & YARA inspection</text>
              </g>
            </g>

            {/* ================================================================= */}
            {/* ZONE 3: ZERO-TRUST ACCESS GATEWAY & SENSORS (STEP 2) */}
            {/* ================================================================= */}
            <g
              id="zone-3"
              className={`transition-all duration-300 cursor-pointer ${
                isZoneDimmed('z3') ? 'opacity-20' : 'opacity-100'
              }`}
              onClick={() => onZoneClick && onZoneClick('z3')}
            >
              {/* Outer Zone Box (Standard Bridge) */}
              <rect
                x="235"
                y="35"
                width="300"
                height="390"
                rx="10"
                fill="#0F172A"
                stroke="#06B6D4"
                strokeWidth="1.8"
                className="hover:stroke-cyan-400"
              />
              {/* Step 2 Header Badge */}
              <rect x="235" y="35" width="300" height="34" rx="10" fill="#06B6D4" fillOpacity="0.15" />
              <circle cx="253" cy="52" r="10" fill="#06B6D4" />
              <text x="253" y="56" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">2</text>
              <text x="270" y="49" fill="#67E8F9" fontSize="10" fontWeight="bold" fontFamily="monospace">ZONE 3: ZERO-TRUST ACCESS GATEWAY</text>
              <text x="270" y="61" fill="#94A3B8" fontSize="8" fontFamily="monospace">192.168.19.173 Host (Ubuntu 24.04 LTS)</text>

              {/* Sub-Boundary: INTERNAL: TRUE ISOLATION BOUNDARY */}
              <rect
                x="385"
                y="85"
                width="140"
                height="325"
                rx="8"
                fill="#1E1B4B"
                fillOpacity="0.3"
                stroke="#A855F7"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              <text x="455" y="100" fill="#C084FC" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                internal: true (Kernel Isolation)
              </text>

              {/* Node: Traefik */}
              <g
                id="node-traefik"
                transform="translate(245, 95)"
                className={`transition-all duration-300 ${isNodeDimmed('traefik') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="130"
                  height="65"
                  rx="6"
                  fill="#1E293B"
                  stroke={currentStep.involvedNodes.includes('traefik') && isTraceMode ? '#06B6D4' : '#334155'}
                  strokeWidth={currentStep.involvedNodes.includes('traefik') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('traefik') && isTraceMode ? 'url(#glow-cyan)' : undefined}
                />
                <text x="10" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">Traefik v3.6</text>
                <text x="10" y="30" fill="#38BDF8" fontSize="8" fontFamily="monospace">:443 TLS Reverse Proxy</text>
                <text x="10" y="48" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Wildcard SNI router</text>
              </g>

              {/* Node: Coraza WAF */}
              <g
                id="node-coraza"
                transform="translate(245, 175)"
                className={`transition-all duration-300 ${isNodeDimmed('coraza') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="130"
                  height="70"
                  rx="6"
                  fill="#1E293B"
                  stroke={
                    currentStep.involvedNodes.includes('coraza') && isTraceMode
                      ? currentStep.step === 3
                        ? '#EF4444'
                        : '#06B6D4'
                      : '#334155'
                  }
                  strokeWidth={currentStep.involvedNodes.includes('coraza') && isTraceMode ? '2.5' : '1'}
                  filter={currentStep.involvedNodes.includes('coraza') && isTraceMode ? 'url(#glow-red)' : undefined}
                />
                <text x="10" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">Coraza WAF</text>
                <text x="10" y="30" fill="#EF4444" fontSize="8" fontWeight="bold" fontFamily="monospace">OWASP CRS 942100</text>
                <text x="10" y="48" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Inline SQLi blocker</text>
                <text x="10" y="60" fill="#F87171" fontSize="8" fontFamily="monospace">HTTP 403 Enforcer</text>
              </g>

              {/* Node: Suricata / Zeek Sensors */}
              <g
                id="node-suricata"
                transform="translate(245, 260)"
                className={`transition-all duration-300 ${isNodeDimmed('suricata') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="130"
                  height="65"
                  rx="6"
                  fill="#1E293B"
                  stroke={currentStep.involvedNodes.includes('suricata') && isTraceMode ? '#A855F7' : '#334155'}
                  strokeWidth={currentStep.involvedNodes.includes('suricata') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('suricata') && isTraceMode ? 'url(#glow-purple)' : undefined}
                />
                <text x="10" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">Suricata & Zeek</text>
                <text x="10" y="30" fill="#C084FC" fontSize="8" fontFamily="monospace">NTA & IDS Sensors</text>
                <text x="10" y="48" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• eve.json / conn.log</text>
              </g>

              {/* Isolated Nodes inside internal: true */}
              {/* Authelia */}
              <g
                id="node-authelia"
                transform="translate(395, 110)"
                className={`transition-all duration-300 ${isNodeDimmed('authelia') ? 'opacity-25' : 'opacity-100'}`}
              >
                <rect width="120" height="50" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="8" y="18" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">Authelia 2FA Gate</text>
                <text x="8" y="30" fill="#10B981" fontSize="8" fontFamily="monospace">Duo / TOTP Auth</text>
                <text x="8" y="42" fill="#64748B" fontSize="7" fontFamily="monospace">auth_net isolation</text>
              </g>

              {/* Keycloak SSO */}
              <g
                id="node-keycloak"
                transform="translate(395, 175)"
                className={`transition-all duration-300 ${isNodeDimmed('keycloak') ? 'opacity-25' : 'opacity-100'}`}
              >
                <rect width="120" height="50" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="8" y="18" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">Keycloak 24 OIDC</text>
                <text x="8" y="30" fill="#38BDF8" fontSize="8" fontFamily="monospace">SSO & RBAC Tokens</text>
                <text x="8" y="42" fill="#64748B" fontSize="7" fontFamily="monospace">Session revocation API</text>
              </g>

              {/* Juice Shop (Vulnerable Target App) */}
              <g
                id="node-juiceshop"
                transform="translate(395, 240)"
                className={`transition-all duration-300 ${isNodeDimmed('juiceshop') ? 'opacity-25' : 'opacity-100'}`}
              >
                <rect width="120" height="50" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="8" y="18" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">OWASP Juice Shop</text>
                <text x="8" y="30" fill="#FBBF24" fontSize="8" fontFamily="monospace">:3000 Node.js Store</text>
                <text x="8" y="42" fill="#10B981" fontSize="7" fontFamily="monospace">&#10003; Shielded by WAF</text>
              </g>

              {/* Redis Session Cache */}
              <g
                id="node-redis"
                transform="translate(395, 305)"
                className={`transition-all duration-300 ${isNodeDimmed('redis') ? 'opacity-25' : 'opacity-100'}`}
              >
                <rect width="120" height="50" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="8" y="18" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">Redis 7 Session</text>
                <text x="8" y="30" fill="#94A3B8" fontSize="8" fontFamily="monospace">:6379 Fast Cache</text>
                <text x="8" y="42" fill="#64748B" fontSize="7" fontFamily="monospace">No host exposure</text>
              </g>
            </g>

            {/* ================================================================= */}
            {/* ZONE 4: REMOTE MSSP SOC CLUSTER (STEP 3) */}
            {/* ================================================================= */}
            <g
              id="zone-4"
              className={`transition-all duration-300 cursor-pointer ${
                isZoneDimmed('z4') ? 'opacity-20' : 'opacity-100'
              }`}
              onClick={() => onZoneClick && onZoneClick('z4')}
            >
              {/* Zone Box */}
              <rect
                x="555"
                y="35"
                width="220"
                height="390"
                rx="10"
                fill="#18132A"
                stroke="#A855F7"
                strokeWidth="1.8"
                className="hover:stroke-purple-400"
              />
              {/* Step 3 Header Badge */}
              <rect x="555" y="35" width="220" height="34" rx="10" fill="#A855F7" fillOpacity="0.15" />
              <circle cx="573" cy="52" r="10" fill="#A855F7" />
              <text x="573" y="56" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">3</text>
              <text x="590" y="49" fill="#D8B4FE" fontSize="10" fontWeight="bold" fontFamily="monospace">ZONE 4: MSSP SOC CLUSTER</text>
              <text x="590" y="61" fill="#94A3B8" fontSize="8" fontFamily="monospace">10.16.64.0/24 (AlmaLinux 9)</text>

              {/* Node: minisoc1 (Elasticsearch) */}
              <g
                id="node-minisoc1"
                transform="translate(570, 95)"
                className={`transition-all duration-300 ${isNodeDimmed('minisoc1') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="190"
                  height="65"
                  rx="6"
                  fill="#0F172A"
                  stroke={currentStep.involvedNodes.includes('minisoc1') && isTraceMode ? '#A855F7' : '#334155'}
                  strokeWidth="1"
                />
                <text x="12" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">minisoc1 (Index & Dash)</text>
                <text x="12" y="30" fill="#A855F7" fontSize="8" fontFamily="monospace">10.16.64.150</text>
                <text x="12" y="46" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Elasticsearch 8.19 & Kibana</text>
                <text x="12" y="58" fill="#64748B" fontSize="7" fontFamily="monospace">Log ingestion & analytics</text>
              </g>

              {/* Node: minisoc2 (Wazuh SIEM) */}
              <g
                id="node-minisoc2"
                transform="translate(570, 175)"
                className={`transition-all duration-300 ${isNodeDimmed('minisoc2') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="190"
                  height="70"
                  rx="6"
                  fill="#0F172A"
                  stroke={currentStep.involvedNodes.includes('minisoc2') && isTraceMode ? '#A855F7' : '#334155'}
                  strokeWidth={currentStep.involvedNodes.includes('minisoc2') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('minisoc2') && isTraceMode ? 'url(#glow-purple)' : undefined}
                />
                <text x="12" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">minisoc2 (The Brain)</text>
                <text x="12" y="30" fill="#A855F7" fontSize="8" fontFamily="monospace">10.16.64.152</text>
                <text x="12" y="46" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Wazuh 4.7 Manager & Correlator</text>
                <text x="12" y="58" fill="#D8B4FE" fontSize="8" fontFamily="monospace">MITRE ATT&CK correlation</text>
              </g>

              {/* Node: minisoc3 (Shuffle SOAR) */}
              <g
                id="node-minisoc3"
                transform="translate(570, 260)"
                className={`transition-all duration-300 ${isNodeDimmed('minisoc3') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect
                  width="190"
                  height="65"
                  rx="6"
                  fill="#0F172A"
                  stroke={currentStep.involvedNodes.includes('minisoc3') && isTraceMode ? '#10B981' : '#334155'}
                  strokeWidth={currentStep.involvedNodes.includes('minisoc3') && isTraceMode ? '2' : '1'}
                />
                <text x="12" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">minisoc3 (The Executor)</text>
                <text x="12" y="30" fill="#10B981" fontSize="8" fontFamily="monospace">10.16.64.157</text>
                <text x="12" y="46" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Shuffle SOAR + MISP Intel</text>
                <text x="12" y="58" fill="#10B981" fontSize="8" fontFamily="monospace">Automated IP Block Dispatcher</text>
              </g>
            </g>

            {/* ================================================================= */}
            {/* ZONE 2: TARGET ENTERPRISE GRID (STEP 4) */}
            {/* ================================================================= */}
            <g
              id="zone-2"
              className={`transition-all duration-300 cursor-pointer ${
                isZoneDimmed('z2') ? 'opacity-20' : 'opacity-100'
              }`}
              onClick={() => onZoneClick && onZoneClick('z2')}
            >
              {/* Zone Box */}
              <rect
                x="795"
                y="35"
                width="205"
                height="390"
                rx="10"
                fill="#1C1917"
                stroke="#F59E0B"
                strokeWidth="1.8"
                className="hover:stroke-amber-400"
              />
              {/* Step 4 Header Badge */}
              <rect x="795" y="35" width="205" height="34" rx="10" fill="#F59E0B" fillOpacity="0.15" />
              <circle cx="813" cy="52" r="10" fill="#F59E0B" />
              <text x="813" y="56" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">4</text>
              <text x="830" y="49" fill="#FCD34D" fontSize="10" fontWeight="bold" fontFamily="monospace">ZONE 2: ENTERPRISE GRID</text>
              <text x="830" y="61" fill="#94A3B8" fontSize="8" fontFamily="monospace">192.168.20.0/24 (Target Vault)</text>

              {/* Node: CORP-DC01 */}
              <g
                id="node-dc01"
                transform="translate(810, 95)"
                className={`transition-all duration-300 ${isNodeDimmed('dc01') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect width="175" height="65" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="12" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">CORP-DC01 (AD DS)</text>
                <text x="12" y="30" fill="#F59E0B" fontSize="8" fontFamily="monospace">192.168.20.10</text>
                <text x="12" y="46" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Windows Server 2022</text>
                <text x="12" y="58" fill="#10B981" fontSize="8" fontFamily="monospace">&#10003; 100% Isolated & Untouched</text>
              </g>

              {/* Node: CORP-PC01 */}
              <g
                id="node-pc01"
                transform="translate(810, 175)"
                className={`transition-all duration-300 ${isNodeDimmed('pc01') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect width="175" height="65" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="12" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">CORP-PC01 (Workstation)</text>
                <text x="12" y="30" fill="#F59E0B" fontSize="8" fontFamily="monospace">192.168.20.100</text>
                <text x="12" y="46" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Finance User ezio</text>
                <text x="12" y="58" fill="#10B981" fontSize="8" fontFamily="monospace">&#10003; Protected Target Enclave</text>
              </g>

              {/* Node: Database Vault */}
              <g
                id="node-dbvault"
                transform="translate(810, 260)"
                className={`transition-all duration-300 ${isNodeDimmed('dbvault') ? 'opacity-30' : 'opacity-100'}`}
              >
                <rect width="175" height="65" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                <text x="12" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">SQL DB & PII Vault</text>
                <text x="12" y="30" fill="#F59E0B" fontSize="8" fontFamily="monospace">192.168.20.25</text>
                <text x="12" y="46" fill="#94A3B8" fontSize="8" fontFamily="sans-serif">• Customer Financial Records</text>
                <text x="12" y="58" fill="#10B981" fontSize="8" fontFamily="monospace">&#10003; Zero Ingress / Breach Avoided</text>
              </g>
            </g>

            {/* ================================================================= */}
            {/* VECTOR PATHS & CONNECTOR EDGES */}
            {/* ================================================================= */}

            {/* Path 1: Kali -> Traefik (Inbound HTTPS / SQLi attempt) */}
            <path
              id="path-z1-z3"
              d="M 195 130 C 215 130, 220 130, 245 130"
              fill="none"
              stroke={isPathActive('path-z1-z3') ? '#EF4444' : '#06B6D4'}
              strokeWidth={isPathActive('path-z1-z3') ? '3.5' : '2'}
              strokeDasharray={isPathActive('path-z1-z3') ? '6,4' : undefined}
              markerEnd={isPathActive('path-z1-z3') ? 'url(#arrow-red)' : 'url(#arrow-cyan)'}
              className={`transition-all duration-300 ${isPathActive('path-z1-z3') ? 'animate-pulse' : ''}`}
            />
            {isPathActive('path-z1-z3') && (
              <circle cx="220" cy="130" r="5" fill="#EF4444" className="animate-ping" />
            )}

            {/* Path 2: Traefik -> Coraza WAF */}
            <path
              id="path-traefik-coraza"
              d="M 310 160 L 310 175"
              fill="none"
              stroke={isPathActive('path-traefik-coraza') ? '#EF4444' : '#06B6D4'}
              strokeWidth={isPathActive('path-traefik-coraza') ? '3.5' : '2'}
              markerEnd={isPathActive('path-traefik-coraza') ? 'url(#arrow-red)' : 'url(#arrow-cyan)'}
              className={`transition-all duration-300 ${isPathActive('path-traefik-coraza') ? 'animate-pulse' : ''}`}
            />

            {/* Block 3: Coraza WAF Block Barrier (Red Denied Path to Protected App) */}
            <path
              id="block-coraza"
              d="M 375 210 L 395 210"
              fill="none"
              stroke="#EF4444"
              strokeWidth={isPathActive('block-coraza') ? '3.5' : '2'}
              strokeDasharray="4,2"
              markerEnd="url(#barrier-red)"
            />
            {isPathActive('block-coraza') && (
              <g transform="translate(380, 195)">
                <circle cx="8" cy="8" r="10" fill="#EF4444" className="animate-ping" opacity="0.6" />
                <circle cx="8" cy="8" r="10" fill="#EF4444" />
                <text x="8" y="11" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">✕</text>
                <rect x="-25" y="-18" width="66" height="15" rx="3" fill="#991B1B" />
                <text x="8" y="-7" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">403 BLOCKED</text>
              </g>
            )}

            {/* Path 4: Sensor Logging to Zone 4 (minisoc2) */}
            <path
              id="path-z3-z4"
              d="M 375 290 C 470 290, 480 210, 570 210"
              fill="none"
              stroke="#A855F7"
              strokeWidth={isPathActive('path-z3-z4') ? '3.5' : '1.8'}
              strokeDasharray="3,3"
              markerEnd="url(#arrow-purple)"
              className={`transition-all duration-300 ${isPathActive('path-z3-z4') ? 'animate-pulse' : ''}`}
            />
            {isPathActive('path-z3-z4') && (
              <circle cx="470" cy="250" r="5" fill="#A855F7" className="animate-ping" />
            )}

            {/* Path 5: SOAR Countermeasure Dispatch to Gateway */}
            <path
              id="path-z4-response"
              d="M 570 295 C 480 320, 350 360, 310 245"
              fill="none"
              stroke="#10B981"
              strokeWidth={isPathActive('path-z4-response') ? '3' : '1.5'}
              strokeDasharray="4,4"
              markerEnd="url(#arrow-cyan)"
              className={`transition-all duration-300 ${isPathActive('path-z4-response') ? 'animate-pulse' : ''}`}
            />
            {isPathActive('path-z4-response') && (
              <g transform="translate(420, 330)">
                <rect width="90" height="18" rx="4" fill="#065F46" />
                <text x="45" y="12" fill="#A7F3D0" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  &#10003; IP 192.168.1.50 BANNED
                </text>
              </g>
            )}

            {/* Path to Zone 2: Blind-Routed / DNAT (Dashed Amber) */}
            <path
              id="path-gateway-zone2"
              d="M 535 130 C 650 130, 700 130, 810 130"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeDasharray="6,4"
              markerEnd="url(#arrow-amber)"
              opacity={isTraceMode ? 0.15 : 0.8}
            />

            {/* Denied Marker on Zone 2 Ingress during Attack */}
            {isTraceMode && (
              <g transform="translate(790, 120)">
                <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#1E293B" stroke="#10B981" strokeWidth="1" />
                <text x="0" y="4" fill="#10B981" fontSize="11" textAnchor="middle">&#128274;</text>
              </g>
            )}
          </svg>
        </div>

        {/* ===================================================================== */}
        {/* PERSISTENT LEGEND COMPONENT PINNED IN THE CORNER */}
        {/* ===================================================================== */}
        <div
          id="svg-persistent-corner-legend"
          className="absolute bottom-2.5 right-2.5 z-20 bg-[#0B1120]/95 backdrop-blur-md border border-[#334155] rounded-lg p-3 font-mono shadow-2xl text-[10px] space-y-2.5 max-w-[270px] select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#334155]">
            <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Visualizer Legend</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Pinned Key
            </span>
          </div>

          {/* 1. Color Coding for Zones */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Per-Zone Color Coding</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0"></span>
                <span className="text-red-300 font-medium">Zone 1: Origin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] shrink-0"></span>
                <span className="text-cyan-300 font-medium">Zone 3: Gateway</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shrink-0"></span>
                <span className="text-purple-300 font-medium">Zone 4: SOC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0"></span>
                <span className="text-amber-300 font-medium">Zone 2: Target</span>
              </div>
            </div>
          </div>

          {/* 2. Border Styles for Isolation Boundaries */}
          <div className="space-y-1 pt-1 border-t border-[#334155]/60">
            <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Isolation Boundary Style</div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 rounded-sm border border-cyan-400/70 bg-cyan-950/20 shrink-0"></div>
                <span className="text-[#F1F5F9]">Solid: Standard Host Bridge</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 rounded-sm border border-dashed border-purple-400 bg-purple-950/30 shrink-0"></div>
                <span className="text-purple-300">
                  Dashed: <code className="text-purple-300 font-bold">internal: true</code> Isolation
                </span>
              </div>
            </div>
          </div>

          {/* 3. Line Styles for Traffic Types */}
          <div className="space-y-1 pt-1 border-t border-[#334155]/60">
            <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Traffic & Edge Line Types</div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-cyan-400 shrink-0"></div>
                <span className="text-[#F1F5F9]">Solid Cyan: mTLS / HTTPS Inspected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t border-dashed border-amber-400 shrink-0"></div>
                <span className="text-[#F1F5F9]">Dashed Amber: DNAT / Blind-Routed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-red-500 rounded shrink-0 flex items-center justify-center text-[7px] text-white">✕</div>
                <span className="text-red-400 font-bold">Solid Red / ✕: Denied / Blocked Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t border-dotted border-purple-400 shrink-0"></div>
                <span className="text-purple-300">Dotted Purple: Telemetry Stream</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
