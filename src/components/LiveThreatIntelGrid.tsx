import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Radio,
  Play,
  Pause,
  Download,
  Terminal,
  Activity,
  Zap,
  Globe,
  Database,
  Crosshair,
  Lock,
  Layers,
  X,
  BarChart3,
  TrendingUp,
  Flame,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

export interface ThreatIntelItem {
  id: string;
  indicator: string;
  type: 'ip-src' | 'ip-dst' | 'hash-sha256' | 'domain' | 'url' | 'signature-sid';
  feed: 'MISP' | 'Suricata ET Open';
  feedOrigin: string;
  threatName: string;
  category: string;
  mitreId: string;
  mitreTactic: string;
  severityScore: number; // 0.0 - 10.0
  severityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number; // percentage
  timestamp: string;
  ingestionLagSec: number;
  status: 'ACTIVE_BLOCK' | 'ENRICHED' | 'ALERT_FIRED' | 'MONITORED';
  matchedAction: string;
  targetZone: string;
  evidence: string;
  rawJson: Record<string, unknown>;
}

const INITIAL_IOCS: ThreatIntelItem[] = [
  {
    id: 'ioc-101',
    indicator: '192.168.19.183',
    type: 'ip-src',
    feed: 'MISP',
    feedOrigin: 'misp-core · Event #2 (AEGIS test IOC)',
    threatName: 'Kali Linux Adversary Station — Multi-Vector Probing',
    category: 'Network Reconnaissance & Exploit',
    mitreId: 'T1190',
    mitreTactic: 'Initial Access',
    severityScore: 9.2,
    severityLevel: 'CRITICAL',
    confidence: 100,
    timestamp: '2026-09-24 18:42:10 UTC',
    ingestionLagSec: 3.2,
    status: 'ENRICHED',
    matchedAction: 'Shuffle SOAR Enriched · Discord Notified',
    targetZone: 'Zone 1 (Kali) → Zone 3 (Gateway)',
    evidence: 'X-Result-Count: 1 from MISP restSearch query via Shuffle raw HTTP node; matches Event 2.',
    rawJson: {
      event_id: '2',
      event_info: 'AEGIS test IOC - Kali Linux Attacker Station',
      attribute: {
        category: 'Network activity',
        type: 'ip-src',
        value: '192.168.19.183',
        to_ids: true,
        distribution: 'This community only',
      },
      tags: ['aegis:verified', 'tlp:amber', 'malware:exploit-kit'],
      wazuh_correlation: { rule_id: '100100', rule_level: 12, agent: 'ztagateway' },
    },
  },
  {
    id: 'ioc-102',
    indicator: 'SID:2210045',
    type: 'signature-sid',
    feed: 'Suricata ET Open',
    feedOrigin: 'Suricata 7.x · Emerging Threats Open Ruleset (Rule #2210045)',
    threatName: 'ET WEB_SERVER SQL Injection Attempt in HTTP POST Data',
    category: 'Web Application Exploit',
    mitreId: 'T1190',
    mitreTactic: 'Initial Access',
    severityScore: 8.9,
    severityLevel: 'HIGH',
    confidence: 96,
    timestamp: '2026-09-24 18:38:04 UTC',
    ingestionLagSec: 4.1,
    status: 'ACTIVE_BLOCK',
    matchedAction: 'Coraza WAF 403 Forbidden · Suricata Fast Logged',
    targetZone: 'Zone 3 (proxy_net)',
    evidence: 'Suricata eve.json stream alert severity 1; correlated with Coraza Rule 942100 inline block.',
    rawJson: {
      alert: {
        action: 'allowed',
        gid: 1,
        signature_id: 2210045,
        rev: 2,
        signature: 'ET WEB_SERVER SQL Injection Attempt in HTTP POST Data',
        category: 'Web Application Attack',
        severity: 1,
      },
      src_ip: '192.168.19.183',
      dest_ip: '192.168.50.20',
      dest_port: 3000,
      proto: 'TCP',
      coraza_verdict: { status: 403, rule_id: 942100, msg: 'SQL Injection Attack Detected via libinjection' },
    },
  },
  {
    id: 'ioc-103',
    indicator: '185.220.101.5',
    type: 'ip-src',
    feed: 'MISP',
    feedOrigin: 'Abuse.ch Feodo Tracker & Tor Exit Node Feed',
    threatName: 'Known Bulletproof Hosting / Tor Exit C2 Ingress',
    category: 'Command and Control Proxy',
    mitreId: 'T1071.001',
    mitreTactic: 'Command and Control',
    severityScore: 9.6,
    severityLevel: 'CRITICAL',
    confidence: 98,
    timestamp: '2026-09-24 18:25:30 UTC',
    ingestionLagSec: 2.8,
    status: 'ENRICHED',
    matchedAction: 'Authelia Forward-Auth Blocked · IP Logged',
    targetZone: 'Zone 3 (External Ingress)',
    evidence: 'Flagged in MISP Feed #14 (Abuse.ch Feodo) with 48 historical malicious campaigns.',
    rawJson: {
      source: 'Abuse.ch Feodo Tracker',
      ip: '185.220.101.5',
      asn: 'AS208323',
      country: 'DE',
      threat_level_id: '1',
      analysis: '2',
      matching_rules: ['suricata-tor-exit', 'authelia-ip-reputation'],
    },
  },
  {
    id: 'ioc-104',
    indicator: 'SID:2024218',
    type: 'signature-sid',
    feed: 'Suricata ET Open',
    feedOrigin: 'Suricata 7.x · Emerging Threats Open Ruleset (Rule #2024218)',
    threatName: 'ET SCAN Nmap Scripting Engine Probe / Rapid Scan Burst',
    category: 'Port & Service Enumeration',
    mitreId: 'T1046',
    mitreTactic: 'Discovery',
    severityScore: 7.4,
    severityLevel: 'MEDIUM',
    confidence: 90,
    timestamp: '2026-09-24 18:15:12 UTC',
    ingestionLagSec: 8.5,
    status: 'ALERT_FIRED',
    matchedAction: 'Elastic Security Rule 1 Fired (180 Real Alerts)',
    targetZone: 'Zone 3 (Gateway Host: 192.168.19.173)',
    evidence: 'Triggered 180 alerts during nmap full-port scan test; Filebeat queue lag mitigated via 15m window (F-022).',
    rawJson: {
      alert_count: 180,
      rule_name: 'Suricata Priority Alert',
      kql: 'event.dataset: "suricata.eve" and event.kind: "alert" and event.severity <= 2',
      observed_burst_pps: 1420,
      filebeat_queue_filled_pct: 1.0,
      ingestion_lag_minutes: 8.5,
    },
  },
  {
    id: 'ioc-105',
    indicator: 'ea384c5689ef03b9b41a547289b4f9104c86e06b2c9a1e05d2138a4d70b39f1c',
    type: 'hash-sha256',
    feed: 'MISP',
    feedOrigin: 'misp-core · CIRCL OSINT Malware Hashes',
    threatName: 'Mimikatz x64 LSASS Memory Dumping Payload',
    category: 'Credential Access Artifact',
    mitreId: 'T1003.001',
    mitreTactic: 'Credential Access',
    severityScore: 9.8,
    severityLevel: 'CRITICAL',
    confidence: 100,
    timestamp: '2026-09-24 17:59:44 UTC',
    ingestionLagSec: 1.9,
    status: 'ACTIVE_BLOCK',
    matchedAction: 'Sysmon Event ID 10 Alert · Wazuh Rule 61640',
    targetZone: 'Zone 2 (CORP-PC01: 192.168.50.21)',
    evidence: 'Sysmon Process Access telemetry matched against MISP binary hash catalog; host-deny triggered.',
    rawJson: {
      sha256: 'ea384c5689ef03b9b41a547289b4f9104c86e06b2c9a1e05d2138a4d70b39f1c',
      imphash: 'a2b109c...',
      malware_family: 'Mimikatz',
      sysmon_event_id: 10,
      target_process: 'C:\\Windows\\System32\\lsass.exe',
      source_image: 'C:\\Users\\victim\\AppData\\Local\\Temp\\mimi.exe',
    },
  },
  {
    id: 'ioc-106',
    indicator: 'juiceshop.zerotrust.lan/rest/user/login',
    type: 'url',
    feed: 'Suricata ET Open',
    feedOrigin: 'Coraza CRS & Traefik Dynamic Telemetry Stream',
    threatName: 'SQLi Authentication Bypass Payload Target',
    category: 'Web Authentication Bypass Probe',
    mitreId: 'T1190',
    mitreTactic: 'Initial Access',
    severityScore: 7.9,
    severityLevel: 'HIGH',
    confidence: 94,
    timestamp: '2026-09-24 17:45:00 UTC',
    ingestionLagSec: 2.1,
    status: 'ACTIVE_BLOCK',
    matchedAction: 'Coraza HTTP 403 Forbidden · Traefik Ingress Stopped',
    targetZone: 'Zone 2 (CORP-WEB01: 192.168.50.20:3000)',
    evidence: 'sqlmap payload \' or 1=1-- blocked by OWASP CRS Rule 942100; decoupled from Authelia.',
    rawJson: {
      target_url: 'https://juiceshop.zerotrust.lan/rest/user/login',
      payload_sample: "' OR 1=1 --",
      caddy_response_code: 403,
      crs_anomaly_score: 15,
      waf_rule_engine: 'Coraza WAF (Caddy v2 + OWASP CRS v4)',
    },
  },
  {
    id: 'ioc-107',
    indicator: '45.142.214.12',
    type: 'ip-dst',
    feed: 'MISP',
    feedOrigin: 'misp-core · Event #104 (Sliver C2 Infrastructure)',
    threatName: 'Sliver Adversary Simulation mTLS C2 Listener',
    category: 'Command and Control Beacon',
    mitreId: 'T1071.001',
    mitreTactic: 'Command and Control',
    severityScore: 8.8,
    severityLevel: 'HIGH',
    confidence: 95,
    timestamp: '2026-09-24 17:12:30 UTC',
    ingestionLagSec: 3.5,
    status: 'MONITORED',
    matchedAction: 'Zeek ssl.log Flagged · Certificate Subject Logged',
    targetZone: 'Zone 1 (Threatscape C2)',
    evidence: 'Zeek detected non-standard self-signed x509 beacon traffic matching Sliver C2 mTLS profile.',
    rawJson: {
      ip: '45.142.214.12',
      port: 8888,
      proto: 'tcp/mTLS',
      framework: 'Sliver C2',
      zeek_stream: '.ds-filebeat-8.19.13-zeek-000001',
      ja3_fingerprint: '6734f37431670b3ab4292b8f60f29984',
    },
  },
  {
    id: 'ioc-108',
    indicator: 'SID:2803814',
    type: 'signature-sid',
    feed: 'Suricata ET Open',
    feedOrigin: 'Suricata 7.x · Emerging Threats Open Ruleset (Rule #2803814)',
    threatName: 'ET MALWARE Cobalt Strike / Sliver Default HTTP Beaconing',
    category: 'C2 Traffic Signature',
    mitreId: 'T1071.001',
    mitreTactic: 'Command and Control',
    severityScore: 9.0,
    severityLevel: 'CRITICAL',
    confidence: 97,
    timestamp: '2026-09-24 16:55:18 UTC',
    ingestionLagSec: 2.4,
    status: 'ALERT_FIRED',
    matchedAction: 'Wazuh Alert Level 12 · Logstash Triggered',
    targetZone: 'Zone 3 (br_proxy)',
    evidence: 'Suricata payload regex match on default user-agent header; forwarded to Logstash webhook.',
    rawJson: {
      signature_id: 2803814,
      classtype: 'trojan-activity',
      header_matched: 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      alert_threshold: '1 alert per 60 seconds',
    },
  },
  {
    id: 'ioc-109',
    indicator: '103.203.57.18',
    type: 'ip-src',
    feed: 'MISP',
    feedOrigin: 'misp-core · AbuseIPDB 100% Confidence Report',
    threatName: 'Distributed Credential Stuffing & Authelia 1FA Scanner',
    category: 'Credential Stuffing Bot',
    mitreId: 'T1110.001',
    mitreTactic: 'Credential Access',
    severityScore: 7.2,
    severityLevel: 'HIGH',
    confidence: 92,
    timestamp: '2026-09-24 16:30:45 UTC',
    ingestionLagSec: 5.1,
    status: 'ALERT_FIRED',
    matchedAction: 'Elastic Security Rule 2 Fired (5+ Failures Grouped)',
    targetZone: 'Zone 3 (Authelia Gateway)',
    evidence: 'Authelia brute-force threshold rule grouped by remote_ip.keyword fired consolidated alert.',
    rawJson: {
      remote_ip: '103.203.57.18',
      failed_attempts: 7,
      targeted_usernames: ['admin', 'root', 'support', 'testuser'],
      authelia_msg: 'Unsuccessful 1FA authentication attempt',
      rule_type: 'threshold',
      window: '5m',
    },
  },
  {
    id: 'ioc-110',
    indicator: 'evil-portal.zerotrust.phish',
    type: 'domain',
    feed: 'MISP',
    feedOrigin: 'misp-core · Phishing Campaign Feed (Event #88)',
    threatName: 'MFA Proxy Phishing Domain (Mailpit Sinkhole Target)',
    category: 'Credential Harvesting Domain',
    mitreId: 'T1566.002',
    mitreTactic: 'Initial Access',
    severityScore: 8.4,
    severityLevel: 'HIGH',
    confidence: 93,
    timestamp: '2026-09-24 16:05:22 UTC',
    ingestionLagSec: 3.1,
    status: 'ACTIVE_BLOCK',
    matchedAction: 'Traefik Wildcard TLS Reject · Sinkhole Captured',
    targetZone: 'Zone 3 (Mailpit: 192.168.19.173:8025)',
    evidence: 'Simulated phishing link routed to Mailpit sinkhole; subject header parsed for credential telemetry.',
    rawJson: {
      domain: 'evil-portal.zerotrust.phish',
      mailpit_message_id: 'msg-9218',
      sender: 'hr-security-update@evil-portal.zerotrust.phish',
      sinkhole_status: 'Dev/Test isolated; SPF/DKIM validation triggered',
    },
  },
];

