import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MermaidDiagram } from './MermaidDiagram';
import {
  ShieldCheck,
  Users,
  Key,
  Lock,
  UserCheck,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Briefcase,
  RotateCcw,
  Fingerprint,
  Layers,
  Search,
  Filter,
  Terminal,
  Server,
  Shield,
  ArrowRight,
  Workflow,
  Network,
  GitBranch,
} from 'lucide-react';

interface RoleMapping {
  group: string;
  role: string;
  sessionLength: string;
  mfaInterval: string;
  scope: string;
  color: string;
  allowedDomains: string[];
  deniedDomains: string[];
  description: string;
}

const ROLE_MAPPINGS: RoleMapping[] = [
  {
    group: 'Marketing',
    role: 'Marketing Staff',
    sessionLength: '8h',
    mfaInterval: 'Login only',
    scope: 'Marketing CRM, Shared department drive, Public blog editor',
    color: 'emerald',
    allowedDomains: ['crm.zerotrust.lan', 'drive.zerotrust.lan'],
    deniedDomains: ['portainer.zerotrust.lan', 'kibana.zerotrust.lan', 'keycloak.zerotrust.lan', 'shop.zerotrust.lan/admin'],
    description: 'General business user. Access restricted to marketing SaaS portals and department file stores.',
  },
  {
    group: 'HR',
    role: 'HR Personnel',
    sessionLength: '8h',
    mfaInterval: 'Every 2h',
    scope: 'HR Information System (HRIS), Payroll & confidential employee records',
    color: 'amber',
    allowedDomains: ['hris.zerotrust.lan', 'payroll.zerotrust.lan'],
    deniedDomains: ['portainer.zerotrust.lan', 'kibana.zerotrust.lan', 'traefik.zerotrust.lan'],
    description: 'High-confidentiality internal business data. Enforces periodic 2-hour step-up MFA re-checks for session freshness.',
  },
  {
    group: 'Developers',
    role: 'Web & API Developers',
    sessionLength: '8h',
    mfaInterval: 'Login only (general); two_factor step-up on /admin.*',
    scope: 'Developer tooling, GitLab CI/CD, scoped juiceshop-admins access',
    color: 'sky',
    allowedDomains: ['gitlab.zerotrust.lan', 'dev.zerotrust.lan', 'shop.zerotrust.lan/admin'],
    deniedDomains: ['kibana.zerotrust.lan (raw SOC)', 'traefik.zerotrust.lan/api', 'mail-relay.internal'],
    description: 'Software engineers building client-facing services. Can access scoped admin panels with step-up verification.',
  },
  {
    group: 'DevOps',
    role: 'Infrastructure Engineers',
    sessionLength: '4h',
    mfaInterval: 'Every 2h',
    scope: 'Portainer CE, Grafana monitoring, container registries & CI/CD deployment pipelines',
    color: 'blue',
    allowedDomains: ['portainer.zerotrust.lan', 'grafana.zerotrust.lan', 'registry.zerotrust.lan'],
    deniedDomains: ['kibana.zerotrust.lan (Zone 4 raw SOC multi-tenant)'],
    description: 'Platform engineers managing Zone 3 gateway infrastructure. Reduced 4-hour session life with mandatory 2-hour MFA verification.',
  },
  {
    group: 'IT',
    role: 'Gateway & Network Admin',
    sessionLength: '2h',
    mfaInterval: 'Every 1h or FIDO2 hardware key',
    scope: 'Portainer, Traefik dynamic router config, hardened mail relay admin, core firewall rules',
    color: 'rose',
    allowedDomains: ['traefik.zerotrust.lan', 'portainer.zerotrust.lan', 'keycloak.zerotrust.lan', 'relay-admin.zerotrust.lan'],
    deniedDomains: ['kibana.zerotrust.lan (raw MSSP SOC — isolated to Zone 4 analysts)'],
    description: 'Highest administrative authority over the ZTA gateway. Enforces strict 2-hour session lifetime and 1-hour MFA re-checks.',
  },
  {
    group: 'Executive',
    role: 'CEO / Leadership',
    sessionLength: '8h',
    mfaInterval: 'Login only',
    scope: 'Read-only high-level posture dashboard (Red/Yellow/Green rollups); NOT raw SOC tools',
    color: 'purple',
    allowedDomains: ['executive.zerotrust.lan', 'crm.zerotrust.lan'],
    deniedDomains: ['portainer.zerotrust.lan', 'traefik.zerotrust.lan', 'kibana.zerotrust.lan', 'shop.zerotrust.lan/admin'],
    description: 'Corporate decision-makers. Strictly limited to high-level summaries. Never inherits raw technical admin tools by virtue of corporate title.',
  },
];

interface SimulationPersona {
  id: string;
  name: string;
  group: string;
  isCustomer: boolean;
  avatar: string;
  hasMFA: boolean;
  sessionAgeHours: number;
}

const PERSONAS: SimulationPersona[] = [
  { id: 'p1', name: 'Public Customer', group: 'Anonymous Web User', isCustomer: true, avatar: '🛍️', hasMFA: false, sessionAgeHours: 0 },
  { id: 'p2', name: 'Junior Frontend Dev (Alice)', group: 'Developers', isCustomer: false, avatar: '👩‍💻', hasMFA: true, sessionAgeHours: 1 },
  { id: 'p3', name: 'Marketing Manager (Bob)', group: 'Marketing', isCustomer: false, avatar: '📈', hasMFA: true, sessionAgeHours: 3 },
  { id: 'p4', name: 'HR Specialist (Clara)', group: 'HR', isCustomer: false, avatar: '📋', hasMFA: true, sessionAgeHours: 2.5 },
  { id: 'p5', name: 'DevOps Lead (David)', group: 'DevOps', isCustomer: false, avatar: '⚙️', hasMFA: true, sessionAgeHours: 3.5 },
  { id: 'p6', name: 'Network Admin (Eagle)', group: 'IT', isCustomer: false, avatar: '🛡️', hasMFA: true, sessionAgeHours: 1.5 },
  { id: 'p7', name: 'Chief Executive Officer (CEO)', group: 'Executive', isCustomer: false, avatar: '👔', hasMFA: true, sessionAgeHours: 4 },
  { id: 'p8', name: 'AEGIS SOC Analyst (Ezio)', group: 'AEGIS-SOC-Tier1', isCustomer: false, avatar: '🦅', hasMFA: true, sessionAgeHours: 2 },
];

