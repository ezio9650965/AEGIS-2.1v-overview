import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Server,
  Network,
  Terminal,
  Cpu,
  Database,
  Radio,
  Globe,
  Lock,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Zap,
  Layers,
  Info,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { SvgTopologyVisualizer } from './SvgTopologyVisualizer';

export interface TopologyProps {
  initialExpandedZone?: 'all' | 'z1' | 'z2' | 'z3' | 'z4' | 'none';
  filterZone?: 'all' | 'z1' | 'z2' | 'z3' | 'z4';
  onZoneSelect?: (zoneId: string) => void;
  showTraceControls?: boolean;
}

interface TraceStep {
  step: number;
  title: string;
  sourceNode: string;
  targetNode: string;
  sourceZone: 'z1' | 'z2' | 'z3' | 'z4';
  targetZone: 'z1' | 'z2' | 'z3' | 'z4';
  trafficType: 'blocked' | 'mtls' | 'internal' | 'telemetry' | 'blind';
  description: string;
  technicalDetail: string;
  commandSnippet?: string;
  resultBadge: string;
  resultColor: 'red' | 'emerald' | 'cyan' | 'purple' | 'amber';
}

interface TraceScenario {
  id: string;
  name: string;
  actLabel: string;
  description: string;
  steps: TraceStep[];
}

const TRACE_SCENARIOS: TraceScenario[] = [
  {
    id: 'sqli-block',
    name: 'SQLi Exploit Blocked & Auto-Isolated',
    actLabel: 'Act II / Act III Demo Flow',
    description: 'Adversary executes automated sqlmap injection against Juice Shop; Coraza WAF blocks payload inline with HTTP 403; Suricata/Zeek ship telemetry to minisoc2; Shuffle SOAR executes active IP ban.',
    steps: [
      {
        step: 1,
        title: 'Adversary sqlmap Payload Injection',
        sourceNode: 'kali',
        targetNode: 'traefik',
        sourceZone: 'z1',
        targetZone: 'z3',
        trafficType: 'mtls',
        description: 'Attacker launches sqlmap from Kali APT station targeting shop.zerotrust.lan with union-based SQL injection payloads.',
        technicalDetail: 'GET /rest/products/search?q=\' UNION SELECT id,email,password FROM Users-- HTTP/1.1 over TLS (SNI: shop.zerotrust.lan)',
        commandSnippet: 'sqlmap -u "https://shop.zerotrust.lan/rest/products/search?q=apple" --batch --dbs',
        resultBadge: 'Attack Initiated (192.168.1.50)',
        resultColor: 'red',
      },
      {
        step: 2,
        title: 'Traefik TLS Termination & WAF Proxy',
        sourceNode: 'traefik',
        targetNode: 'coraza',
        sourceZone: 'z3',
        targetZone: 'z3',
        trafficType: 'internal',
        description: 'Traefik terminates edge TLS using *.zerotrust.lan wildcard certificate and forwards raw HTTP request to Coraza WAF via proxy_net.',
        technicalDetail: 'Traefik router evaluates Host(`shop.zerotrust.lan`) -> forward request to coraza-waf:8080 Caddy listener.',
        commandSnippet: 'traefik.http.routers.shop.middlewares=coraza-waf@docker',
        resultBadge: 'TLS Terminated (:443)',
        resultColor: 'cyan',
      },
      {
        step: 3,
        title: 'Coraza WAF OWASP CRS Inspection & Block',
        sourceNode: 'coraza',
        targetNode: 'coraza',
        sourceZone: 'z3',
        targetZone: 'z3',
        trafficType: 'blocked',
        description: 'Coraza Caddy plugin analyzes query against OWASP Core Rule Set (CRS 942100 SQL Injection Detection) and immediately blocks the transaction with HTTP 403.',
        technicalDetail: '[client 192.168.1.50] Coraza: Access denied with code 403 (phase 2). Match of "rx (?:union select)" at ARGS:q. [id "942100"] [severity "CRITICAL"]',
        commandSnippet: 'HTTP/1.1 403 Forbidden\r\nContent-Type: text/html\r\n\r\n403 Forbidden - Zero Trust WAF Block',
        resultBadge: 'HTTP 403 Forbidden (Blocked)',
        resultColor: 'red',
      },
      {
        step: 4,
        title: 'Suricata IDS & Zeek NTA Telemetry Logging',
        sourceNode: 'coraza',
        targetNode: 'suricata',
        sourceZone: 'z3',
        targetZone: 'z3',
        trafficType: 'telemetry',
        description: 'Suricata IDS inspects packet on br_proxy DMZ bridge and flags ET Open SQLi rule; Zeek records connection metadata in http.log.',
        technicalDetail: 'Suricata Alert [1:2010021:7] ET WEB_SPECIFIC_APPS OWASP SQLi Attempt. Zeek conn.log & http.log write status 403.',
        commandSnippet: 'tail -f /var/log/suricata/eve.json | jq \'.alert.signature\'',
        resultBadge: 'Alert Flagged (SID 2010021)',
        resultColor: 'purple',
      },
      {
        step: 5,
        title: 'Filebeat Log Forwarding to SIEM',
        sourceNode: 'suricata',
        targetNode: 'minisoc1',
        sourceZone: 'z3',
        targetZone: 'z4',
        trafficType: 'telemetry',
        description: 'Gateway Filebeat daemon ships structured JSON logs across the inter-enclave bridge to minisoc1 Elasticsearch and minisoc2 Wazuh Manager.',
        technicalDetail: 'Filebeat index: "suricata-eve-*" & "zeek-http-*" sent via Lumberjack protocol to 10.16.64.155:9200 and Wazuh Manager :1514.',
        commandSnippet: 'curl -X GET "http://10.16.64.155:9200/suricata-*/_count"',
        resultBadge: 'Ingested into ES 8.19',
        resultColor: 'purple',
      },
      {
        step: 6,
        title: 'Wazuh Alert & Shuffle SOAR Active Response',
        sourceNode: 'minisoc2',
        targetNode: 'minisoc3',
        sourceZone: 'z4',
        targetZone: 'z4',
        trafficType: 'telemetry',
        description: 'minisoc2 Wazuh fires Rule 100201 (High Severity SQLi Attempt); webhook notifies Shuffle SOAR ("Mahoraga v2.1") which cross-checks MISP and triggers active IP isolation.',
        technicalDetail: 'Shuffle SOAR webhook triggered -> MISP Threat Intel query -> Wazuh Active Response API command "firewall-drop" executed against 192.168.1.50 in <12 seconds.',
        commandSnippet: 'Wazuh Active Response: /var/ossec/active-response/bin/firewall-drop.sh add - 192.168.1.50 100201',
        resultBadge: 'Attacker IP Blacklisted (Active Defense)',
        resultColor: 'emerald',
      },
    ],
  },
  {
    id: 'mimikatz-edr',
    name: 'Mimikatz LSASS Dump & EDR Host Isolation',
    actLabel: 'Act III Internal Threat Flow',
    description: 'Patient Zero workstation in Zone 2 executes mimikatz to dump memory credentials; Sysmon v15 and Wazuh Agent flag T1003.001; Shuffle SOAR revokes Keycloak tokens and triggers host NIC disconnect.',
    steps: [
      {
        step: 1,
        title: 'LSASS Memory Injection on Patient Zero',
        sourceNode: 'corp-pc01',
        targetNode: 'corp-pc01',
        sourceZone: 'z2',
        targetZone: 'z2',
        trafficType: 'blocked',
        description: 'CORP-PC01 workstation executes unprivileged command escalating to dump credentials via mimikatz sekurlsa::logonpasswords.',
        technicalDetail: 'Process mimikatz.exe opens handle to lsass.exe with PROCESS_VM_READ (0x0010) and PROCESS_QUERY_INFORMATION (0x0400).',
        commandSnippet: 'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit',
        resultBadge: 'Credential Dump Attempt',
        resultColor: 'red',
      },
      {
        step: 2,
        title: 'Sysmon v15 Detection & Wazuh Event Shipping',
        sourceNode: 'corp-pc01',
        targetNode: 'minisoc2',
        sourceZone: 'z2',
        targetZone: 'z4',
        trafficType: 'telemetry',
        description: 'Sysmon v15 catches Event ID 10 (ProcessAccess to lsass.exe); Wazuh Agent v4.7 immediately encrypts and pushes event to minisoc2 over port 1514.',
        technicalDetail: 'Event ID 10: SourceImage: \\mimikatz.exe | TargetImage: C:\\Windows\\System32\\lsass.exe | GrantedAccess: 0x1FFFFF.',
        commandSnippet: 'Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 1',
        resultBadge: 'Sysmon Event ID 10 Dispatched',
        resultColor: 'purple',
      },
      {
        step: 3,
        title: 'Wazuh Manager MITRE ATT&CK Classification',
        sourceNode: 'minisoc2',
        targetNode: 'minisoc2',
        sourceZone: 'z4',
        targetZone: 'z4',
        trafficType: 'internal',
        description: 'Wazuh Manager decodes event, fires local rule mapped to MITRE ATT&CK T1003.001 (OS Credential Dumping: LSASS Memory), and initiates SOAR webhook.',
        technicalDetail: 'Wazuh Rule ID 100085: "Mimikatz LSASS access detected on Windows workstation". Tag: mitre.id="T1003.001", severity: 12.',
        commandSnippet: '<rule id="100085" level="12"><mitre><id>T1003.001</id></mitre></rule>',
        resultBadge: 'MITRE T1003.001 Alert Fired',
        resultColor: 'red',
      },
      {
        step: 4,
        title: 'Shuffle SOAR Token Revocation & NIC Isolation',
        sourceNode: 'minisoc3',
        targetNode: 'keycloak',
        sourceZone: 'z4',
        targetZone: 'z3',
        trafficType: 'internal',
        description: 'Shuffle SOAR calls Keycloak REST API to revoke all active SSO sessions for user ezio, then sends host-drop to Wazuh Agent to sever CORP-PC01 NIC in <47s.',
        technicalDetail: 'POST /admin/realms/aegis/users/{id}/logout (Keycloak Session Revoke) -> Wazuh AR: "host-drop" on agent 002 (192.168.20.100).',
        commandSnippet: 'Shuffle Workflow: [Trigger Wazuh] -> [Keycloak Session Invalidate] -> [Host Isolation Script]',
        resultBadge: 'Host Isolated & Tokens Revoked (<47s)',
        resultColor: 'emerald',
      },
    ],
  },
];