export interface HourlyThreatMetric {
  time: string;
  hourNum: number;
  misp: number;
  suricata: number;
  critical: number;
  total: number;
  eventNote?: string;
}

export const HOURLY_24H_DATA: HourlyThreatMetric[] = [
  { time: '00:00', hourNum: 0, misp: 2, suricata: 3, critical: 0, total: 5 },
  { time: '01:00', hourNum: 1, misp: 1, suricata: 4, critical: 0, total: 5 },
  { time: '02:00', hourNum: 2, misp: 3, suricata: 2, critical: 0, total: 5 },
  { time: '03:00', hourNum: 3, misp: 4, suricata: 3, critical: 1, total: 7 },
  { time: '04:00', hourNum: 4, misp: 2, suricata: 1, critical: 0, total: 3 },
  { time: '05:00', hourNum: 5, misp: 1, suricata: 2, critical: 0, total: 3 },
  { time: '06:00', hourNum: 6, misp: 3, suricata: 5, critical: 0, total: 8 },
  { time: '07:00', hourNum: 7, misp: 5, suricata: 4, critical: 1, total: 9 },
  { time: '08:00', hourNum: 8, misp: 6, suricata: 8, critical: 1, total: 14 },
  { time: '09:00', hourNum: 9, misp: 8, suricata: 11, critical: 2, total: 19 },
  { time: '10:00', hourNum: 10, misp: 12, suricata: 9, critical: 2, total: 21, eventNote: 'OpenLDAP / Authelia MFA sync test' },
  { time: '11:00', hourNum: 11, misp: 9, suricata: 7, critical: 1, total: 16 },
  { time: '12:00', hourNum: 12, misp: 22, suricata: 14, critical: 3, total: 36, eventNote: 'Abuse.ch Feodo Tracker IOC sync' },
  { time: '13:00', hourNum: 13, misp: 14, suricata: 8, critical: 1, total: 22 },
  { time: '14:00', hourNum: 14, misp: 11, suricata: 12, critical: 2, total: 23 },
  { time: '15:00', hourNum: 15, misp: 15, suricata: 16, critical: 3, total: 31 },
  { time: '16:00', hourNum: 16, misp: 18, suricata: 24, critical: 4, total: 42, eventNote: 'Authelia brute-force test (Rule 2 trigger)' },
  { time: '17:00', hourNum: 17, misp: 26, suricata: 28, critical: 6, total: 54, eventNote: 'Mimikatz dump & Sliver C2 beaconing' },
  { time: '18:00', hourNum: 18, misp: 38, suricata: 154, critical: 14, total: 192, eventNote: 'PEAK: Nmap 65k scan (180 alerts) + sqlmap' },
  { time: '19:00', hourNum: 19, misp: 24, suricata: 32, critical: 5, total: 56, eventNote: 'Shuffle SOAR aegis_soar_v1 live trigger' },
  { time: '20:00', hourNum: 20, misp: 16, suricata: 18, critical: 2, total: 34 },
  { time: '21:00', hourNum: 21, misp: 12, suricata: 11, critical: 1, total: 23 },
  { time: '22:00', hourNum: 22, misp: 8, suricata: 9, critical: 1, total: 17 },
  { time: '23:00', hourNum: 23, misp: 6, suricata: 6, critical: 0, total: 12 },
];