interface DestinationEndpoint {
  id: string;
  name: string;
  url: string;
  domain: string;
  path: string;
  zone: string;
  description: string;
}

const ENDPOINTS: DestinationEndpoint[] = [
  { id: 'e1', name: 'Juice Shop Public Storefront', url: 'https://shop.zerotrust.lan/', domain: 'shop.zerotrust.lan', path: '/', zone: 'Zone 3 (DMZ)', description: 'Public e-commerce storefront for customers' },
  { id: 'e2', name: 'Juice Shop Admin Panel', url: 'https://shop.zerotrust.lan/admin/dashboard', domain: 'shop.zerotrust.lan', path: '/admin/dashboard', zone: 'Zone 3 (Protected)', description: 'Product and user administration interface' },
  { id: 'e3', name: 'Portainer CE Container Manager', url: 'https://portainer.zerotrust.lan/', domain: 'portainer.zerotrust.lan', path: '/', zone: 'Zone 3 (Auth Enclave)', description: 'Docker container management console' },
  { id: 'e4', name: 'Traefik Dynamic Routing Dashboard', url: 'https://traefik.zerotrust.lan/dashboard/', domain: 'traefik.zerotrust.lan', path: '/dashboard/', zone: 'Zone 3 (Gateway)', description: 'Edge reverse proxy configuration & routing metrics' },
  { id: 'e5', name: 'HR Payroll & PII System', url: 'https://hris.zerotrust.lan/payroll', domain: 'hris.zerotrust.lan', path: '/payroll', zone: 'Zone 2 (Internal)', description: 'Confidential employee salaries and identity records' },
  { id: 'e6', name: 'Kibana 8.19 Raw Multi-Tenant SOC', url: 'https://minisoc2.zerotrust.lan/kibana', domain: 'minisoc2.zerotrust.lan', path: '/kibana', zone: 'Zone 4 (MSSP SOC)', description: 'Raw SIEM telemetry, MITRE alerts & elasticsearch index viewer' },
  { id: 'e7', name: 'Executive Posture Rollup Portal', url: 'https://executive.zerotrust.lan/scorecard', domain: 'executive.zerotrust.lan', path: '/scorecard', zone: 'Zone 3 (Corporate)', description: 'High-level Red/Yellow/Green SLA and MTTD rollups' },
];

export const CUSTOMER_VS_EMPLOYEE_AUTH_MERMAID = `graph TB
    subgraph Inbound["🌐 Inbound Traffic & Identity Context"]
        CUST["🛍️ Public Consumer / Customer<br/>(Anonymous Web Browser)"]
        EMP["💼 Internal Employee / Admin<br/>(aegis.corp AD Principal)"]
    end

    subgraph EdgeGateway["🛡️ Zone 3: Traefik v3 Edge Gateway (Reverse Proxy)"]
        TRAEFIK["Traefik Ingress Router<br/>TLS Termination (*.zerotrust.lan)"]
        ROUTER{"Host & Path Evaluation<br/>(shop.zerotrust.lan vs *.zerotrust.lan)"}
    end

    subgraph CustomerPath["🟢 Customer Authentication Path (policy: bypass)"]
        BYPASS["Authelia Rule: bypass<br/>Zero Enterprise SSO / No Corporate MFA"]
        SHOP["OWASP Juice Shop Storefront<br/>Local SQLite / Native App Auth"]
        CUST_OK["✅ Instant Storefront Access & Fast Checkout<br/>HTTP 200 OK (Preserves Consumer Conversion)"]
    end

    subgraph EmployeePath["🔵 Employee / Admin Authentication Path (policy: two_factor)"]
        FORWARD_AUTH["Authelia Forward-Auth Middleware<br/>/api/authz/forward-auth"]
        SESSION_CHECK{"Valid Session in<br/>Redis Cache?"}
        KEYCLOAK["Keycloak Identity Provider<br/>OIDC SSO Token Broker"]
        AD["Active Directory (aegis.corp)<br/>LDAP / Kerberos / Group Claims"]
        MFA{"TOTP / Hardware MFA Challenge<br/>(Step-Up Re-auth on /admin.*)"}
        RBAC{"AD Group Authorized<br/>for Target Service?"}
        PROTECTED_APPS["Protected Enclave Applications<br/>(Portainer / Traefik / HRIS / Store Admin)"]
        DENY_BLOCK["🛑 HTTP 401 / 403 Access Denied<br/>Unauthorized or Missing Group Claim"]
    end

    CUST -->|"1. GET /shop"| TRAEFIK
    EMP -->|"1. GET /dashboard or /admin"| TRAEFIK

    TRAEFIK --> ROUTER

    ROUTER -->|"Domain: shop.zerotrust.lan"| BYPASS
    BYPASS --> SHOP
    SHOP --> CUST_OK

    ROUTER -->|"Domain: *.zerotrust.lan or Path: /admin.*"| FORWARD_AUTH
    FORWARD_AUTH --> SESSION_CHECK
    SESSION_CHECK -->|"No / Expired Session"| KEYCLOAK
    KEYCLOAK --> AD
    AD --> MFA
    SESSION_CHECK -->|"Valid Session"| MFA

    MFA -->|"Valid TOTP Code"| RBAC
    MFA -->|"Invalid / Canceled"| DENY_BLOCK

    RBAC -->|"Group Match (e.g. IT, Developers)"| PROTECTED_APPS
    RBAC -->|"Group Mismatch / Forbidden"| DENY_BLOCK

    classDef customer fill:#052e16,stroke:#4ADE80,stroke-width:2px,color:#f0fdf4
    classDef employee fill:#082f49,stroke:#38BDF8,stroke-width:2px,color:#f0f9ff
    classDef edge fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef decision fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#faf5ff
    classDef mfa fill:#451a03,stroke:#FBBF24,stroke-width:2px,color:#fefce8
    classDef deny fill:#4c0519,stroke:#F43F5E,stroke-width:2px,color:#fff1f2
    classDef success fill:#022c22,stroke:#10b981,stroke-width:2px,color:#ecfdf5

    class CUST,BYPASS,SHOP customer
    class EMP,FORWARD_AUTH,KEYCLOAK,AD,PROTECTED_APPS employee
    class TRAEFIK,ROUTER edge
    class SESSION_CHECK,RBAC decision
    class MFA mfa
    class DENY_BLOCK deny
    class CUST_OK success
`;

