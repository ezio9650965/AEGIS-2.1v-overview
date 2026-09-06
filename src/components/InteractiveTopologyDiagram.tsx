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
import { AegisNodeCard } from './AegisNodeCard';

export interface TopologyProps {
  initialExpandedZone?: 'all' | 'z1' | 'z2' | 'z3' | 'z4' | 'none';
  filterZone?: 'all' | 'z1' | 'z2' | 'z3' | 'z4';
  onZoneSelect?: (zoneId: string) => void;
  showTraceControls?: boolean;
}

interface TraceStep {
  step: number;
  title: string;
  flowType: 'primary' | 'telemetry' | 'response_loop';
  sourceNode: string;
  targetNode: string;
  sourceZone: 'z1' | 'z2' | 'z3' | 'z4';
  targetZone: 'z1' | 'z2' | 'z3' | 'z4';
  trafficType: 'blocked' | 'mtls' | 'internal' | 'telemetry' | 'blind' | 'response_loop';
  description: string;
  technicalDetail: string;
  commandSnippet?: string;
  resultBadge: string;
  resultColor: 'red' | 'emerald' | 'cyan' | 'purple' | 'amber';
  parallelTelemetry?: {
    sourceZone: 'z1' | 'z2' | 'z3' | 'z4';
    targetZone: 'z1' | 'z2' | 'z3' | 'z4';
    sourceNode: string;
    targetNode: string;
    label: string;
  };
  responseLoop?: {
    sourceZone: 'z4';
    targetZone: 'z3' | 'z2';
    sourceNode: string;
    targetNode: string;
    action: string;
  };
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
    description:
      'Adversary launches sqlmap; Coraza WAF terminates payload inline at Zone 3 gateway with HTTP 403; Suricata ships out-of-band telemetry to Zone 4 SOC; Shuffle SOAR triggers active response loop back to Zone 3 to blacklist the IP.',
    steps: [
      {
        step: 1,
        title: 'Primary Flow: Adversary sqlmap Injection Launch',
        flowType: 'primary',
        sourceNode: 'kali',
        targetNode: 'traefik',
        sourceZone: 'z1',
        targetZone: 'z3',
        trafficType: 'mtls',
        description:
          'Attacker launches automated sqlmap payload from Kali APT station targeting shop.zerotrust.lan across external network into Zone 3 edge.',
        technicalDetail:
          "GET /rest/products/search?q=' UNION SELECT id,email,password FROM Users-- HTTP/1.1 over TLS (SNI: shop.zerotrust.lan). First hop of Primary Path.",
        commandSnippet: 'sqlmap -u "https://shop.zerotrust.lan/rest/products/search?q=apple" --batch --dbs',
        resultBadge: 'Inbound Request (192.168.1.50)',
        resultColor: 'red',
      },
      {
        step: 2,
        title: 'Primary Flow: Coraza WAF OWASP CRS Inspection & Block',
        flowType: 'primary',
        sourceNode: 'traefik',
        targetNode: 'coraza',
        sourceZone: 'z3',
        targetZone: 'z3',
        trafficType: 'blocked',
        description:
          'Traefik terminates edge TLS; Coraza WAF matches OWASP CRS 942100 and terminates the request with HTTP 403. Access is DENIED at the gateway — payload NEVER enters Zone 2 Target Enclave.',
        technicalDetail:
          '[client 192.168.1.50] Coraza: Access denied with code 403 (phase 2). Match of "rx (?:union select)" at ARGS:q. Zone 2 Target Enclave is 100% untouched.',
        commandSnippet: 'HTTP/1.1 403 Forbidden\r\nContent-Type: text/html\r\n\r\n403 Forbidden - Zero Trust WAF Block',
        resultBadge: 'HTTP 403 Blocked (Zone 2 Safe)',
        resultColor: 'red',
      },
      {
        step: 3,
        title: 'Parallel Telemetry: IDS Flags Alert & Filebeat Ships to SOC',
        flowType: 'telemetry',
        sourceNode: 'suricata',
        targetNode: 'minisoc2',
        sourceZone: 'z3',
        targetZone: 'z4',
        trafficType: 'telemetry',
        description:
          'Out-of-band parallel telemetry: Suricata IDS on DMZ bridge flags ET Open SQLi rule (SID 2010021); Filebeat daemon asynchronously streams eve.json to minisoc2 Wazuh Manager and minisoc1 Elasticsearch.',
        technicalDetail:
          'Filebeat index: "suricata-eve-*" sent via Lumberjack protocol to 10.16.64.155:9200 and Wazuh Manager :1514. This is an out-of-band logging feed, NOT an in-line transit hop.',
        commandSnippet: "tail -f /var/log/suricata/eve.json | jq '.alert.signature'",
        resultBadge: 'Out-of-Band Telemetry Ingested',
        resultColor: 'purple',
      },
      {
        step: 4,
        title: 'Response Loop: Shuffle SOAR Active Response to Gateway',
        flowType: 'response_loop',
        sourceNode: 'minisoc3',
        targetNode: 'traefik',
        sourceZone: 'z4',
        targetZone: 'z3',
        trafficType: 'response_loop',
        description:
          'Active Response Loop: minisoc2 Wazuh fires Rule 100201; Shuffle SOAR ("Mahoraga v2.1") executes automated firewall-drop command BACK to Zone 3 Gateway to blacklist adversary IP in <12s.',
        technicalDetail:
          'Wazuh Active Response command executed BACK on Zone 3 perimeter edge: /var/ossec/active-response/bin/firewall-drop.sh add - 192.168.1.50 100201. Dedicated response loop, NOT transit access.',
        commandSnippet:
          'Wazuh AR Feedback Loop: POST /api/active-response -> firewall-drop.sh (192.168.1.50)',
        resultBadge: 'Attacker IP Banned (<12s Loop)',
        resultColor: 'emerald',
        responseLoop: {
          sourceZone: 'z4',
          targetZone: 'z3',
          sourceNode: 'minisoc3',
          targetNode: 'traefik',
          action: 'Dynamic Firewall IP Drop',
        },
      },
    ],
  },
  {
    id: 'legit-auth-access',
    name: 'Authorized Employee Access to Target Enclave',
    actLabel: 'Primary Request Path (3 Hops)',
    description:
      'Legitimate employee accesses internal target application; Zone 3 Gateway authenticates via Authelia/Keycloak and directly routes packet to Zone 2 Target Enclave (3 steps, bypassing SOC); Telemetry is concurrently shipped out-of-band to Zone 4 SOC.',
    steps: [
      {
        step: 1,
        title: 'Primary Step 1: Corporate Request Arrives at Gateway',
        flowType: 'primary',
        sourceNode: 'kali',
        targetNode: 'traefik',
        sourceZone: 'z1',
        targetZone: 'z3',
        trafficType: 'mtls',
        description:
          'Authenticated remote employee connects to intranet.zerotrust.lan over HTTPS TLS 1.3 arriving at Zone 3 Traefik perimeter edge (:443).',
        technicalDetail:
          'Inbound HTTPS GET /hr/portal HTTP/1.1 (SNI: intranet.zerotrust.lan) with corporate TLS certificate. Hop 1 of Primary Request Path.',
        commandSnippet: 'curl -k -H "Host: intranet.zerotrust.lan" https://192.168.19.173:443/',
        resultBadge: 'Inbound Ingress (:443)',
        resultColor: 'cyan',
      },
      {
        step: 2,
        title: 'Primary Step 2: Gateway Forward-Auth & MFA Verification',
        flowType: 'primary',
        sourceNode: 'traefik',
        targetNode: 'authelia',
        sourceZone: 'z3',
        targetZone: 'z3',
        trafficType: 'internal',
        description:
          'Traefik evaluates Forward-Auth against Authelia v4.39 and validates Keycloak 26 OIDC session token in isolated auth_net bridge. Identity and group RBAC are validated.',
        technicalDetail:
          'Authelia Argon2id session verified in Redis; Keycloak confirms user "ezio" belongs to "corp-finance" role. Traefik receives HTTP 200 OK authorization header.',
        commandSnippet: 'POST /api/authz HTTP/1.1 -> 200 OK (Remote-User: ezio, Realm: aegis.corp)',
        resultBadge: 'Access Authorized (MFA Validated)',
        resultColor: 'emerald',
      },
      {
        step: 3,
        title: 'Primary Step 3: Direct Routing to Zone 2 Target Enclave',
        flowType: 'primary',
        sourceNode: 'traefik',
        targetNode: 'corp-web01',
        sourceZone: 'z3',
        targetZone: 'z2',
        trafficType: 'internal',
        description:
          'Direct Enclave Routing: Traefik proxies authorized transaction DIRECTLY to Zone 2 CORP-WEB01 (192.168.20.175). Traffic flows directly into target enclave without passing through the SOC.',
        technicalDetail:
          'Traefik proxy connection established directly to 192.168.20.175:80. The SOC (Zone 4) does NOT sit in the access path; entry is granted exclusively by Zone 3 Gateway.',
        commandSnippet: 'Reverse Proxy: 192.168.19.173 -> 192.168.20.175:80 (CORP-WEB01 Direct Ingress)',
        resultBadge: 'Target Reached (Direct Transit)',
        resultColor: 'emerald',
        parallelTelemetry: {
          sourceZone: 'z3',
          targetZone: 'z4',
          sourceNode: 'traefik',
          targetNode: 'minisoc1',
          label: 'Access logs & Zeek conn.log shipped out-of-band to Elasticsearch (minisoc1)',
        },
      },
    ],
  },
  {
    id: 'mimikatz-edr',
    name: 'Mimikatz LSASS Dump & EDR Host Isolation',
    actLabel: 'Act III Internal Threat & Active Response',
    description:
      'Workstation CORP-PC01 in Zone 2 executes mimikatz; Sysmon v15 & Wazuh Agent asynchronously stream telemetry out-of-band to Zone 4 SOC; Shuffle SOAR executes response loop back to Zone 2 to isolate the host and Zone 3 to revoke SSO tokens.',
    steps: [
      {
        step: 1,
        title: 'Endpoint Threat: Mimikatz LSASS Injection on Patient Zero',
        flowType: 'primary',
        sourceNode: 'corp-pc01',
        targetNode: 'corp-pc01',
        sourceZone: 'z2',
        targetZone: 'z2',
        trafficType: 'blocked',
        description:
          'Compromised internal workstation CORP-PC01 (192.168.20.100) executes mimikatz privilege escalation attempting to harvest domain credentials from memory.',
        technicalDetail:
          'Event ID 10 (ProcessAccess) in Sysmon v15: Source mimikatz.exe -> Target lsass.exe with GrantedAccess 0x1010 on CORP-PC01.',
        commandSnippet: 'privilege::debug sekurlsa::logonpasswords',
        resultBadge: 'LSASS Access Flagged',
        resultColor: 'red',
      },
      {
        step: 2,
        title: 'Parallel Telemetry: Wazuh Agent Ships EDR Alert to SOC',
        flowType: 'telemetry',
        sourceNode: 'corp-pc01',
        targetNode: 'minisoc2',
        sourceZone: 'z2',
        targetZone: 'z4',
        trafficType: 'telemetry',
        description:
          'Zone 2 endpoint agent (Wazuh Agent 002) asynchronously streams Sysmon Event ID 10 via TLS :1514 to minisoc2 Wazuh Manager. This is an out-of-band EDR stream into the SOC.',
        technicalDetail:
          'Wazuh Rule 92654: "Sysmon - Event 10: Process accessed lsass.exe" MITRE ATT&CK T1003.001 Level 12 Alert indexed to minisoc1 Elasticsearch.',
        commandSnippet: '/var/ossec/bin/wazuh-control status && GET /wazuh-alerts-4.x-*/_count',
        resultBadge: 'EDR Telemetry Streamed',
        resultColor: 'purple',
      },
      {
        step: 3,
        title: 'Response Loop: Shuffle SOAR Host Isolation & Token Revoke',
        flowType: 'response_loop',
        sourceNode: 'minisoc3',
        targetNode: 'corp-pc01',
        sourceZone: 'z4',
        targetZone: 'z2',
        trafficType: 'response_loop',
        description:
          'Active Response Loop: minisoc3 Shuffle SOAR dispatches "host-drop" script BACK to Zone 2 CORP-PC01 to sever its network adapter in <47s, while calling Keycloak REST API (Zone 3) to invalidate active SSO sessions.',
        technicalDetail:
          'Wazuh AR: "host-drop" on agent 002 (192.168.20.100) severs NIC -> POST /admin/realms/aegis/users/{id}/logout invalidates Keycloak token. Response loops back to endpoints, NOT access-granting hops.',
        commandSnippet:
          'Shuffle SOAR Loop: [minisoc3] -> Wazuh AR host-drop [CORP-PC01] + Keycloak Revoke [Zone 3]',
        resultBadge: 'Host Isolated & Tokens Revoked (<47s)',
        resultColor: 'emerald',
        responseLoop: {
          sourceZone: 'z4',
          targetZone: 'z2',
          sourceNode: 'minisoc3',
          targetNode: 'corp-pc01',
          action: 'Host-Drop NIC Sever & SSO Revoke',
        },
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

  const activeScenario =
    TRACE_SCENARIOS.find((s) => s.id === activeScenarioId) || TRACE_SCENARIOS[0];
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
      }, 3400);
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
  // Supports highlighting Primary Path and Parallel Telemetry or Response Loop simultaneously
  const isNodeActive = (nodeId: string) => {
    if (!isTraceMode) return true;
    if (activeStep.sourceNode === nodeId || activeStep.targetNode === nodeId) return true;
    if (activeStep.parallelTelemetry && (activeStep.parallelTelemetry.sourceNode === nodeId || activeStep.parallelTelemetry.targetNode === nodeId)) return true;
    if (activeStep.responseLoop && (activeStep.responseLoop.sourceNode === nodeId || activeStep.responseLoop.targetNode === nodeId)) return true;
    return false;
  };

  const isZoneActive = (zoneKey: string) => {
    if (!isTraceMode) return true;
    if (activeStep.sourceZone === zoneKey || activeStep.targetZone === zoneKey) return true;
    if (activeStep.parallelTelemetry && (activeStep.parallelTelemetry.sourceZone === zoneKey || activeStep.parallelTelemetry.targetZone === zoneKey)) return true;
    if (activeStep.responseLoop && (activeStep.responseLoop.sourceZone === zoneKey || activeStep.responseLoop.targetZone === zoneKey)) return true;
    return false;
  };

  return (
    <div className="space-y-4 font-mono text-[13px] text-[#c9d1d9]">
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR & CONTROLS: TRACE MODE + EXPAND/COLLAPSE ALL */}
      {/* ========================================================================= */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00d4ff] pulse-indicator-cy"></span>
            <span className="font-mono font-bold text-[#c9d1d9] text-xs tracking-wide">
              AEGIS v2.1 Interactive SVG Topology
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded bg-[#21262d] border border-[#30363d]">
            <span className="font-bold text-[#c9d1d9] uppercase tracking-wider">Primary Path:</span>
            <span className="text-[#ff3366] font-bold">① Zone 1 (Origin)</span>
            <span className="text-[#8b949e]">&rarr;</span>
            <span className="text-[#00d4ff] font-bold">② Zone 3 (Gateway)</span>
            <span className="text-[#8b949e]">&rarr;</span>
            <span className="text-[#ffb700] font-bold">③ Zone 2 (Target)</span>
            <span className="text-[#30363d] mx-1">|</span>
            <span className="text-[#bd93f9] font-bold">⇶ Zone 4 SOC (Parallel Telemetry & SOAR Loop ↺)</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Trace a Request Toggle */}
          {showTraceControls && (
            <button
              onClick={toggleTraceMode}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isTraceMode
                  ? 'bg-[rgba(255,51,102,0.13)] text-[#ff3366] border border-[#ff3366] ring-1 ring-[#ff3366]/50 shadow-[0_0_10px_rgba(255,51,102,0.3)]'
                  : 'bg-[#21262d] text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[rgba(0,212,255,0.13)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isTraceMode ? 'Exit Trace Mode' : 'Trace a Request Mode'}</span>
            </button>
          )}

          {/* Expand / Collapse All Controls */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-0.5 rounded border border-[#30363d] font-mono text-[11px]">
            <button
              onClick={expandAll}
              className="px-2 py-1 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-[#30363d]">|</span>
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors cursor-pointer"
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
        activeScenarioId={activeScenarioId}
        onScenarioChange={(newId) => {
          setActiveScenarioId(newId);
          setCurrentStepIndex(0);
          setIsPlaying(false);
        }}
      />

      {/* ========================================================================= */}
      {/* 3. TRACE A REQUEST PLAYBACK CONSOLE (TECHNICAL DEEP DIVE) */}
      {/* ========================================================================= */}
      {isTraceMode && (
        <div className="bg-[#161b22] border-2 border-[#ff3366]/50 rounded-lg p-4 font-mono shadow-xl transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#30363d] mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[rgba(255,51,102,0.13)] text-[#ff3366] font-bold text-[10px] uppercase border border-[#ff3366]/40">
                Active Simulation Trace
              </span>
              <span className="text-[#c9d1d9] font-bold text-xs">{activeScenario.name}</span>
              <span className="text-[10px] text-[#8b949e]">({activeScenario.actLabel})</span>

              {/* Distinct Flow Type Pill */}
              {activeStep.flowType === 'primary' && (
                <span className="px-2 py-0.5 rounded bg-[rgba(0,212,255,0.13)] text-[#00d4ff] font-bold text-[10px] uppercase border border-[#00d4ff]/40 flex items-center gap-1">
                  <span>Primary Request Path</span>
                </span>
              )}
              {activeStep.flowType === 'telemetry' && (
                <span className="px-2 py-0.5 rounded bg-[rgba(189,147,249,0.13)] text-[#bd93f9] font-bold text-[10px] uppercase border border-[#bd93f9]/40 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#bd93f9]" />
                  <span>Parallel Out-of-Band Telemetry</span>
                </span>
              )}
              {activeStep.flowType === 'response_loop' && (
                <span className="px-2 py-0.5 rounded bg-[rgba(0,255,65,0.13)] text-[#00ff41] font-bold text-[10px] uppercase border border-[#00ff41]/40 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-[#00ff41]" />
                  <span>Active Defense Response Loop</span>
                </span>
              )}
            </div>

            {/* Scenario Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8b949e]">Scenario:</span>
              <select
                value={activeScenarioId}
                onChange={(e) => {
                  setActiveScenarioId(e.target.value);
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className="bg-[#21262d] text-xs font-mono text-[#00d4ff] border border-[#30363d] rounded px-2.5 py-1 focus:outline-none focus:border-[#00d4ff]"
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
                <span className="text-[#00d4ff] font-bold">
                  Step {activeStep.step} of {activeScenario.steps.length}: {activeStep.title}
                </span>
                <span className="text-[#8b949e]">
                  From <strong className="text-[#c9d1d9] uppercase">{activeStep.sourceZone}</strong> &rarr; Target{' '}
                  <strong className="text-[#c9d1d9] uppercase">{activeStep.targetZone}</strong>
                </span>
              </div>

              {/* Progress Steps Indicator */}
              <div className="grid grid-cols-6 gap-1 w-full h-2 bg-[#21262d] rounded-full overflow-hidden p-0.5 border border-[#30363d]">
                {activeScenario.steps.map((st, i) => (
                  <div
                    key={st.step}
                    onClick={() => {
                      setCurrentStepIndex(i);
                      setIsPlaying(false);
                    }}
                    className={`h-full rounded-full cursor-pointer transition-all ${
                      i === currentStepIndex
                        ? 'bg-[#00d4ff] shadow-sm shadow-[#00d4ff]/50'
                        : i < currentStepIndex
                        ? 'bg-[#00ff41]'
                        : 'bg-[#30363d]'
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
                className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] disabled:opacity-30 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isPlaying
                    ? 'bg-[rgba(255,183,0,0.13)] text-[#ffb700] border border-[#ffb700]/40'
                    : 'bg-[rgba(0,255,65,0.13)] text-[#00ff41] border border-[#00ff41]/40'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Auto'}</span>
              </button>

              <button
                onClick={handleNextStep}
                disabled={currentStepIndex === activeScenario.steps.length - 1}
                className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] disabled:opacity-30 cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetTrace}
                className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] cursor-pointer"
                title="Reset to Step 1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Step Technical Execution Callout */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs space-y-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[#c9d1d9] font-bold">{activeStep.description}</span>
                </div>
                <div className="text-[11px] text-[#8b949e] font-mono">{activeStep.technicalDetail}</div>
                {activeStep.commandSnippet && (
                  <div className="text-[10px] text-[#00d4ff] font-mono bg-[#161b22] p-1.5 rounded border border-[#30363d] overflow-x-auto">
                    $ {activeStep.commandSnippet}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center">
                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border shadow-sm ${
                    activeStep.resultColor === 'red'
                      ? 'bg-[rgba(255,51,102,0.13)] text-[#ff3366] border-[#ff3366]/40'
                      : activeStep.resultColor === 'emerald'
                      ? 'bg-[rgba(0,255,65,0.13)] text-[#00ff41] border-[#00ff41]/40'
                      : activeStep.resultColor === 'purple'
                      ? 'bg-[rgba(189,147,249,0.13)] text-[#bd93f9] border-[#bd93f9]/40'
                      : 'bg-[rgba(0,212,255,0.13)] text-[#00d4ff] border-[#00d4ff]/40'
                  }`}
                >
                  {activeStep.resultBadge}
                </span>
              </div>
            </div>

            {/* Concurrent Parallel Telemetry Callout */}
            {activeStep.parallelTelemetry && (
              <div className="p-2 rounded bg-[rgba(189,147,249,0.08)] border border-[#bd93f9]/40 text-[11px] text-[#bd93f9] flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#bd93f9] shrink-0 animate-pulse" />
                <span>
                  <strong>Parallel Out-of-Band Telemetry Stream:</strong> {activeStep.parallelTelemetry.label} (Non-blocking, SOC does not sit in transit path)
                </span>
              </div>
            )}

            {/* Active Response Loop Callout */}
            {activeStep.responseLoop && (
              <div className="p-2 rounded bg-[rgba(0,255,65,0.08)] border border-[#00ff41]/40 text-[11px] text-[#00ff41] flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-[#00ff41] shrink-0 animate-pulse" />
                <span>
                  <strong>Active Defense Response Loop:</strong> {activeStep.responseLoop.action} dispatched from Zone 4 SOAR back to {activeStep.responseLoop.targetZone.toUpperCase()} (Countermeasure loop, NOT transit access)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN TOPOLOGY VIEWPORT WITH ALWAYS-VISIBLE LEGEND */}
      {/* ========================================================================= */}
      <div className="relative grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* ALWAYS-VISIBLE PINNED LEGEND */}
        {/* ========================================================================= */}
        <aside className="xl:col-span-3 bg-[#161b22] border border-[#30363d] rounded-lg p-4 font-mono space-y-4 shadow-md h-fit xl:sticky xl:top-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#c9d1d9] uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>Topology Key & Legend</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.13)] text-[#00d4ff] border border-[#00d4ff]/30 font-bold uppercase tracking-wider">
              Key
            </span>
          </div>

          {/* Section 1: Two Distinct Traffic Flows */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
              Distinct Traffic Flows (Primary vs Out-of-Band)
            </div>
            <div className="space-y-1.5 text-[11px]">
              {/* Primary Path 1 */}
              <div className="p-2 rounded bg-[#0d1117] border border-[#ff3366]/40">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-4 h-4 rounded-full bg-[rgba(255,51,102,0.13)] border border-[#ff3366] text-[#ff3366] font-bold text-[9px] flex items-center justify-center shrink-0">1</span>
                  <strong className="text-[#ff3366] text-[10px]">Primary Step 1: Zone 1 (Origin)</strong>
                </div>
                <span className="text-[10px] text-[#8b949e] block pl-6">Adversary station, external client, C2 listeners</span>
              </div>

              {/* Primary Path 2 */}
              <div className="p-2 rounded bg-[#0d1117] border border-[#00d4ff]/40">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-4 h-4 rounded-full bg-[rgba(0,212,255,0.13)] border border-[#00d4ff] text-[#00d4ff] font-bold text-[9px] flex items-center justify-center shrink-0">2</span>
                  <strong className="text-[#00d4ff] text-[10px]">Primary Step 2: Zone 3 (Gateway)</strong>
                </div>
                <span className="text-[10px] text-[#8b949e] block pl-6">Inspects (WAF), Authenticates (Authelia/MFA), Authorizes</span>
              </div>

              {/* Primary Path 3 */}
              <div className="p-2 rounded bg-[#0d1117] border border-[#ffb700]/40">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-4 h-4 rounded-full bg-[rgba(255,183,0,0.13)] border border-[#ffb700] text-[#ffb700] font-bold text-[9px] flex items-center justify-center shrink-0">3</span>
                  <strong className="text-[#ffb700] text-[10px]">Primary Step 3: Zone 2 (Target)</strong>
                </div>
                <span className="text-[10px] text-[#8b949e] block pl-6">Direct destination once access is granted (Zero SOC transit)</span>
              </div>

              {/* Out-of-Band Telemetry Branch */}
              <div className="p-2 rounded bg-[rgba(189,147,249,0.08)] border border-[#bd93f9]/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-4 h-4 rounded-full bg-[rgba(189,147,249,0.13)] border border-[#bd93f9] text-[#bd93f9] font-bold text-[9px] flex items-center justify-center shrink-0">⇶</span>
                  <strong className="text-[#bd93f9] text-[10px]">Parallel Telemetry Stream</strong>
                </div>
                <span className="text-[10px] text-[#8b949e] block pl-6">Zone 3 Sensors & Zone 2 EDR ship logs out-of-band to Zone 4 SOC</span>
              </div>

              {/* Response Loop */}
              <div className="p-2 rounded bg-[rgba(0,255,65,0.08)] border border-[#00ff41]/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-4 h-4 rounded-full bg-[rgba(0,255,65,0.13)] border border-[#00ff41] text-[#00ff41] font-bold text-[9px] flex items-center justify-center shrink-0">↺</span>
                  <strong className="text-[#00ff41] text-[10px]">SOAR Active Response Loop</strong>
                </div>
                <span className="text-[10px] text-[#8b949e] block pl-6">Zone 4 SOAR dispatches firewall-drop / host-drop back to Zone 3 / Zone 2</span>
              </div>
            </div>
          </div>

          {/* Section 2: Kernel Isolation Boundary Style */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Isolation Boundary Style</div>
            <div className="p-2 rounded bg-[rgba(189,147,249,0.08)] border-2 border-dashed border-[#bd93f9]/60 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-[#bd93f9] shrink-0 mt-0.5" />
              <div className="text-[10px] leading-relaxed">
                <strong className="text-[#bd93f9] block font-bold">internal: true (Kernel Isolated)</strong>
                <span className="text-[#8b949e]">
                  Zero host port bindings, isolated Docker bridge, no default internet gateway or outbound route.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Arrow & Line Styles */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Traffic & Edge Line Types</div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-0.5 bg-[#00d4ff] shrink-0 shadow-sm"></div>
                <span className="text-[#c9d1d9]">Solid Cyan: mTLS / Primary Ingress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-[#ffb700] shrink-0"></div>
                <span className="text-[#ffb700]">Dashed Amber: Direct Verified Enclave Transit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dotted border-[#bd93f9] shrink-0"></div>
                <span className="text-[#bd93f9]">Dotted Purple: Out-of-Band Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-[#00ff41] shrink-0"></div>
                <span className="text-[#00ff41]">Dashed Green: SOAR Active Response Loop</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-1 bg-[#ff3366] rounded-full shrink-0 flex items-center justify-center text-[7px] text-white">✕</div>
                <span className="text-[#ff3366]">Solid Red / ✕: Denied / Blocked Path</span>
              </div>
            </div>
          </div>

          {/* Architectural Distinction Cue */}
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] text-[10px] space-y-2 text-[#8b949e]">
            <div className="text-[#00d4ff] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"></span>
              <span>Architectural Ground Truth:</span>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] leading-relaxed">
              <p className="text-[#c9d1d9]">
                <strong className="text-[#00d4ff]">Primary Request Flow (3 Steps):</strong> Zone 1 &rarr; Zone 3 &rarr; Zone 2. Gateway terminates TLS, authenticates identity, and routes directly to target enclave.
              </p>
              <p className="text-[#bd93f9]">
                <strong className="text-[#bd93f9]">SOC (Zone 4) is NOT in-line:</strong> Sensors and agents ship telemetry out-of-band; SOAR countermeasure is a feedback loop ↺, not access verification.
              </p>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* TOPOLOGY NODES & INTER-ZONE FLOWS */}
        {/* ========================================================================= */}
        <div className="xl:col-span-9 space-y-4">
          {/* ========================================================================= */}
          {/* SEQUENTIAL TRAFFIC PATH NAVIGATOR: PRIMARY PATH (3 STEPS) + PARALLEL SOC */}
          {/* ========================================================================= */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 shadow-md font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00d4ff] pulse-indicator-cy"></span>
                <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-wider">
                  Primary Request Path (3 Hops) & Out-of-Band SOC Operations
                </span>
              </div>
              <span className="text-[10px] text-[#8b949e]">
                Click any zone card to toggle and focus component details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Primary Step 1 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z1')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z1
                    ? 'bg-[rgba(255,51,102,0.13)] border-[#ff3366] text-[#c9d1d9] shadow-sm ring-1 ring-[#ff3366]/50'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#ff3366]/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[rgba(255,51,102,0.13)] border-2 border-[#ff3366] text-[#ff3366] font-mono font-black text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-[#ff3366] font-bold">1. Origin</div>
                  <div className="text-xs font-bold text-[#c9d1d9] truncate">Zone 1: Threatscape</div>
                  <div className="text-[10px] text-[#8b949e] truncate">192.168.1.0/24 · Inbound</div>
                </div>
              </button>

              {/* Primary Step 2 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z3')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z3
                    ? 'bg-[rgba(0,212,255,0.13)] border-[#00d4ff] text-[#c9d1d9] shadow-sm ring-1 ring-[#00d4ff]/50'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#00d4ff]/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,255,0.13)] border-2 border-[#00d4ff] text-[#00d4ff] font-mono font-black text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-[#00d4ff] font-bold">2. Gateway & Auth</div>
                  <div className="text-xs font-bold text-[#c9d1d9] truncate">Zone 3: ZTA Gateway</div>
                  <div className="text-[10px] text-[#8b949e] truncate">192.168.19.173 · Traefik/WAF</div>
                </div>
              </button>

              {/* Primary Step 3 Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z2')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z2
                    ? 'bg-[rgba(255,183,0,0.13)] border-[#ffb700] text-[#c9d1d9] shadow-sm ring-1 ring-[#ffb700]/50'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#ffb700]/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[rgba(255,183,0,0.13)] border-2 border-[#ffb700] text-[#ffb700] font-mono font-black text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-[#ffb700] font-bold">3. Target Enclave</div>
                  <div className="text-xs font-bold text-[#c9d1d9] truncate">Zone 2: Enterprise Grid</div>
                  <div className="text-[10px] text-[#8b949e] truncate">192.168.20.0/24 · Direct Dest</div>
                </div>
              </button>

              {/* Out-of-Band SOC & SOAR Indicator */}
              <button
                type="button"
                onClick={() => toggleZone('z4')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  expandedZones.z4
                    ? 'bg-[rgba(189,147,249,0.13)] border-[#bd93f9] text-[#c9d1d9] shadow-sm ring-1 ring-[#bd93f9]/50'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#bd93f9]/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[rgba(189,147,249,0.13)] border-2 border-[#bd93f9] text-[#bd93f9] font-mono font-black text-xs flex items-center justify-center shrink-0">
                  SOC
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-[#bd93f9] font-bold">Out-of-Band SOC</div>
                  <div className="text-xs font-bold text-[#c9d1d9] truncate">Zone 4: MSSP Cluster</div>
                  <div className="text-[10px] text-[#8b949e] truncate">10.16.64.0/24 · Telemetry/SOAR</div>
                </div>
              </button>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* ZONE 1 CARD: FLOW 1 - ADVERSARY ORIGIN */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z1') && (
            <div
              className={`bg-[#161b22] border border-[#30363d] border-t-4 border-t-[#ff3366] rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z1') ? 'opacity-20' : 'opacity-100'
              }`}
            >
              {/* Pinned Monospace Zone Tag */}
              <div className="bg-[rgba(255,51,102,0.08)] border-b border-[#30363d] px-4 py-1.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#ff3366] tracking-wider uppercase">
                  🔴 ZONE 1 — THREATSCAPE · INTERNET
                </span>
                <span className="text-[9px] text-[#8b949e]">TRAFFIC STEP 1</span>
              </div>

              {/* Summary Header (Collapsed-by-Default) */}
              <div
                onClick={() => toggleZone('z1')}
                className="p-4 bg-[#161b22] hover:bg-[#21262d] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none transition-colors"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(255,51,102,0.13)] border-2 border-[#ff3366] text-[#ff3366] font-mono font-black text-lg flex items-center justify-center shadow-lg">
                      1
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xs font-bold text-[#c9d1d9] font-mono flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#ff3366]" />
                        <span>Zone 1: Threatscape & Red Team Engine</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                        192.168.1.0/24 (External Network)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#8b949e]">
                      This is the outside world and simulated adversary station where external traffic and attack attempts originate.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e]">
                    2 Appliances · 4 C2 & Exploit Tools
                  </span>
                  <div className="p-1 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]">
                    {expandedZones.z1 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail */}
              {expandedZones.z1 && (
                <div className="p-4 border-t border-[#30363d] bg-[#0d1117] font-mono space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Node 1: Kali Linux APT */}
                    <AegisNodeCard
                      name="Kali Linux APT Station"
                      categoryColor="rd"
                      icon={<Terminal className="w-4 h-4" />}
                      ipAddress="192.168.1.50"
                      portBadges={[{ port: ':443/80', isExposed: true }]}
                      statusBadge={{ label: 'ACTIVE THREAT', isHealthy: false }}
                      facts={[
                        'Sliver C2: Go-based C2 with mTLS/DNS listeners',
                        'sqlmap: Automated SQLi exploit engine',
                        'mimikatz: LSASS memory credential dump',
                        'Burp Suite: Layer 7 HTTP payload crafting',
                      ]}
                      isActiveInTrace={isNodeActive('kali')}
                      isDimmed={isTraceMode && !isNodeActive('kali')}
                    />

                    {/* Node 2: REMnux Sandbox */}
                    <AegisNodeCard
                      name="REMnux Malware Sandbox"
                      categoryColor="am"
                      icon={<Cpu className="w-4 h-4" />}
                      ipAddress="Airgapped Analysis"
                      portBadges={[{ port: 'AIRGAPPED', isExposed: false }]}
                      statusBadge={{ label: 'ISOLATED LAB', isHealthy: true }}
                      facts={[
                        'YARA Analysis: Pattern matching on dropped binaries',
                        'NetworkMiner: Passive traffic artifact extraction',
                        'exiftool & strings: Static header metadata inspection',
                        'Zero external egress allowed by hypervisor',
                      ]}
                      isActiveInTrace={isNodeActive('remnux')}
                      isDimmed={isTraceMode && !isNodeActive('remnux')}
                    />
                  </div>

                  {/* Directional Connector to Next Stage */}
                  <div className="flex items-center justify-center gap-2 text-xs text-[#ff3366] pt-2 border-t border-[#30363d]">
                    <span>Adversary traffic traverses external network to perimeter gateway</span>
                    <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inter-Zone Traffic Flow Connector: Step 1 -> Step 2 */}
          {filterZone === 'all' && (
            <div className="flex items-center justify-center gap-2 py-1 font-mono text-[11px]">
              <div className="h-px bg-gradient-to-r from-transparent via-[#30363d] to-transparent flex-1"></div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#161b22] border border-[#00d4ff]/40 text-[#00d4ff] flex items-center gap-2.5 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-[rgba(255,51,102,0.13)] text-[#ff3366] text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-[#8b949e]">Inbound HTTPS / Exploits (:443)</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#00d4ff] animate-pulse" />
                <span className="w-4 h-4 rounded-full bg-[rgba(0,212,255,0.13)] text-[#00d4ff] text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-[#c9d1d9] font-bold">Edge Reverse Proxy & Coraza WAF</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#30363d] to-transparent flex-1"></div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ZONE 3 CARD: FLOW 2 - PERIMETER ENFORCEMENT & GATEWAY */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z3') && (
            <div
              className={`bg-[#161b22] border border-[#30363d] border-t-4 border-t-[#00d4ff] rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z3') ? 'opacity-20' : 'opacity-100'
              }`}
            >
              {/* Pinned Monospace Zone Tag */}
              <div className="bg-[rgba(0,212,255,0.08)] border-b border-[#30363d] px-4 py-1.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#00d4ff] tracking-wider uppercase">
                  🔵 ZONE 3 — ZERO-TRUST ACCESS GATEWAY & SENSORS
                </span>
                <span className="text-[9px] text-[#8b949e]">TRAFFIC STEP 2</span>
              </div>

              {/* Summary Header (Collapsed-by-Default) */}
              <div
                onClick={() => toggleZone('z3')}
                className="p-4 bg-[#161b22] hover:bg-[#21262d] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none transition-colors"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.13)] border-2 border-[#00d4ff] text-[#00d4ff] font-mono font-black text-lg flex items-center justify-center shadow-lg">
                      2
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xs font-bold text-[#c9d1d9] font-mono flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#00d4ff]" />
                        <span>Zone 3: Zero-Trust Access Gateway & Sensor Cluster</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#00d4ff] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                        192.168.19.173 (Host Ingress Gateway)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#8b949e]">
                      This is the main security checkpoint that inspects all incoming requests, blocks attacks, and requires identity logins.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#00d4ff]">
                    Traefik v3.6 + Coraza WAF + Zeek/Suricata + Authelia/Keycloak
                  </span>
                  <div className="p-1 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]">
                    {expandedZones.z3 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail */}
              {expandedZones.z3 && (
                <div className="p-4 border-t border-[#30363d] bg-[#0d1117] font-mono space-y-5">
                  {/* Segment A: Proxy & Sensor DMZ (proxy_net) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#00d4ff]">
                        <Globe className="w-3.5 h-3.5 text-[#00d4ff]" />
                        <span>Perimeter DMZ Bridge (proxy_net: 172.20.0.0/16)</span>
                      </div>
                      <span className="text-[10px] text-[#8b949e]">Exposed to WAN via ports :80 and :443</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Traefik */}
                      <AegisNodeCard
                        name="Traefik v3.6 Edge Router"
                        categoryColor="cy"
                        icon={<Shield className="w-4 h-4" />}
                        ipAddress="172.20.0.2 / Host :443"
                        portBadges={[
                          { port: ':443 TLS', isExposed: true },
                          { port: ':80 EX', isExposed: true },
                        ]}
                        statusBadge={{ label: 'ONLINE', isHealthy: true }}
                        facts={[
                          'TLS 1.3 Termination & Cert Resolver',
                          'Wildcard *.zerotrust.lan SAN',
                          'Forward-Auth MFA Middleware',
                        ]}
                        isActiveInTrace={isNodeActive('traefik')}
                        isDimmed={isTraceMode && !isNodeActive('traefik')}
                      />

                      {/* Coraza WAF */}
                      <AegisNodeCard
                        name="Coraza WAF (Caddy CRS)"
                        categoryColor="rd"
                        icon={<ShieldAlert className="w-4 h-4" />}
                        ipAddress="172.20.0.3:8080"
                        portBadges={[{ port: ':8080 DMZ', isExposed: false }]}
                        statusBadge={{ label: 'OWASP CRS 942100', isHealthy: false }}
                        facts={[
                          'OWASP Core Rule Set 942100 (SQLi)',
                          'Inline HTTP 403 Forbidden Blocker',
                          'Zero false positive tuning enabled',
                        ]}
                        isActiveInTrace={isNodeActive('coraza')}
                        isDimmed={isTraceMode && !isNodeActive('coraza')}
                      />

                      {/* Suricata & Zeek */}
                      <AegisNodeCard
                        name="Suricata IDS & Zeek NTA"
                        categoryColor="pu"
                        icon={<Radio className="w-4 h-4" />}
                        ipAddress="Host Tap ens33/ens34"
                        portBadges={[{ port: 'PROMISC', isExposed: false }]}
                        statusBadge={{ label: '52K RULES', isHealthy: true }}
                        facts={[
                          '52,000+ ET Open Signatures active',
                          'Zeek conn, http, dns, ssl extraction',
                          'Real-time eve.json Filebeat shipping',
                        ]}
                        isActiveInTrace={isNodeActive('suricata')}
                        isDimmed={isTraceMode && !isNodeActive('suricata')}
                      />
                    </div>
                  </div>

                  {/* Segment B: Kernel Isolation Boundary (auth_net - internal: true) */}
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg border-2 border-dashed border-[#bd93f9]/60 bg-[rgba(189,147,249,0.06)] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#bd93f9]/30">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#bd93f9]">
                          <Lock className="w-4 h-4 text-[#bd93f9]" />
                          <span>internal: true — Docker Kernel Isolated Auth Network (auth_net: 172.21.0.0/16)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[rgba(189,147,249,0.13)] text-[#bd93f9] border border-[#bd93f9]/40 font-bold uppercase">
                          Zero Host Exposure
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Authelia */}
                        <AegisNodeCard
                          name="Authelia v4.39.20"
                          categoryColor="pu"
                          icon={<Lock className="w-4 h-4" />}
                          ipAddress="172.21.0.2:9091"
                          portBadges={[{ port: ':9091 BLK', isExposed: false }]}
                          statusBadge={{ label: 'ARGON2ID', isHealthy: true }}
                          facts={[
                            'Argon2id: 64MB RAM, 3 iterations',
                            'Forward-Auth endpoint /api/authz',
                            'Session TTL: 72 Hours in Redis',
                          ]}
                          isActiveInTrace={isNodeActive('authelia')}
                          isDimmed={isTraceMode && !isNodeActive('authelia')}
                        />

                        {/* Keycloak SSO */}
                        <AegisNodeCard
                          name="Keycloak 26 (Prod Mode)"
                          categoryColor="pu"
                          icon={<ShieldCheck className="w-4 h-4" />}
                          ipAddress="172.21.0.3:8080"
                          portBadges={[{ port: ':8080 BLK', isExposed: false }]}
                          statusBadge={{ label: 'OIDC IDP', isHealthy: true }}
                          facts={[
                            'start production mode (no dev flags)',
                            'OIDC Provider for Admin & Employees',
                            'bash /dev/tcp health check configured',
                          ]}
                          isActiveInTrace={isNodeActive('keycloak')}
                          isDimmed={isTraceMode && !isNodeActive('keycloak')}
                        />

                        {/* PostgreSQL Vault & Redis */}
                        <AegisNodeCard
                          name="PostgreSQL Vault & Redis"
                          categoryColor="pu"
                          icon={<Database className="w-4 h-4" />}
                          ipAddress="172.21.0.4 / 172.21.0.5"
                          portBadges={[
                            { port: ':5432 BLK', isExposed: false },
                            { port: ':6379 BLK', isExposed: false },
                          ]}
                          statusBadge={{ label: 'ISOLATED DB', isHealthy: true }}
                          facts={[
                            'Keycloak & Authelia user credentials',
                            'Redis high-speed ticket & token cache',
                            'Zero host port binding (Kernel blocked)',
                          ]}
                          isActiveInTrace={isNodeActive('redis')}
                          isDimmed={isTraceMode && !isNodeActive('redis')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Directional Connector to Next Stage */}
                  <div className="flex items-center justify-center gap-2 text-xs text-[#00d4ff] pt-2 border-t border-[#30363d]">
                    <span>Zone 3 validates identity & policies; verified requests routed directly to Zone 2 Target Enclave</span>
                    <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* PRIMARY REQUEST PATH CONNECTOR: ZONE 3 GATEWAY -> ZONE 2 TARGET ENCLAVE */}
          {/* ======================================================================= */}
          {filterZone === 'all' && (
            <div className="flex items-center justify-center gap-2 py-1 font-mono text-[11px]">
              <div className="h-px bg-gradient-to-r from-transparent via-[#ffb700]/50 to-transparent flex-1"></div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#161b22] border border-[#ffb700]/50 text-[#ffb700] flex items-center gap-2.5 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-[rgba(0,212,255,0.13)] text-[#00d4ff] text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-[#8b949e]">Primary Request Path: Direct Verified Ingress (Zero SOC Transit)</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ffb700] animate-pulse" />
                <span className="w-4 h-4 rounded-full bg-[rgba(255,183,0,0.13)] text-[#ffb700] text-[10px] font-bold flex items-center justify-center">3</span>
                <span className="text-[#c9d1d9] font-bold">Zone 2: Enterprise Target Enclave</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#ffb700]/50 to-transparent flex-1"></div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ZONE 2 CARD: PRIMARY STEP 3 - ENTERPRISE TARGET ASSETS */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z2') && (
            <div
              className={`bg-[#161b22] border border-[#30363d] border-t-4 border-t-[#ffb700] rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z2') ? 'opacity-20' : 'opacity-100'
              }`}
            >
              {/* Pinned Monospace Zone Tag */}
              <div className="bg-[rgba(255,183,0,0.08)] border-b border-[#30363d] px-4 py-1.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#ffb700] tracking-wider uppercase">
                  🟡 ZONE 2 — TARGET ENCLAVE · aegis.corp
                </span>
                <span className="text-[9px] text-[#ffb700] font-bold">PRIMARY STEP 3 (DESTINATION)</span>
              </div>

              {/* Summary Header (Collapsed-by-Default) */}
              <div
                onClick={() => toggleZone('z2')}
                className="p-4 bg-[#161b22] hover:bg-[#21262d] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none transition-colors"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(255,183,0,0.13)] border-2 border-[#ffb700] text-[#ffb700] font-mono font-black text-lg flex items-center justify-center shadow-lg">
                      3
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xs font-bold text-[#c9d1d9] font-mono flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#ffb700]" />
                        <span>Zone 2: Enterprise Target Enclave & Crown Jewels</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#ffb700] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                        192.168.20.0/24 (Domain aegis.corp)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#8b949e]">
                      This is the company&apos;s internal private network containing workstations, databases, and servers that must never be directly accessed from the internet.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#ffb700]">
                    CORP-DC01 · CORP-PC01 · CORP-DB01 · CORP-WEB01
                  </span>
                  <div className="p-1 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]">
                    {expandedZones.z2 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail */}
              {expandedZones.z2 && (
                <div className="p-4 border-t border-[#30363d] bg-[#0d1117] font-mono space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* DC01 */}
                    <AegisNodeCard
                      name="CORP-DC01 (AD DS)"
                      categoryColor="am"
                      icon={<Server className="w-4 h-4" />}
                      ipAddress="192.168.20.10"
                      portBadges={[
                        { port: ':389 LDAP', isExposed: false },
                        { port: ':88 KRB', isExposed: false },
                      ]}
                      statusBadge={{ label: 'PROTECTED', isHealthy: true }}
                      facts={[
                        'Windows Server 2022 AD DS',
                        'Domain Controller for aegis.corp',
                        'Zero internet route / No public IP',
                      ]}
                      isActiveInTrace={isNodeActive('dc01')}
                      isDimmed={isTraceMode && !isNodeActive('dc01')}
                    />

                    {/* PC01 */}
                    <AegisNodeCard
                      name="CORP-PC01 (Workstation)"
                      categoryColor="am"
                      icon={<Cpu className="w-4 h-4" />}
                      ipAddress="192.168.20.100"
                      portBadges={[{ port: 'Sysmon v15', isExposed: false }]}
                      statusBadge={{ label: 'EDR ARMED', isHealthy: true }}
                      facts={[
                        'Windows 10 Finance Client (ezio)',
                        'Domain joined to aegis.corp',
                        'Wazuh Agent 002 Active Response target',
                      ]}
                      isActiveInTrace={isNodeActive('corp-pc01')}
                      isDimmed={isTraceMode && !isNodeActive('corp-pc01')}
                    />

                    {/* DB01 */}
                    <AegisNodeCard
                      name="CORP-DB01 (Database)"
                      categoryColor="am"
                      icon={<Database className="w-4 h-4" />}
                      ipAddress="192.168.20.50"
                      portBadges={[{ port: ':5432 NO EXT', isExposed: false }]}
                      statusBadge={{ label: 'CROWN JEWEL', isHealthy: true }}
                      facts={[
                        'PostgreSQL 14 Customer PII Vault',
                        'auditd FIM & Query Logging active',
                        '100% Shielded by Zero-Trust Edge',
                      ]}
                      isActiveInTrace={isNodeActive('dbvault')}
                      isDimmed={isTraceMode && !isNodeActive('dbvault')}
                    />

                    {/* WEB01 */}
                    <AegisNodeCard
                      name="CORP-WEB01 (Intranet)"
                      categoryColor="am"
                      icon={<Globe className="w-4 h-4" />}
                      ipAddress="192.168.20.175"
                      portBadges={[{ port: ':80/:443 INT', isExposed: false }]}
                      statusBadge={{ label: 'MFA REQUIRED', isHealthy: true }}
                      facts={[
                        'Departmental HR & Wiki portal',
                        'Protected by Authelia Forward-Auth',
                        'Wazuh Agent telemetry streaming',
                      ]}
                      isActiveInTrace={isNodeActive('corp-web01')}
                      isDimmed={isTraceMode && !isNodeActive('corp-web01')}
                    />
                  </div>

                  {/* Security Conclusion */}
                  <div className="p-3 rounded bg-[#161b22] border border-[#00ff41]/30 flex items-center gap-2.5 text-xs text-[#00ff41]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Zone 2 is 100% isolated: Direct destination of authorized requests from Zone 3; never exposed to internet.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* PARALLEL TELEMETRY STREAM & ACTIVE DEFENSE RESPONSE LOOP CONNECTOR */}
          {/* ======================================================================= */}
          {filterZone === 'all' && (
            <div className="flex flex-col items-center justify-center gap-2 py-2 font-mono text-[11px]">
              {/* Telemetry Stream */}
              <div className="flex items-center justify-center gap-2 w-full">
                <div className="h-px bg-gradient-to-r from-transparent via-[#bd93f9]/50 to-transparent flex-1"></div>
                <div className="px-3.5 py-1.5 rounded-full bg-[#161b22] border border-[#bd93f9]/50 text-[#bd93f9] flex items-center gap-2.5 shadow-sm">
                  <Radio className="w-3.5 h-3.5 text-[#bd93f9] animate-pulse" />
                  <span className="text-[#8b949e]">Parallel Out-of-Band Telemetry Stream:</span>
                  <span className="text-[#00d4ff] font-bold">Zone 3 (Sensors)</span>
                  <span className="text-[#8b949e]">&</span>
                  <span className="text-[#ffb700] font-bold">Zone 2 (EDR Agents)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#bd93f9] animate-pulse" />
                  <span className="text-[#c9d1d9] font-bold">Zone 4 (minisoc1 / minisoc2)</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-[#bd93f9]/50 to-transparent flex-1"></div>
              </div>

              {/* Response Loop */}
              <div className="flex items-center justify-center gap-2 w-full">
                <div className="h-px bg-gradient-to-r from-transparent via-[#00ff41]/50 to-transparent flex-1"></div>
                <div className="px-3.5 py-1.5 rounded-full bg-[#161b22] border border-[#00ff41]/50 text-[#00ff41] flex items-center gap-2.5 shadow-sm">
                  <RotateCcw className="w-3.5 h-3.5 text-[#00ff41] animate-pulse" />
                  <span className="text-[#8b949e]">Active Defense Response Loop:</span>
                  <span className="text-[#00ff41] font-bold">Zone 4 Shuffle SOAR (minisoc3)</span>
                  <span className="text-[#8b949e]">&rarr;</span>
                  <span className="text-[#00d4ff] font-bold">Perimeter IP Drop (Zone 3)</span>
                  <span className="text-[#8b949e]">/</span>
                  <span className="text-[#ffb700] font-bold">Host NIC Isolation (Zone 2)</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-[#00ff41]/50 to-transparent flex-1"></div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* ZONE 4 CARD: OUT-OF-BAND MSSP SOC & SOAR CLUSTER */}
          {/* ======================================================================= */}
          {(filterZone === 'all' || filterZone === 'z4') && (
            <div
              className={`bg-[#161b22] border border-[#30363d] border-t-4 border-t-[#bd93f9] rounded-lg transition-all shadow-md overflow-hidden ${
                isTraceMode && !isZoneActive('z4') ? 'opacity-20' : 'opacity-100'
              }`}
            >
              {/* Pinned Monospace Zone Tag */}
              <div className="bg-[rgba(189,147,249,0.08)] border-b border-[#30363d] px-4 py-1.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#bd93f9] tracking-wider uppercase">
                  🟣 ZONE 4 — MSSP SOC & SOAR CLUSTER
                </span>
                <span className="text-[9px] text-[#bd93f9] font-bold">OUT-OF-BAND (TELEMETRY & ACTIVE DEFENSE LOOP)</span>
              </div>

              {/* Summary Header (Collapsed-by-Default) */}
              <div
                onClick={() => toggleZone('z4')}
                className="p-4 bg-[#161b22] hover:bg-[#21262d] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none transition-colors"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(189,147,249,0.13)] border-2 border-[#bd93f9] text-[#bd93f9] font-mono font-black text-sm flex items-center justify-center shadow-lg">
                      SOC
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xs font-bold text-[#c9d1d9] font-mono flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#bd93f9]" />
                        <span>Zone 4: Remote MSSP SOC & SOAR Cluster</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#bd93f9] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                        10.16.64.0/24 (Dedicated SOC Subnet · Out-of-Band)
                      </span>
                    </div>

                    {/* Non-Technical Sentence (Constraint D) */}
                    <p className="text-xs text-[#8b949e]">
                      This is the central security control room that analyzes telemetry out-of-band and dispatches automated response loops. It does not sit in the user access path.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0 font-mono">
                  <span className="text-[10px] px-2 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#bd93f9]">
                    minisoc1 (ES 8.19) · minisoc2 (Wazuh 4.7) · minisoc3 (SOAR)
                  </span>
                  <div className="p-1 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]">
                    {expandedZones.z4 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Technical Detail */}
              {expandedZones.z4 && (
                <div className="p-4 border-t border-[#30363d] bg-[#0d1117] font-mono space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* minisoc1 */}
                    <AegisNodeCard
                      name="minisoc1: The Vault"
                      categoryColor="pu"
                      icon={<Database className="w-4 h-4" />}
                      ipAddress="10.16.64.155"
                      portBadges={[{ port: ':9200 mTLS', isExposed: false }]}
                      statusBadge={{ label: 'INGESTING', isHealthy: true }}
                      facts={[
                        'Elasticsearch 8.19 native RPM on Rocky 9',
                        'Indices: filebeat-*, wazuh-alerts-*',
                        'Zero external exposure, mTLS ingest only',
                      ]}
                      isActiveInTrace={isNodeActive('minisoc1')}
                      isDimmed={isTraceMode && !isNodeActive('minisoc1')}
                    />

                    {/* minisoc2 */}
                    <AegisNodeCard
                      name="minisoc2: The Brain"
                      categoryColor="pu"
                      icon={<Shield className="w-4 h-4" />}
                      ipAddress="10.16.64.156"
                      portBadges={[
                        { port: ':1514 Wazuh', isExposed: false },
                        { port: ':55000 API', isExposed: false },
                      ]}
                      statusBadge={{ label: 'SIEM ACTIVE', isHealthy: true }}
                      facts={[
                        'Wazuh Manager 4.7 & Correlator',
                        'MITRE ATT&CK auto-tagging (T1190, T1003)',
                        'Active Response automated webhook trigger',
                      ]}
                      isActiveInTrace={isNodeActive('minisoc2')}
                      isDimmed={isTraceMode && !isNodeActive('minisoc2')}
                    />

                    {/* minisoc3 */}
                    <AegisNodeCard
                      name="minisoc3: The Executor"
                      categoryColor="gn"
                      icon={<Zap className="w-4 h-4" />}
                      ipAddress="10.16.64.157"
                      portBadges={[{ port: ':3001 SOAR', isExposed: false }]}
                      statusBadge={{ label: 'ACTIVE DEFENSE', isHealthy: true }}
                      facts={[
                        'Shuffle SOAR ("Mahoraga v2.1") engine',
                        'MISP threat intelligence enrichment split',
                        'Active response host-drop execution (<47s)',
                      ]}
                      isActiveInTrace={isNodeActive('minisoc3')}
                      isDimmed={isTraceMode && !isNodeActive('minisoc3')}
                    />
                  </div>

                  {/* Directional Connector to Next Stage */}
                  <div className="flex items-center justify-center gap-2 text-xs text-[#00ff41] pt-2 border-t border-[#30363d]">
                    <RotateCcw className="w-3.5 h-3.5 text-[#00ff41] animate-pulse" />
                    <span>Automated containment loops back to Zone 3 Gateway or Zone 2 Endpoints without intercepting access</span>
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