export const LiveThreatIntelGrid: React.FC = () => {
  const [items, setItems] = useState<ThreatIntelItem[]>(INITIAL_IOCS);
  const [filterFeed, setFilterFeed] = useState<'ALL' | 'MISP' | 'SURICATA'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIoc, setSelectedIoc] = useState<ThreatIntelItem | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentFlashId, setRecentFlashId] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'BAR' | 'AREA'>('BAR');
  const [selectedHour, setSelectedHour] = useState<string | null>(null);

  // Live feed simulation ticker
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      // Simulate real-time stream pulse: update timestamps and randomize slight ingestion lag
      setItems((prev) => {
        const randomIndex = Math.floor(Math.random() * prev.length);
        const target = prev[randomIndex];
        const updated = [...prev];
        const now = new Date();
        const timeStr = `${now.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
        updated[randomIndex] = {
          ...target,
          timestamp: timeStr,
          ingestionLagSec: Number((Math.random() * 4 + 1.2).toFixed(1)),
        };
        setRecentFlashId(target.id);
        setTimeout(() => setRecentFlashId(null), 1500);
        return updated;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        ingestionLagSec: Number((Math.random() * 3 + 1.1).toFixed(1)),
      }))
    );
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis_threat_intel_feed_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedHour) {
        const hourPrefix = selectedHour.slice(0, 2);
        if (!item.timestamp.includes(` ${hourPrefix}:`)) return false;
      }
      if (filterFeed === 'MISP' && item.feed !== 'MISP') return false;
      if (filterFeed === 'SURICATA' && item.feed !== 'Suricata ET Open') return false;
      if (filterSeverity !== 'ALL' && item.severityLevel !== filterSeverity) return false;
      if (filterType !== 'ALL' && item.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.indicator.toLowerCase().includes(q) ||
          item.threatName.toLowerCase().includes(q) ||
          item.mitreId.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.matchedAction.toLowerCase().includes(q) ||
          item.targetZone.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, selectedHour, filterFeed, filterSeverity, filterType, searchQuery]);

  // Metrics
  const criticalCount = items.filter((i) => i.severityLevel === 'CRITICAL').length;
  const highCount = items.filter((i) => i.severityLevel === 'HIGH').length;
  const mispCount = items.filter((i) => i.feed === 'MISP').length;
  const suricataCount = items.filter((i) => i.feed === 'Suricata ET Open').length;

  const total24hIndicators = HOURLY_24H_DATA.reduce((sum, h) => sum + h.total, 0);
  const peakHour = HOURLY_24H_DATA.reduce((max, h) => (h.total > max.total ? h : max), HOURLY_24H_DATA[0]);
  const mispTotal24h = HOURLY_24H_DATA.reduce((sum, h) => sum + h.misp, 0);
  const suricataTotal24h = HOURLY_24H_DATA.reduce((sum, h) => sum + h.suricata, 0);

  // Custom Recharts Tooltip Component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderChartTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as HourlyThreatMetric;

    return (
      <div className="bg-[#090D16] border border-[#38BDF8]/40 rounded p-2.5 font-mono text-[11px] shadow-2xl space-y-1.5 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-1">
          <span className="text-white font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#00d4ff]" />
            {label} UTC
          </span>
          <span className="text-[10px] text-amber-300 font-semibold">
            {data.total} Total IOCs
          </span>
        </div>

        {data.eventNote && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 font-sans font-semibold">
            <Flame className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{data.eventNote}</span>
          </div>
        )}

        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[#38BDF8]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#38BDF8]" />
              MISP Ingestion:
            </span>
            <span className="font-bold">{data.misp}</span>
          </div>

          <div className="flex items-center justify-between text-amber-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#F59E0B]" />
              Suricata ET Open:
            </span>
            <span className="font-bold">{data.suricata}</span>
          </div>

          {data.critical > 0 && (
            <div className="flex items-center justify-between text-rose-400 border-t border-[#30363D]/50 pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-rose-500" />
                Critical Events:
              </span>
              <span className="font-bold">{data.critical}</span>
            </div>
          )}
        </div>

        <div className="text-[9px] text-[#64748B] pt-0.5 italic">
          Click bar to filter/highlight timeframe
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-5 font-mono text-[12px] space-y-4 shadow-xl">
      {/* Top Banner & Feed Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#30363D]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Radio className="w-4 h-4 text-[#00d4ff] animate-pulse" />
            <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider">
              Live Threat Intelligence Feeds & Detection Grid
            </h3>
            <span className="text-[#64748B]">/</span>
            <span className="text-xs text-[#00ff41] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41]" />
              MISP & Suricata ET Open Stream
            </span>
          </div>
          <div className="text-xs text-[#8B949E] flex flex-wrap items-center gap-2">
            <span>Zone 4 Automation Node (<span className="text-[#38BDF8]">minisoc3: 10.16.64.157</span>)</span>
            <span aria-hidden="true">·</span>
            <span>Zone 3 Sensor (<span className="text-[#38BDF8]">ztagateway: proxy_net</span>)</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Attribute Correlation & Anomaly Scoring</span>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer border ${
              isLiveStreaming
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={isLiveStreaming ? 'Pause live stream polling' : 'Resume live stream polling'}
          >
            {isLiveStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Streaming</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Paused</span>
              </>
            )}
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
            title="Force immediate feed synchronization"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Feeds</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
            title="Export filtered IOCs as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Live Metric Strip (Strict Zero-Pill: Clean unboxed typography with typographic dividers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0F172A] p-3 rounded-lg border border-[#30363D]">
        <div className="space-y-0.5">
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Feed Sources</div>
          <div className="text-xs font-bold text-[#F1F5F9]">
            MISP Core <span className="text-[#64748B]">/</span> Suricata ET Open
          </div>
          <div className="text-[11px] text-[#8B949E]">
            {mispCount} MISP IOCs · {suricataCount} Signatures
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Severity Threshold</div>
          <div className="text-xs font-bold text-rose-400">
            {criticalCount} Critical <span className="text-[#64748B]">·</span> {highCount} High
          </div>
          <div className="text-[11px] text-[#8B949E]">
            Avg CVSS / Threat Score: <span className="text-[#F1F5F9]">8.4</span>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Enrichment Speed</div>
          <div className="text-xs font-bold text-[#00ff41]">
            99.4% &lt; 120ms
          </div>
          <div className="text-[11px] text-[#8B949E]">
            Shuffle raw HTTP node (F-025 fix)
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Sensor Coverage</div>
          <div className="text-xs font-bold text-[#38BDF8]">
            52,256 ET Rules Active
          </div>
          <div className="text-[11px] text-[#8B949E]">
            proxy_net inline + Filebeat ECS
          </div>
        </div>
      </div>

      {/* 24-Hour Threat Indicator Frequency & Trend Graph (Recharts) */}
      <div className="bg-[#0F172A] border border-[#30363D] rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#30363D]">
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 className="w-4 h-4 text-[#00d4ff]" />
            <h4 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider">
              24-Hour Threat Indicator Ingestion Velocity & Burst Frequency
            </h4>
            {selectedHour ? (
              <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded flex items-center gap-1.5 font-bold">
                <span>Window: {selectedHour} UTC</span>
                <button
                  onClick={() => setSelectedHour(null)}
                  className="hover:text-white cursor-pointer"
                  title="Clear hour filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : (
              <span className="text-[10px] text-[#00ff41] font-mono bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                Live 24h Feed
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* 24h Summary Stats */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#8B949E]">
              <span>24h Ingested: <strong className="text-[#F1F5F9] font-mono">{total24hIndicators}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Peak: <strong className="text-rose-400 font-mono">{peakHour.total} IOCs @ {peakHour.time}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Rate: <strong className="text-[#00ff41] font-mono">{(total24hIndicators / 24).toFixed(1)}/hr</strong></span>
            </div>

            {/* Mode Toggle: Stacked Bar vs Trend Area */}
            <div className="flex items-center bg-[#161B22] p-0.5 rounded border border-[#30363D] text-[11px]">
              <button
                onClick={() => setChartViewMode('BAR')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  chartViewMode === 'BAR'
                    ? 'bg-[#38BDF8]/20 text-[#38BDF8] font-bold border border-[#38BDF8]/40'
                    : 'text-[#8B949E] hover:text-white'
                }`}
                title="View as stacked frequency bars"
              >
                <BarChart3 className="w-3 h-3" />
                <span>Mini-Bars</span>
              </button>
              <button
                onClick={() => setChartViewMode('AREA')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  chartViewMode === 'AREA'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-[#8B949E] hover:text-white'
                }`}
                title="View as continuous area velocity curve"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Trend Graph</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Chart Viewport */}
        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'BAR' ? (
              <BarChart
                data={HOURLY_24H_DATA}
                margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const clickedTime = (e.activePayload[0].payload as HourlyThreatMetric).time;
                    setSelectedHour(selectedHour === clickedTime ? null : clickedTime);
                  } else if (e?.activeLabel) {
                    setSelectedHour(selectedHour === e.activeLabel ? null : e.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={renderChartTooltip} />
                <Bar
                  dataKey="misp"
                  name="MISP Threat Intel"
                  stackId="feedStack"
                  fill="#38BDF8"
                  radius={[0, 0, 0, 0]}
                  cursor="pointer"
                >
                  {HOURLY_24H_DATA.map((entry) => (
                    <Cell
                      key={`misp-${entry.time}`}
                      fill={
                        selectedHour === entry.time
                          ? '#00e5ff'
                          : entry.total >= 100
                          ? '#38BDF8'
                          : '#0284c7'
                      }
                      opacity={selectedHour && selectedHour !== entry.time ? 0.35 : 1}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="suricata"
                  name="Suricata ET Open"
                  stackId="feedStack"
                  fill="#F59E0B"
                  radius={[2, 2, 0, 0]}
                  cursor="pointer"
                >
                  {HOURLY_24H_DATA.map((entry) => (
                    <Cell
                      key={`suricata-${entry.time}`}
                      fill={
                        selectedHour === entry.time
                          ? '#00ff41'
                          : entry.total >= 100
                          ? '#EF4444'
                          : '#F59E0B'
                      }
                      opacity={selectedHour && selectedHour !== entry.time ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart
                data={HOURLY_24H_DATA}
                margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const clickedTime = (e.activePayload[0].payload as HourlyThreatMetric).time;
                    setSelectedHour(selectedHour === clickedTime ? null : clickedTime);
                  } else if (e?.activeLabel) {
                    setSelectedHour(selectedHour === e.activeLabel ? null : e.activeLabel);
                  }
                }}
              >
                <defs>
                  <linearGradient id="mispAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="suricataAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={renderChartTooltip} />
                <Area
                  type="monotone"
                  dataKey="suricata"
                  name="Suricata ET Open"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#suricataAreaGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="misp"
                  name="MISP Threat Intel"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#mispAreaGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend & Key Scenario Wave Markers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 border-t border-[#1E293B] text-[11px]">
          {/* Series Legend */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#38BDF8]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]" />
              MISP Ingestion ({mispTotal24h} IOCs)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
              Suricata ET Open ({suricataTotal24h} Signatures)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              Peak Attack Burst (18:00 UTC)
            </span>
          </div>

          {/* Quick Scenario Jumps */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[#64748B] mr-1">Quick Waves:</span>
            {[
              { time: '16:00', label: '16:00 Brute Force' },
              { time: '17:00', label: '17:00 Mimikatz/C2' },
              { time: '18:00', label: '18:00 Nmap Peak' },
              { time: '19:00', label: '19:00 SOAR Live' },
            ].map((wave) => (
              <button
                key={wave.time}
                onClick={() => setSelectedHour(selectedHour === wave.time ? null : wave.time)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                  selectedHour === wave.time
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/50 font-bold'
                    : 'bg-[#161B22] text-[#8B949E] border-[#30363D] hover:text-white'
                }`}
                title={`Filter indicators matching ${wave.time} UTC wave`}
              >
                {wave.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search IOC indicator, MITRE ID, signature, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0F172A] border border-[#30363D] rounded pl-8 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#00d4ff]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[#64748B] hover:text-[#F1F5F9]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Feed Filter */}
          <div className="flex items-center bg-[#0F172A] p-0.5 rounded border border-[#30363D] text-[11px]">
            <button
              onClick={() => setFilterFeed('ALL')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterFeed === 'ALL' ? 'bg-slate-700 text-[#F1F5F9] font-bold' : 'text-[#8B949E] hover:text-white'
              }`}
            >
              All Feeds ({items.length})
            </button>
            <button
              onClick={() => setFilterFeed('MISP')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterFeed === 'MISP' ? 'bg-[#38BDF8]/20 text-[#38BDF8] font-bold' : 'text-[#8B949E] hover:text-white'
              }`}
            >
              MISP Only ({mispCount})
            </button>
            <button
              onClick={() => setFilterFeed('SURICATA')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterFeed === 'SURICATA' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-[#8B949E] hover:text-white'
              }`}
            >
              Suricata ET ({suricataCount})
            </button>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center bg-[#0F172A] p-0.5 rounded border border-[#30363D] text-[11px]">
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  filterSeverity === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 font-bold'
                      : sev === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'bg-slate-700 text-[#F1F5F9] font-bold'
                    : 'text-[#8B949E] hover:text-white'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Type Dropdown / Quick Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0F172A] border border-[#30363D] text-[#8B949E] hover:text-white text-[11px] rounded px-2 py-1 focus:outline-none focus:border-[#00d4ff]"
          >
            <option value="ALL">All Types</option>
            <option value="ip-src">IP Source</option>
            <option value="ip-dst">IP Destination</option>
            <option value="signature-sid">Suricata SID</option>
            <option value="hash-sha256">SHA256 Hash</option>
            <option value="url">URL Endpoint</option>
            <option value="domain">Domain Name</option>
          </select>
        </div>
      </div>

      {/* Main Threat Intelligence Data-Grid */}
      <div className="overflow-x-auto border border-[#30363D] rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0F172A] border-b border-[#30363D] text-[11px] text-[#64748B] uppercase tracking-wider font-semibold">
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Indicator / IOC</th>
              <th className="py-2.5 px-3">Threat Description & MITRE</th>
              <th className="py-2.5 px-3">Feed Source</th>
              <th className="py-2.5 px-3 text-right">Score</th>
              <th className="py-2.5 px-3">Security Action</th>
              <th className="py-2.5 px-3 text-right">Timestamp</th>
              <th className="py-2.5 px-2 w-10 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D] text-xs">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#8B949E]">
                  No threat indicators match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const isFlashing = recentFlashId === item.id;
                const isSelected = selectedIoc?.id === item.id;

                const scoreColor =
                  item.severityScore >= 9.0
                    ? 'text-rose-400 font-bold'
                    : item.severityScore >= 7.5
                    ? 'text-amber-400 font-bold'
                    : 'text-sky-400 font-bold';

                const statusColor =
                  item.status === 'ACTIVE_BLOCK'
                    ? 'text-rose-400'
                    : item.status === 'ENRICHED'
                    ? 'text-[#00ff41]'
                    : item.status === 'ALERT_FIRED'
                    ? 'text-amber-400'
                    : 'text-sky-400';

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedIoc(item)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1E293B]'
                        : isFlashing
                        ? 'bg-emerald-950/40'
                        : idx % 2 === 0
                        ? 'bg-[#161B22] hover:bg-[#1E293B]/60'
                        : 'bg-[#12161C] hover:bg-[#1E293B]/60'
                    }`}
                  >
                    {/* Index & Pulse */}
                    <td className="py-2.5 px-3 text-center text-[#64748B] text-[11px]">
                      {isFlashing ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-[#00ff41] animate-ping" />
                      ) : (
                        idx + 1
                      )}
                    </td>

                    {/* Indicator & Type */}
                    <td className="py-2.5 px-3 font-mono">
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-[#F1F5F9] font-bold tracking-tight hover:text-[#00d4ff] truncate max-w-[200px] sm:max-w-xs block">
                          {item.indicator}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(item.indicator, item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#64748B] hover:text-[#00d4ff]"
                          title="Copy indicator value"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-[#00ff41]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-[#64748B] uppercase tracking-wider mt-0.5">
                        {item.type} <span aria-hidden="true">·</span> {item.targetZone}
                      </div>
                    </td>

                    {/* Threat Name & MITRE ATT&CK */}
                    <td className="py-2.5 px-3">
                      <div className="text-[#CBD5E1] font-semibold text-[11px] leading-tight">
                        {item.threatName}
                      </div>
                      <div className="text-[10px] text-[#8B949E] mt-0.5 flex items-center gap-1.5">
                        <span className="text-[#38BDF8] font-bold">{item.mitreId}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.mitreTactic}</span>
                      </div>
                    </td>

                    {/* Feed Source */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-[11px] font-semibold text-[#F1F5F9]">
                        {item.feed}
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate max-w-[140px]">
                        {item.feedOrigin}
                      </div>
                    </td>

                    {/* Severity Score */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                      <div className={scoreColor}>
                        {item.severityScore.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-[#64748B] uppercase">
                        {item.severityLevel}
                      </div>
                    </td>

                    {/* Action & Status */}
                    <td className="py-2.5 px-3">
                      <div className={`text-[11px] font-semibold ${statusColor}`}>
                        {item.status.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-[#8B949E] truncate max-w-[180px]">
                        {item.matchedAction}
                      </div>
                    </td>

                    {/* Timestamp & Lag */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-[11px] text-[#8B949E]">
                      <div>{item.timestamp.slice(11, 19)}</div>
                      <div className="text-[10px] text-[#64748B]">+{item.ingestionLagSec}s lag</div>
                    </td>

                    {/* Inspect Arrow */}
                    <td className="py-2.5 px-2 text-center text-[#64748B]">
                      <ChevronRight className="w-4 h-4 mx-auto hover:text-[#00d4ff]" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal / Dossier Inspector */}
      {selectedIoc && (
        <div className="p-4 bg-[#0F172A] rounded-lg border border-[#38BDF8]/40 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#30363D]">
            <div>
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#00d4ff]" />
                <h4 className="text-sm font-bold text-[#F1F5F9] font-mono">
                  IOC Intelligence Dossier: <span className="text-[#00d4ff]">{selectedIoc.indicator}</span>
                </h4>
              </div>
              <div className="text-xs text-[#8B949E] mt-0.5">
                Source: {selectedIoc.feedOrigin} · MITRE ATT&CK: {selectedIoc.mitreId} ({selectedIoc.mitreTactic})
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F1F5F9]">
                Severity Score: <span className="text-rose-400 font-mono text-sm">{selectedIoc.severityScore.toFixed(1)}/10</span>
              </span>
              <button
                onClick={() => setSelectedIoc(null)}
                className="p-1 rounded hover:bg-slate-800 text-[#8B949E] hover:text-[#F1F5F9] transition-colors"
                title="Close Dossier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Column 1: Context */}
            <div className="bg-[#161B22] p-3 rounded border border-[#30363D] space-y-2">
              <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Detection Context</div>
              <div className="text-[#CBD5E1] text-[11px] leading-relaxed">
                {selectedIoc.evidence}
              </div>
              <div className="text-[10px] text-[#8B949E]">
                Target Enclave: <span className="text-[#38BDF8]">{selectedIoc.targetZone}</span>
              </div>
            </div>

            {/* Column 2: Threat Attribution */}
            <div className="bg-[#161B22] p-3 rounded border border-[#30363D] space-y-2">
              <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Threat Attribution</div>
              <div className="text-[#CBD5E1] text-[11px] font-semibold">
                {selectedIoc.threatName}
              </div>
              <div className="text-[10px] text-[#8B949E]">
                Category: <span className="text-[#F1F5F9]">{selectedIoc.category}</span>
              </div>
              <div className="text-[10px] text-[#8B949E]">
                Confidence: <span className="text-[#00ff41]">{selectedIoc.confidence}%</span>
              </div>
            </div>

            {/* Column 3: SOAR Action & Pipeline */}
            <div className="bg-[#161B22] p-3 rounded border border-[#30363D] space-y-2">
              <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">SOAR Response Pipeline</div>
              <div className="text-[11px] text-[#00ff41] font-semibold">
                {selectedIoc.matchedAction}
              </div>
              <div className="text-[10px] text-[#8B949E]">
                Ingestion Latency: <span className="text-[#F1F5F9]">{selectedIoc.ingestionLagSec} seconds</span>
              </div>
              <div className="text-[10px] text-[#8B949E]">
                Status: <span className="text-amber-300 font-bold">{selectedIoc.status}</span>
              </div>
            </div>
          </div>

          {/* Raw JSON View */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase text-[#64748B] font-bold">
              <span>Telemetry JSON Payload (Wazuh / MISP / Suricata Schema)</span>
              <button
                onClick={() => handleCopy(JSON.stringify(selectedIoc.rawJson, null, 2), 'json')}
                className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Payload</span>
              </button>
            </div>
            <pre className="bg-[#090D16] p-3 rounded border border-[#30363D] text-[11px] font-mono text-[#A7F3D0] overflow-x-auto max-h-44">
              {JSON.stringify(selectedIoc.rawJson, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