export const InteractiveTopologyDiagram: React.FC<TopologyProps> = ({
  initialExpandedZone = 'none',
  filterZone = 'all',
  onZoneSelect,
  showTraceControls = true,
}) => {
  // Collapsed by default progressive disclosure
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({
    z1: initialExpandedZone === 'all' || initialExpandedZone === 'z1',
    z2: initialExpandedZone === 'all' || initialExpandedZone === 'z2',
    z3: initialExpandedZone === 'all' || initialExpandedZone === 'z3',
    z4: initialExpandedZone === 'all' || initialExpandedZone === 'z4',
  });

  // Trace mode state
  const [isTraceMode, setIsTraceMode] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('sqli-block');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeScenario = TRACE_SCENARIOS.find((s) => s.id === activeScenarioId) || TRACE_SCENARIOS[0];
  const activeStep = activeScenario.steps[currentStepIndex] || activeScenario.steps[0];

  // Auto-play timer for trace mode
  useEffect(() => {
    if (isPlaying && isTraceMode) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= activeScenario.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isTraceMode, activeScenario.steps.length]);

  // When activating trace mode, auto-expand relevant zones
  const toggleTraceMode = () => {
    if (!isTraceMode) {
      setIsTraceMode(true);
      setCurrentStepIndex(0);
      setIsPlaying(true);
      // Auto-expand all zones for visual tracing
      setExpandedZones({ z1: true, z2: true, z3: true, z4: true });
    } else {
      setIsTraceMode(false);
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    if (currentStepIndex < activeScenario.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleResetTrace = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const toggleZone = (zoneKey: string) => {
    setExpandedZones((prev) => ({
      ...prev,
      [zoneKey]: !prev[zoneKey],
    }));
    if (onZoneSelect) onZoneSelect(zoneKey);
  };

  const expandAll = () => {
    setExpandedZones({ z1: true, z2: true, z3: true, z4: true });
  };

  const collapseAll = () => {
    setExpandedZones({ z1: false, z2: false, z3: false, z4: false });
  };

  // Helper to determine if a node or zone is active during trace mode
  const isNodeActive = (nodeId: string) => {
    if (!isTraceMode) return true;
    return activeStep.sourceNode === nodeId || activeStep.targetNode === nodeId;
  };

  const isZoneActive = (zoneKey: string) => {
    if (!isTraceMode) return true;
    return activeStep.sourceZone === zoneKey || activeStep.targetZone === zoneKey;
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR & CONTROLS: TRACE MODE + EXPAND/COLLAPSE ALL */}
      {/* ========================================================================= */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-mono font-bold text-[#F1F5F9] text-sm">AEGIS v2.1 Interactive SVG Topology</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded bg-[#0F172A] border border-cyan-500/30 text-cyan-300">
            <span className="font-bold text-white uppercase tracking-wider">Sequential Path:</span>
            <span className="text-red-400 font-bold">① Zone 1 (Origin)</span>
            <span className="text-[#64748B]">&rarr;</span>
            <span className="text-cyan-300 font-bold">② Zone 3 (Gateway)</span>
            <span className="text-[#64748B]">&rarr;</span>
            <span className="text-purple-300 font-bold">③ Zone 4 (SOC)</span>
            <span className="text-[#64748B]">&rarr;</span>
            <span className="text-amber-300 font-bold">④ Zone 2 (Target)</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Trace a Request Toggle */}
          {showTraceControls && (
            <button
              onClick={toggleTraceMode}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isTraceMode
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-red-500/20 shadow-sm'
                  : 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 hover:bg-[#38BDF8]/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isTraceMode ? 'Exit Trace Mode' : 'Trace a Request Mode'}</span>
            </button>
          )}

          {/* Expand / Collapse All Controls (Constraint B) */}
          <div className="flex items-center gap-1 bg-[#0F172A] p-0.5 rounded border border-[#334155] font-mono text-[11px]">
            <button
              onClick={expandAll}
              className="px-2 py-1 rounded text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-[#334155]">|</span>
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE SVG TOPOLOGY VISUALIZER WITH PINNED CORNER LEGEND */}
      {/* ========================================================================= */}
      <SvgTopologyVisualizer
        isTraceMode={isTraceMode}
        onToggleTrace={toggleTraceMode}
        currentStepIndex={currentStepIndex}
        onStepSelect={(idx) => {
          setCurrentStepIndex(idx);
          setIsPlaying(false);
        }}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onResetTrace={handleResetTrace}
        onZoneClick={(zk) => toggleZone(zk)}
        expandedZones={expandedZones}
      />

      {/* ========================================================================= */}
      {/* 3. TRACE A REQUEST PLAYBACK CONSOLE (TECHNICAL DEEP DIVE) */}
      {/* ========================================================================= */}
      {isTraceMode && (
        <div className="bg-[#0B1120] border-2 border-red-500/40 rounded-lg p-4 font-mono shadow-xl transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#334155]/60 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px] uppercase border border-red-500/40 animate-pulse">
                Active Simulation Trace
              </span>
              <span className="text-[#F1F5F9] font-bold text-sm">{activeScenario.name}</span>
              <span className="text-[10px] text-[#94A3B8]">({activeScenario.actLabel})</span>
            </div>

            {/* Scenario Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#94A3B8]">Scenario:</span>
              <select
                value={activeScenarioId}
                onChange={(e) => {
                  setActiveScenarioId(e.target.value);
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className="bg-[#1E293B] text-xs font-mono text-[#38BDF8] border border-[#334155] rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
              >
                {TRACE_SCENARIOS.map((scen) => (
                  <option key={scen.id} value={scen.id}>
                    {scen.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step Controls & Progress Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center mb-3">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-400 font-bold">
                  Step {activeStep.step} of {activeScenario.steps.length}: {activeStep.title}
                </span>
                <span className="text-[#94A3B8]">
                  From <strong className="text-white uppercase">{activeStep.sourceZone}</strong> &rarr; Target{' '}
                  <strong className="text-white uppercase">{activeStep.targetZone}</strong>
                </span>
              </div>

              {/* Progress Steps Indicator */}
              <div className="grid grid-cols-6 gap-1 w-full h-2 bg-[#1E293B] rounded-full overflow-hidden p-0.5 border border-[#334155]">
                {activeScenario.steps.map((st, i) => (
                  <div
                    key={st.step}
                    onClick={() => {
                      setCurrentStepIndex(i);
                      setIsPlaying(false);
                    }}
                    className={`h-full rounded-full cursor-pointer transition-all ${
                      i === currentStepIndex
                        ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                        : i < currentStepIndex
                        ? 'bg-emerald-500'
                        : 'bg-[#334155]'
                    }`}
                    title={`Step ${st.step}: ${st.title}`}
                  />
                ))}
              </div>
            </div>

            {/* Playback Buttons */}
            <div className="lg:col-span-4 flex items-center justify-end gap-2">
              <button
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="p-1.5 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white disabled:opacity-40 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Auto'}</span>
              </button>

              <button
                onClick={handleNextStep}
                disabled={currentStepIndex === activeScenario.steps.length - 1}
                className="p-1.5 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white disabled:opacity-40 cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetTrace}
                className="p-1.5 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white cursor-pointer"
                title="Reset to Step 1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Step Technical Execution Callout */}
          <div className="bg-[#1E293B]/80 border border-[#334155] rounded p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-[#F1F5F9] font-bold">{activeStep.description}</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono">{activeStep.technicalDetail}</div>
              {activeStep.commandSnippet && (
                <div className="text-[10px] text-cyan-300/90 font-mono bg-[#0F172A] p-1.5 rounded border border-[#334155]/60 overflow-x-auto">
                  $ {activeStep.commandSnippet}
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center">
              <span
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border shadow-sm ${
                  activeStep.resultColor === 'red'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-red-500/10'
                    : activeStep.resultColor === 'emerald'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                    : activeStep.resultColor === 'purple'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                }`}
              >
                {activeStep.resultBadge}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN TOPOLOGY VIEWPORT WITH ALWAYS-VISIBLE LEGEND (CONSTRAINT A) */}
      {/* ========================================================================= */}
      <div className="relative grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* ALWAYS-VISIBLE PINNED LEGEND (CONSTRAINT A - NO TOOLTIP, NEVER HIDDEN) */}
        {/* ========================================================================= */}
        <aside className="xl:col-span-3 bg-[#1E293B] border border-[#334155] rounded-lg p-4 font-mono space-y-4 shadow-md h-fit xl:sticky xl:top-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#334155]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1F5F9] uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Topology Key & Legend</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Always Visible
            </span>
          </div>

          {/* Section 1: Numbered Traffic Order per Zone */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Sequential Traffic Order (1 &rarr; 4)</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2.5 p-2 rounded bg-[#0F172A] border border-red-500/30">
                <span className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500 text-red-400 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <div>
                  <strong className="text-red-400 block text-[10px]">Step 1: Zone 1 (Origin)</strong>
                  <span className="text-[10px] text-[#94A3B8]">Adversary station, C2 listeners, exploit tools</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded bg-[#0F172A] border border-cyan-500/30">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong className="text-cyan-300 block text-[10px]">Step 2: Zone 3 (Gateway)</strong>
                  <span className="text-[10px] text-[#94A3B8]">Front door reverse proxy, WAF, IDS & MFA</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded bg-[#0F172A] border border-purple-500/30">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <div>
                  <strong className="text-purple-300 block text-[10px]">Step 3: Zone 4 (SOC)</strong>
                  <span className="text-[10px] text-[#94A3B8]">Watchtower SIEM, Shuffle SOAR & MISP cluster</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded bg-[#0F172A] border border-amber-500/30">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
                <div>
                  <strong className="text-amber-300 block text-[10px]">Step 4: Zone 2 (Target)</strong>
                  <span className="text-[10px] text-[#94A3B8]">Protected AD domain, Win10 workstations, DB vault</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Kernel Isolation Boundary Style */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Isolation Boundary Style</div>
            <div className="p-2 rounded bg-purple-950/30 border-2 border-dashed border-purple-500/60 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-[10px] leading-relaxed">
                <strong className="text-purple-300 block font-bold">internal: true (Kernel Isolated)</strong>
                <span className="text-[#94A3B8]">
                  Zero host port bindings, isolated Docker bridge, no default internet gateway or outbound route.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Arrow & Line Styles */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Traffic & Edge Line Types</div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-0.5 bg-cyan-400 shrink-0 shadow-sm"></div>
                <span className="text-[#F1F5F9]">Solid Cyan: mTLS / HTTPS Inspected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-emerald-400 shrink-0"></div>
                <span className="text-[#F1F5F9]">Dashed Emerald: Internal Auth Query</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dotted border-purple-400 shrink-0"></div>
                <span className="text-[#F1F5F9]">Dotted Purple: Telemetry Stream (SIEM)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-1 bg-red-500 rounded-full shrink-0 flex items-center justify-center text-[7px] text-white">✕</div>
                <span className="text-red-300">Solid Red / ✕: Denied / Blocked Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-amber-400 shrink-0"></div>
                <span className="text-[#F1F5F9]">Dashed Amber: Blind-Routed Backend</span>
              </div>
            </div>
          </div>

          {/* Execution Order Cue */}
          <div className="bg-[#0B1120] p-3 rounded-lg border border-cyan-500/30 text-[10px] space-y-2 text-[#94A3B8]">
            <div className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Sequential Traffic Path (1 &rarr; 4):</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
                <span><strong className="text-red-400">Zone 1</strong>: Origin (Adversary)</span>
              </div>
              <div className="text-[9px] text-[#64748B] pl-6">&darr; Inbound HTTPS Requests (:443)</div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
                <span><strong className="text-cyan-300">Zone 3</strong>: Perimeter Gate & WAF</span>
              </div>
              <div className="text-[9px] text-[#64748B] pl-6">&darr; Security Logs & Telemetry Stream</div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[9px] font-bold flex items-center justify-center shrink-0">3</span>
                <span><strong className="text-purple-300">Zone 4</strong>: MSSP SOC SIEM & SOAR</span>
              </div>
              <div className="text-[9px] text-[#64748B] pl-6">&darr; Active Response Host-Drop / Access</div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[9px] font-bold flex items-center justify-center shrink-0">4</span>
                <span><strong className="text-amber-300">Zone 2</strong>: Enterprise Grid (Target)</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* TOPOLOGY NODES: ORDERED IN REAL TRAFFIC FLOW 1 &rarr; 2 &rarr; 3 &rarr; 4 (CONSTRAINT C) */}
        {/* ========================================================================= */}
        <div className="xl:col-span-9 space-y-4">
          {/* ========================================================================= */}
          {/* SEQUENTIAL TRAFFIC PATH NAVIGATOR (1 THROUGH 4: ORIGIN TO TARGET) */}
          {/* ========================================================================= */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3.5 shadow-md font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#334155]/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Sequential Traffic Path: Step 1 (Origin) &rarr; Step 4 (Target)
                </span>
              </div>
              <span className="text-[10px] text-[#94A3B8]">
                Click any step indicator to toggle and focus zone details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Step 1 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z1')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z1
                    ? 'bg-red-950/40 border-red-500 text-white shadow-sm ring-1 ring-red-500/50'
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-red-500/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 border-2 border-red-500 text-red-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-red-400 font-bold">1. Origin</div>
                  <div className="text-xs font-bold text-white truncate">Zone 1: Threatscape</div>
                  <div className="text-[10px] text-[#94A3B8] truncate">192.168.1.0/24 · Inbound</div>
                </div>
              </button>

              {/* Step 2 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z3')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z3
                    ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/50'
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-cyan-400/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-mono font-black text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-cyan-300 font-bold">2. Perimeter Gate</div>
                  <div className="text-xs font-bold text-white truncate">Zone 3: ZTA Gateway</div>
                  <div className="text-[10px] text-[#94A3B8] truncate">192.168.19.173 · Traefik/WAF</div>
                </div>
              </button>

              {/* Step 3 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z4')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z4
                    ? 'bg-purple-950/40 border-purple-400 text-white shadow-sm ring-1 ring-purple-400/50'
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-purple-400/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border-2 border-purple-400 text-purple-300 font-mono font-black text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-purple-300 font-bold">3. SOC & SOAR</div>
                  <div className="text-xs font-bold text-white truncate">Zone 4: MSSP SOC</div>
                  <div className="text-[10px] text-[#94A3B8] truncate">10.16.64.0/24 · Elastic/Wazuh</div>
                </div>
              </button>

              {/* Step 4 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z2')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z2
                    ? 'bg-amber-950/40 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/50'
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:border-amber-400/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-mono font-black text-sm flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-amber-300 font-bold">4. Target Enclave</div>
                  <div className="text-xs font-bold text-white truncate">Zone 2: Enterprise Grid</div>
                  <div className="text-[10px] text-[#94A3B8] truncate">192.168.20.0/24 · AD DS & PC</div>
                </div>
              </button>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* ZONE 1 CARD: FLOW 1 - ADVERSARY ORIGIN */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z1') && (
            <div
              className={`bg-[#1E293B] border-2 rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z1')
                  ? 'opacity-25 border-[#334155]'
                  : 'border-red-500/40 hover:border-red-500/70'
              }`}
            >
              {/* Summary Header (Collapsed-by-Default - Constraints B & D) */}
              <div
                onClick={() => toggleZone('z1')}
                className="p-4 bg-[#0F172A]/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  {/* Traffic Sequence Number 1 */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-400 font-mono font-black text-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                      1
                    </div>
                    <span className="text-[8px] font-mono font-bold tracking-wider text-red-400 uppercase mt-0.5">STEP 1</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                        Traffic Step 1 of 4: Attack Origin
                      </span>
                      <h3 className="text-sm font-bold text-red-400 font-mono flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-red-400" />
                        <span>Zone 1: Threatscape & Red Team Engine</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
                        192.168.1.0/24 (External Network)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#F1F5F9] font-sans font-medium">
                      This is the outside world and simulated adversary station where external traffic and attack attempts originate.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8]">
                    2 Virtual Appliances · 4 C2 & Exploit Tools
                  </span>
                  <div className="p-1 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white">
                    {expandedZones.z1 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail (Constraint B) */}
              {expandedZones.z1 && (
                <div className="p-4 border-t border-red-500/20 bg-[#0B1120] font-mono space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Node 1: Kali APT Station */}
                    <div
                      className={`p-3.5 rounded border transition-all ${
                        isTraceMode && activeStep.sourceNode === 'kali'
                          ? 'bg-red-950/40 border-red-400 shadow-md shadow-red-500/20 ring-1 ring-red-400'
                          : 'bg-[#1E293B] border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white flex items-center gap-2 text-xs">
                          <Terminal className="w-3.5 h-3.5 text-red-400" />
                          <span>Kali Linux APT Station</span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-mono">192.168.1.50</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-2 font-sans">
                        Primary adversarial offensive hub running automated scanners, exploit frameworks, and C2 listeners.
                      </p>
                      <div className="space-y-1 text-[10px] text-[#F1F5F9]/80 border-t border-[#334155]/60 pt-2">
                        <div>• <strong className="text-white">Sliver C2:</strong> Go-based C2 with mTLS/DNS listeners</div>
                        <div>• <strong className="text-white">sqlmap:</strong> Automated SQLi exploit engine</div>
                        <div>• <strong className="text-white">mimikatz:</strong> sekurlsa::logonpasswords LSASS memory dump</div>
                        <div>• <strong className="text-white">Burp Suite:</strong> Layer 7 HTTP payload crafting</div>
                      </div>
                    </div>

                    {/* Node 2: REMnux Sandbox */}
                    <div className="p-3.5 rounded border bg-[#1E293B] border-[#334155]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white flex items-center gap-2 text-xs">
                          <Cpu className="w-3.5 h-3.5 text-[#FBBF24]" />
                          <span>REMnux Malware Sandbox</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8] font-mono">Isolated Analysis</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-2 font-sans">
                        Reverse engineering and passive PCAP inspection station for artifacts gathered from the DMZ.
                      </p>
                      <div className="space-y-1 text-[10px] text-[#F1F5F9]/80 border-t border-[#334155]/60 pt-2">
                        <div>• <strong className="text-white">YARA Analysis:</strong> Pattern matching on dropped binaries</div>
                        <div>• <strong className="text-white">NetworkMiner:</strong> Passive traffic artifact extraction</div>
                        <div>• <strong className="text-white">exiftool & strings:</strong> Static header metadata inspection</div>
                      </div>
                    </div>
                  </div>

                  {/* Directional Connector to Next Stage */}
                  <div className="flex items-center justify-center gap-2 text-xs text-red-400/80 pt-2 border-t border-[#334155]/40">
                    <span>Adversary traffic traverses external network to perimeter gateway</span>
                    <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inter-Zone Traffic Flow Connector: Step 1 -> Step 2 */}
          {(filterZone === 'all') && (
            <div className="flex items-center justify-center gap-2 py-1 font-mono text-[11px]">
              <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent flex-1"></div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#0B1120] border border-cyan-500/40 text-cyan-300 flex items-center gap-2.5 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-[#94A3B8]">Inbound HTTPS / Exploits (:443)</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-white font-bold">Edge Reverse Proxy & Coraza WAF</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent flex-1"></div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ZONE 3 CARD: FLOW 2 - PERIMETER ENFORCEMENT & GATEWAY */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z3') && (
            <div
              className={`bg-[#1E293B] border-2 rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z3')
                  ? 'opacity-25 border-[#334155]'
                  : 'border-cyan-500/40 hover:border-cyan-500/70'
              }`}
            >
              {/* Summary Header (Collapsed-by-Default - Constraints B & D) */}
              <div
                onClick={() => toggleZone('z3')}
                className="p-4 bg-[#0F172A]/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  {/* Traffic Sequence Number 2 */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-mono font-black text-lg flex items-center justify-center shadow-lg shadow-cyan-400/20">
                      2
                    </div>
                    <span className="text-[8px] font-mono font-bold tracking-wider text-cyan-300 uppercase mt-0.5">STEP 2</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Traffic Step 2 of 4: Perimeter Gate & Sensors
                      </span>
                      <h3 className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span>Zone 3: Zero-Trust Access Gateway & Sensors</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
                        192.168.19.173 (Ubuntu 24.04 LTS Host)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#F1F5F9] font-sans font-medium">
                      This is the front door — every request is checked, authenticated, and filtered here before it reaches anything else.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#1E293B] border border-[#334155] text-cyan-300">
                    9 Containers · Dual Bridge Isolation · Coraza WAF
                  </span>
                  <div className="p-1 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white">
                    {expandedZones.z3 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail (Constraint B) */}
              {expandedZones.z3 && (
                <div className="p-4 border-t border-cyan-500/20 bg-[#0B1120] font-mono space-y-4">
                  {/* Segment 1: proxy_net (DMZ Segment) */}
                  <div className="p-3.5 rounded bg-[#1E293B]/60 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                        <Network className="w-3.5 h-3.5" />
                        <span>Network Segment 1: proxy_net (DMZ Bridge - 172.20.0.0/16)</span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">Public Ports Exposed: 80, 443</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Traefik */}
                      <div
                        className={`p-3 rounded border transition-all ${
                          isTraceMode && activeStep.targetNode === 'traefik'
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-md ring-1 ring-cyan-400'
                            : 'bg-[#0F172A] border-[#334155]'
                        }`}
                      >
                        <div className="font-bold text-cyan-300 text-[11px] mb-1">Traefik v3.6 Edge Router</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Ports: :80, :443 (TLS Termination)</div>
                          <div>• Certs: *.zerotrust.lan (Multi-SAN)</div>
                          <div>• Dynamic Forward-Auth Middleware</div>
                        </div>
                      </div>

                      {/* Coraza WAF */}
                      <div
                        className={`p-3 rounded border transition-all ${
                          isTraceMode && activeStep.targetNode === 'coraza'
                            ? 'bg-red-950/50 border-red-400 shadow-md ring-1 ring-red-400'
                            : 'bg-[#0F172A] border-[#334155]'
                        }`}
                      >
                        <div className="font-bold text-red-400 text-[11px] mb-1">Coraza WAF (Caddy + CRS)</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Port: :8080 (proxy_net only)</div>
                          <div>• Rules: OWASP Core Rule Set (CRS 942100)</div>
                          <div>• Action: Inline HTTP 403 Blocking</div>
                        </div>
                      </div>

                      {/* Suricata IDS */}
                      <div
                        className={`p-3 rounded border transition-all ${
                          isTraceMode && activeStep.targetNode === 'suricata'
                            ? 'bg-purple-950/40 border-purple-400 shadow-md ring-1 ring-purple-400'
                            : 'bg-[#0F172A] border-[#334155]'
                        }`}
                      >
                        <div className="font-bold text-purple-300 text-[11px] mb-1">Suricata IDS Container</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• 52,256 ET Open Signatures</div>
                          <div>• Promiscuous Sniffing on br_proxy</div>
                          <div>• Logs: /var/log/suricata/eve.json</div>
                        </div>
                      </div>

                      {/* Zeek NTA */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-[#F1F5F9] text-[11px] mb-1">Zeek NTA 5-Node Cluster</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Host Sensor on br_proxy, ens34, ens33</div>
                          <div>• Protocol Logs: conn, http, dns, ssl</div>
                          <div>• Shipped via Filebeat to minisoc1</div>
                        </div>
                      </div>

                      {/* Juice Shop Target */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-[#FBBF24] text-[11px] mb-1">OWASP Juice Shop (:3000)</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• URL: shop.zerotrust.lan</div>
                          <div>• Protected inline by Coraza WAF</div>
                          <div>• Target of Act II demo injection</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segment 2: auth_net with DISTINCT ISOLATION BOUNDARY (CONSTRAINT A) */}
                  <div className="p-3.5 rounded bg-purple-950/20 border-2 border-dashed border-purple-500/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Enclave Segment 2: auth_net [KERNEL ISOLATED — internal: true]</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Zero Host Ports Bound · No Internet Egress
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Authelia */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-emerald-400 text-[11px] mb-1">Authelia v4.39.20</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Port: :9091 (auth_net only)</div>
                          <div>• Argon2id: 64MB RAM, 3 iters</div>
                          <div>• Forward-Auth: /api/authz/forward-auth</div>
                          <div>• Session TTL: 72 Hours</div>
                        </div>
                      </div>

                      {/* Keycloak */}
                      <div
                        className={`p-3 rounded border transition-all ${
                          isTraceMode && activeStep.targetNode === 'keycloak'
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-md ring-1 ring-cyan-400'
                            : 'bg-[#0F172A] border-[#334155]'
                        }`}
                      >
                        <div className="font-bold text-cyan-300 text-[11px] mb-1">Keycloak v26.6.2 (Prod)</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Port: :8080 (auth_net only)</div>
                          <div>• Mode: start (plain production mode)</div>
                          <div>• OIDC Identity Provider & SSO</div>
                          <div>• Health: bash /dev/tcp port test</div>
                        </div>
                      </div>

                      {/* PostgreSQL */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-[#F1F5F9] text-[11px] mb-1">PostgreSQL 16 Vault</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Port: :5432 (auth_net only)</div>
                          <div>• Holds Keycloak & Authelia schemas</div>
                          <div>• Zero external host port binding</div>
                        </div>
                      </div>

                      {/* Redis */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-[#F1F5F9] text-[11px] mb-1">Redis 7 Session Cache</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Port: :6379 (auth_net only)</div>
                          <div>• Fast ticket & token session cache</div>
                          <div>• Protected memory storage</div>
                        </div>
                      </div>

                      {/* Mailpit */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-[#F1F5F9] text-[11px] mb-1">Mailpit SMTP Sinkhole</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Ports: :8025 (Dev/Test only)</div>
                          <div>• Sinks test activation links</div>
                          <div>• Health: wget command check</div>
                        </div>
                      </div>

                      {/* Portainer */}
                      <div className="p-3 rounded bg-[#0F172A] border border-[#334155]">
                        <div className="font-bold text-[#F1F5F9] text-[11px] mb-1">Portainer CE</div>
                        <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                          <div>• Port: :9000 (Internal only)</div>
                          <div>• Container management GUI</div>
                          <div>• Health: --version CLI check</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flow Directional Indicators */}
                  <div className="flex items-center justify-between text-xs text-cyan-300/80 pt-2 border-t border-[#334155]/40 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-400" />
                      <span>Telemetry flows to Zone 4 SOC via Filebeat (10.16.64.0/24)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sanitized requests forward to Zone 2 Enterprise Grid</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inter-Zone Traffic Flow Connector: Step 2 -> Step 3 */}
          {(filterZone === 'all') && (
            <div className="flex items-center justify-center gap-2 py-1 font-mono text-[11px]">
              <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent flex-1"></div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#0B1120] border border-purple-500/40 text-purple-300 flex items-center gap-2.5 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-[#94A3B8]">Zeek, Suricata & Access Logs</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center justify-center">3</span>
                <span className="text-white font-bold">Filebeat &rarr; Remote MSSP SOC Cluster</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent flex-1"></div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ZONE 4 CARD: FLOW 3 - MSSP SOC CLUSTER */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z4') && (
            <div
              className={`bg-[#1E293B] border-2 rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z4')
                  ? 'opacity-25 border-[#334155]'
                  : 'border-purple-500/40 hover:border-purple-500/70'
              }`}
            >
              {/* Summary Header (Collapsed-by-Default - Constraints B & D) */}
              <div
                onClick={() => toggleZone('z4')}
                className="p-4 bg-[#0F172A]/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  {/* Traffic Sequence Number 3 */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border-2 border-purple-400 text-purple-300 font-mono font-black text-lg flex items-center justify-center shadow-lg shadow-purple-400/20">
                      3
                    </div>
                    <span className="text-[8px] font-mono font-bold tracking-wider text-purple-300 uppercase mt-0.5">STEP 3</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        Traffic Step 3 of 4: Remote MSSP SOC & SOAR
                      </span>
                      <h3 className="text-sm font-bold text-purple-400 font-mono flex items-center gap-2">
                        <Server className="w-4 h-4 text-purple-400" />
                        <span>Zone 4: Remote MSSP SOC Cluster</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
                        10.16.64.0/24 (3-Node AlmaLinux 9 Enclave)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#F1F5F9] font-sans font-medium">
                      This is the watchtower and nerve center — analyzing all incoming logs in real time and automatically triggering defenses.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#1E293B] border border-[#334155] text-purple-300">
                    minisoc1/2/3 Split · Wazuh 4.7 · Shuffle SOAR
                  </span>
                  <div className="p-1 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white">
                    {expandedZones.z4 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail (Constraint B) */}
              {expandedZones.z4 && (
                <div className="p-4 border-t border-purple-500/20 bg-[#0B1120] font-mono space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Node 1: minisoc1 */}
                    <div
                      className={`p-3.5 rounded border transition-all ${
                        isTraceMode && activeStep.targetNode === 'minisoc1'
                          ? 'bg-purple-950/50 border-purple-400 shadow-md ring-1 ring-purple-400'
                          : 'bg-[#1E293B] border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white text-xs">minisoc1 (The Vault)</div>
                        <span className="text-[10px] text-cyan-300 font-mono">10.16.64.155</span>
                      </div>
                      <div className="text-[10px] text-purple-300 font-semibold mb-2">
                        Elasticsearch 8.19 (Native RPM & systemd)
                      </div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Port: :9200 (mTLS & basic auth)</div>
                        <div>• Ingests Traefik, Zeek, Suricata, Sysmon</div>
                        <div>• Indices: filebeat-*, wazuh-alerts-*</div>
                      </div>
                    </div>

                    {/* Node 2: minisoc2 */}
                    <div
                      className={`p-3.5 rounded border transition-all ${
                        isTraceMode && (activeStep.sourceNode === 'minisoc2' || activeStep.targetNode === 'minisoc2')
                          ? 'bg-purple-950/50 border-purple-400 shadow-md ring-1 ring-purple-400'
                          : 'bg-[#1E293B] border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white text-xs">minisoc2 (The Brain)</div>
                        <span className="text-[10px] text-cyan-300 font-mono">10.16.64.156</span>
                      </div>
                      <div className="text-[10px] text-purple-300 font-semibold mb-2">
                        Wazuh Manager 4.7 + Kibana Dashboards
                      </div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Ports: :1514 (Agent), :55000 (API), :443</div>
                        <div>• Custom local_rules.xml with MITRE IDs</div>
                        <div>• Generates webhook to Shuffle SOAR</div>
                      </div>
                    </div>

                    {/* Node 3: minisoc3 */}
                    <div
                      className={`p-3.5 rounded border transition-all ${
                        isTraceMode && (activeStep.sourceNode === 'minisoc3' || activeStep.targetNode === 'minisoc3')
                          ? 'bg-emerald-950/40 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                          : 'bg-[#1E293B] border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white text-xs">minisoc3 (The Executor)</div>
                        <span className="text-[10px] text-cyan-300 font-mono">10.16.64.157</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold mb-2">
                        Shuffle SOAR + MISP Threat Intel Stack
                      </div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Shuffle SOAR ("Mahoraga v2.1", :3001)</div>
                        <div>• MISP Split: core, modules, db, redis</div>
                        <div>• Active Response host-drop dispatcher</div>
                      </div>
                    </div>
                  </div>

                  {/* Flow Directional Indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-purple-400/80 pt-2 border-t border-[#334155]/40">
                    <span>Automated SOAR countermeasures route active responses back to Zone 3 and Zone 2</span>
                    <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inter-Zone Traffic Flow Connector: Step 3 -> Step 4 */}
          {(filterZone === 'all') && (
            <div className="flex items-center justify-center gap-2 py-1 font-mono text-[11px]">
              <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent flex-1"></div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#0B1120] border border-amber-500/40 text-amber-300 flex items-center gap-2.5 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center justify-center">3</span>
                <span className="text-[#94A3B8]">SOAR Countermeasures & Host-Drop</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center justify-center">4</span>
                <span className="text-white font-bold">Target Enterprise Enclave Isolation</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent flex-1"></div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ZONE 2 CARD: FLOW 4 - ENTERPRISE TARGET ASSETS */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z2') && (
            <div
              className={`bg-[#1E293B] border-2 rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z2')
                  ? 'opacity-25 border-[#334155]'
                  : 'border-amber-500/40 hover:border-amber-500/70'
              }`}
            >
              {/* Summary Header (Collapsed-by-Default - Constraints B & D) */}
              <div
                onClick={() => toggleZone('z2')}
                className="p-4 bg-[#0F172A]/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  {/* Traffic Sequence Number 4 */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-mono font-black text-lg flex items-center justify-center shadow-lg shadow-amber-400/20">
                      4
                    </div>
                    <span className="text-[8px] font-mono font-bold tracking-wider text-amber-300 uppercase mt-0.5">STEP 4</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Traffic Step 4 of 4: Protected Target Enclave
                      </span>
                      <h3 className="text-sm font-bold text-amber-300 font-mono flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-400" />
                        <span>Zone 2: Small Enterprise Domain Grid</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
                        aegis.corp (192.168.20.0/24 Subnet)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#F1F5F9] font-sans font-medium">
                      This is the protected inner vault containing corporate workstations, directory servers, and sensitive business data.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#1E293B] border border-[#334155] text-amber-300">
                    4 Target Virtual Machines · Windows AD · Customer PII
                  </span>
                  <div className="p-1 rounded bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white">
                    {expandedZones.z2 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail (Constraint B) */}
              {expandedZones.z2 && (
                <div className="p-4 border-t border-amber-500/20 bg-[#0B1120] font-mono space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* CORP-DC01 */}
                    <div className="p-3.5 rounded bg-[#1E293B] border border-[#334155]">
                      <div className="font-bold text-amber-300 text-xs mb-1">CORP-DC01 (Domain Controller)</div>
                      <div className="text-[10px] text-cyan-300 font-mono mb-2">192.168.20.10</div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Windows Server 2022 AD DS</div>
                        <div>• DNS, Kerberos, LDAP Server</div>
                        <div>• Wazuh Agent v4.7 installed</div>
                        <div>• Events: 4625, 4768, 4769</div>
                      </div>
                    </div>

                    {/* CORP-PC01 */}
                    <div
                      className={`p-3.5 rounded border transition-all ${
                        isTraceMode && (activeStep.sourceNode === 'corp-pc01' || activeStep.targetNode === 'corp-pc01')
                          ? 'bg-amber-950/50 border-amber-400 shadow-md ring-1 ring-amber-400'
                          : 'bg-[#1E293B] border-[#334155]'
                      }`}
                    >
                      <div className="font-bold text-amber-300 text-xs mb-1">CORP-PC01 ("Patient Zero")</div>
                      <div className="text-[10px] text-cyan-300 font-mono mb-2">192.168.20.100</div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Windows 10 Workstation</div>
                        <div>• Joined to domain aegis.corp</div>
                        <div>• Sysmon v15 (SwiftOnSecurity)</div>
                        <div>• Wazuh Agent v4.7 (Active Drop)</div>
                      </div>
                    </div>

                    {/* CORP-DB01 */}
                    <div className="p-3.5 rounded bg-[#1E293B] border border-[#334155]">
                      <div className="font-bold text-amber-300 text-xs mb-1">CORP-DB01 (Crown Jewel DB)</div>
                      <div className="text-[10px] text-cyan-300 font-mono mb-2">192.168.20.50</div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Ubuntu 22.04 LTS (PostgreSQL 14)</div>
                        <div>• Hosts "customers" PII table</div>
                        <div>• auditd FIM & Query Logging</div>
                        <div>• Wazuh Agent v4.7 monitoring</div>
                      </div>
                    </div>

                    {/* CORP-WEB01 */}
                    <div className="p-3.5 rounded bg-[#1E293B] border border-[#334155]">
                      <div className="font-bold text-amber-300 text-xs mb-1">CORP-WEB01 (Intranet Portal)</div>
                      <div className="text-[10px] text-cyan-300 font-mono mb-2">192.168.20.175</div>
                      <div className="space-y-1 text-[10px] text-[#94A3B8] border-t border-[#334155]/60 pt-2">
                        <div>• Ubuntu 22.04 Internal Intranet</div>
                        <div>• Departmental HR & Wiki App</div>
                        <div>• MFA protected via Authelia</div>
                        <div>• Wazuh Agent v4.7 monitoring</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
