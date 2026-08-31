import React, { useState } from 'react';
import {
  Layers,
  Server,
  Shield,
  Radio,
  Database,
  Terminal,
  Cpu,
  Globe,
  RefreshCw,
  Play,
  Check,
  Copy,
  PlusCircle,
  Workflow,
  Zap,
  Search,
  AlertTriangle,
  Send,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export const SubTopologiesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'z1' | 'z2' | 'z3' | 'z4'>('z3');
  const [activeMispTab, setActiveMispTab] = useState<'stack' | 'feeds' | 'manual' | 'soar'>('stack');
  const [activeSocConfigTab, setActiveSocConfigTab] = useState<'compose' | 'env' | 'logstash' | 'logstash_yml'>('compose');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Manual IOC Form State for Simulation
  const [iocType, setIocType] = useState<'ip-dst' | 'url' | 'sha256' | 'domain'>('ip-dst');
  const [iocValue, setIocValue] = useState<string>('185.220.101.5');
  const [iocComment, setIocComment] = useState<string>('C2 Beaconing detected on Zone 3 Traefik');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simLogs, setSimLogs] = useState<string[]>([]);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRunSoarSimulation = () => {
    setIsSimulating(true);
    setSimStep(1);
    setSimLogs([
      `[08:43:10] 🚀 [MISP UI / API] Creating Event ID #1042: Category "Payload delivery" | Threat Level 2 (High)...`,
      `[08:43:10] ✅ Attribute Added: Type="${iocType}" Value="${iocValue}" | Tagged: "tlp:amber", "source:manual_ezio"`
    ]);

    setTimeout(() => {
      setSimStep(2);
      setSimLogs((prev) => [
        ...prev,
        `[08:43:12] ⚡ [MISP Webhook] Event Published -> Triggering Shuffle SOAR Endpoint (http://10.16.64.157:3001/api/v1/hooks/webhook_misp_enrichment)`,
        `[08:43:12] 🔍 [Shuffle SOAR - Node 1] Received Webhook Payload for IOC: ${iocValue}`
      ]);
    }, 1200);

    setTimeout(() => {
      setSimStep(3);
      setSimLogs((prev) => [
        ...prev,
        `[08:43:14] 🌐 [Shuffle SOAR - Node 2] Cross-checking Threat Intel Feeds (Abuse.ch URLhaus / Feodo Tracker / VirusTotal)...`,
        `[08:43:14] ⚠️ [Abuse.ch Match] Found IOC in Feodo Tracker! Reputation Score: 94/100 (High Risk Botnet C2 Node)`
      ]);
    }, 2400);

    setTimeout(() => {
      setSimStep(4);
      setSimLogs((prev) => [
        ...prev,
        `[08:43:16] 🔎 [Shuffle SOAR - Node 3] Querying Elasticsearch (minisoc1:9200) index "zeek-conn-*", "filebeat-*"...`,
        `[08:43:16] 🚨 [MATCH FOUND] 3 Active TCP connections from CORP-PC01 (192.168.20.100) to ${iocValue}:443!`
      ]);
    }, 3600);

    setTimeout(() => {
      setSimStep(5);
      setSimLogs((prev) => [
        ...prev,
        `[08:43:18] 🛡️ [Shuffle SOAR - Node 4] Executing Wazuh Active Response on minisoc2 (10.16.64.156)...`,
        `[08:43:18] 💥 [ACTIVE RESPONSE EXECUTED] Command "host-drop" sent to Agent 002 (CORP-PC01). NIC Isolated!`
      ]);
    }, 4800);

    setTimeout(() => {
      setSimStep(6);
      setSimLogs((prev) => [
        ...prev,
        `[08:43:20] 📢 [Shuffle SOAR - Node 5] Posted Enriched Alert to Slack #soc-alerts & tagged MISP Attribute "soar:contained_active_response".`,
        `[08:43:20] ✅ [WORKFLOW COMPLETE] Total Pipeline Duration: 10.2s. Threat Mitigated Successfully!`
      ]);
      setIsSimulating(false);
    }, 6000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="pro-title flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#38BDF8]" />
              <span>Section 3: Detailed Zone Sub-Topologies</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Select a zone below to inspect internal components, IP addresses, network segments, port bindings, telemetry sources, and threat intelligence orchestration.
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-[#0F172A] p-1 border border-[#334155] rounded font-mono">
            <button
              onClick={() => setActiveSubTab('z1')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'z1' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Zone 1: Threatscape
            </button>
            <button
              onClick={() => setActiveSubTab('z2')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'z2' ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Zone 2: Enterprise Grid
            </button>
            <button
              onClick={() => setActiveSubTab('z3')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'z3' ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Zone 3: ZTA Gateway
            </button>
            <button
              onClick={() => setActiveSubTab('z4')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'z4' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Zone 4: MSSP SOC
            </button>
          </div>
        </div>

        {/* Sub-tab 1: Zone 1 */}
        {activeSubTab === 'z1' && (
          <div className="space-y-4 font-mono">
            <div className="bg-[#0F172A] border border-red-500/30 rounded-lg p-5">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">Zone 1: Threatscape & Red Team Emulation Engine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-white mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-red-400" />
                    <span>Kali Linux APT Station (192.168.1.50)</span>
                  </div>
                  <ul className="text-[#94A3B8] space-y-1 text-[11px] list-disc list-inside">
                    <li><strong className="text-white">Sliver C2 Framework:</strong> Go-based C2 server operating mTLS / DNS / HTTPS listeners.</li>
                    <li><strong className="text-white">sqlmap:</strong> Automated SQL injection scanner targeting OWASP Juice Shop endpoints.</li>
                    <li><strong className="text-white">mimikatz:</strong> Credential dumping tool (`sekurlsa::logonpasswords`).</li>
                    <li><strong className="text-white">Burp Suite Professional:</strong> Layer 7 intercepting proxy and web payload generator.</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-white mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#FBBF24]" />
                    <span>REMnux Static/Dynamic Malware Sandbox</span>
                  </div>
                  <ul className="text-[#94A3B8] space-y-1 text-[11px] list-disc list-inside">
                    <li><strong className="text-white">YARA Analysis:</strong> Pattern matching rules for dropped executable payloads.</li>
                    <li><strong className="text-white">exiftool & strings:</strong> Static header and metadata extraction on artifacts.</li>
                    <li><strong className="text-white">NetworkMiner:</strong> Passive network forensics and file extraction from Zeek pcaps.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Zone 2 */}
        {activeSubTab === 'z2' && (
          <div className="space-y-4 font-mono">
            <div className="bg-[#0F172A] border border-[#FBBF24]/30 rounded-lg p-5">
              <h3 className="text-sm font-bold text-[#FBBF24] uppercase tracking-wider mb-3">Zone 2: Small Enterprise Domain Grid (`aegis.corp` - 192.168.20.0/24)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#FBBF24] mb-1">CORP-DC01 (<span className="text-[#00d4ff]">192.168.20.10</span>)</div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">Windows Server 2022 Domain Controller</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• Active Directory Domain Services (`aegis.corp`)</li>
                    <li>• DNS Server & DHCP Server</li>
                    <li>• Wazuh Agent v4.7</li>
                    <li>• Telemetry: Win Events 4625, 4768, 4769</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#FBBF24] mb-1">CORP-PC01 (<span className="text-[#00d4ff]">192.168.20.100</span>)</div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">Windows 10 Workstation ("Patient Zero")</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• Domain-joined to `aegis.corp`</li>
                    <li>• Sysmon v15 (SwiftOnSecurity config)</li>
                    <li>• Wazuh Agent v4.7</li>
                    <li>• Telemetry: Event IDs 1, 3, 7, 10, 11, 22</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#FBBF24] mb-1">CORP-DB01 (<span className="text-[#00d4ff]">192.168.20.50</span>)</div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">Ubuntu 22.04 LTS Database Server</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• PostgreSQL 14 (Hosting `customers` PII table)</li>
                    <li>• auditd FIM & Process Execution rules</li>
                    <li>• Wazuh Agent v4.7</li>
                    <li>• Telemetry: Query logs & shadow FIM</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#FBBF24] mb-1">CORP-WEB01 (<span className="text-[#00d4ff]">192.168.20.175</span>)</div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">Ubuntu 22.04 - Vulnerable Web Application (Crown Jewel)</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• Primary host for juiceshop.zerotrust.lan</li>
                    <li>• Instrumented with Coraza WAF (OWASP Top 10 Protection)</li>
                    <li>• Wazuh Agent v4.7 (HIDS & Vulnerability Detection)</li>
                    <li>• Telemetry: Traefik L7 JSON, SQLi/XSS Alerts, WAF Blocks</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 3: Zone 3 */}
        {activeSubTab === 'z3' && (
          <div className="space-y-4 font-mono">
            <div className="bg-[#0F172A] border border-[#38BDF8]/30 rounded-lg p-5">
              <h3 className="text-sm font-bold text-[#38BDF8] uppercase tracking-wider mb-3">Zone 3: ZTA Gateway Network Isolation & Port Matrix</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs mb-4">
                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#38BDF8] mb-2 flex items-center justify-between">
                    <span>proxy_net (DMZ Bridge)</span>
                    <span className="text-[10px] text-[#4ADE80]">External Facing</span>
                  </div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• <strong className="text-white">Traefik v3.6.1:</strong> Edge Router, TLS Termination, Forward-Auth proxy.</li>
                    <li>• <strong className="text-white">Coraza WAF:</strong> Caddy plugin with OWASP Core Rule Set inline web filter.</li>
                    <li>• <strong className="text-white">Suricata IDS:</strong> Signature detection with Emerging Threats ruleset.</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-purple-300 mb-2 flex items-center justify-between">
                    <span>auth_net (internal: true Bridge)</span>
                    <span className="text-[10px] text-purple-400">Kernel Isolated</span>
                  </div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• <strong className="text-white">Authelia v4.39.20:</strong> Forward Auth, Argon2id, OIDC Provider.</li>
                    <li>• <strong className="text-white">Keycloak v26.6.2:</strong> Federated Identity Vault (`start --optimized`).</li>
                    <li>• <strong className="text-white">PostgreSQL 16 & Redis 7:</strong> Zero host exposure database & session cache.</li>
                  </ul>
                </div>
              </div>

              {/* Port Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1E293B] text-[#38BDF8] border-b border-[#334155]">
                      <th className="p-2">Port</th>
                      <th className="p-2">Service</th>
                      <th className="p-2">Network Scope</th>
                      <th className="p-2">Host Access State</th>
                      <th className="p-2">Security Enforcement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] text-[#F1F5F9]/80">
                    <tr>
                      <td className="p-2 font-bold text-[#38BDF8]">80/TCP</td>
                      <td className="p-2">Traefik HTTP</td>
                      <td className="p-2">proxy_net</td>
                      <td className="p-2 text-[#4ADE80] font-bold">EXPOSED</td>
                      <td className="p-2">Permanent 301 HTTPS Redirect</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-[#38BDF8]">443/TCP</td>
                      <td className="p-2">Traefik HTTPS</td>
                      <td className="p-2">proxy_net + auth_net</td>
                      <td className="p-2 text-[#4ADE80] font-bold">EXPOSED</td>
                      <td className="p-2">TLS 1.3 + Authelia Forward-Auth MFA</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-[#38BDF8]">1514/TCP</td>
                      <td className="p-2">Wazuh Agent Proxy</td>
                      <td className="p-2">proxy_net</td>
                      <td className="p-2 text-[#4ADE80] font-bold">EXPOSED</td>
                      <td className="p-2">mTLS blind proxy pass-through to minisoc2</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-purple-400">5432/TCP</td>
                      <td className="p-2">PostgreSQL Vault</td>
                      <td className="p-2">auth_net</td>
                      <td className="p-2 text-red-400 font-bold">BLOCKED</td>
                      <td className="p-2">internal: true (Kernel Bridge Refusal)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-purple-400">6379/TCP</td>
                      <td className="p-2">Redis Session Cache</td>
                      <td className="p-2">auth_net</td>
                      <td className="p-2 text-red-400 font-bold">BLOCKED</td>
                      <td className="p-2">internal: true (Kernel Bridge Refusal)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-purple-400">9091/TCP</td>
                      <td className="p-2">Authelia Forward Auth</td>
                      <td className="p-2">auth_net</td>
                      <td className="p-2 text-red-400 font-bold">BLOCKED</td>
                      <td className="p-2">Internal call from Traefik only</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 4: Zone 4 */}
        {activeSubTab === 'z4' && (
          <div className="space-y-6 font-mono">
            {/* Zone 4 Cluster Overview Cards */}
            <div className="bg-[#0F172A] border border-purple-500/30 rounded-lg p-5">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Zone 4: MSSP SOC 3-Node Processing Cluster (10.16.64.0/24)</span>
                <span className="text-xs font-normal text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">AlmaLinux 9.3 Enclave</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#38BDF8] mb-1 flex items-center justify-between">
                    <span>minisoc1 (10.16.64.155)</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/40 font-bold">Native RPM (systemd)</span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">"The Vault" — Primary Telemetry Indexer</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• Elasticsearch 8.19.13 (Native RPM / JVM 8GB locked)</li>
                    <li>• Port 9200/TCP (TLS / Basic Auth)</li>
                    <li>• Stores raw Filebeat, Zeek 5-node cluster, & Wazuh alerts</li>
                    <li>• Direct query verified healthy from minisoc3 Logstash</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
                  <div className="font-bold text-[#4ADE80] mb-1 flex items-center justify-between">
                    <span>minisoc2 (10.16.64.156)</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">Native RPM (systemd)</span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">"The Brain" — SIEM & Visualization Engine</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• Wazuh Manager 4.7 (Native RPM - Ports 1514/1515 mTLS)</li>
                    <li>• Kibana 8.19.13 (Native RPM - Port 5601)</li>
                    <li>• Bare-metal performance with zero Docker virtualization overhead</li>
                    <li>• Active Response engine command controller</li>
                  </ul>
                </div>

                <div className="bg-[#1E293B] p-4 rounded border border-purple-500/40 glow-purple-hover">
                  <div className="font-bold text-purple-400 mb-1 flex items-center justify-between">
                    <span>minisoc3 (10.16.64.157)</span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40 font-bold">Docker Compose (9 Containers)</span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mb-2">"The Executor" — SOAR & Threat Intel</div>
                  <ul className="text-[11px] text-[#F1F5F9]/80 space-y-1">
                    <li>• <strong className="text-white">Shuffle SOAR (4):</strong> frontend (:3001), backend, orborus, mongo:6</li>
                    <li>• <strong className="text-white">MISP Official (4):</strong> core (:8080), modules, db, redis</li>
                    <li>• <strong className="text-white">Logstash 8.19.13 (:5044):</strong> rule.level &gt;= 12 query to Shuffle hook</li>
                    <li>• <strong className="text-white">Mailpit (:8025):</strong> SMTP sinkhole moved to minisoc3</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Dedicated MISP Threat Intelligence & Shuffle SOAR Operations Hub */}
            <div className="bg-[#0F172A] border border-purple-500/40 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      minisoc3 Architecture, Threat Intelligence & SOAR Operations Hub
                    </h4>
                    <p className="text-[11px] text-[#94A3B8]">
                      minisoc3 (10.16.64.157) · 9-Container Stack (Shuffle + MISP + Logstash + Mailpit on `soc_net`)
                    </p>
                  </div>
                </div>

                {/* Sub-tab switcher inside Zone 4 MISP Hub */}
                <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded border border-[#334155]">
                  <button
                    onClick={() => setActiveMispTab('stack')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      activeMispTab === 'stack'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    1. 9-Container Stack & Configs
                  </button>
                  <button
                    onClick={() => setActiveMispTab('feeds')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      activeMispTab === 'feeds'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    2. Abuse.ch Feeds
                  </button>
                  <button
                    onClick={() => setActiveMispTab('manual')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      activeMispTab === 'manual'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    3. Manual IOC & API Setup
                  </button>
                  <button
                    onClick={() => setActiveMispTab('soar')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      activeMispTab === 'soar'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    4. Live SOAR Simulator
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: 9-Container Stack Breakdown & Sanitized Configs */}
              {activeMispTab === 'stack' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    {/* Shuffle Group */}
                    <div className="bg-[#1E293B] p-3 rounded border border-purple-500/30">
                      <div className="font-bold text-purple-300 mb-1 flex items-center justify-between">
                        <span>Shuffle SOAR (4)</span>
                        <span className="text-[9px] text-[#4ADE80] font-mono">[HEALTHY]</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Visual Automation & Webhook Orchestrator</p>
                      <ul className="text-[10px] text-[#F1F5F9]/80 space-y-1">
                        <li>• <code className="text-purple-300">shuffle</code>: ghcr.io/shuffle/shuffle-frontend (:3001)</li>
                        <li>• <code className="text-purple-300">shuffle-backend</code>: ghcr.io/shuffle/shuffle-backend</li>
                        <li>• <code className="text-purple-300">shuffle-orborus</code>: ghcr.io/shuffle/shuffle-orborus</li>
                        <li>• <code className="text-purple-300">shuffle-database</code>: mongo:6</li>
                      </ul>
                    </div>

                    {/* MISP Group */}
                    <div className="bg-[#1E293B] p-3 rounded border border-purple-500/30">
                      <div className="font-bold text-purple-300 mb-1 flex items-center justify-between">
                        <span>MISP Official (4)</span>
                        <span className="text-[9px] text-[#4ADE80] font-mono">[HEALTHY]</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Threat Intelligence Management Platform</p>
                      <ul className="text-[10px] text-[#F1F5F9]/80 space-y-1">
                        <li>• <code className="text-cyan-300">misp-core</code>: ghcr.io/misp/misp-docker/misp-core (:8080)</li>
                        <li>• <code className="text-cyan-300">misp-modules</code>: ghcr.io/misp/misp-docker/misp-modules</li>
                        <li>• <code className="text-cyan-300">misp-db</code>: mariadb:10.11</li>
                        <li>• <code className="text-cyan-300">misp-redis</code>: valkey/valkey:7.2</li>
                      </ul>
                    </div>

                    {/* Logstash */}
                    <div className="bg-[#1E293B] p-3 rounded border border-purple-500/30">
                      <div className="font-bold text-[#38BDF8] mb-1 flex items-center justify-between">
                        <span>Logstash Pipeline</span>
                        <span className="text-[9px] text-[#4ADE80] font-mono">[HEALTHY]</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">ES Alert Poller & SOAR Forwarder</p>
                      <ul className="text-[10px] text-[#F1F5F9]/80 space-y-1">
                        <li>• <code className="text-[#38BDF8]">logstash</code>: docker.elastic.co/logstash/logstash:8.19.13 (:5044)</li>
                        <li>• Scheduled query on <code className="text-[#38BDF8]">minisoc1:9200</code></li>
                        <li>• Filter: <code className="text-emerald-400">rule.level &gt;= 12</code></li>
                        <li>• Action: HTTP POST to Shuffle webhook</li>
                      </ul>
                    </div>

                    {/* Mailpit */}
                    <div className="bg-[#1E293B] p-3 rounded border border-purple-500/30">
                      <div className="font-bold text-[#F59E0B] mb-1 flex items-center justify-between">
                        <span>Mailpit Sinkhole</span>
                        <span className="text-[9px] text-[#4ADE80] font-mono">[HEALTHY]</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Phishing Payload Trap</p>
                      <ul className="text-[10px] text-[#F1F5F9]/80 space-y-1">
                        <li>• <code className="text-[#F59E0B]">mailpit</code>: axllent/mailpit (:8025 / :1025)</li>
                        <li>• Moved from Gateway to minisoc3 in v2.1</li>
                        <li>• Traps phishing simulation emails</li>
                        <li>• REST API for header & link extraction</li>
                      </ul>
                    </div>
                  </div>

                  {/* Sanitized Configuration Viewer */}
                  <div className="bg-[#1E293B] p-4 rounded border border-[#334155] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 uppercase">minisoc3 Configuration Blueprint</span>
                        <span className="text-[10px] text-[#4ADE80] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          Zero-Secret Policy Enforced (Variables Only)
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded border border-[#334155]">
                        <button
                          onClick={() => setActiveSocConfigTab('compose')}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            activeSocConfigTab === 'compose'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                          }`}
                        >
                          soc/docker-compose.yml
                        </button>
                        <button
                          onClick={() => setActiveSocConfigTab('env')}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            activeSocConfigTab === 'env'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                          }`}
                        >
                          soc/.env.example
                        </button>
                        <button
                          onClick={() => setActiveSocConfigTab('logstash')}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            activeSocConfigTab === 'logstash'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                          }`}
                        >
                          logstash.conf
                        </button>
                        <button
                          onClick={() => setActiveSocConfigTab('logstash_yml')}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            activeSocConfigTab === 'logstash_yml'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                          }`}
                        >
                          logstash.yml
                        </button>
                      </div>
                    </div>

                    {activeSocConfigTab === 'compose' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                          <span>`~/aegis/soc/docker-compose.yml` (9 Services on `soc_net` bridge):</span>
                          <button
                            onClick={() =>
                              handleCopy(
                                `version: '3.8'\n\nnetworks:\n  soc_net:\n    driver: bridge\n\nservices:\n  # --- SHUFFLE SOAR (4 Services) ---\n  shuffle:\n    image: ghcr.io/shuffle/shuffle-frontend:latest\n    container_name: shuffle-frontend\n    ports:\n      - "3001:80"\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  shuffle-backend:\n    image: ghcr.io/shuffle/shuffle-backend:latest\n    container_name: shuffle-backend\n    environment:\n      - SHUFFLE_MONGO_DATABASE=shuffle\n      - SHUFFLE_MONGO_HOST=shuffle-database\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  shuffle-orborus:\n    image: ghcr.io/shuffle/shuffle-orborus:latest\n    container_name: shuffle-orborus\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  shuffle-database:\n    image: mongo:6\n    container_name: shuffle-database\n    volumes:\n      - shuffle_db:/data/db\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  # --- MISP THREAT INTEL (4 Official Services) ---\n  misp-core:\n    image: ghcr.io/misp/misp-docker/misp-core:latest\n    container_name: misp-core\n    ports:\n      - "8080:80"\n    environment:\n      - ADMIN_PASSPHRASE=\${MISP_ADMIN_PASSWORD}\n      - MYSQL_HOST=misp-db\n      - MYSQL_DATABASE=misp\n      - MYSQL_USER=misp\n      - MYSQL_PASSWORD=\${MISP_MYSQL_PASSWORD}\n      - REDIS_HOST=misp-redis\n      - REDIS_PASSWORD=\${REDIS_PASSWORD}\n      - GPG_PASSPHRASE=\${MISP_GPG_PASSPHRASE}\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  misp-modules:\n    image: ghcr.io/misp/misp-docker/misp-modules:latest\n    container_name: misp-modules\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  misp-db:\n    image: mariadb:10.11\n    container_name: misp-db\n    environment:\n      - MYSQL_ROOT_PASSWORD=\${MISP_MYSQL_ROOT_PASSWORD}\n      - MYSQL_DATABASE=misp\n      - MYSQL_USER=misp\n      - MYSQL_PASSWORD=\${MISP_MYSQL_PASSWORD}\n    volumes:\n      - misp_db_data:/var/lib/mysql\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  misp-redis:\n    image: valkey/valkey:7.2\n    container_name: misp-redis\n    command: ["valkey-server", "--requirepass", "\${REDIS_PASSWORD}"]\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  # --- LOGSTASH INGESTION & PIPELINE ---\n  logstash:\n    image: docker.elastic.co/logstash/logstash:8.19.13\n    container_name: soc-logstash\n    ports:\n      - "5044:5044"\n    volumes:\n      - ./logstash/pipeline/logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro\n      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro\n    environment:\n      - ES_USER=\${ES_USER}\n      - ES_PASSWORD=\${ES_PASSWORD}\n    networks:\n      - soc_net\n    restart: unless-stopped\n\n  # --- MAILPIT SMTP SINKHOLE ---\n  mailpit:\n    image: axllent/mailpit:latest\n    container_name: soc-mailpit\n    ports:\n      - "8025:8025"\n      - "1025:1025"\n    networks:\n      - soc_net\n    restart: unless-stopped\n\nvolumes:\n  shuffle_db:\n  misp_db_data:`,
                                'compose_code'
                              )
                            }
                            className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                          >
                            {copiedCode === 'compose_code' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode === 'compose_code' ? 'Copied!' : 'Copy YAML'}</span>
                          </button>
                        </div>
                        <div className="bg-[#0F172A] p-3 rounded border border-[#334155] text-[10px] font-mono text-[#4ADE80] max-h-72 overflow-y-auto whitespace-pre">
{`version: '3.8'

networks:
  soc_net:
    driver: bridge

services:
  # --- SHUFFLE SOAR (4 Services) ---
  shuffle:
    image: ghcr.io/shuffle/shuffle-frontend:latest
    container_name: shuffle-frontend
    ports:
      - "3001:80"
    networks:
      - soc_net
    restart: unless-stopped

  shuffle-backend:
    image: ghcr.io/shuffle/shuffle-backend:latest
    container_name: shuffle-backend
    environment:
      - SHUFFLE_MONGO_DATABASE=shuffle
      - SHUFFLE_MONGO_HOST=shuffle-database
    networks:
      - soc_net
    restart: unless-stopped

  shuffle-orborus:
    image: ghcr.io/shuffle/shuffle-orborus:latest
    container_name: shuffle-orborus
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - soc_net
    restart: unless-stopped

  shuffle-database:
    image: mongo:6
    container_name: shuffle-database
    volumes:
      - shuffle_db:/data/db
    networks:
      - soc_net
    restart: unless-stopped

  # --- MISP THREAT INTEL (4 Official Services) ---
  misp-core:
    image: ghcr.io/misp/misp-docker/misp-core:latest
    container_name: misp-core
    ports:
      - "8080:80"
    environment:
      - ADMIN_PASSPHRASE=\${MISP_ADMIN_PASSWORD}
      - MYSQL_HOST=misp-db
      - MYSQL_DATABASE=misp
      - MYSQL_USER=misp
      - MYSQL_PASSWORD=\${MISP_MYSQL_PASSWORD}
      - REDIS_HOST=misp-redis
      - REDIS_PASSWORD=\${REDIS_PASSWORD}
      - GPG_PASSPHRASE=\${MISP_GPG_PASSPHRASE}
    networks:
      - soc_net
    restart: unless-stopped

  misp-modules:
    image: ghcr.io/misp/misp-docker/misp-modules:latest
    container_name: misp-modules
    networks:
      - soc_net
    restart: unless-stopped

  misp-db:
    image: mariadb:10.11
    container_name: misp-db
    environment:
      - MYSQL_ROOT_PASSWORD=\${MISP_MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=misp
      - MYSQL_USER=misp
      - MYSQL_PASSWORD=\${MISP_MYSQL_PASSWORD}
    volumes:
      - misp_db_data:/var/lib/mysql
    networks:
      - soc_net
    restart: unless-stopped

  misp-redis:
    image: valkey/valkey:7.2
    container_name: misp-redis
    command: ["valkey-server", "--requirepass", "\${REDIS_PASSWORD}"]
    networks:
      - soc_net
    restart: unless-stopped

  # --- LOGSTASH INGESTION & PIPELINE ---
  logstash:
    image: docker.elastic.co/logstash/logstash:8.19.13
    container_name: soc-logstash
    ports:
      - "5044:5044"
    volumes:
      - ./logstash/pipeline/logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
    environment:
      - ES_USER=\${ES_USER}
      - ES_PASSWORD=\${ES_PASSWORD}
    networks:
      - soc_net
    restart: unless-stopped

  # --- MAILPIT SMTP SINKHOLE ---
  mailpit:
    image: axllent/mailpit:latest
    container_name: soc-mailpit
    ports:
      - "8025:8025"
      - "1025:1025"
    networks:
      - soc_net
    restart: unless-stopped

volumes:
  shuffle_db:
  misp_db_data:`}
                        </div>
                      </div>
                    )}

                    {activeSocConfigTab === 'env' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                          <span>`~/aegis/soc/.env.example` (Committed Template with Variable Placeholders):</span>
                          <button
                            onClick={() =>
                              handleCopy(
                                `# Elasticsearch credentials on minisoc1 (10.16.64.155)\nES_USER=logstash_internal\nES_PASSWORD=\${ES_PASSWORD}\n\n# MISP Official Stack Variables on minisoc3 (10.16.64.157)\nMISP_ADMIN_PASSWORD=\${MISP_ADMIN_PASSWORD}\nMISP_MYSQL_ROOT_PASSWORD=\${MISP_MYSQL_ROOT_PASSWORD}\nMISP_MYSQL_PASSWORD=\${MISP_MYSQL_PASSWORD}\nMISP_GPG_PASSPHRASE=\${MISP_GPG_PASSPHRASE}\nREDIS_PASSWORD=\${REDIS_PASSWORD}`,
                                'env_code'
                              )
                            }
                            className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                          >
                            {copiedCode === 'env_code' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode === 'env_code' ? 'Copied!' : 'Copy .env.example'}</span>
                          </button>
                        </div>
                        <div className="bg-[#0F172A] p-3 rounded border border-[#334155] text-[11px] font-mono text-[#F1F5F9]/90 whitespace-pre">
{`# Elasticsearch credentials on minisoc1 (10.16.64.155)
ES_USER=logstash_internal
ES_PASSWORD=\${ES_PASSWORD}

# MISP Official Stack Variables on minisoc3 (10.16.64.157)
MISP_ADMIN_PASSWORD=\${MISP_ADMIN_PASSWORD}
MISP_MYSQL_ROOT_PASSWORD=\${MISP_MYSQL_ROOT_PASSWORD}
MISP_MYSQL_PASSWORD=\${MISP_MYSQL_PASSWORD}
MISP_GPG_PASSPHRASE=\${MISP_GPG_PASSPHRASE}
REDIS_PASSWORD=\${REDIS_PASSWORD}`}
                        </div>
                        <p className="text-[10px] text-[#94A3B8]">
                          * Note: The real `.env` is gitignored on the AlmaLinux host. No actual secrets are stored in git or blueprints.
                        </p>
                      </div>
                    )}

                    {activeSocConfigTab === 'logstash' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                          <span>`~/aegis/soc/logstash/pipeline/logstash.conf` (Scheduled ES Query & Shuffle Hook):</span>
                          <button
                            onClick={() =>
                              handleCopy(
                                `input {\n  elasticsearch {\n    hosts => ["https://10.16.64.155:9200"]\n    index => "wazuh-alerts-*"\n    user => "\${ES_USER}"\n    password => "\${ES_PASSWORD}"\n    ssl => true\n    ssl_certificate_verification => false\n    query => '{ "query": { "range": { "rule.level": { "gte": 12 } } } }'\n    schedule => "* * * * *"\n  }\n}\n\nfilter {\n  mutate {\n    add_field => { "[soar][source]" => "wazuh_critical_feed" }\n  }\n}\n\noutput {\n  http {\n    url => "http://shuffle-backend:5001/api/v1/hooks/webhook_misp_enrichment"\n    http_method => "post"\n    format => "json"\n    mapping => {\n      "rule_id" => "%{[rule][id]}"\n      "rule_description" => "%{[rule][description]}"\n      "rule_level" => "%{[rule][level]}"\n      "agent_id" => "%{[agent][id]}"\n      "agent_name" => "%{[agent][name]}"\n      "agent_ip" => "%{[agent][ip]}"\n      "src_ip" => "%{[data][srcip]}"\n      "dest_ip" => "%{[data][dstip]}"\n      "full_log" => "%{[full_log]}"\n    }\n  }\n  stdout { codec => rubydebug }\n}`,
                                'logstash_conf'
                              )
                            }
                            className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                          >
                            {copiedCode === 'logstash_conf' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode === 'logstash_conf' ? 'Copied!' : 'Copy Pipeline'}</span>
                          </button>
                        </div>
                        <div className="bg-[#0F172A] p-3 rounded border border-[#334155] text-[10px] font-mono text-[#38BDF8] max-h-72 overflow-y-auto whitespace-pre">
{`input {
  elasticsearch {
    hosts => ["https://10.16.64.155:9200"]
    index => "wazuh-alerts-*"
    user => "\${ES_USER}"
    password => "\${ES_PASSWORD}"
    ssl => true
    ssl_certificate_verification => false
    query => '{ "query": { "range": { "rule.level": { "gte": 12 } } } }'
    schedule => "* * * * *"
  }
}

filter {
  mutate {
    add_field => { "[soar][source]" => "wazuh_critical_feed" }
  }
}

output {
  http {
    url => "http://shuffle-backend:5001/api/v1/hooks/webhook_misp_enrichment"
    http_method => "post"
    format => "json"
    mapping => {
      "rule_id" => "%{[rule][id]}"
      "rule_description" => "%{[rule][description]}"
      "rule_level" => "%{[rule][level]}"
      "agent_id" => "%{[agent][id]}"
      "agent_name" => "%{[agent][name]}"
      "agent_ip" => "%{[agent][ip]}"
      "src_ip" => "%{[data][srcip]}"
      "dest_ip" => "%{[data][dstip]}"
      "full_log" => "%{[full_log]}"
    }
  }
  stdout { codec => rubydebug }
}`}
                        </div>
                      </div>
                    )}

                    {activeSocConfigTab === 'logstash_yml' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                          <span>`~/aegis/soc/logstash/config/logstash.yml`:</span>
                          <button
                            onClick={() =>
                              handleCopy(
                                `http.host: "0.0.0.0"\nxpack.monitoring.enabled: false\npipeline.workers: 2\npipeline.batch.size: 125`,
                                'logstash_yml_code'
                              )
                            }
                            className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                          >
                            {copiedCode === 'logstash_yml_code' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode === 'logstash_yml_code' ? 'Copied!' : 'Copy YAML'}</span>
                          </button>
                        </div>
                        <div className="bg-[#0F172A] p-3 rounded border border-[#334155] text-[11px] font-mono text-[#F1F5F9]/90 whitespace-pre">
{`http.host: "0.0.0.0"
xpack.monitoring.enabled: false
pipeline.workers: 2
pipeline.batch.size: 125`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Abuse.ch Auto Feed Ingestion */}
              {activeMispTab === 'feeds' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#94A3B8]">
                    MISP on <strong className="text-purple-300">minisoc3 (10.16.64.157:8080)</strong> automatically ingests live threat intelligence feeds from Abuse.ch, converting raw malware payloads, C2 IP addresses, and malicious URLs into actionable attributes for correlation.
                  </div>

                  {/* Feed Status Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-[#1E293B] p-3 rounded border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-400 text-xs">URLhaus</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">ACTIVE (2h)</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Malicious URLs & payload distribution domains.</p>
                      <div className="text-[10px] text-[#F1F5F9]/80 space-y-0.5">
                        <div>• Format: CSV / MISP Feed</div>
                        <div>• Auto-Publish: Enabled</div>
                        <div>• Feed ID: #1</div>
                      </div>
                    </div>

                    <div className="bg-[#1E293B] p-3 rounded border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-400 text-xs">MalwareBazaar</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">ACTIVE (2h)</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Hashes (MD5, SHA256, ImpHash) of sample binaries.</p>
                      <div className="text-[10px] text-[#F1F5F9]/80 space-y-0.5">
                        <div>• Format: MISP JSON</div>
                        <div>• Tags: `malware_bazaar`</div>
                        <div>• Feed ID: #2</div>
                      </div>
                    </div>

                    <div className="bg-[#1E293B] p-3 rounded border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-400 text-xs">Feodo Tracker</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">ACTIVE (1h)</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Botnet Command & Control (C2) IP addresses.</p>
                      <div className="text-[10px] text-[#F1F5F9]/80 space-y-0.5">
                        <div>• Target: Emotet, Qakbot, Cobalt</div>
                        <div>• Auto-Alert: Trigger SOAR</div>
                        <div>• Feed ID: #3</div>
                      </div>
                    </div>

                    <div className="bg-[#1E293B] p-3 rounded border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-400 text-xs">ThreatFox</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">ACTIVE (1h)</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mb-2">Community IOC indicators with malware tags.</p>
                      <div className="text-[10px] text-[#F1F5F9]/80 space-y-0.5">
                        <div>• Category: Multi-Attribute</div>
                        <div>• Confidence: High (&gt;75)</div>
                        <div>• Feed ID: #4</div>
                      </div>
                    </div>
                  </div>

                  {/* Automatic Ingestion Configuration Instructions */}
                  <div className="bg-[#1E293B] p-4 rounded border border-[#334155] space-y-3">
                    <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Automated Ingestion Setup Commands & Cron Schedule</span>
                      <RefreshCw className="w-4 h-4 text-purple-400" />
                    </h5>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                        <span>1. MISP Cake Console Feed Sync Command (`misp-core` container on minisoc3):</span>
                        <button
                          onClick={() => handleCopy('docker exec -it misp-core /var/www/MISP/app/Console/cake Server fetchFeed all', 'cake')}
                          className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          {copiedCode === 'cake' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode === 'cake' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-[#0F172A] p-2.5 rounded border border-[#334155] text-xs font-mono text-[#4ADE80]">
                        docker exec -it misp-core /var/www/MISP/app/Console/cake Server fetchFeed all
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mt-2">
                        <span>2. Automated Host Cron Schedule (`/etc/cron.d/misp-abusech` on minisoc3):</span>
                        <button
                          onClick={() => handleCopy('0 */2 * * * root docker exec misp-core /var/www/MISP/app/Console/cake Server fetchFeed all\n0 3 * * * root docker exec misp-core /var/www/MISP/app/Console/cake Server cacheFeeds all', 'cron')}
                          className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          {copiedCode === 'cron' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode === 'cron' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-[#0F172A] p-2.5 rounded border border-[#334155] text-xs font-mono text-[#94A3B8]">
                        <div className="text-[#38BDF8]"># Auto-fetch Abuse.ch feeds every 2 hours via official misp-core container</div>
                        <div>0 */2 * * * root docker exec misp-core /var/www/MISP/app/Console/cake Server fetchFeed all</div>
                        <div>0 3 * * * root docker exec misp-core /var/www/MISP/app/Console/cake Server cacheFeeds all</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Manual IOC Addition Instructions & REST API */}
              {activeMispTab === 'manual' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#94A3B8]">
                    Instructions for SOC Analysts to manually submit new Indicators of Compromise (IOCs) into MISP and trigger the Shuffle SOAR enrichment pipeline.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Method A: MISP GUI Instructions */}
                    <div className="bg-[#1E293B] p-4 rounded border border-[#334155] space-y-2.5">
                      <h5 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4" />
                        <span>Method A: MISP Web User Interface</span>
                      </h5>
                      <ol className="text-[11px] text-[#F1F5F9]/80 space-y-1.5 list-decimal list-inside leading-relaxed">
                        <li>Navigate to <strong className="text-white">http://10.16.64.157:8080</strong> and authenticate.</li>
                        <li>Click <strong className="text-white">Events → Add Event</strong> in the left navigation sidebar.</li>
                        <li>Fill Event Details:
                          <ul className="pl-4 list-disc text-[#94A3B8] text-[10px]">
                            <li>Event Info: <code className="text-purple-300">Manual Ingestion - C2 IP 185.220.101.5</code></li>
                            <li>Threat Level: <code className="text-red-300">High (2)</code> | Analysis: <code className="text-amber-300">Initial (1)</code></li>
                          </ul>
                        </li>
                        <li>Click <strong className="text-white">Add Attribute</strong>:
                          <ul className="pl-4 list-disc text-[#94A3B8] text-[10px]">
                            <li>Category: <code className="text-purple-300">Network activity</code></li>
                            <li>Type: <code className="text-cyan-300">ip-dst</code> or <code className="text-cyan-300">url</code> or <code className="text-cyan-300">sha256</code></li>
                            <li>Value: <code className="text-emerald-300">185.220.101.5</code></li>
                          </ul>
                        </li>
                        <li>Add Tag: <code className="text-amber-300">tlp:amber</code>, <code className="text-purple-300">soar:pending_enrichment</code>.</li>
                        <li>Click <strong className="text-white">Publish Event</strong> to fire the ZMQ / Webhook alert to Shuffle SOAR.</li>
                      </ol>
                    </div>

                    {/* Method B: REST API CLI Command */}
                    <div className="bg-[#1E293B] p-4 rounded border border-[#334155] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-[#4ADE80] uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-4 h-4" />
                          <span>Method B: REST API (curl Command)</span>
                        </h5>
                        <button
                          onClick={() =>
                            handleCopy(
                              `curl -s -k -X POST "http://10.16.64.157:8080/events/add" \\\n  -H "Authorization: YOUR_MISP_API_KEY" \\\n  -H "Accept: application/json" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "Event": {\n      "info": "Manual Threat Ingestion - Suspicious C2 IP",\n      "threat_level_id": "2",\n      "analysis": "1",\n      "Attribute": [\n        {\n          "type": "ip-dst",\n          "value": "185.220.101.5",\n          "comment": "C2 IP flagged during Zone 3 Traefik triage"\n        }\n      ]\n    }\n  }'`,
                              'api_cmd'
                            )
                          }
                          className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          {copiedCode === 'api_cmd' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode === 'api_cmd' ? 'Copied!' : 'Copy curl'}</span>
                        </button>
                      </div>

                      <div className="bg-[#0F172A] p-2.5 rounded border border-[#334155] text-[10px] font-mono text-[#4ADE80] overflow-x-auto whitespace-pre">
{`curl -s -k -X POST "http://10.16.64.157:8080/events/add" \\
  -H "Authorization: YOUR_MISP_API_KEY" \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/json" \\
  -d '{
    "Event": {
      "info": "Manual Threat Ingestion - Suspicious C2 IP",
      "threat_level_id": "2",
      "analysis": "1",
      "Attribute": [
        {
          "type": "ip-dst",
          "value": "185.220.101.5",
          "comment": "C2 IP flagged during Zone 3 Traefik triage"
        }
      ]
    }
  }'`}
                      </div>

                      <div className="text-[10px] text-[#94A3B8]">
                        <strong className="text-white">Note:</strong> When posted, MISP triggers Shuffle SOAR webhook listener on <code className="text-purple-300">http://10.16.64.157:3001/api/v1/hooks/webhook_misp_enrichment</code>.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Interactive Live SOAR Workflow Simulator */}
              {activeMispTab === 'soar' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Interactive SOAR Workflow Execution Simulator ("Mahoraga v2.1")</span>
                      </h5>
                      <p className="text-[11px] text-[#94A3B8]">
                        Simulate submitting a custom IOC to MISP and witness the real-time automated Shuffle SOAR enrichment & containment pipeline!
                      </p>
                    </div>

                    <button
                      onClick={handleRunSoarSimulation}
                      disabled={isSimulating}
                      className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isSimulating
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                      }`}
                    >
                      {isSimulating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Executing Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Run Live SOAR Simulation</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Input form for simulation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1E293B] p-3 rounded border border-[#334155] text-xs">
                    <div>
                      <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">IOC Type</label>
                      <select
                        value={iocType}
                        onChange={(e) => setIocType(e.target.value as any)}
                        className="w-full bg-[#0F172A] border border-[#334155] text-white rounded p-1.5 focus:outline-none focus:border-purple-400"
                      >
                        <option value="ip-dst">Destination IP (ip-dst)</option>
                        <option value="url">Malicious URL (url)</option>
                        <option value="sha256">SHA256 Payload Hash</option>
                        <option value="domain">Malicious Domain</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">IOC Value</label>
                      <input
                        type="text"
                        value={iocValue}
                        onChange={(e) => setIocValue(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] text-emerald-400 font-mono rounded p-1.5 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Analyst Context / Note</label>
                      <input
                        type="text"
                        value={iocComment}
                        onChange={(e) => setIocComment(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] text-slate-200 rounded p-1.5 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Visual SOAR Pipeline Node Tracker */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[10px] font-mono">
                    <div
                      className={`p-2.5 rounded border transition-all ${
                        simStep >= 1
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      <div className="font-bold mb-1 flex items-center justify-between">
                        <span>Node 1: Webhook</span>
                        {simStep >= 1 && <Check className="w-3 h-3 text-[#4ADE80]" />}
                      </div>
                      <div>MISP Event Hook</div>
                    </div>

                    <div
                      className={`p-2.5 rounded border transition-all ${
                        simStep >= 3
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      <div className="font-bold mb-1 flex items-center justify-between">
                        <span>Node 2: Threat Intel</span>
                        {simStep >= 3 && <Check className="w-3 h-3 text-[#4ADE80]" />}
                      </div>
                      <div>Abuse.ch Lookup</div>
                    </div>

                    <div
                      className={`p-2.5 rounded border transition-all ${
                        simStep >= 4
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      <div className="font-bold mb-1 flex items-center justify-between">
                        <span>Node 3: Telemetry</span>
                        {simStep >= 4 && <Check className="w-3 h-3 text-[#4ADE80]" />}
                      </div>
                      <div>Elasticsearch Search</div>
                    </div>

                    <div
                      className={`p-2.5 rounded border transition-all ${
                        simStep >= 5
                          ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      <div className="font-bold mb-1 flex items-center justify-between">
                        <span>Node 4: Containment</span>
                        {simStep >= 5 && <Check className="w-3 h-3 text-[#4ADE80]" />}
                      </div>
                      <div>Wazuh Active Response</div>
                    </div>

                    <div
                      className={`p-2.5 rounded border transition-all ${
                        simStep >= 6
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      <div className="font-bold mb-1 flex items-center justify-between">
                        <span>Node 5: Alert & Tag</span>
                        {simStep >= 6 && <Check className="w-3 h-3 text-[#4ADE80]" />}
                      </div>
                      <div>Slack & MISP Tag</div>
                    </div>
                  </div>

                  {/* Terminal Log Output Window */}
                  <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-1.5 font-mono text-[11px] min-h-[140px] max-h-[220px] overflow-y-auto">
                    <div className="text-[10px] text-[#38BDF8] font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Shuffle SOAR Execution Console Log (`http://10.16.64.157:3001`)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>

                    {simLogs.length === 0 ? (
                      <div className="text-[#94A3B8] italic text-center py-6">
                        Click "Run Live SOAR Simulation" above to trigger an automated MISP IOC enrichment test pipeline.
                      </div>
                    ) : (
                      simLogs.map((log, index) => (
                        <div
                          key={index}
                          className={`${
                            log.includes('Match') || log.includes('MATCH FOUND')
                              ? 'text-amber-300 font-semibold'
                              : log.includes('ACTIVE RESPONSE') || log.includes('Isolated')
                              ? 'text-red-400 font-bold'
                              : log.includes('COMPLETE')
                              ? 'text-[#4ADE80] font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

