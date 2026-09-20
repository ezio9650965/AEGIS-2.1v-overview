import React, { useState } from 'react';
import { InteractiveTopologyDiagram } from '../InteractiveTopologyDiagram';
import { Zone3SegmentationDiagram } from './Zone3SegmentationDiagram';
import { Zone3FileStructure } from './Zone3FileStructure';
import { Zone3ConfigFilesViewer } from './Zone3ConfigFilesViewer';
import {
  ShieldCheck,
  Check,
  Copy,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export const Zone3GatewayView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* L2/L3 Network Segmentation Topology (Current Verified vs. Intended Design) */}
      <Zone3SegmentationDiagram />

      {/* Visual Topology for Zone 3 (Constraints A-E) */}
      <div className="mb-2">
        <InteractiveTopologyDiagram filterZone="z3" initialExpandedZone="z3" showTraceControls={false} />
      </div>

      {/* File Structure Section */}
      <Zone3FileStructure />

      {/* Configuration Files Section with Tabbed Code Viewer & Secret Redaction */}
      <Zone3ConfigFilesViewer />

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
              <li>• <strong className="text-white">Keycloak v26.6.2:</strong> Federated Identity Vault (`start` plain production mode).</li>
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

      {/* NEW SECTION: Access Control Model — Customers vs. Employees */}
      <div className="bg-[#0F172A] border border-[#38BDF8]/30 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#38BDF8] uppercase tracking-wider">
                Access Control Model — Customers vs. Employees
              </h4>
              <p className="text-[11px] text-[#94A3B8]">
                Dual Authentication Domains & Gateway Policy Enforcement (Authelia + Traefik Forward-Auth)
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
            Production Policy Rule
          </span>
        </div>

        {/* Two Authentication Domains Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
            <div className="font-bold text-[#4ADE80] mb-2 flex items-center justify-between">
              <span>(a) Customer-Facing Application</span>
              <span className="text-[10px] bg-emerald-500/20 text-[#4ADE80] px-1.5 py-0.5 rounded font-mono">WAF-Only (Coraza)</span>
            </div>
            <p className="text-[11px] text-[#F1F5F9]/80 mb-2 leading-relaxed">
              Customer-facing applications (<span className="text-[#38BDF8] font-bold">juiceshop.zerotrust.lan</span>) remain fully decoupled from Authelia — zero Authelia access control policy, zero employee MFA, zero employee SSO delegation.
            </p>
            <ul className="text-[11px] text-[#94A3B8] space-y-1 list-disc list-inside">
              <li>Protected inline by Coraza WAF with OWASP Core Rule Set.</li>
              <li>Customers register & authenticate via the native application user database.</li>
              <li><strong className="text-white">Conversion Preservation:</strong> Enterprise-style MFA on a public customer app would destroy conversion and is explicitly <em>NOT</em> how AEGIS is designed.</li>
            </ul>
          </div>

          <div className="bg-[#1E293B] p-4 rounded border border-[#334155]">
            <div className="font-bold text-[#38BDF8] mb-2 flex items-center justify-between">
              <span>(b) Employee / Admin Domain</span>
              <span className="text-[10px] bg-blue-500/20 text-[#38BDF8] px-1.5 py-0.5 rounded font-mono">Group-Scoped 2FA</span>
            </div>
            <p className="text-[11px] text-[#F1F5F9]/80 mb-2 leading-relaxed">
              Employee and administration paths strictly mandate <code className="text-[#38BDF8] bg-black/40 px-1 py-0.5 rounded">policy: two_factor</code> via Authelia, scoped by LDAP-derived group membership (<code className="text-white">ou=Security_Groups: admins, it_ops, security, users</code>).
            </p>
            <ul className="text-[11px] text-[#94A3B8] space-y-1 list-disc list-inside">
              <li>Admin consoles (<code className="text-[#38BDF8]">keycloak</code>, <code className="text-[#38BDF8]">traefik</code>) restricted to <code className="text-emerald-400">group:admins</code>.</li>
              <li>Docker manager (<code className="text-[#38BDF8]">portainer</code>) restricted to <code className="text-emerald-400">group:admins</code> and <code className="text-emerald-400">group:it_ops</code>.</li>
              <li>Wildcard fallback enforces 2FA for all other internal authenticated users.</li>
            </ul>
          </div>
        </div>

        {/* Authelia Access Control YAML Example */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Hardened Authelia Gateway Configuration (<code className="text-[#38BDF8]">authelia/configuration.yml</code>):</span>
            <button
              onClick={() =>
                handleCopy(
                  `access_control:\n  default_policy: deny\n  rules:\n    # 1. Authelia portal — bypass (is the auth layer itself)\n    - domain: "authelia.zerotrust.lan"\n      policy: bypass\n\n    # 2. Keycloak OIDC protocol endpoints — bypass (required for OAuth2 flow)\n    - domain: "keycloak.zerotrust.lan"\n      resources:\n        - "^/realms/.*/protocol/openid-connect/.*"\n        - "^/realms/.*/login-actions/.*"\n        - "^/health/.*"\n        - "^/js/.*"\n        - "^/resources/.*"\n        - "^/realms/.*/account/.*"\n      policy: bypass\n\n    # 3. Keycloak admin interfaces — two_factor, group:admins only, explicit deny otherwise\n    - domain: "keycloak.zerotrust.lan"\n      policy: two_factor\n      subject: "group:admins"\n    - domain: "keycloak.zerotrust.lan"\n      policy: deny\n\n    # 4. Traefik dashboard — two_factor, group:admins only, explicit deny otherwise\n    - domain: "traefik.zerotrust.lan"\n      policy: two_factor\n      subject: "group:admins"\n    - domain: "traefik.zerotrust.lan"\n      policy: deny\n\n    # 5. Mailpit SMTP sinkhole — bypass (dev/test SMTP sinkhole, documented known limitation)\n    - domain: "mailpit.zerotrust.lan"\n      policy: bypass\n\n    # 6. Portainer (Docker socket, root-equivalent power) — two_factor, admins or it_ops, explicit deny otherwise\n    - domain: "portainer.zerotrust.lan"\n      policy: two_factor\n      subject:\n        - "group:admins"\n        - "group:it_ops"\n    - domain: "portainer.zerotrust.lan"\n      policy: deny\n\n    # (juiceshop.zerotrust.lan has NO Authelia policy — public-facing, protected only by Coraza WAF)\n\n    # 7. Wildcard fallback — two_factor, any authenticated user\n    - domain: "*.zerotrust.lan"\n      policy: two_factor`,
                  'authelia_ac'
                )
              }
              className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
            >
              {copiedCode === 'authelia_ac' ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode === 'authelia_ac' ? 'Copied!' : 'Copy YAML'}</span>
            </button>
          </div>
          <div className="bg-[#0F172A] p-3 rounded border border-[#334155] text-[11px] font-mono text-[#38BDF8] whitespace-pre overflow-x-auto">
{`access_control:
  default_policy: deny
  rules:
    # 1. Authelia portal — bypass (is the auth layer itself)
    - domain: "authelia.zerotrust.lan"
      policy: bypass

    # 2. Keycloak OIDC protocol endpoints — bypass (required for OAuth2 flow)
    - domain: "keycloak.zerotrust.lan"
      resources:
        - "^/realms/.*/protocol/openid-connect/.*"
        - "^/realms/.*/login-actions/.*"
        - "^/health/.*"
        - "^/js/.*"
        - "^/resources/.*"
        - "^/realms/.*/account/.*"
      policy: bypass

    # 3. Keycloak admin interfaces — two_factor, group:admins only, explicit deny otherwise
    - domain: "keycloak.zerotrust.lan"
      policy: two_factor
      subject: "group:admins"
    - domain: "keycloak.zerotrust.lan"
      policy: deny

    # 4. Traefik dashboard — two_factor, group:admins only, explicit deny otherwise
    - domain: "traefik.zerotrust.lan"
      policy: two_factor
      subject: "group:admins"
    - domain: "traefik.zerotrust.lan"
      policy: deny

    # 5. Mailpit SMTP sinkhole — bypass (dev/test SMTP sinkhole, documented known limitation)
    - domain: "mailpit.zerotrust.lan"
      policy: bypass

    # 6. Portainer (Docker socket, root-equivalent power) — two_factor, admins or it_ops, explicit deny otherwise
    - domain: "portainer.zerotrust.lan"
      policy: two_factor
      subject:
        - "group:admins"
        - "group:it_ops"
    - domain: "portainer.zerotrust.lan"
      policy: deny

    # (juiceshop.zerotrust.lan has NO Authelia policy — public-facing, protected only by Coraza WAF)

    # 7. Wildcard fallback — two_factor, any authenticated user
    - domain: "*.zerotrust.lan"
      policy: two_factor`}
          </div>
        </div>

        {/* Fallthrough Fix, Hijacking Mitigation & TOTP Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="bg-[#1E293B] border border-amber-500/40 rounded p-3 text-[11px] text-[#F1F5F9]/90 space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Rule Fallthrough Fix</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              Authelia applies the first full match. When only the subject fails to match, it falls through to subsequent rules. An explicit <code className="text-amber-300">policy: deny</code> rule must immediately follow each group rule to prevent fallthrough to the wildcard rule.
            </p>
          </div>

          <div className="bg-[#1E293B] border border-[#38BDF8]/40 rounded p-3 text-[11px] text-[#F1F5F9]/90 space-y-1">
            <div className="font-bold text-[#38BDF8] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Session Hijacking Mitigation</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              Admin-path MFA re-validates even within an already-valid general session. Hijacking a standard session cookie does not grant access to admin interfaces without completing a fresh hardware/TOTP challenge.
            </p>
          </div>

          <div className="bg-[#1E293B] border border-emerald-500/40 rounded p-3 text-[11px] text-[#F1F5F9]/90 space-y-1">
            <div className="font-bold text-[#4ADE80] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TOTP MFA Security Boundary</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              TOTP MFA secrets are rendered <span className="text-white font-semibold">once in-browser</span> during authenticated enrollment and <span className="text-[#4ADE80] font-semibold">NEVER transit email / Mailpit</span>, remaining immune to sinkhole exposure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