export const GovernancePolicyView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Simulator State
  const [simPersonaId, setSimPersonaId] = useState<string>('p1');
  const [simEndpointId, setSimEndpointId] = useState<string>('e1');
  const [simStepUpMfaCompleted, setSimStepUpMfaCompleted] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredRoles = ROLE_MAPPINGS.filter((r) => {
    const matchesGroup = selectedGroup === 'all' || r.group === selectedGroup;
    const matchesSearch =
      r.group.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.scope.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const currentPersona = PERSONAS.find((p) => p.id === simPersonaId) || PERSONAS[0];
  const currentEndpoint = ENDPOINTS.find((e) => e.id === simEndpointId) || ENDPOINTS[0];

  // Evaluate Simulation Decision
  const evaluatePolicy = () => {
    // 1. Customer Storefront
    if (currentEndpoint.domain === 'shop.zerotrust.lan' && !currentEndpoint.path.startsWith('/admin')) {
      return {
        decision: 'ALLOW (BYPASS)',
        policy: 'policy: bypass',
        status: 200,
        color: 'emerald',
        reason: 'Customer-facing public route. Traefik bypasses Authelia forward-auth to preserve storefront user conversion.',
        requiresStepUp: false,
        adCheck: 'None (Public)',
      };
    }

    // 2. Customer on any protected internal route
    if (currentPersona.isCustomer) {
      return {
        decision: 'DENY (401 UNAUTHORIZED)',
        policy: 'policy: two_factor (default deny)',
        status: 401,
        color: 'rose',
        reason: 'Public anonymous customer has no Active Directory account in aegis.corp and is blocked at the gateway.',
        requiresStepUp: false,
        adCheck: 'Failed: Unauthenticated',
      };
    }

    // 3. Storefront Admin Panel
    if (currentEndpoint.domain === 'shop.zerotrust.lan' && currentEndpoint.path.startsWith('/admin')) {
      if (currentPersona.group === 'Developers' || currentPersona.group === 'IT') {
        if (!simStepUpMfaCompleted) {
          return {
            decision: 'CHALLENGE (STEP-UP MFA REQUIRED)',
            policy: 'policy: two_factor (subject: group:juiceshop-admins)',
            status: 401,
            color: 'amber',
            reason: 'User has valid general session, but /admin.* enforces step-up re-authentication to prevent session-cookie hijacking.',
            requiresStepUp: true,
            adCheck: `Passed: Member of ${currentPersona.group}`,
          };
        } else {
          return {
            decision: 'ALLOW (STEP-UP 2FA VERIFIED)',
            policy: 'policy: two_factor',
            status: 200,
            color: 'emerald',
            reason: 'Admin-path step-up challenge satisfied. User granted access to store management.',
            requiresStepUp: false,
            adCheck: `Passed: Member of ${currentPersona.group}`,
          };
        }
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN)',
          policy: 'policy: two_factor (subject mismatch)',
          status: 403,
          color: 'rose',
          reason: `User is authenticated as ${currentPersona.group}, but /admin.* is strictly restricted to juiceshop-admins (Developers/IT).`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} not in juiceshop-admins`,
        };
      }
    }

    // 4. Raw SOC Kibana
    if (currentEndpoint.domain.includes('minisoc2')) {
      if (currentPersona.group === 'AEGIS-SOC-Tier1') {
        return {
          decision: 'ALLOW (SOC ANALYST TIER 1)',
          policy: 'policy: two_factor (MSSP Tier 1 Enclave)',
          status: 200,
          color: 'emerald',
          reason: 'Authorized AEGIS SOC Operator granted full multi-tenant Kibana and MITRE alert triage console access.',
          requiresStepUp: false,
          adCheck: 'Passed: AEGIS SOC Operational Unit',
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN - MSSP ISOLATION)',
          policy: 'policy: deny (MSSP Service Boundary)',
          status: 403,
          color: 'rose',
          reason: `Raw Kibana console is restricted to AEGIS SOC Analysts. Client roles (${currentPersona.group}) receive scoped escalation advisories only.`,
          requiresStepUp: false,
          adCheck: 'Failed: Client accounts cannot access shared SOC backend',
        };
      }
    }

    // 5. Portainer & Traefik Admin
    if (currentEndpoint.domain.includes('portainer') || currentEndpoint.domain.includes('traefik')) {
      if (currentPersona.group === 'IT' || (currentPersona.group === 'DevOps' && currentEndpoint.domain.includes('portainer'))) {
        return {
          decision: 'ALLOW (AUTHORIZED INFRA ADMIN)',
          policy: 'policy: two_factor (subject: group:it, group:devops)',
          status: 200,
          color: 'emerald',
          reason: `Granted access based on Active Directory infrastructure engineering group membership (${currentPersona.group}).`,
          requiresStepUp: false,
          adCheck: `Passed: ${currentPersona.group} infrastructure role`,
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN)',
          policy: 'policy: deny',
          status: 403,
          color: 'rose',
          reason: `Access to core gateway and container infrastructure is strictly denied to group ${currentPersona.group}. Corporate title does not grant infrastructure privileges.`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} lacks infrastructure authorization`,
        };
      }
    }

    // 6. HRIS / Payroll
    if (currentEndpoint.domain.includes('hris')) {
      if (currentPersona.group === 'HR') {
        if (currentPersona.sessionAgeHours > 2) {
          return {
            decision: 'CHALLENGE (2-HOUR MFA EXPIRY)',
            policy: 'policy: two_factor (MFA Re-check: 2h)',
            status: 401,
            color: 'amber',
            reason: `Session age (${currentPersona.sessionAgeHours}h) exceeds the 2-hour confidential HR MFA threshold. Re-authentication prompt triggered.`,
            requiresStepUp: true,
            adCheck: 'Passed: HR Group (Session Refresh Required)',
          };
        }
        return {
          decision: 'ALLOW (HR AUTHORIZED)',
          policy: 'policy: two_factor (subject: group:hr)',
          status: 200,
          color: 'emerald',
          reason: 'Access granted to confidential employee records within valid 2-hour MFA freshness window.',
          requiresStepUp: false,
          adCheck: 'Passed: HR Group',
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN)',
          policy: 'policy: deny',
          status: 403,
          color: 'rose',
          reason: `Group ${currentPersona.group} is not authorized to access confidential HR/Payroll records.`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} not in HR Group`,
        };
      }
    }

    // 7. Executive Posture Portal
    if (currentEndpoint.domain.includes('executive')) {
      if (currentPersona.group === 'Executive' || currentPersona.group === 'IT') {
        return {
          decision: 'ALLOW (EXECUTIVE POSTURE ROLLUP)',
          policy: 'policy: two_factor (subject: group:executive)',
          status: 200,
          color: 'emerald',
          reason: 'Access granted to high-level posture summaries, SLA compliance trends, and MTTR risk scorecards.',
          requiresStepUp: false,
          adCheck: `Passed: ${currentPersona.group} authorized`,
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN)',
          policy: 'policy: deny',
          status: 403,
          color: 'rose',
          reason: `Staff in group ${currentPersona.group} cannot view executive posture scorecard.`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} not in Executive`,
        };
      }
    }

    // Default
    return {
      decision: 'DENY (DEFAULT DENY)',
      policy: 'default_policy: deny',
      status: 403,
      color: 'rose',
      reason: 'No explicit Authelia rule matched. Default deny policy enforced.',
      requiresStepUp: false,
      adCheck: 'Default Deny Enforced',
    };
  };

  const simResult = evaluatePolicy();

  return (
    <div className="space-y-8 font-mono">
      {/* SECTION HEADER CARD */}
      <div className="pro-card p-6 relative overflow-hidden shadow-lg border-[#38BDF8]/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-4 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#0F172A] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-sm glow-cyan-hover">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#38BDF8] bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/30 uppercase tracking-widest font-mono">
                  [SECTION_11] · AEGIS v2.1 POLICY SPECIFICATION
                </span>
                <span className="status-badge-success">
                  Dual-Domain Architecture
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#F1F5F9] tracking-wide mt-1 font-mono glitch-header flex items-center">
                Identity, Access & Service Governance Policy
                <span className="terminal-cursor-cyan text-base">▊</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#0F172A] text-[#94A3B8] border border-[#334155] px-3 py-1.5 rounded font-mono">
              AD DS: <strong className="text-white">aegis.corp</strong>
            </span>
            <span className="status-badge-accent">
              Authelia v4.38 + Traefik v3
            </span>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] font-sans mt-3 leading-relaxed relative z-10 max-w-5xl">
          Zero-Trust security fails when access models disregard user context. AEGIS establishes strict architectural separation between <strong className="text-white">Customer-Facing Public E-Commerce</strong> and <strong className="text-[#38BDF8]">Internal Employee/Admin Infrastructure</strong>. Privilege is dynamically bound to Active Directory security groups (job function), never organizational rank, with symmetric onboarding and instantaneous offboarding.
        </p>

        {/* 4 Pillars Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 relative z-10 text-xs">
          <div className="pro-card p-3.5 glow-green-hover">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] uppercase font-bold font-mono">
              <span>Domain 1: Customer</span>
              <span className="text-[#4ADE80]">[BYPASS]</span>
            </div>
            <div className="text-sm font-bold text-[#4ADE80] mt-1 font-mono">policy: bypass</div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
              Zero enterprise MFA on public shop. Protects consumer checkout conversion.
            </p>
          </div>

          <div className="pro-card p-3.5 glow-cyan-hover">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] uppercase font-bold font-mono">
              <span>Domain 2: Employee</span>
              <span className="text-[#38BDF8]">[2FA_ENFORCED]</span>
            </div>
            <div className="text-sm font-bold text-[#38BDF8] mt-1 font-mono">policy: two_factor</div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
              AD security group scoping with step-up verification on <code className="text-white">/admin.*</code>.
            </p>
          </div>

          <div className="pro-card p-3.5 glow-amber-hover">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] uppercase font-bold font-mono">
              <span>Account Lifecycle</span>
              <span className="text-[#FBBF24]">[6_STEPS]</span>
            </div>
            <div className="text-sm font-bold text-[#FBBF24] mt-1 font-mono">Symmetric AD Truth</div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
              Single-use activation link + on-screen TOTP enrollment (never over email).
            </p>
          </div>

          <div className="pro-card p-3.5 hover:border-purple-500/60 transition-colors">
            <div className="flex items-center justify-between text-[#94A3B8] text-[10px] uppercase font-bold font-mono">
              <span>MSSP Service Model</span>
              <span className="text-purple-400">[3_TIERS]</span>
            </div>
            <div className="text-sm font-bold text-purple-400 mt-1 font-mono">Tenant Isolation</div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
              Analysts get raw Kibana; clients receive actionable incident escalations.
            </p>
          </div>
        </div>
      </div>

      {/* 1. ACCESS CONTROL MODEL — CUSTOMERS VS. EMPLOYEES */}
      <section className="space-y-4">
        <div className="terminal-panel-header flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="pro-title text-white">
              1. Access Control Model — Customers vs. Employees
            </h3>
          </div>
          <span className="status-badge-accent">
            Authelia Forward-Auth + Traefik Ingress
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Customer Domain Card */}
          <div className="pro-card p-5 space-y-3 glow-green-hover border-emerald-500/40">
            <div className="terminal-panel-header flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#4ADE80]">
                  🛍️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#4ADE80] font-mono">Customer-Facing Domain</h4>
                  <p className="text-[11px] text-[#94A3B8] font-mono">shop.zerotrust.lan (Storefront)</p>
                </div>
              </div>
              <span className="status-badge-success font-mono font-bold">
                policy: bypass
              </span>
            </div>

            <p className="text-xs text-[#F1F5F9]/80 font-sans leading-relaxed">
              Customer-facing paths (such as the OWASP Juice Shop public storefront) are explicitly configured with <code className="text-[#4ADE80] bg-black/40 px-1 py-0.5 rounded font-mono">policy: bypass</code> in Authelia — zero enterprise MFA and zero employee SSO delegation.
            </p>

            <div className="space-y-2 text-xs font-sans">
              <div className="bg-[#0F172A] p-3 rounded border border-[#334155] space-y-1">
                <strong className="text-white flex items-center gap-1.5 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                  Native Application Authentication
                </strong>
                <p className="text-[#94A3B8] text-[11px]">
                  Customers register and sign in through the application's local user database. Corporate Active Directory credentials are not required or exposed.
                </p>
              </div>

              <div className="bg-[#0F172A] p-3 rounded border border-amber-500/30 space-y-1">
                <strong className="text-amber-300 flex items-center gap-1.5 font-mono text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Conversion Preservation Principle
                </strong>
                <p className="text-[#94A3B8] text-[11px]">
                  Forcing enterprise 2FA or corporate identity checks onto a public consumer e-commerce storefront would destroy conversion and represents an architectural defect dressed up as security.
                </p>
              </div>
            </div>
          </div>

          {/* Employee/Admin Domain Card */}
          <div className="pro-card p-5 space-y-3 glow-cyan-hover border-[#38BDF8]/40">
            <div className="terminal-panel-header flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-[#38BDF8]">
                  💼
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#38BDF8] font-mono">Employee & Admin Domain</h4>
                  <p className="text-[11px] text-[#94A3B8] font-mono">*.zerotrust.lan + /admin routes</p>
                </div>
              </div>
              <span className="status-badge-accent font-mono font-bold">
                policy: two_factor
              </span>
            </div>

            <p className="text-xs text-[#F1F5F9]/80 font-sans leading-relaxed">
              Internal engineering tools, management consoles (Portainer, Traefik, Keycloak), and administration endpoints mandate <code className="text-[#38BDF8] bg-black/40 px-1 py-0.5 rounded font-mono">policy: two_factor</code> via Authelia forward-auth.
            </p>

            <div className="space-y-2 text-xs font-sans">
              <div className="bg-[#0F172A] p-3 rounded border border-[#334155] space-y-1">
                <strong className="text-white flex items-center gap-1.5 font-mono text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Active Directory Group Scoping
                </strong>
                <p className="text-[#94A3B8] text-[11px]">
                  Access tokens issued by Keycloak contain Active Directory group claims. Gateway rules enforce granular RBAC on every URL prefix.
                </p>
              </div>

              <div className="bg-[#0F172A] p-3 rounded border border-sky-500/30 space-y-1">
                <strong className="text-[#38BDF8] flex items-center gap-1.5 font-mono text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Session-Cookie Hijacking Mitigation
                </strong>
                <p className="text-[#94A3B8] text-[11px]">
                  Admin-path MFA re-validates even within an already-valid general session. If an attacker hijacks a standard user session cookie, they cannot silently pivot to <code className="text-white">/admin</code> without completing a secondary hardware/TOTP challenge.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VISUAL FLOW CHART (MERMAID.JS) */}
        <div className="pro-card p-5 space-y-3 border-[#38BDF8]/40 shadow-lg">
          <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-[#38BDF8]" />
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span>Visual Authentication Flow — Customer Bypass vs. Employee 2FA Gate</span>
                </h4>
                <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                  Path-based decision tree executed at the Traefik v3 reverse proxy and Authelia v4.38 forward-auth layer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                TRAEFIK + AUTHELIA PIPELINE
              </span>
            </div>
          </div>

          {/* Interactive Flow Diagram Container */}
          <div className="bg-[#0F172A] p-3 rounded-lg border border-[#334155]">
            <MermaidDiagram
              chart={CUSTOMER_VS_EMPLOYEE_AUTH_MERMAID}
              id="customer-vs-employee-auth-flow"
              title="Customer vs. Employee Authentication Path Separation"
            />
          </div>

          {/* Diagram Legend & Architecture Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px] font-sans">
            <div className="bg-[#0B1120] p-2.5 rounded border border-emerald-500/30 flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-0.5 shadow-sm"></span>
              <div>
                <strong className="text-emerald-300 font-mono block text-[10px]">🟢 Customer Path (Bypass):</strong>
                <span className="text-[#94A3B8]">Direct proxy to store app. Preserves checkout UX & conversion rate.</span>
              </div>
            </div>

            <div className="bg-[#0B1120] p-2.5 rounded border border-sky-500/30 flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 mt-0.5 shadow-sm"></span>
              <div>
                <strong className="text-sky-300 font-mono block text-[10px]">🔵 Employee Path (2FA):</strong>
                <span className="text-[#94A3B8]">Authelia forward-auth checks Redis cache & Keycloak AD token claims.</span>
              </div>
            </div>

            <div className="bg-[#0B1120] p-2.5 rounded border border-amber-500/30 flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 mt-0.5 shadow-sm"></span>
              <div>
                <strong className="text-amber-300 font-mono block text-[10px]">🟡 Step-Up Challenge:</strong>
                <span className="text-[#94A3B8]">Re-authenticates TOTP on <code className="text-white font-mono">/admin.*</code> against cookie hijacking.</span>
              </div>
            </div>

            <div className="bg-[#0B1120] p-2.5 rounded border border-rose-500/30 flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0 mt-0.5 shadow-sm"></span>
              <div>
                <strong className="text-rose-300 font-mono block text-[10px]">🔴 Access Denied:</strong>
                <span className="text-[#94A3B8]">Immediate 401/403 for unauthorized users or group mismatches.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Authelia Access Control YAML Code Block */}
        <div className="pro-card p-4 space-y-2">
          <div className="terminal-panel-header flex items-center justify-between pb-2 text-xs">
            <span className="text-[#94A3B8] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
              <code className="text-[#38BDF8] font-bold">authelia/configuration.yml</code>
              <span className="text-[10px] text-[#94A3B8]/80">— Gateway Access Control Rules</span>
            </span>
            <button
              onClick={() =>
                handleCopy(
                  `access_control:\n  default_policy: deny\n  rules:\n    # 1. Customer Storefront (Public access without employee SSO)\n    - domain: "shop.zerotrust.lan"\n      policy: bypass\n\n    # 2. Storefront Admin Panel (Step-up MFA scoped to juice-shop admin group)\n    - domain: "shop.zerotrust.lan"\n      resources: ["^/admin.*"]\n      policy: two_factor\n      subject: "group:juiceshop-admins"\n\n    # 3. Internal Engineering & SOC Domains (Strict 2FA)\n    - domain: "*.zerotrust.lan"\n      policy: two_factor`,
                  'authelia_yaml_spec'
                )
              }
              className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer text-xs glow-cyan-hover px-2 py-0.5 rounded border border-[#38BDF8]/30 bg-[#0F172A]"
            >
              {copiedCode === 'authelia_yaml_spec' ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode === 'authelia_yaml_spec' ? 'Copied YAML!' : 'Copy YAML'}</span>
            </button>
          </div>

          <div className="bg-[#0B1120] p-3.5 rounded border border-[#334155] text-xs font-mono text-[#38BDF8] whitespace-pre overflow-x-auto shadow-inner">
{`access_control:
  default_policy: deny
  rules:
    # 1. Customer Storefront (Public access without employee SSO)
    - domain: "shop.zerotrust.lan"
      policy: bypass

    # 2. Storefront Admin Panel (Step-up MFA scoped to juice-shop admin group)
    - domain: "shop.zerotrust.lan"
      resources: ["^/admin.*"]
      policy: two_factor
      subject: "group:juiceshop-admins"

    # 3. Internal Engineering & SOC Domains (Strict 2FA)
    - domain: "*.zerotrust.lan"
      policy: two_factor`}
          </div>

          <div className="flex items-start gap-2 bg-[#0F172A] border border-emerald-500/30 rounded p-3 text-xs text-[#F1F5F9]/90 font-sans">
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#4ADE80] font-mono">[IN-BROWSER_ISOLATION] TOTP MFA Security Boundary:</strong> TOTP MFA secrets are rendered <span className="text-white font-semibold">once in-browser</span> during authenticated enrollment and <span className="text-[#4ADE80] font-semibold">NEVER transit email / Mailpit</span>. This is safe by design and completely distinct from the mail-sinkhole issue documented in the Security Debt Register.
            </div>
          </div>
        </div>
      </section>

      {/* 2. ROLE-BASED ACCESS MAPPING TABLE */}
      <section className="space-y-4">
        <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FBBF24]" />
            <h3 className="pro-title text-white">
              2. Role-Based Access Mapping (Zone 2 — Active Directory)
            </h3>
          </div>
          <span className="text-xs text-[#FBBF24] bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 font-mono">
            Domain: aegis.corp
          </span>
        </div>

        {/* Filter Controls */}
        <div className="pro-card p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="text-xs text-[#94A3B8] font-mono">Filter by Group:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-mono ${
                  selectedGroup === 'all' ? 'bg-[#38BDF8] text-black font-bold shadow-sm' : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
                }`}
              >
                All Groups ({ROLE_MAPPINGS.length})
              </button>
              {ROLE_MAPPINGS.map((r) => (
                <button
                  key={r.group}
                  onClick={() => setSelectedGroup(r.group)}
                  className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer font-mono ${
                    selectedGroup === r.group ? 'bg-[#FBBF24] text-black font-bold shadow-sm' : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
                  }`}
                >
                  {r.group}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search roles or scopes..."
              className="w-full pl-8 pr-3 py-1 bg-[#0F172A] border border-[#334155] rounded text-xs text-[#F1F5F9] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#38BDF8] font-sans"
            />
          </div>
        </div>

        {/* Interactive Mapping Table */}
        <div className="pro-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead>
                <tr className="terminal-panel-header bg-[#0F172A] text-[#FBBF24] font-mono">
                  <th className="p-3 font-bold">AD Security Group</th>
                  <th className="p-3 font-bold">Example Role</th>
                  <th className="p-3 font-bold">Session Duration</th>
                  <th className="p-3 font-bold">MFA Re-check Interval</th>
                  <th className="p-3 font-bold">Enforced Access Scope</th>
                  <th className="p-3 font-bold">Explicit Restrictions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155] text-[#F1F5F9]/90">
                {filteredRoles.map((r, index) => (
                  <motion.tr
                    key={r.group}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.06,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    className="hover:bg-[#0F172A]/70 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        r.color === 'emerald' ? 'bg-emerald-400' :
                        r.color === 'amber' ? 'bg-amber-400' :
                        r.color === 'sky' ? 'bg-sky-400' :
                        r.color === 'blue' ? 'bg-blue-400' :
                        r.color === 'rose' ? 'bg-rose-400' : 'bg-purple-400'
                      }`}></span>
                      <span>{r.group}</span>
                    </td>
                    <td className="p-3 text-[#94A3B8] font-medium">{r.role}</td>
                    <td className="p-3 font-mono font-semibold text-[#38BDF8]">{r.sessionLength}</td>
                    <td className="p-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        r.mfaInterval.includes('1h') || r.mfaInterval.includes('hardware') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' :
                        r.mfaInterval.includes('2h') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' :
                        'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {r.mfaInterval}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-white">{r.scope}</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">{r.description}</div>
                    </td>
                    <td className="p-3 text-[11px]">
                      <div className="flex flex-wrap gap-1">
                        {r.deniedDomains.map((d) => (
                          <span key={d} className="bg-rose-500/10 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono">
                            ✕ {d}
                          </span>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Core Directive Callout */}
        <div className="pro-card p-4 text-xs font-sans text-[#F1F5F9]/90 flex items-start gap-3 border-[#FBBF24]/40 glow-amber-hover">
          <AlertTriangle className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-[#FBBF24] font-mono text-sm block">
              [GOVERNANCE_DIRECTIVE] Core Zero-Trust Principle:
            </strong>
            <p className="leading-relaxed">
              Privilege maps strictly to <span className="text-white underline font-bold">job function</span> via Active Directory group membership, never to hierarchical org-chart title. An executive account does <span className="text-rose-400 font-bold">NOT</span> automatically inherit admin-panel, gateway configuration, or raw SOC tool access.
            </p>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE POLICY DECISION SIMULATOR (LIVE DEFENSE TOOL) */}
      <section className="pro-card p-5 space-y-4 border-[#38BDF8]/40 shadow-lg">
        <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[#38BDF8]" />
            <div>
              <h3 className="pro-title text-white flex items-center gap-2">
                <span>3. Gateway Policy Decision Simulator</span>
                <span className="status-badge-accent font-normal">
                  Live Defense Demo Tool
                </span>
              </h3>
              <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                Simulate how Traefik and Authelia evaluate incoming identity tokens across disparate URLs.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSimPersonaId('p1');
              setSimEndpointId('e1');
              setSimStepUpMfaCompleted(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0F172A] hover:bg-[#334155] text-[#94A3B8] hover:text-white rounded text-xs transition-colors cursor-pointer border border-[#334155] font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Simulation</span>
          </button>
        </div>

        {/* Simulator Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Persona Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block font-mono">
              1. Select Inbound Identity Persona:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSimPersonaId(p.id);
                    setSimStepUpMfaCompleted(false);
                  }}
                  className={`p-2.5 rounded text-left transition-all border cursor-pointer flex items-center gap-2.5 ${
                    simPersonaId === p.id
                      ? 'bg-sky-500/20 border-[#38BDF8] text-white shadow-sm glow-cyan-active'
                      : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#64748B]'
                  }`}
                >
                  <span className="text-lg">{p.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate text-white">{p.name}</div>
                    <div className="text-[10px] text-[#38BDF8] font-mono truncate">{p.group}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Destination URL Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block font-mono">
              2. Select Target Destination URL:
            </label>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {ENDPOINTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSimEndpointId(e.id);
                    setSimStepUpMfaCompleted(false);
                  }}
                  className={`w-full p-2.5 rounded text-left transition-all border cursor-pointer flex items-start justify-between gap-2 ${
                    simEndpointId === e.id
                      ? 'bg-sky-500/20 border-[#38BDF8] text-white shadow-sm glow-cyan-active'
                      : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#64748B]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{e.name}</div>
                    <div className="text-[10px] text-[#38BDF8] font-mono">{e.url}</div>
                  </div>
                  <span className="text-[9px] bg-black/40 text-[#94A3B8] px-1.5 py-0.5 rounded border border-[#334155] font-mono shrink-0">
                    {e.zone}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step-up MFA trigger button if challenge */}
        {simResult.requiresStepUp && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 glow-amber-hover">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-sans">
              <Key className="w-4 h-4 text-amber-400" />
              <span>
                <strong className="font-mono">[STEP-UP_REQUIRED]</strong> User has a valid general session, but target requires step-up re-authentication.
              </span>
            </div>
            <button
              onClick={() => setSimStepUpMfaCompleted(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Simulate TOTP Step-Up 2FA</span>
            </button>
          </div>
        )}

        {/* Simulation Output Card */}
        <div className={`p-4 rounded-lg border font-mono ${
          simResult.color === 'emerald' ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200' :
          simResult.color === 'amber' ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' :
          'bg-rose-950/30 border-rose-500/50 text-rose-200'
        }`}>
          <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {simResult.color === 'emerald' ? '✅' : simResult.color === 'amber' ? '⚠️' : '🛑'}
              </span>
              <span className="text-sm font-bold tracking-wide">{simResult.decision}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-black/50 border border-white/10 font-bold">
                HTTP {simResult.status}
              </span>
            </div>
            <span className="text-xs bg-black/40 px-2.5 py-1 rounded border border-white/10">
              {simResult.policy}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
            <div>
              <span className="text-[#94A3B8] block text-[10px] uppercase">Active Directory Check:</span>
              <span className="font-semibold text-white">{simResult.adCheck}</span>
            </div>
            <div>
              <span className="text-[#94A3B8] block text-[10px] uppercase">Requested Target:</span>
              <span className="font-semibold text-[#38BDF8] truncate block">{currentEndpoint.url}</span>
            </div>
            <div>
              <span className="text-[#94A3B8] block text-[10px] uppercase">Principal Identity:</span>
              <span className="font-semibold text-white">{currentPersona.name} ({currentPersona.group})</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 text-xs font-sans text-white/90 leading-relaxed">
            <strong className="font-mono">[RATIONALE]</strong> {simResult.reason}
          </div>
        </div>
      </section>

      {/* 4. 6-STEP SECURE ONBOARDING & OFFBOARDING LIFECYCLE */}
      <section className="space-y-4">
        <div className="terminal-panel-header flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#4ADE80]" />
            <h3 className="pro-title text-white">
              4. Secure Onboarding & Offboarding Lifecycle (6-Step Flow)
            </h3>
          </div>
          <span className="status-badge-success">
            Symmetric Identity Lifecycle
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
          {/* Step 1 */}
          <div className="pro-card p-4 space-y-2 glow-cyan-hover">
            <div className="terminal-panel-header flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                STEP 1 · AD PROVISIONING
              </span>
              <Users className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <h4 className="font-bold text-white text-sm font-mono">AD Group Assignment</h4>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              IT/HR creates the AD user entry in <code className="text-white font-mono">aegis.corp</code> and assigns the user's primary security group (e.g. <em>Developers</em>) at creation time. This single directory edit silently shapes all future gateway permissions.
            </p>
          </div>

          {/* Step 2 */}
          <div className="pro-card p-4 space-y-2 glow-amber-hover">
            <div className="terminal-panel-header flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold text-[#FBBF24] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                STEP 2 · SECURE RELAY
              </span>
              <Mail className="w-4 h-4 text-[#FBBF24]" />
            </div>
            <h4 className="font-bold text-white text-sm font-mono">Outbound Relay Activation</h4>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              A real hardened SMTP relay (with SPF/DKIM/DMARC, not Mailpit) transmits <strong className="text-white">ONE</strong> single-use account activation link with a strict 24–48 hour expiration window.
            </p>
          </div>

          {/* Step 3 */}
          <div className="pro-card p-4 space-y-2 glow-green-hover">
            <div className="terminal-panel-header flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold text-[#4ADE80] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                STEP 3 · ARGON2ID CREDENTIAL
              </span>
              <Lock className="w-4 h-4 text-[#4ADE80]" />
            </div>
            <h4 className="font-bold text-white text-sm font-mono">Keycloak & Argon2id Setup</h4>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              The user clicks the link and lands directly in an authenticated Keycloak session. Sets their initial password, hashed server-side with <strong className="text-white">Argon2id</strong> (64MB memory, 3 iterations, 4 parallelism).
            </p>
          </div>

          {/* Step 4 */}
          <div className="pro-card p-4 space-y-2 hover:border-purple-500/60 transition-colors">
            <div className="terminal-panel-header flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                STEP 4 · TOTP ENROLLMENT
              </span>
              <Fingerprint className="w-4 h-4 text-purple-400" />
            </div>
            <h4 className="font-bold text-white text-sm font-mono">On-Screen TOTP QR Generation</h4>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Immediately within the same session, Keycloak renders the TOTP QR code on-screen once. The user scans it into their authenticator app. The initial email link is destroyed permanently.
            </p>
          </div>

          {/* Step 5 */}
          <div className="pro-card p-4 space-y-2 glow-cyan-hover">
            <div className="terminal-panel-header flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                STEP 5 · ROUTINE AUTH LOOP
              </span>
              <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <h4 className="font-bold text-white text-sm font-mono">Password + TOTP Only</h4>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              All future logins require password + TOTP. Email is <strong className="text-[#4ADE80]">permanently removed from the authentication loop</strong>, completely shutting down email interception vectors.
            </p>
          </div>

          {/* Step 6 */}
          <div className="pro-card p-4 space-y-2 border-rose-500/40 hover:border-rose-500 transition-colors">
            <div className="terminal-panel-header flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 font-mono">
                STEP 6 · SYMMETRIC OFFBOARDING
              </span>
              <UserCheck className="w-4 h-4 text-rose-400" />
            </div>
            <h4 className="font-bold text-white text-sm font-mono">Instant AD Revocation</h4>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Disabling or deleting the Active Directory account immediately invalidates all active tokens in Keycloak and closes every access path across Traefik simultaneously.
            </p>
          </div>
        </div>
      </section>

      {/* 5. MSSP SERVICE TIERING MATRIX (ZONE 4) */}
      <section className="space-y-4">
        <div className="terminal-panel-header flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-400" />
            <h3 className="pro-title text-white">
              5. MSSP Service Tiering & Support Model (Zone 4)
            </h3>
          </div>
          <span className="text-xs text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/30 font-mono">
            Commercial MSSP Delivery
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          {/* Tier 1 */}
          <div className="pro-card p-5 space-y-3 border-purple-500/40 hover:border-purple-500 transition-colors">
            <div className="terminal-panel-header flex items-center justify-between pb-2">
              <div>
                <h4 className="font-bold text-purple-300 text-sm font-mono">Tier 1: AEGIS SOC Analysts</h4>
                <div className="text-[10px] text-[#94A3B8] font-mono">Primary Paid Service Core</div>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">
                Raw SIEM
              </span>
            </div>
            <p className="text-[#F1F5F9]/80 leading-relaxed text-[11px]">
              Full raw access to the multi-tenant Elasticsearch 8.19 and Kibana console on <code className="text-[#38BDF8] font-mono">minisoc2</code>.
            </p>
            <ul className="text-[#94A3B8] space-y-1.5 list-disc list-inside text-[11px]">
              <li>Real-time triage of all MITRE ATT&CK-tagged alerts</li>
              <li>Direct MISP threat intel feed correlation & IOC database access</li>
              <li>Shuffle SOAR automated active response execution</li>
            </ul>
          </div>

          {/* Tier 2 */}
          <div className="pro-card p-5 space-y-3 glow-cyan-hover">
            <div className="terminal-panel-header flex items-center justify-between pb-2">
              <div>
                <h4 className="font-bold text-[#38BDF8] text-sm font-mono">Tier 2: Client IT & DevOps</h4>
                <div className="text-[10px] text-[#94A3B8] font-mono">Tenant-Scoped Escalation</div>
              </div>
              <span className="status-badge-accent font-bold">
                Scoped Advisories
              </span>
            </div>
            <p className="text-[#F1F5F9]/80 leading-relaxed text-[11px]">
              Restricted dashboard showing only their own confirmed incidents and summarized threat severity.
            </p>
            <ul className="text-[#94A3B8] space-y-1.5 list-disc list-inside text-[11px]">
              <li>Notified automatically upon verified Level 12+ alert escalations</li>
              <li>Actionable remediation advisories and patch instructions</li>
              <li><strong className="text-amber-400">Strictly Isolated:</strong> No raw Kibana console access</li>
            </ul>
          </div>

          {/* Tier 3 */}
          <div className="pro-card p-5 space-y-3 glow-green-hover">
            <div className="terminal-panel-header flex items-center justify-between pb-2">
              <div>
                <h4 className="font-bold text-[#4ADE80] text-sm font-mono">Tier 3: Client Executives</h4>
                <div className="text-[10px] text-[#94A3B8] font-mono">High-Level Posture Rollup</div>
              </div>
              <span className="status-badge-success font-bold">
                Scorecard Only
              </span>
            </div>
            <p className="text-[#F1F5F9]/80 leading-relaxed text-[11px]">
              High-level organizational posture rollups (Red / Yellow / Green status) and SLA metrics.
            </p>
            <ul className="text-[#94A3B8] space-y-1.5 list-disc list-inside text-[11px]">
              <li>SLA compliance, MTTD, MTTR, and threat landscape trends</li>
              <li>Zero technical alert-level noise or raw log streams</li>
              <li>Quarterly executive risk scorecards for board review</li>
            </ul>
          </div>
        </div>

        {/* Value Proposition Note */}
        <div className="pro-card p-4 text-xs font-sans text-[#F1F5F9]/90 flex items-start gap-3 border-purple-500/30">
          <Briefcase className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-purple-400 font-mono text-sm block">
              [BUSINESS_MODEL] Service Tiering & Multi-Tenant Security:
            </strong>
            <p className="leading-relaxed mt-1">
              This service tiering represents the fundamental business value of the MSSP model. Exposing raw Kibana access or internal SOC tooling directly to client teams would undercut the value proposition of AEGIS managed triage and risk leaking cross-tenant telemetry in a multi-client deployment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
