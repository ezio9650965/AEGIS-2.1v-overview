import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
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
}) => {
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
      statusColor: 'text-[#ff3366]',
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
      statusColor: 'text-[#00d4ff]',
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
      statusColor: 'text-[#ff3366] font-bold',
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
      statusColor: 'text-[#bd93f9]',
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
      statusColor: 'text-[#00ff41] font-bold',
      involvedNodes: ['minisoc3', 'traefik', 'dc01'],
      involvedZones: ['z4', 'z3', 'z2'],
    },
  ];

  const currentStep = sqliSteps[currentStepIndex] || sqliSteps[0];

  // Helper to determine whether a node is dimmed during trace mode (Constraint: dim to 20%)
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
    <div className="space-y-3 font-mono text-[13px]">
      {/* Top Banner & Trace a Request Controls */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[rgba(0,212,255,0.13)] border border-[#00d4ff]/40 flex items-center justify-center text-[#00d4ff]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#c9d1d9] text-xs tracking-wide">
                AEGIS Network Vector Topology
              </span>
              <span className="px-2 py-0.5 rounded bg-[rgba(0,212,255,0.13)] text-[#00d4ff] border border-[#00d4ff]/30 font-mono text-[9px] uppercase font-bold tracking-wider">
                Interactive Map
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Real-time vector map of the 4 AEGIS security zones and verified packet routing paths.
            </p>
          </div>
        </div>

        {/* 'Trace a Request' Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTrace}
            className={`px-3.5 py-1.5 rounded font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              isTraceMode
                ? 'bg-[#ff3366] text-white shadow-[0_0_12px_rgba(255,51,102,0.4)] ring-2 ring-[#ff3366]/50'
                : 'bg-[#21262d] text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[rgba(0,212,255,0.13)]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isTraceMode ? 'bg-white pulse-indicator-rd' : 'bg-[#00d4ff] pulse-indicator-cy'
              }`}
            />
            <span>{isTraceMode ? 'Exit Trace Mode' : 'Trace a Request (SQLi Demo)'}</span>
          </button>
        </div>
      </div>

      {/* SQLi Attack Trace Control Console (Visible when Trace Mode is Active) */}
      {isTraceMode && (
        <div className="bg-[#161b22] border-2 border-[#ff3366]/60 rounded-lg p-3.5 space-y-3 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[rgba(255,51,102,0.13)] text-[#ff3366] border border-[#ff3366]/40 font-mono text-[10px] font-bold uppercase tracking-wider">
                SQLi Attack Simulation
              </span>
              <span className="text-[#c9d1d9] font-bold text-xs">
                Step {currentStep.step} of 5: {currentStep.name}
              </span>
              <span className={`text-[11px] font-mono ${currentStep.statusColor}`}>
                [{currentStep.status}]
              </span>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => onStepSelect(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#c9d1d9] disabled:opacity-30 hover:bg-[#2d333b] cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={onTogglePlay}
                className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                  isPlaying
                    ? 'bg-[#ffb700] text-black hover:bg-[#ffb700]/90'
                    : 'bg-[#00ff41] text-black hover:bg-[#00ff41]/90'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Flow'}</span>
              </button>

              <button
                onClick={() => onStepSelect(Math.min(sqliSteps.length - 1, currentStepIndex + 1))}
                disabled={currentStepIndex === sqliSteps.length - 1}
                className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#c9d1d9] disabled:opacity-30 hover:bg-[#2d333b] cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onResetTrace}
                className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#2d333b] cursor-pointer ml-1"
                title="Reset Flow to Step 1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stepper Buttons for Jump-to-Step */}
          <div className="grid grid-cols-5 gap-2">
            {sqliSteps.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => onStepSelect(idx)}
                className={`p-2 rounded text-left border transition-all cursor-pointer ${
                  currentStepIndex === idx
                    ? 'bg-[rgba(255,51,102,0.13)] border-[#ff3366] text-[#ff3366] shadow-[0_0_8px_rgba(255,51,102,0.25)] ring-1 ring-[#ff3366]'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#444c56] hover:text-[#c9d1d9]'
                }`}
              >
                <div className="text-[9px] uppercase tracking-wider font-bold">Step {s.step}</div>
                <div className="text-xs font-bold truncate text-[#c9d1d9]">{s.name}</div>
              </button>
            ))}
          </div>

          {/* Current Step Explanation Box */}
          <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d] text-[11px] flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">🛡️</span>
            <div>
              <span className="font-bold text-[#c9d1d9]">AEGIS Pipeline Action: </span>
              <span className="text-[#8b949e]">{currentStep.description}</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas Container with Absolute Corner Legend */}
      <div className="relative bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
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
              <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
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
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#00d4ff" />
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
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#ffb700" />
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
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#bd93f9" />
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
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#ff3366" />
              </marker>
              <marker
                id="arrow-green"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#00ff41" />
              </marker>
              <marker
                id="barrier-red"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="8"
                markerHeight="8"
              >
                <circle cx="5" cy="5" r="4.5" fill="#ff3366" />
                <path d="M 3 3 L 7 7 M 7 3 L 3 7" stroke="#FFFFFF" strokeWidth="1.5" />
              </marker>
            </defs>

            {/* Background Grid Pattern (AEGIS 44px grid) */}
            <pattern id="bg-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#21262d" strokeWidth="1" opacity="0.6" />
            </pattern>
            <rect width="1020" height="460" fill="url(#bg-grid)" />

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
                rx="8"
                fill="#161b22"
                stroke="#ff3366"
                strokeWidth="1.5"
                className="hover:stroke-[#ff3366]"
              />
              {/* Top Border Accent (3px matching Zone Color) */}
              <rect x="20" y="35" width="190" height="3.5" rx="2" fill="#ff3366" />

              {/* Pinned Monospace Zone Label */}
              <rect x="20" y="38.5" width="190" height="26" fill="rgba(255, 51, 102, 0.12)" />
              <text x="28" y="55" fill="#ff3366" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                🔴 ZONE 1 — THREATSCAPE · INTERNET
              </text>

              {/* Node 1: Kali Linux APT Station */}
              <g
                id="node-kali"
                transform="translate(35, 80)"
                className={`transition-all duration-300 ${isNodeDimmed('kali') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="160"
                  height="82"
                  rx="6"
                  fill="#21262d"
                  stroke={currentStep.involvedNodes.includes('kali') && isTraceMode ? '#ff3366' : '#30363d'}
                  strokeWidth={currentStep.involvedNodes.includes('kali') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('kali') && isTraceMode ? 'url(#glow-red)' : undefined}
                />
                <circle cx="20" cy="20" r="7" fill="rgba(255,51,102,0.2)" stroke="#ff3366" />
                <text x="20" y="23" fill="#ff3366" fontSize="8" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">⚡</text>
                <text x="34" y="19" fill="#c9d1d9" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">Kali Linux APT</text>
                <text x="34" y="30" fill="#ff3366" fontSize="8" fontFamily="'JetBrains Mono', monospace">192.168.1.50</text>
                {/* Port Badges */}
                <rect x="12" y="38" width="55" height="13" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="16" y="47" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">PORT :443/80</text>
                {/* Status Dot */}
                <circle cx="145" cy="18" r="3" fill="#ff3366" />
                <text x="12" y="65" fill="#8b949e" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">• sqlmap / Sliver C2</text>
                <text x="12" y="75" fill="#8b949e" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">• Burp Suite L7 Proxy</text>
              </g>

              {/* Node 2: REMnux Sandbox */}
              <g
                id="node-remnux"
                transform="translate(35, 180)"
                className={`transition-all duration-300 ${isNodeDimmed('remnux') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="160" height="74" rx="6" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <circle cx="20" cy="19" r="7" fill="rgba(255,183,0,0.2)" stroke="#ffb700" />
                <text x="20" y="22" fill="#ffb700" fontSize="8" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">⚙</text>
                <text x="34" y="19" fill="#c9d1d9" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">REMnux Sandbox</text>
                <text x="34" y="30" fill="#ffb700" fontSize="8" fontFamily="'JetBrains Mono', monospace">Isolated Analysis</text>
                <rect x="12" y="38" width="55" height="13" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="16" y="47" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">AIRGAPPED</text>
                <text x="12" y="64" fill="#8b949e" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">• YARA & PCAP Forensic</text>
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
                rx="8"
                fill="#161b22"
                stroke="#00d4ff"
                strokeWidth="1.5"
                className="hover:stroke-[#00d4ff]"
              />
              {/* Top Border Accent (3px matching Zone Color) */}
              <rect x="235" y="35" width="300" height="3.5" rx="2" fill="#00d4ff" />

              {/* Pinned Monospace Zone Label */}
              <rect x="235" y="38.5" width="300" height="26" fill="rgba(0, 212, 255, 0.12)" />
              <text x="243" y="55" fill="#00d4ff" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                🔵 ZONE 3 — ZERO-TRUST ACCESS GATEWAY & SENSORS
              </text>

              {/* Sub-Boundary: INTERNAL: TRUE ISOLATION BOUNDARY */}
              <rect
                x="385"
                y="75"
                width="140"
                height="335"
                rx="6"
                fill="#21262d"
                fillOpacity="0.5"
                stroke="#bd93f9"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              <text x="455" y="90" fill="#bd93f9" fontSize="7.5" fontWeight="bold" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
                internal: true (Kernel Isolation)
              </text>

              {/* Node: Traefik v3.6 */}
              <g
                id="node-traefik"
                transform="translate(245, 80)"
                className={`transition-all duration-300 ${isNodeDimmed('traefik') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="130"
                  height="72"
                  rx="6"
                  fill="#21262d"
                  stroke={currentStep.involvedNodes.includes('traefik') && isTraceMode ? '#00d4ff' : '#30363d'}
                  strokeWidth={currentStep.involvedNodes.includes('traefik') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('traefik') && isTraceMode ? 'url(#glow-cyan)' : undefined}
                />
                <text x="10" y="17" fill="#00d4ff" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">Traefik v3.6 Edge</text>
                <text x="10" y="29" fill="#c9d1d9" fontSize="8" fontFamily="'JetBrains Mono', monospace">TLS Reverse Proxy</text>
                {/* Port Badges */}
                <rect x="10" y="36" width="38" height="12" rx="2" fill="rgba(0,255,65,0.08)" stroke="rgba(0,255,65,0.3)" />
                <text x="14" y="45" fill="#00ff41" fontSize="7" fontFamily="'JetBrains Mono', monospace">:443 TLS</text>
                <rect x="52" y="36" width="32" height="12" rx="2" fill="rgba(0,255,65,0.08)" stroke="rgba(0,255,65,0.3)" />
                <text x="56" y="45" fill="#00ff41" fontSize="7" fontFamily="'JetBrains Mono', monospace">:80 EX</text>
                <circle cx="120" cy="15" r="3" fill="#00ff41" />
                <text x="10" y="63" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Wildcard *.zerotrust.lan</text>
              </g>

              {/* Node: Coraza WAF */}
              <g
                id="node-coraza"
                transform="translate(245, 165)"
                className={`transition-all duration-300 ${isNodeDimmed('coraza') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="130"
                  height="76"
                  rx="6"
                  fill="#21262d"
                  stroke={
                    currentStep.involvedNodes.includes('coraza') && isTraceMode
                      ? currentStep.step === 3
                        ? '#ff3366'
                        : '#00d4ff'
                      : '#30363d'
                  }
                  strokeWidth={currentStep.involvedNodes.includes('coraza') && isTraceMode ? '2.5' : '1'}
                  filter={currentStep.involvedNodes.includes('coraza') && isTraceMode ? 'url(#glow-red)' : undefined}
                />
                <text x="10" y="17" fill="#ff3366" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">Coraza WAF (CRS)</text>
                <text x="10" y="29" fill="#c9d1d9" fontSize="8" fontFamily="'JetBrains Mono', monospace">OWASP CRS 942100</text>
                {/* Port badge */}
                <rect x="10" y="36" width="48" height="12" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="14" y="45" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">:8080 DMZ</text>
                <circle cx="120" cy="15" r="3" fill="#ff3366" />
                <text x="10" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Inline SQLi blocker</text>
                <text x="10" y="70" fill="#ff3366" fontSize="7" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">• Action: HTTP 403 Block</text>
              </g>

              {/* Node: Suricata / Zeek Sensors */}
              <g
                id="node-suricata"
                transform="translate(245, 255)"
                className={`transition-all duration-300 ${isNodeDimmed('suricata') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="130"
                  height="72"
                  rx="6"
                  fill="#21262d"
                  stroke={currentStep.involvedNodes.includes('suricata') && isTraceMode ? '#bd93f9' : '#30363d'}
                  strokeWidth={currentStep.involvedNodes.includes('suricata') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('suricata') && isTraceMode ? 'url(#glow-purple)' : undefined}
                />
                <text x="10" y="17" fill="#bd93f9" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">Suricata & Zeek</text>
                <text x="10" y="29" fill="#c9d1d9" fontSize="8" fontFamily="'JetBrains Mono', monospace">Promiscuous Sniffing</text>
                <rect x="10" y="36" width="55" height="12" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="14" y="45" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">PASSIVE CAP</text>
                <circle cx="120" cy="15" r="3" fill="#00ff41" />
                <text x="10" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• 52k ET Signatures</text>
                <text x="10" y="69" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• eve.json & Filebeat</text>
              </g>

              {/* Isolated Nodes inside internal: true */}
              {/* Authelia */}
              <g
                id="node-authelia"
                transform="translate(395, 100)"
                className={`transition-all duration-300 ${isNodeDimmed('authelia') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="120" height="52" rx="4" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="8" y="16" fill="#bd93f9" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">Authelia v4.39</text>
                <text x="8" y="27" fill="#00ff41" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">Argon2id + Forward-Auth</text>
                <rect x="8" y="33" width="44" height="11" rx="2" fill="rgba(255,51,102,0.08)" stroke="rgba(255,51,102,0.3)" />
                <text x="12" y="41" fill="#ff3366" fontSize="6.5" fontFamily="'JetBrains Mono', monospace">:9091 BLK</text>
              </g>

              {/* Keycloak SSO */}
              <g
                id="node-keycloak"
                transform="translate(395, 160)"
                className={`transition-all duration-300 ${isNodeDimmed('keycloak') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="120" height="52" rx="4" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="8" y="16" fill="#bd93f9" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">Keycloak 26 (Prod)</text>
                <text x="8" y="27" fill="#00d4ff" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">OIDC IdP & RBAC</text>
                <rect x="8" y="33" width="44" height="11" rx="2" fill="rgba(255,51,102,0.08)" stroke="rgba(255,51,102,0.3)" />
                <text x="12" y="41" fill="#ff3366" fontSize="6.5" fontFamily="'JetBrains Mono', monospace">:8080 BLK</text>
              </g>

              {/* Juice Shop (Vulnerable Target App) */}
              <g
                id="node-juiceshop"
                transform="translate(395, 220)"
                className={`transition-all duration-300 ${isNodeDimmed('juiceshop') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="120" height="52" rx="4" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="8" y="16" fill="#ffb700" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">OWASP Juice Shop</text>
                <text x="8" y="27" fill="#00ff41" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">Shielded by WAF</text>
                <rect x="8" y="33" width="44" height="11" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="12" y="41" fill="#8b949e" fontSize="6.5" fontFamily="'JetBrains Mono', monospace">:3000 Node</text>
              </g>

              {/* PostgreSQL & Redis Session Cache */}
              <g
                id="node-db-session"
                transform="translate(395, 280)"
                className={`transition-all duration-300 ${isNodeDimmed('redis') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="120" height="52" rx="4" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="8" y="16" fill="#c9d1d9" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">PostgreSQL + Redis</text>
                <text x="8" y="27" fill="#8b949e" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">Identity Vault & Sessions</text>
                <rect x="8" y="33" width="50" height="11" rx="2" fill="rgba(255,51,102,0.08)" stroke="rgba(255,51,102,0.3)" />
                <text x="11" y="41" fill="#ff3366" fontSize="6.5" fontFamily="'JetBrains Mono', monospace">:5432/:6379</text>
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
                rx="8"
                fill="#161b22"
                stroke="#bd93f9"
                strokeWidth="1.5"
                className="hover:stroke-[#bd93f9]"
              />
              {/* Top Border Accent (3px matching Zone Color) */}
              <rect x="555" y="35" width="220" height="3.5" rx="2" fill="#bd93f9" />

              {/* Pinned Monospace Zone Label */}
              <rect x="555" y="38.5" width="220" height="26" fill="rgba(189, 147, 249, 0.12)" />
              <text x="563" y="55" fill="#bd93f9" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                🟣 ZONE 4 — MSSP SOC & SOAR CLUSTER
              </text>

              {/* Node: minisoc1 (Elasticsearch) */}
              <g
                id="node-minisoc1"
                transform="translate(570, 80)"
                className={`transition-all duration-300 ${isNodeDimmed('minisoc1') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="190"
                  height="72"
                  rx="6"
                  fill="#21262d"
                  stroke={currentStep.involvedNodes.includes('minisoc1') && isTraceMode ? '#bd93f9' : '#30363d'}
                  strokeWidth="1"
                />
                <text x="12" y="17" fill="#bd93f9" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">minisoc1 (The Vault)</text>
                <text x="12" y="29" fill="#00d4ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">10.16.64.155</text>
                <rect x="12" y="36" width="55" height="12" rx="2" fill="rgba(0,212,255,0.08)" stroke="rgba(0,212,255,0.3)" />
                <text x="16" y="45" fill="#00d4ff" fontSize="7" fontFamily="'JetBrains Mono', monospace">:9200 mTLS</text>
                <circle cx="175" cy="15" r="3" fill="#00ff41" />
                <text x="12" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Elasticsearch 8.19 (RPM)</text>
              </g>

              {/* Node: minisoc2 (Wazuh SIEM) */}
              <g
                id="node-minisoc2"
                transform="translate(570, 165)"
                className={`transition-all duration-300 ${isNodeDimmed('minisoc2') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="190"
                  height="76"
                  rx="6"
                  fill="#21262d"
                  stroke={currentStep.involvedNodes.includes('minisoc2') && isTraceMode ? '#bd93f9' : '#30363d'}
                  strokeWidth={currentStep.involvedNodes.includes('minisoc2') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('minisoc2') && isTraceMode ? 'url(#glow-purple)' : undefined}
                />
                <text x="12" y="17" fill="#bd93f9" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">minisoc2 (The Brain)</text>
                <text x="12" y="29" fill="#00d4ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">10.16.64.156</text>
                <rect x="12" y="36" width="60" height="12" rx="2" fill="rgba(0,212,255,0.08)" stroke="rgba(0,212,255,0.3)" />
                <text x="16" y="45" fill="#00d4ff" fontSize="7" fontFamily="'JetBrains Mono', monospace">:1514 / :55000</text>
                <circle cx="175" cy="15" r="3" fill="#00ff41" />
                <text x="12" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Wazuh 4.7 Manager & Correlator</text>
                <text x="12" y="70" fill="#bd93f9" fontSize="7" fontFamily="'JetBrains Mono', monospace">• MITRE T1190 & Webhook SOAR</text>
              </g>

              {/* Node: minisoc3 (Shuffle SOAR) */}
              <g
                id="node-minisoc3"
                transform="translate(570, 255)"
                className={`transition-all duration-300 ${isNodeDimmed('minisoc3') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect
                  width="190"
                  height="72"
                  rx="6"
                  fill="#21262d"
                  stroke={currentStep.involvedNodes.includes('minisoc3') && isTraceMode ? '#00ff41' : '#30363d'}
                  strokeWidth={currentStep.involvedNodes.includes('minisoc3') && isTraceMode ? '2' : '1'}
                  filter={currentStep.involvedNodes.includes('minisoc3') && isTraceMode ? 'url(#glow-green)' : undefined}
                />
                <text x="12" y="17" fill="#00ff41" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">minisoc3 (The Executor)</text>
                <text x="12" y="29" fill="#00d4ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">10.16.64.157</text>
                <rect x="12" y="36" width="55" height="12" rx="2" fill="rgba(0,255,65,0.08)" stroke="rgba(0,255,65,0.3)" />
                <text x="16" y="45" fill="#00ff41" fontSize="7" fontFamily="'JetBrains Mono', monospace">:3001 SOAR</text>
                <circle cx="175" cy="15" r="3" fill="#00ff41" />
                <text x="12" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Shuffle SOAR + MISP Intel</text>
                <text x="12" y="69" fill="#00ff41" fontSize="7" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">• Active Response Host-Drop</text>
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
                rx="8"
                fill="#161b22"
                stroke="#ffb700"
                strokeWidth="1.5"
                className="hover:stroke-[#ffb700]"
              />
              {/* Top Border Accent (3px matching Zone Color) */}
              <rect x="795" y="35" width="205" height="3.5" rx="2" fill="#ffb700" />

              {/* Pinned Monospace Zone Label */}
              <rect x="795" y="38.5" width="205" height="26" fill="rgba(255, 183, 0, 0.12)" />
              <text x="803" y="55" fill="#ffb700" fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                🟡 ZONE 2 — TARGET ENCLAVE · aegis.corp
              </text>

              {/* Node: CORP-DC01 */}
              <g
                id="node-dc01"
                transform="translate(810, 80)"
                className={`transition-all duration-300 ${isNodeDimmed('dc01') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="175" height="72" rx="6" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="12" y="17" fill="#ffb700" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">CORP-DC01 (AD DS)</text>
                <text x="12" y="29" fill="#00d4ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">192.168.20.10</text>
                <rect x="12" y="36" width="60" height="12" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="16" y="45" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">:389/:88/:53</text>
                <circle cx="160" cy="15" r="3" fill="#00ff41" />
                <text x="12" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Windows Server 2022</text>
                <text x="12" y="69" fill="#00ff41" fontSize="7" fontFamily="'JetBrains Mono', monospace">✓ 100% Isolated & Untouched</text>
              </g>

              {/* Node: CORP-PC01 */}
              <g
                id="node-pc01"
                transform="translate(810, 165)"
                className={`transition-all duration-300 ${isNodeDimmed('pc01') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="175" height="72" rx="6" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="12" y="17" fill="#ffb700" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">CORP-PC01 (Client)</text>
                <text x="12" y="29" fill="#00d4ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">192.168.20.100</text>
                <rect x="12" y="36" width="60" height="12" rx="2" fill="#2d333b" stroke="#30363d" />
                <text x="16" y="45" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">SYSMON v15</text>
                <circle cx="160" cy="15" r="3" fill="#00ff41" />
                <text x="12" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Finance Workstation</text>
                <text x="12" y="69" fill="#00ff41" fontSize="7" fontFamily="'JetBrains Mono', monospace">✓ Protected Target Enclave</text>
              </g>

              {/* Node: Database Vault */}
              <g
                id="node-dbvault"
                transform="translate(810, 255)"
                className={`transition-all duration-300 ${isNodeDimmed('dbvault') ? 'opacity-20' : 'opacity-100'}`}
              >
                <rect width="175" height="72" rx="6" fill="#21262d" stroke="#30363d" strokeWidth="1" />
                <text x="12" y="17" fill="#ffb700" fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">CORP-DB01 (Crown Jewel)</text>
                <text x="12" y="29" fill="#00d4ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">192.168.20.50</text>
                <rect x="12" y="36" width="60" height="12" rx="2" fill="rgba(255,51,102,0.08)" stroke="rgba(255,51,102,0.3)" />
                <text x="16" y="45" fill="#ff3366" fontSize="7" fontFamily="'JetBrains Mono', monospace">:5432 NO EXT</text>
                <circle cx="160" cy="15" r="3" fill="#00ff41" />
                <text x="12" y="60" fill="#8b949e" fontSize="7" fontFamily="'JetBrains Mono', monospace">• Customer PII Database</text>
                <text x="12" y="69" fill="#00ff41" fontSize="7" fontFamily="'JetBrains Mono', monospace">✓ Zero Ingress / No Breach</text>
              </g>
            </g>

            {/* ================================================================= */}
            {/* VECTOR PATHS & CONNECTOR EDGES WITH ANIMATED FLOW */}
            {/* ================================================================= */}

            {/* Path 1: Kali -> Traefik (Inbound HTTPS / SQLi attempt) */}
            <path
              id="path-z1-z3"
              d="M 195 120 C 215 120, 220 120, 245 120"
              fill="none"
              stroke={isPathActive('path-z1-z3') ? '#ff3366' : '#00d4ff'}
              strokeWidth={isPathActive('path-z1-z3') ? '4' : '2'}
              strokeDasharray="6,3"
              markerEnd={isPathActive('path-z1-z3') ? 'url(#arrow-red)' : 'url(#arrow-cyan)'}
              filter={isPathActive('path-z1-z3') ? 'url(#glow-red)' : undefined}
              className={`svg-flow-path-mtls transition-all duration-300 ${
                isTraceMode && !isPathActive('path-z1-z3') ? 'opacity-20' : 'opacity-100'
              }`}
            />
            {isPathActive('path-z1-z3') && (
              <circle cx="220" cy="120" r="5" fill="#ff3366" className="animate-ping" />
            )}

            {/* Path 2: Traefik -> Coraza WAF */}
            <path
              id="path-traefik-coraza"
              d="M 310 152 L 310 165"
              fill="none"
              stroke={isPathActive('path-traefik-coraza') ? '#ff3366' : '#00d4ff'}
              strokeWidth={isPathActive('path-traefik-coraza') ? '4' : '2'}
              strokeDasharray="4,2"
              markerEnd={isPathActive('path-traefik-coraza') ? 'url(#arrow-red)' : 'url(#arrow-cyan)'}
              filter={isPathActive('path-traefik-coraza') ? 'url(#glow-red)' : undefined}
              className={`svg-flow-path-mtls transition-all duration-300 ${
                isTraceMode && !isPathActive('path-traefik-coraza') ? 'opacity-20' : 'opacity-100'
              }`}
            />

            {/* Block 3: Coraza WAF Block Barrier (Red Denied Path to Protected App) */}
            <path
              id="block-coraza"
              d="M 375 200 L 395 200"
              fill="none"
              stroke="#ff3366"
              strokeWidth={isPathActive('block-coraza') ? '4' : '2'}
              strokeDasharray="4,2"
              markerEnd="url(#barrier-red)"
              filter={isPathActive('block-coraza') ? 'url(#glow-red)' : undefined}
              className={`transition-all duration-300 ${
                isTraceMode && !isPathActive('block-coraza') ? 'opacity-20' : 'opacity-100'
              }`}
            />
            {isPathActive('block-coraza') && (
              <g transform="translate(380, 185)">
                <circle cx="8" cy="8" r="10" fill="#ff3366" className="animate-ping" opacity="0.6" />
                <circle cx="8" cy="8" r="10" fill="#ff3366" />
                <text x="8" y="11" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">✕</text>
                <rect x="-25" y="-18" width="66" height="15" rx="3" fill="#ff3366" />
                <text x="8" y="-7" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">403 BLOCKED</text>
              </g>
            )}

            {/* Path 4: Sensor Logging to Zone 4 (minisoc2) */}
            <path
              id="path-z3-z4"
              d="M 375 280 C 470 280, 480 200, 570 200"
              fill="none"
              stroke="#bd93f9"
              strokeWidth={isPathActive('path-z3-z4') ? '4' : '1.8'}
              strokeDasharray="3,3"
              markerEnd="url(#arrow-purple)"
              filter={isPathActive('path-z3-z4') ? 'url(#glow-purple)' : undefined}
              className={`svg-flow-path-telemetry transition-all duration-300 ${
                isTraceMode && !isPathActive('path-z3-z4') ? 'opacity-20' : 'opacity-100'
              }`}
            />
            {isPathActive('path-z3-z4') && (
              <circle cx="470" cy="240" r="5" fill="#bd93f9" className="animate-ping" />
            )}

            {/* Path 5: SOAR Countermeasure Dispatch to Gateway */}
            <path
              id="path-z4-response"
              d="M 570 290 C 480 320, 350 360, 310 240"
              fill="none"
              stroke="#00ff41"
              strokeWidth={isPathActive('path-z4-response') ? '3.5' : '1.8'}
              strokeDasharray="4,4"
              markerEnd="url(#arrow-green)"
              filter={isPathActive('path-z4-response') ? 'url(#glow-green)' : undefined}
              className={`svg-flow-path-soar transition-all duration-300 ${
                isTraceMode && !isPathActive('path-z4-response') ? 'opacity-20' : 'opacity-100'
              }`}
            />
            {isPathActive('path-z4-response') && (
              <g transform="translate(410, 320)">
                <rect width="105" height="18" rx="4" fill="#00ff41" />
                <text x="52" y="12" fill="#0d1117" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                  ✓ IP 192.168.1.50 BANNED
                </text>
              </g>
            )}

            {/* Path to Zone 2: Blind-Routed / DNAT (Dashed Amber) */}
            <path
              id="path-gateway-zone2"
              d="M 535 120 C 650 120, 700 120, 810 120"
              fill="none"
              stroke="#ffb700"
              strokeWidth="1.8"
              strokeDasharray="5,4"
              markerEnd="url(#arrow-amber)"
              className={`svg-flow-path-dnat transition-all duration-300 ${
                isTraceMode ? 'opacity-20' : 'opacity-80'
              }`}
            />

            {/* Denied Marker on Zone 2 Ingress during Attack */}
            {isTraceMode && (
              <g transform="translate(790, 110)">
                <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#21262d" stroke="#00ff41" strokeWidth="1" />
                <text x="0" y="4" fill="#00ff41" fontSize="11" textAnchor="middle">🔒</text>
              </g>
            )}
          </svg>
        </div>

        {/* ===================================================================== */}
        {/* PERSISTENT LEGEND COMPONENT PINNED IN THE CORNER */}
        {/* ===================================================================== */}
        <div
          id="svg-persistent-corner-legend"
          className="absolute bottom-2.5 right-2.5 z-20 bg-[#161b22]/95 backdrop-blur-md border border-[#30363d] rounded-lg p-3 font-mono shadow-2xl text-[10px] space-y-2.5 max-w-[270px] select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]">
            <div className="flex items-center gap-1.5 font-bold text-[#c9d1d9] text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#00d4ff] pulse-indicator-cy"></span>
              <span>Visualizer Legend</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.13)] text-[#00d4ff] border border-[#00d4ff]/30 font-bold uppercase tracking-wider">
              AEGIS KEY
            </span>
          </div>

          {/* 1. Color Coding for Zones */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold text-[#8b949e] uppercase tracking-wider">Per-Zone Color Coding</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff3366] shrink-0"></span>
                <span className="text-[#ff3366] font-medium truncate">Zone 1: Threat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00d4ff] shrink-0"></span>
                <span className="text-[#00d4ff] font-medium truncate">Zone 3: Gateway</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#bd93f9] shrink-0"></span>
                <span className="text-[#bd93f9] font-medium truncate">Zone 4: SOC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffb700] shrink-0"></span>
                <span className="text-[#ffb700] font-medium truncate">Zone 2: Target</span>
              </div>
            </div>
          </div>

          {/* 2. Border Styles for Isolation Boundaries */}
          <div className="space-y-1 pt-1 border-t border-[#30363d]/60">
            <div className="text-[9px] font-bold text-[#8b949e] uppercase tracking-wider">Isolation Boundary Style</div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 rounded-sm border border-[#00d4ff]/70 bg-[rgba(0,212,255,0.13)] shrink-0"></div>
                <span className="text-[#c9d1d9]">Solid: Host Bridge</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 rounded-sm border border-dashed border-[#bd93f9] bg-[rgba(189,147,249,0.13)] shrink-0"></div>
                <span className="text-[#bd93f9]">
                  Dashed: <code className="text-[#bd93f9] font-bold">internal: true</code> Isolation
                </span>
              </div>
            </div>
          </div>

          {/* 3. Line Styles for Traffic Types */}
          <div className="space-y-1 pt-1 border-t border-[#30363d]/60">
            <div className="text-[9px] font-bold text-[#8b949e] uppercase tracking-wider">Traffic & Edge Line Types</div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-[#00d4ff] shrink-0"></div>
                <span className="text-[#c9d1d9]">Cyan: mTLS / Inspected Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t border-dashed border-[#ffb700] shrink-0"></div>
                <span className="text-[#c9d1d9]">Amber: DNAT / Blind-Routed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-[#ff3366] rounded shrink-0 flex items-center justify-center text-[7px] text-white font-bold">✕</div>
                <span className="text-[#ff3366] font-bold">Red / ✕: Denied / Blocked Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t border-dotted border-[#bd93f9] shrink-0"></div>
                <span className="text-[#bd93f9]">Purple: Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 border-t border-dashed border-[#00ff41] shrink-0"></div>
                <span className="text-[#00ff41]">Green: SOAR Countermeasure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
