import React, { useState, useEffect } from 'react';
import {
  DEPLOYMENT_SECTIONS,
  VERIFICATION_MATRIX,
  TROUBLESHOOTING_MATRIX,
  SECRETS_ROTATION_LIST,
} from '../data/deploymentGuideData';
import {
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Lock,
  Flame,
  Network,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const DeploymentGuideView: React.FC = () => {
  const [activeAnchor, setActiveAnchor] = useState<string>('sec-dep-1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({
    'why-acl': true,
    'why-env': true,
    'why-explicit-deny': true,
    'why-bug-1': true,
    'why-bug-2': false,
    'why-bug-3': false,
    'why-bug-4': false,
    'why-socketio': false,
    'why-totp': false,
  });
  const [filterBadge, setFilterBadge] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const toggleWhy = (key: string) => {
    setExpandedWhy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const anchors = DEPLOYMENT_SECTIONS.map((s) => s.id);
      const scrollPos = window.scrollY + 180;
      for (let i = anchors.length - 1; i >= 0; i--) {
        const el = document.getElementById(anchors[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveAnchor(anchors[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveAnchor(id);
    }
  };

  const filteredSections = DEPLOYMENT_SECTIONS.filter((sec) => {
    const matchesBadge = filterBadge === 'All' || sec.badge === filterBadge;
    const matchesSearch =
      !searchQuery ||
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBadge && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Terminal className="w-5 h-5 text-[#38BDF8]" />
              <h2 className="text-xl font-bold tracking-tight text-[#F1F5F9]">
                Deployment Guide: Replicating the Identity & WAF Stack
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] max-w-4xl leading-relaxed">
              Standalone, authoritative engineering walkthrough to reproduce the reference AEGIS v2.1 Identity and WAF architecture from scratch.
              Covers dual-network Docker containment, OpenLDAP DIT schema and ACL grants, Authelia Forward-Auth with LDAP group RBAC,
              Keycloak 26.x OIDC federation via the oidc-proxy Caddy sidecar (resolving the 4-layer handshake chain), and inline Coraza WAF inspection.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[11px] font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sky-400" />
              Reference: Ubuntu 24.04 LTS
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              9 Core Containers
            </span>
          </div>
        </div>

        {/* Quick Nav Chips */}
        <div className="pt-4 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[#94A3B8] text-[11px] uppercase tracking-wider mr-1">Quick Jump:</span>
          {DEPLOYMENT_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className={`px-2 py-1 rounded border text-[11px] transition-all cursor-pointer ${
                activeAnchor === sec.id
                  ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8] font-bold'
                  : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-slate-500'
              }`}
            >
              {sec.number}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Table of Contents */}
        <div className="lg:col-span-3 lg:sticky lg:top-20 space-y-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#334155]">
              <span className="font-mono text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-sky-400" />
                Guide Sections
              </span>
              <span className="text-[10px] font-mono text-slate-400">11 Steps</span>
            </div>

            {/* Filter by status badge */}
            <div className="flex items-center gap-1 mb-3 text-[10px] font-mono">
              {['All', 'Required', 'Verification step'].map((badge) => (
                <button
                  key={badge}
                  onClick={() => setFilterBadge(badge)}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    filterBadge === badge
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 font-bold'
                      : 'bg-[#0F172A] border-[#334155] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>

            {/* TOC list */}
            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 font-mono text-xs">
              {filteredSections.map((sec) => {
                const isActive = activeAnchor === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-all flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-300 font-semibold border-l-2 border-sky-400 pl-2'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300">
                        {sec.number}
                      </span>
                      <span className="truncate text-[11px]">{sec.shortTitle}</span>
                    </div>
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded shrink-0 uppercase tracking-tighter ${
                        sec.badge === 'Required'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}
                    >
                      {sec.badge === 'Verification step' ? 'Verify' : sec.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Architecture Reference Box */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 font-mono text-[11px] space-y-2">
            <div className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
              <Network className="w-3.5 h-3.5 text-emerald-400" />
              Network Isolation Rules
            </div>
            <div className="text-slate-400 space-y-1 leading-relaxed">
              <div>
                <span className="text-sky-300 font-semibold">proxy_net:</span> Traefik, Coraza WAF, Suricata (Edge DMZ)
              </div>
              <div>
                <span className="text-emerald-300 font-semibold">auth_net:</span> OpenLDAP, Postgres, Redis, Authelia, Keycloak, oidc-proxy (<span className="text-amber-300 font-bold">internal: true</span>)
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Stream */}
        <div className="lg:col-span-9 space-y-8">
          {/* ============================================================ */}
          {/* § 1 — Architecture Overview */}
          {/* ============================================================ */}
          <section id="sec-dep-1" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 1</span>
                <h3 className="text-lg font-bold text-slate-100">Architecture Overview & Dual-Bridge Topology</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0F172A] border border-[#334155] rounded p-4 space-y-2">
                <div className="font-mono font-bold text-sky-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Flow A: Perimeter Forward-Auth MFA (Traefik + Authelia)
                </div>
                <div className="p-3 bg-slate-900 rounded font-mono text-[11px] text-slate-300 border border-slate-800 leading-relaxed overflow-x-auto">
                  Browser ──(HTTPS:443)──► Traefik Edge Reverse Proxy
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─► Forward-Auth Check (/api/authz/forward-auth)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Authelia (Forward-Auth Gateway)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─► Authenticates via OpenLDAP (auth_net:389)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─► Verifies 2FA TOTP in PostgreSQL
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;200 OK ──► Traefik forwards request to backend
                </div>
                <p className="text-slate-400 text-[11px]">
                  All ingress web requests hit Traefik first, which delegates authentication to Authelia before permitting access.
                </p>
              </div>

              <div className="bg-[#0F172A] border border-[#334155] rounded p-4 space-y-2">
                <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Flow B: Identity Federation (Keycloak + oidc-proxy)
                </div>
                <div className="p-3 bg-slate-900 rounded font-mono text-[11px] text-slate-300 border border-slate-800 leading-relaxed overflow-x-auto">
                  Browser ──(Redirect:443)──► Keycloak (Relying Party)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─► Redirects user to Authelia IdP for SSO login
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Backchannel Token Exchange on auth_net)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Keycloak ──(HTTP:8080)──► oidc-proxy (Caddy)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (Injects Host & Proto)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Authelia OIDC (:9091)
                </div>
                <p className="text-slate-400 text-[11px]">
                  Server-to-server token retrieval bypasses Java PKIX truststore limitations by routing through the internal Caddy sidecar.
                </p>
              </div>
            </div>

            {/* Component Versions Table */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Component Manifest & Reference Versions
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border border-[#334155] rounded">
                  <thead className="bg-[#0F172A] text-slate-400 border-b border-[#334155]">
                    <tr>
                      <th className="p-2 text-left">Component</th>
                      <th className="p-2 text-left">Version</th>
                      <th className="p-2 text-left">Network Bridge</th>
                      <th className="p-2 text-left">Role / Port</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] text-slate-300">
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Traefik</td>
                      <td className="p-2">v3.6.1</td>
                      <td className="p-2">proxy_net, auth_net</td>
                      <td className="p-2">Edge TLS 1.3 Ingress, Forward-Auth Routing (80, 443)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-emerald-300">Authelia</td>
                      <td className="p-2">v4.39.x</td>
                      <td className="p-2">auth_net</td>
                      <td className="p-2">Forward-Auth Gatekeeper, OpenID Connect 1.0 Provider (:9091)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Keycloak</td>
                      <td className="p-2">v26.x (Quarkus)</td>
                      <td className="p-2">auth_net</td>
                      <td className="p-2">OIDC Relying Party & Identity Broker (:8080)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-amber-300">OpenLDAP</td>
                      <td className="p-2">osixia/openldap:1.5.0</td>
                      <td className="p-2">auth_net (internal)</td>
                      <td className="p-2">Centralized Directory Store, posixAccount & Groups (:389)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-purple-300">Coraza WAF</td>
                      <td className="p-2">v3 (Caddy + CRS)</td>
                      <td className="p-2">proxy_net</td>
                      <td className="p-2">Inline Web Application Firewall with OWASP Core Rule Set (:8080)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-slate-300">oidc-proxy</td>
                      <td className="p-2">caddy:2-alpine</td>
                      <td className="p-2">auth_net (internal)</td>
                      <td className="p-2">Header rewriting & TLS bridge sidecar for Keycloak (:8080)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 2 — Prerequisites */}
          {/* ============================================================ */}
          <section id="sec-dep-2" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 2</span>
                <h3 className="text-lg font-bold text-slate-100">Host & Perimeter Prerequisites</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <p className="text-slate-400 font-sans mb-2">
                  1. Verify host OS (Ubuntu 24.04 LTS), Docker Engine 26+, and docker compose plugin:
                </p>
                <div className="bg-[#0F172A] border border-[#334155] rounded p-3 relative group">
                  <button
                    onClick={() => handleCopy('docker version && docker compose version', 'prereq-docker')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedKey === 'prereq-docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="text-emerald-400"># Verify Docker & compose availability</pre>
                  <pre className="text-slate-200">docker version && docker compose version</pre>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-sans mb-2">
                  2. Generate multi-SAN self-signed wildcard TLS certificate for <code className="text-sky-300">*.zerotrust.lan</code>:
                </p>
                <div className="bg-[#0F172A] border border-[#334155] rounded p-3 relative group">
                  <button
                    onClick={() =>
                      handleCopy(
                        'mkdir -p traefik/certs && openssl req -x509 -nodes -days 365 -newkey rsa:4096 \\\n  -keyout traefik/certs/zerotrust.key \\\n  -out traefik/certs/zerotrust.crt \\\n  -subj "/CN=*.zerotrust.lan" \\\n  -addext "subjectAltName = DNS:zerotrust.lan,DNS:*.zerotrust.lan"',
                        'prereq-cert'
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Copy certificate generation command"
                  >
                    {copiedKey === 'prereq-cert' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="text-emerald-400"># Generate 4096-bit RSA wildcard certificate</pre>
                  <pre className="text-slate-200">
{`mkdir -p traefik/certs && openssl req -x509 -nodes -days 365 -newkey rsa:4096 \\
  -keyout traefik/certs/zerotrust.key \\
  -out traefik/certs/zerotrust.crt \\
  -subj "/CN=*.zerotrust.lan" \\
  -addext "subjectAltName = DNS:zerotrust.lan,DNS:*.zerotrust.lan"`}
                  </pre>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-sans mb-2">
                  3. Add DNS / hosts mapping on client machines pointing gateway domains to the gateway host IP:
                </p>
                <div className="bg-[#0F172A] border border-[#334155] rounded p-3">
                  <pre className="text-emerald-400"># /etc/hosts entry for client test machines</pre>
                  <pre className="text-slate-200">
                    &lt;GATEWAY_HOST_IP&gt; authelia.zerotrust.lan keycloak.zerotrust.lan traefik.zerotrust.lan juiceshop.zerotrust.lan portainer.zerotrust.lan mailpit.zerotrust.lan
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-xs text-emerald-300 flex items-center justify-between">
              <span><strong>Verification:</strong> Test port accessibility on host. Only 80 and 443 should be listening externally.</span>
              <code className="bg-[#0F172A] px-2 py-1 rounded text-slate-200 border border-[#334155]">ss -tulpn | grep -E ':(80|443)'</code>
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 3 — Base Stack Deploy */}
          {/* ============================================================ */}
          <section id="sec-dep-3" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 3</span>
                <h3 className="text-lg font-bold text-slate-100">Base Stack Deploy & Environment Orchestration</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-300">
              The compose skeleton configures isolated networks, volumes, and services. The critical security directive is{' '}
              <code className="text-emerald-400 font-mono">internal: true</code> on <code className="text-emerald-400 font-mono">auth_net</code>,
              ensuring identity databases (Postgres, Redis, OpenLDAP) cannot route packets to the public internet or external bridges.
            </p>

            {/* compose.yml Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>docker-compose.yml (Network & Service Skeleton)</span>
                <button
                  onClick={() =>
                    handleCopy(
`version: '3.8'

networks:
  proxy_net:
    name: proxy_net
    driver: bridge
  auth_net:
    name: auth_net
    driver: bridge
    internal: true

volumes:
  ldap_data:
  ldap_config:
  postgres_data:
  redis_data:
  traefik_data:

services:
  traefik:
    image: traefik:v3.6.1
    container_name: aegis-traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - proxy_net
      - auth_net
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - ./traefik/certs:/certs:ro

  openldap:
    image: osixia/openldap:1.5.0
    container_name: aegis-openldap
    restart: unless-stopped
    networks:
      - auth_net
    environment:
      LDAP_ORGANISATION: "AEGIS Zero-Trust"
      LDAP_DOMAIN: "zerotrust.lan"
      LDAP_ADMIN_PASSWORD: "\${LDAP_ADMIN_PASSWORD}"
      LDAP_CONFIG_PASSWORD: "\${LDAP_CONFIG_PASSWORD}"
      LDAP_TLS: "false"
    volumes:
      - ldap_data:/var/lib/ldap
      - ldap_config:/etc/ldap/slapd.d

  authelia:
    image: authelia/authelia:4.39.0
    container_name: aegis-authelia
    restart: unless-stopped
    networks:
      - auth_net
    environment:
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD: "\${LDAP_BIND_PASSWORD}"
      AUTHELIA_STORAGE_POSTGRES_PASSWORD: "\${POSTGRES_AUTHELIA_PASSWORD}"
      AUTHELIA_SESSION_REDIS_PASSWORD: "\${REDIS_PASSWORD}"
      AUTHELIA_JWT_SECRET: "\${AUTHELIA_JWT_SECRET}"
      AUTHELIA_STORAGE_ENCRYPTION_KEY: "\${AUTHELIA_STORAGE_ENCRYPTION_KEY}"
    volumes:
      - ./authelia/configuration.yml:/config/configuration.yml:ro
      - ./authelia/oidc.key:/config/oidc.key:ro

  oidc-proxy:
    image: caddy:2-alpine
    container_name: aegis-oidc-proxy
    restart: unless-stopped
    networks:
      - auth_net
    volumes:
      - ./oidc-proxy/Caddyfile:/etc/caddy/Caddyfile:ro

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    container_name: aegis-keycloak
    restart: unless-stopped
    command: start --optimized
    networks:
      - auth_net
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: "\${POSTGRES_KEYCLOAK_PASSWORD}"
      KC_HOSTNAME: keycloak.zerotrust.lan
      KC_PROXY_HEADERS: xforwarded
      KEYCLOAK_ADMIN: "\${KEYCLOAK_ADMIN_USER}"
      KEYCLOAK_ADMIN_PASSWORD: "\${KEYCLOAK_ADMIN_PASSWORD}"

  postgres:
    image: postgres:16-alpine
    container_name: aegis-postgres
    restart: unless-stopped
    networks:
      - auth_net
    environment:
      POSTGRES_MULTIPLE_DATABASES: "authelia,keycloak"
      POSTGRES_USER: root
      POSTGRES_PASSWORD: "\${POSTGRES_ROOT_PASSWORD}"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: aegis-redis
    restart: unless-stopped
    networks:
      - auth_net
    command: ["redis-server", "--requirepass", "\${REDIS_PASSWORD}"]
    volumes:
      - redis_data:/data

  coraza:
    image: owasp/coraza-caddy:latest
    container_name: aegis-coraza
    restart: unless-stopped
    networks:
      - proxy_net
    volumes:
      - ./coraza/Caddyfile:/etc/caddy/Caddyfile:ro

  mailpit:
    image: axllent/mailpit:latest
    container_name: aegis-mailpit
    restart: unless-stopped
    networks:
      - auth_net`,
                      'compose-base'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'compose-base' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Compose</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto">
                <pre>{`networks:
  proxy_net:
    name: proxy_net
    driver: bridge
  auth_net:
    name: auth_net
    driver: bridge
    internal: true # STRICT AIR-GAP: Prevents any default egress to external networks`}</pre>
              </div>
            </div>

            {/* .env Template */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300">Environment Template (.env.example)</span>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs relative">
                <button
                  onClick={() =>
                    handleCopy(
`# AEGIS Zero-Trust Production Environment Template
LDAP_ORGANISATION="AEGIS Zero-Trust"
LDAP_DOMAIN=zerotrust.lan
LDAP_ADMIN_PASSWORD=<generate-strong-password>
LDAP_CONFIG_PASSWORD=<generate-strong-password>
LDAP_BIND_PASSWORD=<generate-strong-password>

POSTGRES_ROOT_PASSWORD=<generate-strong-password>
POSTGRES_AUTHELIA_PASSWORD=<generate-strong-password>
POSTGRES_KEYCLOAK_PASSWORD=<generate-strong-password>
REDIS_PASSWORD=<generate-strong-password>

AUTHELIA_JWT_SECRET=<generate-strong-secret-32-chars>
AUTHELIA_SESSION_SECRET=<generate-strong-secret-32-chars>
AUTHELIA_STORAGE_ENCRYPTION_KEY=<generate-strong-secret-32-chars>

KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<generate-strong-password>
KEYCLOAK_OIDC_CLIENT_SECRET=<generate-strong-secret-32-chars>`,
                      'env-template'
                    )
                  }
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
                  title="Copy .env template"
                >
                  {copiedKey === 'env-template' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="text-slate-300">
{`LDAP_ADMIN_PASSWORD=<generate-strong-password>
LDAP_CONFIG_PASSWORD=<generate-strong-password>
LDAP_BIND_PASSWORD=<generate-strong-password>
POSTGRES_AUTHELIA_PASSWORD=<generate-strong-password>
REDIS_PASSWORD=<generate-strong-password>
AUTHELIA_JWT_SECRET=<generate-strong-secret-32-chars>
KEYCLOAK_OIDC_CLIENT_SECRET=<generate-strong-secret-32-chars>`}
                </pre>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-xs text-emerald-300">
              <strong>Verification:</strong> Run <code className="text-slate-200">docker compose up -d && docker ps</code>. All 9 containers must report healthy or running.
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 4 — OpenLDAP Deployment */}
          {/* ============================================================ */}
          <section id="sec-dep-4" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 4</span>
                <h3 className="text-lg font-bold text-slate-100">OpenLDAP Centralized Directory Deployment</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Deploys the central directory tree under <code className="text-sky-300 font-mono">dc=zerotrust,dc=lan</code>.
              Sets up organizational units (<code className="text-emerald-300 font-mono">ou=People</code>,{' '}
              <code className="text-emerald-300 font-mono">ou=Security_Groups</code>), seed users, the{' '}
              <code className="text-amber-300 font-mono">authelia-bind</code> service account, and the essential{' '}
              <code className="text-amber-300 font-mono">olcAccess</code> ACL grant.
            </p>

            {/* DIT Creation LDIF */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>1. Baseline DIT Structure & Security Groups (01-dit-structure.ldif)</span>
                <button
                  onClick={() =>
                    handleCopy(
`# Create Organizational Units
dn: ou=People,dc=zerotrust,dc=lan
objectClass: organizationalUnit
ou: People

dn: ou=Groups,dc=zerotrust,dc=lan
objectClass: organizationalUnit
ou: Groups

dn: ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: organizationalUnit
ou: Security_Groups

# Create Security Groups
dn: cn=admins,ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: top
objectClass: groupOfNames
cn: admins
description: System and Security Administrators
member: uid=ezio,ou=People,dc=zerotrust,dc=lan

dn: cn=it_ops,ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: top
objectClass: groupOfNames
cn: it_ops
description: IT Operations & Container Maintainers
member: uid=testuser,ou=People,dc=zerotrust,dc=lan

dn: cn=security,ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: top
objectClass: groupOfNames
cn: security
description: SOC Incident Response Team
member: uid=ezio,ou=People,dc=zerotrust,dc=lan

dn: cn=users,ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: top
objectClass: groupOfNames
cn: users
description: Standard Enterprise Employees
member: uid=testuser,ou=People,dc=zerotrust,dc=lan
member: uid=ezio,ou=People,dc=zerotrust,dc=lan`,
                      'ldif-dit'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'ldif-dit' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy LDIF</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto">
                <pre>{`dn: ou=People,dc=zerotrust,dc=lan
objectClass: organizationalUnit
ou: People

dn: ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: organizationalUnit
ou: Security_Groups

dn: cn=admins,ou=Security_Groups,dc=zerotrust,dc=lan
objectClass: groupOfNames
cn: admins
member: uid=ezio,ou=People,dc=zerotrust,dc=lan`}</pre>
              </div>
            </div>

            {/* Bind Account & Seed Users LDIF */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>2. Bind Account & Users (02-users.ldif)</span>
                <button
                  onClick={() =>
                    handleCopy(
`# Read-Only Service Account for Authelia Directory Bind
dn: cn=authelia-bind,dc=zerotrust,dc=lan
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: authelia-bind
userPassword: <strong-password>

# Administrator Identity (with sn and givenName for Keycloak claim sync)
dn: uid=ezio,ou=People,dc=zerotrust,dc=lan
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
uid: ezio
cn: Ezio Auditore
givenName: Mohamed Anis
sn: Taibi
mail: ezio@zerotrust.lan
userPassword: <strong-password>

# Operator / Test Identity
dn: uid=testuser,ou=People,dc=zerotrust,dc=lan
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
uid: testuser
cn: Test User
givenName: Test
sn: User
mail: testuser@zerotrust.lan
userPassword: <strong-password>`,
                      'ldif-users'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'ldif-users' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Users LDIF</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-300">
                <pre>{`dn: cn=authelia-bind,dc=zerotrust,dc=lan
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: authelia-bind
userPassword: <strong-password>`}</pre>
              </div>
            </div>

            {/* CRUCIAL ACL GRANT */}
            <div className="space-y-2 border border-amber-500/40 bg-amber-500/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  3. Crucial ACL Grant for Bind Account (03-acl-grant.ldif)
                </span>
                <button
                  onClick={() =>
                    handleCopy(
`dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcAccess
olcAccess: {0}to * by dn.exact="cn=authelia-bind,dc=zerotrust,dc=lan" read by * break`,
                      'ldif-acl'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'ldif-acl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy ACL LDIF</span>
                </button>
              </div>

              <div className="bg-[#0F172A] border border-amber-500/30 rounded p-3 font-mono text-xs text-slate-200">
                <pre>{`dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcAccess
olcAccess: {0}to * by dn.exact="cn=authelia-bind,dc=zerotrust,dc=lan" read by * break`}</pre>
              </div>

              {/* Collapsible WHY */}
              <div className="border-t border-amber-500/20 pt-2">
                <button
                  onClick={() => toggleWhy('why-acl')}
                  className="flex items-center gap-1.5 text-xs font-mono text-amber-300 font-bold hover:text-amber-200 cursor-pointer"
                >
                  {expandedWhy['why-acl'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Why this happens (The LDAP Result Code 32 Trap)
                </button>
                {expandedWhy['why-acl'] && (
                  <div className="mt-2 text-xs text-slate-300 space-y-1.5 bg-[#0F172A] p-3 rounded border border-[#334155] leading-relaxed">
                    <p>
                      <strong>The Pitfall:</strong> Without this explicit ACL, Authelia returns{' '}
                      <code className="text-rose-400 font-mono font-bold">LDAP Result Code 32 ("No Such Object")</code> when querying{' '}
                      <code className="text-sky-300 font-mono">ou=Security_Groups</code> or user records, even when the entries exist perfectly in the database.
                    </p>
                    <p>
                      <strong>The LDAP Specification Standard:</strong> OpenLDAP standard behavior hides unauthorized subtrees as if they do not exist to prevent enumeration attacks by unauthenticated attackers.
                      Applying this grant instructs slapd to allow <code className="text-amber-300 font-mono">authelia-bind</code> to evaluate read filters across all entries while maintaining password encryption.
                    </p>
                  </div>
                )}
              </div>

              <div className="font-mono text-xs text-slate-300">
                <p className="mb-1 text-slate-400">Apply the ACL modification directly to slapd config database:</p>
                <div className="bg-[#0F172A] p-2 rounded border border-[#334155] text-slate-200">
                  <code>docker exec -i aegis-openldap ldapmodify -Y EXTERNAL -H ldapi:/// &lt; 03-acl-grant.ldif</code>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-xs text-emerald-300 flex items-center justify-between">
              <span><strong>Verification:</strong> Verify bind account can authenticate and search directory trees.</span>
              <code className="bg-[#0F172A] px-2 py-1 rounded text-slate-200 border border-[#334155]">
                docker exec -it aegis-openldap ldapwhoami -x -D "cn=authelia-bind,dc=zerotrust,dc=lan" -w "$LDAP_BIND_PASSWORD"
              </code>
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 5 — Authelia LDAP Backend */}
          {/* ============================================================ */}
          <section id="sec-dep-5" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 5</span>
                <h3 className="text-lg font-bold text-slate-100">Authelia LDAP Backend Migration & MFA Flow</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Configures Authelia to authenticate credentials against OpenLDAP on the isolated <code className="text-emerald-400 font-mono">auth_net</code>,
              deriving display names, emails, and group memberships in real time.
            </p>

            {/* Configuration snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>authelia/configuration.yml (authentication_backend Block)</span>
                <button
                  onClick={() =>
                    handleCopy(
`authentication_backend:
  refresh_interval: 5m
  ldap:
    address: ldap://openldap:389
    base_dn: dc=zerotrust,dc=lan
    additional_users_dn: ou=People
    users_filter: "(&({username_attribute}={input})(objectClass=person))"
    additional_groups_dn: ou=Security_Groups
    groups_filter: "(&(member={dn})(objectClass=groupOfNames))"
    user: cn=authelia-bind,dc=zerotrust,dc=lan
    attributes:
      username: uid
      display_name: cn
      mail: mail
      group_name: cn`,
                      'authelia-ldap-cfg'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'authelia-ldap-cfg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Config</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-300">
                <pre>{`authentication_backend:
  refresh_interval: 5m
  ldap:
    address: ldap://openldap:389
    base_dn: dc=zerotrust,dc=lan
    additional_users_dn: ou=People
    users_filter: "(&({username_attribute}={input})(objectClass=person))"
    additional_groups_dn: ou=Security_Groups
    groups_filter: "(&(member={dn})(objectClass=groupOfNames))"
    user: cn=authelia-bind,dc=zerotrust,dc=lan
    attributes:
      username: uid
      display_name: cn
      mail: mail
      group_name: cn`}</pre>
              </div>
            </div>

            {/* Critical Env-Var Gotcha Callout */}
            <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-lg space-y-2 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                CRITICAL GOTCHA: Authelia Variable Substitution Allow-List (#1 Most Common Mistake)
              </div>
              <p className="text-slate-300 font-sans leading-relaxed text-xs">
                Authelia’s parser <strong>only</strong> expands environment variables prefixed with <code className="text-amber-300 font-mono">AUTHELIA_*</code> or <code className="text-amber-300 font-mono">X_AUTHELIA_*</code>.
                Writing <code className="text-rose-400 font-mono">{'${LDAP_BIND_PASSWORD}'}</code> in <code className="text-slate-200 font-mono">configuration.yml</code> fails silently and leaves the bind password unexpanded!
              </p>
              <div className="bg-[#0F172A] p-3 rounded border border-rose-500/20 text-slate-200">
                <span className="text-slate-400 block mb-1">Correct compose environment declaration:</span>
                <code>{'AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD: "${LDAP_BIND_PASSWORD}"'}</code>
              </div>
            </div>

            {/* Operational Notes: Password reset & TOTP storage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 space-y-1">
                <span className="text-amber-300 font-bold block">Password Reset Behavior</span>
                <p className="text-slate-400 font-sans text-xs">
                  Authelia does not permit in-browser password resets when using LDAP unless the bind service account has write/modify access to user attributes. We deliberately restrict authelia-bind to read-only for least privilege.
                </p>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 space-y-1">
                <span className="text-sky-300 font-bold block">TOTP Decoupling Security Finding</span>
                <p className="text-slate-400 font-sans text-xs">
                  Authelia persists TOTP seeds in PostgreSQL, keyed strictly by username. Deleting a user from LDAP leaves their TOTP secret in PostgreSQL. User offboarding procedures must explicitly purge the database table <code className="text-slate-300">totp_configurations</code>!
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-xs text-emerald-300">
              <strong>Verification:</strong> Navigate to <code className="text-slate-200">https://authelia.zerotrust.lan/</code>, log in as <code className="text-slate-200">testuser</code> with password, complete email registration via Mailpit (<code className="text-slate-200">https://mailpit.zerotrust.lan/</code>), and scan TOTP QR code.
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 6 — Group-Based Access Control */}
          {/* ============================================================ */}
          <section id="sec-dep-6" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 6</span>
                <h3 className="text-lg font-bold text-slate-100">Group-Based Access Control & Explicit Deny Hardening</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Enforces role-based access boundaries across all perimeter domains. Privileged admin surfaces (Keycloak, Traefik Dashboard, Portainer)
              are gated by LDAP group membership (<code className="text-emerald-400 font-mono">group:admins</code>,{' '}
              <code className="text-sky-400 font-mono">group:it_ops</code>).
            </p>

            {/* Access control rules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>authelia/configuration.yml (access_control Block)</span>
                <button
                  onClick={() =>
                    handleCopy(
`access_control:
  default_policy: deny
  rules:
    # 1. Self-portal bypass
    - domain: authelia.zerotrust.lan
      policy: bypass

    # 2. Keycloak OIDC protocol & login action bypass (Prevents SSO auth deadlocks)
    - domain: keycloak.zerotrust.lan
      resources:
        - "^/realms/.*/protocol/openid-connect/.*"
        - "^/realms/.*/login-actions/.*"
        - "^/resources/.*"
      policy: bypass

    # 3a. Keycloak Admin Console: Restricted to group:admins with 2FA
    - domain: keycloak.zerotrust.lan
      subject:
        - "group:admins"
      policy: two_factor
    # 3b. EXPLICIT DENY: Blocks subject fallthrough for non-admin users
    - domain: keycloak.zerotrust.lan
      policy: deny

    # 4a. Traefik Dashboard: Restricted to group:admins with 2FA
    - domain: traefik.zerotrust.lan
      subject:
        - "group:admins"
      policy: two_factor
    # 4b. EXPLICIT DENY: Blocks subject fallthrough
    - domain: traefik.zerotrust.lan
      policy: deny

    # 5. Dev mail sinkhole bypass
    - domain: mailpit.zerotrust.lan
      policy: bypass

    # 6a. Portainer: Restricted to group:admins OR group:it_ops
    - domain: portainer.zerotrust.lan
      subject:
        - "group:admins"
        - "group:it_ops"
      policy: two_factor
    # 6b. EXPLICIT DENY: Blocks subject fallthrough
    - domain: portainer.zerotrust.lan
      policy: deny

    # 7. Default Internal Wildcard: Requires 2FA for all authenticated employees
    - domain: "*.zerotrust.lan"
      policy: two_factor`,
                      'access-control-cfg'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'access-control-cfg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Rules</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-300 max-h-64 overflow-y-auto">
                <pre>{`rules:
  # 3a. Keycloak Admin Console: Restricted to group:admins
  - domain: keycloak.zerotrust.lan
    subject:
      - "group:admins"
    policy: two_factor

  # 3b. EXPLICIT DENY: Prevents fallthrough to *.zerotrust.lan wildcard
  - domain: keycloak.zerotrust.lan
    policy: deny`}</pre>
              </div>
            </div>

            {/* Collapsible WHY for Explicit Deny */}
            <div className="border border-sky-500/30 bg-sky-500/5 rounded-lg p-4 space-y-2">
              <button
                onClick={() => toggleWhy('why-explicit-deny')}
                className="flex items-center gap-1.5 text-xs font-mono text-sky-300 font-bold hover:text-sky-200 cursor-pointer"
              >
                {expandedWhy['why-explicit-deny'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Why this happens: Authelia Subject Mismatch Fallthrough (#2 Most Common Trap)
              </button>
              {expandedWhy['why-explicit-deny'] && (
                <div className="text-xs text-slate-300 space-y-2 bg-[#0F172A] p-3 rounded border border-[#334155] leading-relaxed font-sans">
                  <p>
                    <strong>The Real Vulnerability:</strong> Authelia evaluates access_control rules top-to-bottom and matches on{' '}
                    <em>Domain + Resources + Subject</em>. However, if only the <em>Subject</em> fails to match, Authelia does{' '}
                    <strong>not</strong> implicitly deny the request. Instead, evaluation falls through to subsequent matching rules!
                  </p>
                  <p>
                    <strong>The Gap Caught in Testing:</strong> Without the companion <code className="text-amber-300 font-mono">policy: deny</code> rule,
                    a non-admin user (such as <code className="text-sky-300 font-mono">testuser</code>) trying to access{' '}
                    <code className="text-sky-300 font-mono">keycloak.zerotrust.lan</code> failed Rule 3a, but fell straight through to Rule 7 (
                    <code className="text-sky-300 font-mono">*.zerotrust.lan</code>, <code className="text-sky-300 font-mono">policy: two_factor</code>).
                    Because they had valid 2FA, they were incorrectly granted access to the admin console!
                  </p>
                  <p>
                    <strong>The Fix:</strong> Inserting an immediate explicit <code className="text-rose-400 font-mono">policy: deny</code> for the same domain
                    guarantees that non-matching subjects are immediately terminated with HTTP 403 Forbidden.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-xs text-emerald-300">
              <strong>Verification:</strong> Log in as <code className="text-slate-200">testuser</code> (in it_ops, not admins) and visit{' '}
              <code className="text-slate-200">https://keycloak.zerotrust.lan/</code> ➔ Observe HTTP 403. Visit{' '}
              <code className="text-slate-200">https://portainer.zerotrust.lan/</code> ➔ Observe HTTP 200 OK.
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 7 — Keycloak OIDC Federation */}
          {/* ============================================================ */}
          <section id="sec-dep-7" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 7</span>
                <h3 className="text-lg font-bold text-slate-100">Keycloak OIDC Federation & The 4-Layer Handshake Chain</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Federates Keycloak 26.x as an OpenID Connect Relying Party with Authelia as the upstream Identity Provider.
              This architecture unifies single sign-on across the sovereign enterprise grid while retaining edge Forward-Auth.
              Connecting two modern Zero-Trust systems across an internal Docker bridge triggered four cascading protocol bugs.
            </p>

            {/* The 4 Cascading Bugs Callout Grid */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                The 4-Layer Handshake Chain: Bug Post-Mortem & Fixes
              </span>

              {/* Bug 1 */}
              <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    Bug 1: PKIX Path Building Failed (Keycloak 26 SimpleHttpRequest)
                  </span>
                  <button
                    onClick={() => toggleWhy('why-bug-1')}
                    className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {expandedWhy['why-bug-1'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Details
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div><strong>Symptom:</strong> <code className="text-rose-300">SSLHandshakeException: PKIX path building failed on /realms/aegis/broker/authelia/endpoint</code></div>
                  <div><strong>Root Cause:</strong> Keycloak 26 running on Quarkus uses an internal <code className="text-sky-300">SimpleHttpRequest</code> client that ignores <code className="text-sky-300">KC_TRUSTSTORE_PATHS</code> and JVM trust parameters for backchannel OIDC discovery.</div>
                  <div><strong>Remediation:</strong> Deploy <code className="text-emerald-400 font-semibold">oidc-proxy</code> Caddy sidecar on <code className="text-emerald-400">auth_net</code> to proxy backchannel calls over plain HTTP, keeping TLS at the perimeter.</div>
                </div>
              </div>

              {/* Bug 2 */}
              <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    Bug 2: Invalid X-Forwarded-Proto Header Value 'http'
                  </span>
                  <button
                    onClick={() => toggleWhy('why-bug-2')}
                    className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {expandedWhy['why-bug-2'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Details
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div><strong>Symptom:</strong> Authelia rejects backchannel queries with: <code className="text-rose-300">invalid X-Forwarded-Proto: http</code></div>
                  <div><strong>Root Cause:</strong> Authelia's OIDC provider specification mandates HTTPS scheme declaration; direct plain HTTP lacks the expected forwarding header.</div>
                  <div><strong>Remediation:</strong> In <code className="text-emerald-400 font-semibold">oidc-proxy</code>, inject <code className="text-sky-300">header_up X-Forwarded-Proto https</code>.</div>
                </div>
              </div>

              {/* Bug 3 */}
              <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    Bug 3: Could Not Determine Effective Issuer
                  </span>
                  <button
                    onClick={() => toggleWhy('why-bug-3')}
                    className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {expandedWhy['why-bug-3'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Details
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div><strong>Symptom:</strong> Authelia logs: <code className="text-rose-300">error occurred discovering the issuer: no session cookie configuration matches url 'https://oidc-proxy:8080'</code></div>
                  <div><strong>Root Cause:</strong> Authelia derives effective issuer from Host headers. Addressing the sidecar as oidc-proxy:8080 violates RFC 8414 issuer matching.</div>
                  <div><strong>Remediation:</strong> In <code className="text-emerald-400 font-semibold">oidc-proxy</code>, rewrite <code className="text-sky-300">header_up Host authelia.zerotrust.lan</code> and <code className="text-sky-300">X-Forwarded-Host authelia.zerotrust.lan</code>.</div>
                </div>
              </div>

              {/* Bug 4 */}
              <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    Bug 4: Client Authentication Method Mismatch (invalid_client)
                  </span>
                  <button
                    onClick={() => toggleWhy('why-bug-4')}
                    className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {expandedWhy['why-bug-4'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Details
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div><strong>Symptom:</strong> Token exchange fails with: <code className="text-rose-300">invalid_client: client authentication failed</code></div>
                  <div><strong>Root Cause:</strong> Keycloak sent client credentials in the HTTP request body (<code className="text-slate-300">client_secret_post</code>), while Authelia expected HTTP Basic Auth header (<code className="text-slate-300">client_secret_basic</code>).</div>
                  <div><strong>Remediation:</strong> In Keycloak IdP settings, set Client Authentication to <code className="text-emerald-400 font-semibold">Client secret sent as HTTP Basic authentication</code>.</div>
                </div>
              </div>
            </div>

            {/* Step 7.2: oidc-proxy Caddyfile */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>Step 7.2 — The Architectural Fix: oidc-proxy/Caddyfile</span>
                <button
                  onClick={() =>
                    handleCopy(
`:8080 {
    reverse_proxy authelia:9091 {
        header_up Host authelia.zerotrust.lan
        header_up X-Forwarded-Host authelia.zerotrust.lan
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-Port 443
    }
}`,
                      'caddyfile-oidc'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'caddyfile-oidc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Caddyfile</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-200">
                <pre>{`:8080 {
    reverse_proxy authelia:9091 {
        header_up Host authelia.zerotrust.lan
        header_up X-Forwarded-Host authelia.zerotrust.lan
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-Port 443
    }
}`}</pre>
              </div>
            </div>

            {/* Step 7.3: Keycloak IdP Settings Table */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Step 7.3 — Keycloak Manual OIDC Endpoints Configuration
              </span>
              <p className="text-xs text-slate-400 font-sans">
                In Keycloak Admin Console ➔ Realm <code className="text-sky-300 font-mono">aegis</code> ➔ Identity Providers ➔ Add OpenID Connect v1.0:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border border-[#334155] rounded">
                  <thead className="bg-[#0F172A] text-slate-400 border-b border-[#334155]">
                    <tr>
                      <th className="p-2 text-left">Configuration Field</th>
                      <th className="p-2 text-left">Value</th>
                      <th className="p-2 text-left">Routing Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] text-slate-300">
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Alias</td>
                      <td className="p-2">authelia</td>
                      <td className="p-2 text-slate-400">Callback URI slug</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Authorization URL</td>
                      <td className="p-2">https://authelia.zerotrust.lan/api/oidc/authorization</td>
                      <td className="p-2 text-emerald-400 font-bold">Browser-facing (Traefik Edge)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Token URL</td>
                      <td className="p-2">http://oidc-proxy:8080/api/oidc/token</td>
                      <td className="p-2 text-amber-400 font-bold">Backchannel (Internal oidc-proxy)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">User Info URL</td>
                      <td className="p-2">http://oidc-proxy:8080/api/oidc/userinfo</td>
                      <td className="p-2 text-amber-400 font-bold">Backchannel (Internal oidc-proxy)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">JWKS URL</td>
                      <td className="p-2">http://oidc-proxy:8080/jwks.json</td>
                      <td className="p-2 text-amber-400 font-bold">Backchannel (Internal oidc-proxy)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Issuer</td>
                      <td className="p-2">https://authelia.zerotrust.lan</td>
                      <td className="p-2 text-sky-300">RFC 8414 Expected Issuer String</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Client ID / Secret</td>
                      <td className="p-2">keycloak / &lt;KEYCLOAK_OIDC_CLIENT_SECRET&gt;</td>
                      <td className="p-2">Matches Authelia configuration.yml</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Client Authentication</td>
                      <td className="p-2 text-emerald-400 font-bold">Client secret sent as HTTP Basic authentication</td>
                      <td className="p-2">Resolves Bug 4</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-300">Default Scopes</td>
                      <td className="p-2">openid profile email groups</td>
                      <td className="p-2">Requires sn & givenName in OpenLDAP</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 7.4 & 7.5: Flow Verification & Hardening */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 space-y-2">
                <span className="text-emerald-400 font-bold block">Step 7.4 — Test the Flow</span>
                <p className="text-slate-400 font-sans text-xs">
                  Open browser to <code className="text-slate-200">https://keycloak.zerotrust.lan/realms/aegis/account/</code>.
                  Click "Sign In with authelia" ➔ Redirects to Authelia ➔ Enter credentials + TOTP ➔ Consent ➔ First Broker Login ➔ Keycloak Account Console.
                </p>
                <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                  Expected log: <span className="text-emerald-400">HTTP 302</span> on <code className="text-sky-300">/broker/authelia/endpoint</code> with zero PKIX errors.
                </div>
              </div>

              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 space-y-2">
                <span className="text-sky-400 font-bold block">Step 7.5 — Production Hardening</span>
                <ul className="text-slate-400 font-sans text-xs space-y-1 list-disc list-inside">
                  <li>Enable <strong className="text-slate-200">Validate Signatures</strong> in IdP settings once basic handshake succeeds.</li>
                  <li>Enable <strong className="text-slate-200">Use PKCE (S256)</strong> for authorization code protection.</li>
                  <li>Create permanent named admin and delete temporary bootstrap credentials.</li>
                  <li>Delete stray test realms (e.g. AEGIS.CORP) to prevent configuration confusion.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 8 — Coraza WAF Inline */}
          {/* ============================================================ */}
          <section id="sec-dep-8" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 8</span>
                <h3 className="text-lg font-bold text-slate-100">Inline Coraza WAF & Web Application Protection</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Integrates Coraza WAF (Caddy with OWASP Core Rule Set) inline between Traefik and OWASP Juice Shop.
              Unlike internal services, Juice Shop is intentionally decoupled from Authelia to simulate a public-facing customer storefront
              protected exclusively by real-time layer 7 WAF inspection.
            </p>

            {/* Coraza Caddyfile */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>coraza/Caddyfile (CRS Setup & Long-Polling Exclusion)</span>
                <button
                  onClick={() =>
                    handleCopy(
`:8080 {
    order coraza_waf first

    coraza_waf {
        load_owasp_crs
        directives \`
            SecRuleEngine On
            SecRequestBodyAccess On
            SecResponseBodyAccess Off
            SecAuditEngine RelevantOnly
            SecAuditLog /var/log/coraza/audit.log
            SecAuditLogParts ABIJDEFHZ
            SecAuditLogType Serial
            SecAuditLogFormat JSON

            # Known Issue Exclusion: Juice Shop socket.io polling triggers CRS anomaly false-positive
            SecRule REQUEST_URI "@beginsWith /socket.io/" "id:1001,phase:1,pass,nolog,ctl:ruleEngine=DetectionOnly"
        \`
    }

    # Proxy clean inspected requests to Zone 2 CORP-WEB01 origin (migrated from 192.168.19.175)
    reverse_proxy 192.168.50.20:3000
}`,
                      'coraza-caddyfile'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'coraza-caddyfile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Caddyfile</span>
                </button>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-200 max-h-56 overflow-y-auto">
                <pre>{`:8080 {
    order coraza_waf first
    coraza_waf {
        load_owasp_crs
        directives \`
            SecRuleEngine On
            SecRequestBodyAccess On
            SecRule REQUEST_URI "@beginsWith /socket.io/" "id:1001,phase:1,pass,nolog,ctl:ruleEngine=DetectionOnly"
        \`
    }
    reverse_proxy 192.168.50.20:3000
}`}</pre>
              </div>
            </div>

            {/* Traefik Dynamic Config Routing */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300">
                traefik/dynamic.yml (Repoint Service to Coraza WAF)
              </span>
              <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs text-slate-300">
                <pre>{`http:
  routers:
    juiceshop:
      rule: "Host(\`juiceshop.zerotrust.lan\`)"
      entryPoints: ["websecure"]
      service: juiceshop-waf-service
      tls: {} # WAF-only protection, no forward-auth middleware attached

  services:
    juiceshop-waf-service:
      loadBalancer:
        servers:
          - url: "http://coraza:8080" # Repointed to WAF proxy rather than backend directly`}</pre>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-xs text-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <span><strong>Verification Command:</strong> Simulate SQL injection attack against search endpoint:</span>
                <button
                  onClick={() =>
                    handleCopy('curl -skG "https://juiceshop.zerotrust.lan/rest/products/search" --data-urlencode "q=\' OR 1=1--"', 'verify-waf')
                  }
                  className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 text-[10px] cursor-pointer"
                >
                  {copiedKey === 'verify-waf' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code className="block bg-[#0F172A] p-2 rounded text-slate-200 border border-[#334155]">
                curl -skG "https://juiceshop.zerotrust.lan/rest/products/search" --data-urlencode "q=' OR 1=1--"
              </code>
              <span className="block text-emerald-400">
                <strong>Expected Output:</strong> HTTP/2 403 Forbidden. Confirmed in <code className="text-slate-300">coraza_logs/access.log</code> with rule ID 942100.
              </span>
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 9 — Verification Matrix */}
          {/* ============================================================ */}
          <section id="sec-dep-9" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 9</span>
                <h3 className="text-lg font-bold text-slate-100">End-to-End Verification Matrix</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                Verification step
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Run each command below to systematically validate the integrity, authentication controls, and security posture of the replicated stack:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border border-[#334155] rounded">
                <thead className="bg-[#0F172A] text-slate-400 border-b border-[#334155]">
                  <tr>
                    <th className="p-2.5 text-left">Subsystem</th>
                    <th className="p-2.5 text-left">Validation Command</th>
                    <th className="p-2.5 text-left">Authoritative Expected Output</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] text-slate-300">
                  {VERIFICATION_MATRIX.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2.5">
                        <span className="font-bold text-sky-300 block">{item.component}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{item.category}</span>
                      </td>
                      <td className="p-2.5 text-slate-200">
                        <code className="bg-[#0F172A] p-1.5 rounded border border-[#334155] block text-[11px] max-w-md overflow-x-auto">
                          {item.command}
                        </code>
                      </td>
                      <td className="p-2.5 text-emerald-300 text-[11px] leading-relaxed">
                        {item.expectedOutput}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleCopy(item.command, `matrix-${idx}`)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
                          title="Copy command"
                        >
                          {copiedKey === `matrix-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 10 — Troubleshooting Quick Reference */}
          {/* ============================================================ */}
          <section id="sec-dep-10" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 10</span>
                <h3 className="text-lg font-bold text-slate-100">Troubleshooting Quick Reference</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                Verification step
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Compilation of the most frequent operational errors, root causes, and targeted remediation steps encountered during engineering:
            </p>

            <div className="space-y-3 font-mono text-xs">
              {TROUBLESHOOTING_MATRIX.map((item, idx) => (
                <div key={idx} className="bg-[#0F172A] border border-[#334155] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      {item.symptom}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
                        item.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs font-sans">
                    <strong className="text-slate-400 font-mono text-[11px]">Likely Root Cause:</strong> {item.likelyCause}
                  </div>
                  <div className="bg-[#1E293B] p-2.5 rounded border border-slate-700 text-emerald-300 text-xs font-sans">
                    <strong className="text-emerald-400 font-mono text-[11px]">Targeted Fix:</strong> {item.fix}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================ */}
          {/* § 11 — Secrets Management (Pre-Defense) */}
          {/* ============================================================ */}
          <section id="sec-dep-11" className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-sky-400">§ 11</span>
                <h3 className="text-lg font-bold text-slate-100">Pre-Defense Secrets Rotation & Security Hygiene</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Required
              </span>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 text-xs font-sans">
              <div className="flex items-center gap-1.5 font-mono text-amber-300 font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-400" />
                Mandatory Credential Rotation Protocol Before Public Demos
              </div>
              <p className="text-slate-300 leading-relaxed">
                During iterative development, debugging, and terminal logging, development secrets inevitably get exposed in shell histories,
                temporary configuration snapshots, and container inspection outputs. 
                Before final evaluation or public deployment, all twelve items in the table below <strong>must</strong> be regenerated using 
                cryptographically secure pseudo-random generators (<code className="text-amber-300 font-mono">openssl rand -hex 32</code>).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border border-[#334155] rounded">
                <thead className="bg-[#0F172A] text-slate-400 border-b border-[#334155]">
                  <tr>
                    <th className="p-2 text-left">Secret Name</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-left">Blast Radius / Impact</th>
                    <th className="p-2 text-left">Generation Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] text-slate-300">
                  {SECRETS_ROTATION_LIST.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2 font-bold text-sky-300">{item.secretName}</td>
                      <td className="p-2 text-slate-400">{item.location}</td>
                      <td className="p-2 text-slate-300 font-sans text-xs">{item.impact}</td>
                      <td className="p-2">
                        <div className="flex items-center justify-between gap-2 bg-[#0F172A] px-2 py-1 rounded border border-[#334155]">
                          <code className="text-emerald-300 text-[11px] truncate max-w-xs">{item.generationCommand}</code>
                          <button
                            onClick={() => handleCopy(item.generationCommand, `secret-${idx}`)}
                            className="p-1 hover:text-white cursor-pointer"
                            title="Copy command"
                          >
                            {copiedKey === `secret-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[#0F172A] border border-[#334155] rounded p-4 space-y-2 font-mono text-xs">
              <span className="text-slate-300 font-bold block">Git Security Guardrails (.gitignore Enforcement)</span>
              <p className="text-slate-400 font-sans text-xs">
                Ensure sensitive keys are never staged or committed into version control:
              </p>
              <div className="bg-[#1E293B] p-2.5 rounded text-slate-300 border border-slate-700">
                <code>{`# Secrets and Private Keys
.env
*.env
*.key
*.p12
*.pem
traefik/certs/
authelia/oidc.key`}</code>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
