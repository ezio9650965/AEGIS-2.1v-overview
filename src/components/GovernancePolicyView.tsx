import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CustomerVsEmployeeFlow } from './CustomerVsEmployeeFlow';
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
  Info,
  HelpCircle,
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
  { id: 'p9', name: 'IT Ops Engineer (testuser)', group: 'it_ops', isCustomer: false, avatar: '🔧', hasMFA: true, sessionAgeHours: 1 },
  { id: 'p6', name: 'Network Admin (Eagle)', group: 'admins', isCustomer: false, avatar: '🛡️', hasMFA: true, sessionAgeHours: 1.5 },
  { id: 'p2', name: 'Junior Frontend Dev (Alice)', group: 'users', isCustomer: false, avatar: '👩‍💻', hasMFA: true, sessionAgeHours: 1 },
  { id: 'p3', name: 'Marketing Manager (Bob)', group: 'users', isCustomer: false, avatar: '📈', hasMFA: true, sessionAgeHours: 3 },
  { id: 'p4', name: 'HR Specialist (Clara)', group: 'HR', isCustomer: false, avatar: '📋', hasMFA: true, sessionAgeHours: 2.5 },
  { id: 'p5', name: 'DevOps Lead (David)', group: 'it_ops', isCustomer: false, avatar: '⚙️', hasMFA: true, sessionAgeHours: 3.5 },
  { id: 'p7', name: 'Chief Executive Officer (CEO)', group: 'Executive', isCustomer: false, avatar: '👔', hasMFA: true, sessionAgeHours: 4 },
  { id: 'p8', name: 'AEGIS SOC Analyst (Ezio)', group: 'security', isCustomer: false, avatar: '🦅', hasMFA: true, sessionAgeHours: 2 },
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
  { id: 'e1', name: 'Juice Shop Public Storefront (WAF only)', url: 'https://juiceshop.zerotrust.lan/', domain: 'juiceshop.zerotrust.lan', path: '/', zone: 'Zone 3 (DMZ)', description: 'Public e-commerce storefront (Decoupled from Authelia, protected only by Coraza WAF)' },
  { id: 'e8', name: 'Keycloak OIDC Protocol Endpoint', url: 'https://keycloak.zerotrust.lan/realms/aegis/protocol/openid-connect/auth', domain: 'keycloak.zerotrust.lan', path: '/realms/aegis/protocol/openid-connect/auth', zone: 'Zone 3 (Auth Enclave)', description: 'OAuth2/OIDC token & auth protocol (Rule 2: policy bypass)' },
  { id: 'e9', name: 'Keycloak Admin Console', url: 'https://keycloak.zerotrust.lan/admin/', domain: 'keycloak.zerotrust.lan', path: '/admin/', zone: 'Zone 3 (Auth Enclave)', description: 'Keycloak master administration interface (Rule 3a: admins 2FA, 3b: explicit deny)' },
  { id: 'e4', name: 'Traefik Dynamic Routing Dashboard', url: 'https://traefik.zerotrust.lan/dashboard/', domain: 'traefik.zerotrust.lan', path: '/dashboard/', zone: 'Zone 3 (Gateway)', description: 'Edge reverse proxy configuration (Rule 4a: admins 2FA, 4b: explicit deny)' },
  { id: 'e10', name: 'Mailpit Development SMTP Sinkhole', url: 'https://mailpit.zerotrust.lan/', domain: 'mailpit.zerotrust.lan', path: '/', zone: 'Zone 3 (Dev Enclave)', description: 'Developer email sinkhole web UI (Rule 5: policy bypass)' },
  { id: 'e3', name: 'Portainer CE Container Manager', url: 'https://portainer.zerotrust.lan/', domain: 'portainer.zerotrust.lan', path: '/', zone: 'Zone 3 (Auth Enclave)', description: 'Docker container management socket (Rule 6a: admins/it_ops 2FA, 6b: explicit deny)' },
  { id: 'e11', name: 'Internal Enterprise App (*.zerotrust.lan)', url: 'https://internal.zerotrust.lan/', domain: 'internal.zerotrust.lan', path: '/', zone: 'Zone 3 (Protected)', description: 'Standard enterprise internal tool (Rule 7: wildcard fallback two_factor)' },
  { id: 'e5', name: 'HR Payroll & PII System', url: 'https://hris.zerotrust.lan/payroll', domain: 'hris.zerotrust.lan', path: '/payroll', zone: 'Zone 2 (Internal)', description: 'Confidential employee salaries and identity records' },
  { id: 'e6', name: 'Kibana 8.19 Raw Multi-Tenant SOC', url: 'https://minisoc2.zerotrust.lan/kibana', domain: 'minisoc2.zerotrust.lan', path: '/kibana', zone: 'Zone 4 (MSSP SOC)', description: 'Raw SIEM telemetry, MITRE alerts & elasticsearch index viewer' },
  { id: 'e7', name: 'Executive Posture Rollup Portal', url: 'https://executive.zerotrust.lan/scorecard', domain: 'executive.zerotrust.lan', path: '/scorecard', zone: 'Zone 3 (Corporate)', description: 'High-level Red/Yellow/Green SLA and MTTD rollups' },
];

export interface AutheliaRuleItem {
  id: string;
  order: string;
  domain: string;
  policy: 'bypass' | 'two_factor' | 'deny';
  subject?: string;
  resources?: string[];
  type: 'Bypass' | 'Group-Restricted Admin' | 'Fallthrough Deny' | 'Wildcard Fallback' | 'Decoupled';
  description: string;
  rationale: string;
  testuserVerdict: {
    status: '403 Forbidden' | '2FA Required (Allowed)' | 'Bypassed (200 OK)';
    color: 'rose' | 'emerald' | 'sky';
    detail: string;
  };
}

export const AUTHELIA_LIVE_RULES: AutheliaRuleItem[] = [
  {
    id: 'rule-1',
    order: '1',
    domain: 'authelia.zerotrust.lan',
    policy: 'bypass',
    type: 'Bypass',
    description: 'Authelia Authentication Portal itself',
    rationale: 'Self-authentication bypass. Authelia is the forward-auth provider itself and cannot require forward-auth without creating an infinite redirect loop.',
    testuserVerdict: {
      status: 'Bypassed (200 OK)',
      color: 'sky',
      detail: 'Direct access to login and TOTP challenge screen.',
    },
  },
  {
    id: 'rule-2',
    order: '2',
    domain: 'keycloak.zerotrust.lan',
    policy: 'bypass',
    resources: [
      '^/realms/.*/protocol/openid-connect/.*',
      '^/realms/.*/login-actions/.*',
      '^/health/.*',
      '^/js/.*',
      '^/resources/.*',
      '^/realms/.*/account/.*',
    ],
    type: 'Bypass',
    description: 'Keycloak OIDC & OAuth2 Protocol Endpoints',
    rationale: 'Protocol bypass required for OIDC federation. Bypasses Authelia forward-auth so downstream apps and relying parties can perform authorization-code redirects and token exchanges without recursive authentication deadlocks.',
    testuserVerdict: {
      status: 'Bypassed (200 OK)',
      color: 'sky',
      detail: 'Allows browser redirect to Keycloak realm login actions without edge 401/403 interference.',
    },
  },
  {
    id: 'rule-3a',
    order: '3a',
    domain: 'keycloak.zerotrust.lan',
    policy: 'two_factor',
    subject: 'group:admins',
    type: 'Group-Restricted Admin',
    description: 'Keycloak Admin Console & Realm Configurations',
    rationale: 'Administrative interface restricted strictly to LDAP directory admins (cn=admins,ou=Security_Groups,dc=zerotrust,dc=lan). Requires password + TOTP 2FA.',
    testuserVerdict: {
      status: '403 Forbidden',
      color: 'rose',
      detail: 'testuser (groups: it_ops, users) fails subject match (not in admins). Triggers immediate evaluation of rule 3b.',
    },
  },
  {
    id: 'rule-3b',
    order: '3b',
    domain: 'keycloak.zerotrust.lan',
    policy: 'deny',
    subject: 'All other subjects (non-admins)',
    type: 'Fallthrough Deny',
    description: 'Keycloak Fallthrough Prevention Deny Rule',
    rationale: 'CRITICAL SECURITY HARDENING: Authelia evaluates top-to-bottom and does NOT implicitly deny on subject mismatch alone. Without this explicit deny, non-admins fell through to the downstream *.zerotrust.lan wildcard rule and gained unauthorized access.',
    testuserVerdict: {
      status: '403 Forbidden',
      color: 'rose',
      detail: 'Immediately terminated by explicit deny rule 3b before wildcard rule 7 is reached.',
    },
  },
  {
    id: 'rule-4a',
    order: '4a',
    domain: 'traefik.zerotrust.lan',
    policy: 'two_factor',
    subject: 'group:admins',
    type: 'Group-Restricted Admin',
    description: 'Traefik v3 Reverse Proxy Dashboard & Routing API',
    rationale: 'Restricted strictly to group:admins. Traefik dashboard controls live routing tables, dynamic TLS certificates, and middleware definitions.',
    testuserVerdict: {
      status: '403 Forbidden',
      color: 'rose',
      detail: 'testuser is not in group:admins; fails subject match, triggering rule 4b.',
    },
  },
  {
    id: 'rule-4b',
    order: '4b',
    domain: 'traefik.zerotrust.lan',
    policy: 'deny',
    subject: 'All other subjects (non-admins)',
    type: 'Fallthrough Deny',
    description: 'Traefik Fallthrough Prevention Deny Rule',
    rationale: 'CRITICAL SECURITY HARDENING: Explicit deny immediately terminates evaluation for non-admin subjects targeting traefik.zerotrust.lan, preventing downstream wildcard fallthrough.',
    testuserVerdict: {
      status: '403 Forbidden',
      color: 'rose',
      detail: 'Immediately blocked with 403 Forbidden.',
    },
  },
  {
    id: 'rule-5',
    order: '5',
    domain: 'mailpit.zerotrust.lan',
    policy: 'bypass',
    type: 'Bypass',
    description: 'Mailpit Development SMTP Sinkhole',
    rationale: 'Development and testing SMTP sinkhole bypass. Documented known limitation in the Security Debt Register. TOTP enrollment secrets never transit this sinkhole.',
    testuserVerdict: {
      status: 'Bypassed (200 OK)',
      color: 'sky',
      detail: 'Direct access to mail sinkhole UI for dev verification.',
    },
  },
  {
    id: 'rule-6a',
    order: '6a',
    domain: 'portainer.zerotrust.lan',
    policy: 'two_factor',
    subject: 'group:admins OR group:it_ops',
    type: 'Group-Restricted Admin',
    description: 'Portainer CE (Controls Docker Socket — Root-Equivalent Power)',
    rationale: 'Portainer mounts /var/run/docker.sock giving root-level host container control. Restricted to LDAP directory groups admins and it_ops with mandatory 2FA.',
    testuserVerdict: {
      status: '2FA Required (Allowed)',
      color: 'emerald',
      detail: 'testuser is a member of group:it_ops! Subject match succeeds -> completes password + TOTP 2FA -> granted access.',
    },
  },
  {
    id: 'rule-6b',
    order: '6b',
    domain: 'portainer.zerotrust.lan',
    policy: 'deny',
    subject: 'All other subjects (non-admins, non-it_ops)',
    type: 'Fallthrough Deny',
    description: 'Portainer Fallthrough Prevention Deny Rule',
    rationale: 'CRITICAL SECURITY HARDENING: Blocks general users (marketing, hr, sales) from accessing the Docker management console before wildcard evaluation.',
    testuserVerdict: {
      status: '403 Forbidden',
      color: 'rose',
      detail: 'Evaluated only if neither group:admins nor group:it_ops matches (e.g. general staff).',
    },
  },
  {
    id: 'rule-decoupled',
    order: '—',
    domain: 'juiceshop.zerotrust.lan',
    policy: 'bypass',
    type: 'Decoupled',
    description: 'OWASP Juice Shop (Public E-Commerce Storefront)',
    rationale: 'Fully decoupled from Authelia forward-auth entirely. Public customer-facing app protected exclusively inline by Coraza WAF (OWASP Core Rule Set). Preserves customer conversion without corporate 2FA.',
    testuserVerdict: {
      status: 'Bypassed (200 OK)',
      color: 'emerald',
      detail: 'Customer traffic routes straight through Traefik + Coraza WAF without touching Authelia.',
    },
  },
  {
    id: 'rule-7',
    order: '7',
    domain: '*.zerotrust.lan',
    policy: 'two_factor',
    subject: 'Any authenticated user (ou=People)',
    type: 'Wildcard Fallback',
    description: 'Internal Enterprise Wildcard Fallback',
    rationale: 'Catch-all rule for all other internal enterprise tools on *.zerotrust.lan. Mandates LDAP authentication + TOTP 2FA for any valid employee.',
    testuserVerdict: {
      status: '2FA Required (Allowed)',
      color: 'emerald',
      detail: 'Authenticated LDAP employees pass standard 2FA verification.',
    },
  },
];

interface ColumnHeaderTooltipProps {
  title: string;
  tooltipTitle: string;
  definition: string;
  spec?: string;
  align?: 'left' | 'center' | 'right';
}

const ColumnHeaderTooltip: React.FC<ColumnHeaderTooltipProps> = ({
  title,
  tooltipTitle,
  definition,
  spec,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <th className="p-3 font-bold relative group/th select-none text-left">
      <div
        className={`inline-flex items-center gap-1.5 cursor-help ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        tabIndex={0}
        role="button"
        aria-label={`Definition for ${title}`}
      >
        <span className="text-[#FBBF24] border-b border-dashed border-[#FBBF24]/60 group-hover/th:border-[#38BDF8] group-hover/th:text-[#38BDF8] transition-colors">
          {title}
        </span>
        <span className="w-3.5 h-3.5 rounded-full bg-[#1E293B] border border-[#FBBF24]/50 text-[#FBBF24] group-hover/th:border-[#38BDF8] group-hover/th:text-[#38BDF8] group-hover/th:bg-sky-500/20 flex items-center justify-center text-[9px] font-mono shrink-0 transition-colors">
          ?
        </span>
      </div>

      {/* Interactive Tooltip Popover */}
      <div
        className={`absolute z-50 top-full mt-2 w-72 md:w-80 p-3.5 bg-[#0B1120] border border-[#38BDF8]/60 rounded-lg shadow-2xl text-left pointer-events-auto transition-all duration-200 font-sans ${
          align === 'right'
            ? 'right-0'
            : align === 'center'
            ? 'left-1/2 -translate-x-1/2'
            : 'left-0'
        } ${
          isOpen
            ? 'opacity-100 translate-y-0 visible pointer-events-auto'
            : 'opacity-0 -translate-y-1 invisible pointer-events-none group-hover/th:opacity-100 group-hover/th:translate-y-0 group-hover/th:visible group-hover/th:pointer-events-auto'
        }`}
      >
        {/* Tooltip Header */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#334155] font-mono text-[11px]">
          <span className="text-[#38BDF8] font-bold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <span>{tooltipTitle}</span>
          </span>
          <span className="text-[9px] text-[#94A3B8] bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#334155]">
            GOVERNANCE DEF
          </span>
        </div>

        {/* Tooltip Body */}
        <p className="text-xs text-[#F1F5F9] mt-2 leading-relaxed font-normal">
          {definition}
        </p>

        {/* Technical Architecture Footnote */}
        {spec && (
          <div className="mt-2.5 pt-2 border-t border-[#1E293B] flex items-start gap-1.5 text-[10px] text-[#94A3B8] font-mono">
            <span className="text-[#FBBF24] font-bold shrink-0">[AEGIS_SPEC]</span>
            <span className="leading-tight">{spec}</span>
          </div>
        )}
      </div>
    </th>
  );
};

export const GovernancePolicyView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedRuleCategory, setSelectedRuleCategory] = useState<string>('all');

  // Simulator State
  const [simPersonaId, setSimPersonaId] = useState<string>('p1');
  const [simEndpointId, setSimEndpointId] = useState<string>('e1');
  const [simStepUpMfaCompleted, setSimStepUpMfaCompleted] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredAutheliaRules = AUTHELIA_LIVE_RULES.filter((rule) => {
    if (selectedRuleCategory === 'all') return true;
    if (selectedRuleCategory === 'bypass') return rule.type === 'Bypass';
    if (selectedRuleCategory === 'group') return rule.type === 'Group-Restricted Admin';
    if (selectedRuleCategory === 'deny') return rule.type === 'Fallthrough Deny';
    if (selectedRuleCategory === 'wildcard') return rule.type === 'Wildcard Fallback' || rule.type === 'Decoupled';
    return true;
  });

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
    // 1. Decoupled Juice Shop (Public Storefront)
    if (currentEndpoint.domain === 'juiceshop.zerotrust.lan' || currentEndpoint.domain === 'shop.zerotrust.lan') {
      return {
        decision: 'ALLOW (AUTHELIA DECOUPLED - WAF ONLY)',
        policy: 'No Authelia Middleware Attached',
        status: 200,
        color: 'emerald',
        reason: 'Public customer-facing application. Fully decoupled from Authelia forward-auth to eliminate user friction; perimeter protection enforced exclusively by Coraza WAF (OWASP Core Rule Set).',
        requiresStepUp: false,
        adCheck: 'None (Bypassed / Public Storefront)',
      };
    }

    // 2. Rule 1: Authelia Self-Auth Portal
    if (currentEndpoint.domain === 'authelia.zerotrust.lan') {
      return {
        decision: 'ALLOW (RULE 1: SELF-AUTH BYPASS)',
        policy: 'policy: bypass',
        status: 200,
        color: 'sky',
        reason: 'Authelia web portal itself. Excluded from forward-auth loop to prevent recursive redirection deadlocks.',
        requiresStepUp: false,
        adCheck: 'Authelia Service Boundary',
      };
    }

    // 3. Rule 2: Keycloak OIDC Protocol Endpoints
    if (currentEndpoint.domain === 'keycloak.zerotrust.lan' && (currentEndpoint.path.includes('/protocol/openid-connect/') || currentEndpoint.path.includes('/login-actions/') || currentEndpoint.path.includes('/health/'))) {
      return {
        decision: 'ALLOW (RULE 2: OIDC PROTOCOL BYPASS)',
        policy: 'policy: bypass',
        status: 200,
        color: 'sky',
        reason: 'OIDC/OAuth2 discovery and backchannel endpoints bypassed at Authelia so relying parties can negotiate tokens and redirect flows cleanly.',
        requiresStepUp: false,
        adCheck: 'OIDC Protocol Delegation',
      };
    }

    // 4. Rule 5: Mailpit SMTP Sinkhole
    if (currentEndpoint.domain === 'mailpit.zerotrust.lan') {
      return {
        decision: 'ALLOW (RULE 5: DEV SINKHOLE BYPASS)',
        policy: 'policy: bypass',
        status: 200,
        color: 'sky',
        reason: 'Development email sinkhole bypassed in lab environment. Documented limitation in Security Debt Register.',
        requiresStepUp: false,
        adCheck: 'Dev Environment Only',
      };
    }

    // 5. Anonymous Customer attempting to reach internal services
    if (currentPersona.isCustomer) {
      return {
        decision: 'DENY (401 UNAUTHORIZED)',
        policy: 'policy: two_factor (default deny)',
        status: 401,
        color: 'rose',
        reason: 'Anonymous customer has no OpenLDAP account in dc=zerotrust,dc=lan and is blocked by Traefik forward-auth middleware.',
        requiresStepUp: false,
        adCheck: 'Failed: Unauthenticated (No LDAP Record in ou=People)',
      };
    }

    // 6. Rule 3a & 3b: Keycloak Admin Console
    if (currentEndpoint.domain === 'keycloak.zerotrust.lan') {
      if (currentPersona.group === 'admins' || currentPersona.group === 'IT') {
        return {
          decision: 'ALLOW (RULE 3a: GROUP:ADMINS 2FA VERIFIED)',
          policy: 'policy: two_factor (subject: group:admins)',
          status: 200,
          color: 'emerald',
          reason: 'Keycloak master admin console granted to member of LDAP Security Group "admins" with 2FA (password + TOTP).',
          requiresStepUp: false,
          adCheck: `Passed: Member of ${currentPersona.group}`,
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN - RULE 3b EXPLICIT DENY)',
          policy: 'policy: deny (explicit fallthrough blocker)',
          status: 403,
          color: 'rose',
          reason: `Subject mismatch on Rule 3a (${currentPersona.group} != group:admins). Explicit deny rule 3b terminates evaluation immediately, preventing wildcard fallthrough.`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} not in group:admins`,
        };
      }
    }

    // 7. Rule 4a & 4b: Traefik Dynamic Routing Dashboard
    if (currentEndpoint.domain === 'traefik.zerotrust.lan') {
      if (currentPersona.group === 'admins' || currentPersona.group === 'IT') {
        return {
          decision: 'ALLOW (RULE 4a: GROUP:ADMINS 2FA VERIFIED)',
          policy: 'policy: two_factor (subject: group:admins)',
          status: 200,
          color: 'emerald',
          reason: 'Edge Traefik reverse proxy dashboard granted to member of LDAP group:admins with password + TOTP 2FA.',
          requiresStepUp: false,
          adCheck: `Passed: Member of ${currentPersona.group}`,
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN - RULE 4b EXPLICIT DENY)',
          policy: 'policy: deny (explicit fallthrough blocker)',
          status: 403,
          color: 'rose',
          reason: `Subject mismatch on Rule 4a (${currentPersona.group} != group:admins). Explicit deny rule 4b immediately blocks request with HTTP 403, preventing wildcard fallthrough.`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} not in group:admins`,
        };
      }
    }

    // 8. Rule 6a & 6b: Portainer CE (Docker socket control)
    if (currentEndpoint.domain === 'portainer.zerotrust.lan') {
      if (currentPersona.group === 'admins' || currentPersona.group === 'it_ops' || currentPersona.group === 'IT' || currentPersona.group === 'DevOps') {
        return {
          decision: 'ALLOW (RULE 6a: ADMINS / IT_OPS 2FA VERIFIED)',
          policy: 'policy: two_factor (subject: group:admins, group:it_ops)',
          status: 200,
          color: 'emerald',
          reason: `Portainer root Docker socket management granted to authorized infrastructure group (${currentPersona.group}) upon password + TOTP 2FA.`,
          requiresStepUp: false,
          adCheck: `Passed: Infrastructure group ${currentPersona.group}`,
        };
      } else {
        return {
          decision: 'DENY (403 FORBIDDEN - RULE 6b EXPLICIT DENY)',
          policy: 'policy: deny (explicit fallthrough blocker)',
          status: 403,
          color: 'rose',
          reason: `Subject mismatch on Rule 6a (${currentPersona.group} is not in admins or it_ops). Explicit deny rule 6b terminates evaluation with HTTP 403.`,
          requiresStepUp: false,
          adCheck: `Failed: ${currentPersona.group} not in admins or it_ops`,
        };
      }
    }

    // 9. HRIS / Payroll (Zone 2 Internal)
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

    // 10. Raw SOC Kibana
    if (currentEndpoint.domain.includes('minisoc2')) {
      if (currentPersona.group === 'security' || currentPersona.group === 'AEGIS-SOC-Tier1') {
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

    // 11. Rule 7: Wildcard Fallback for any other *.zerotrust.lan internal application
    if (currentEndpoint.domain.endsWith('.zerotrust.lan')) {
      return {
        decision: 'ALLOW (RULE 7: WILDCARD 2FA VERIFIED)',
        policy: 'policy: two_factor (any authenticated user)',
        status: 200,
        color: 'emerald',
        reason: 'Internal enterprise service on *.zerotrust.lan. Any authenticated employee with valid LDAP credentials and TOTP MFA is granted access.',
        requiresStepUp: false,
        adCheck: `Passed: Authenticated LDAP identity (${currentPersona.group})`,
      };
    }

    // Default
    return {
      decision: 'DENY (DEFAULT DENY)',
      policy: 'default_policy: deny',
      status: 403,
      color: 'rose',
      reason: 'No explicit Authelia rule matched. Default deny policy enforced.',
      requiresStepUp: false,
      adCheck: 'Failed: Default Deny',
    };
  };

  const simResult = evaluatePolicy();

  return (
    <div className="governance-dashboard font-mono">
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
                  <h4 className="text-sm font-bold text-[#4ADE80] font-mono">Customer-Facing Application</h4>
                  <p className="text-[11px] text-[#94A3B8] font-mono">juiceshop.zerotrust.lan (Public Storefront)</p>
                </div>
              </div>
              <span className="status-badge-success font-mono font-bold">
                WAF-Only (Coraza)
              </span>
            </div>

            <p className="text-xs text-[#F1F5F9]/80 font-sans leading-relaxed">
              Customer-facing applications (such as <code className="text-[#4ADE80] bg-black/40 px-1 py-0.5 rounded font-mono">juiceshop.zerotrust.lan</code>) remain completely decoupled from Authelia — zero Authelia policy, zero employee MFA, zero employee SSO delegation. Protected inline by Coraza WAF.
            </p>

            <div className="space-y-2 text-xs font-sans">
              <div className="bg-[#0F172A] p-3 rounded border border-[#334155] space-y-1">
                <strong className="text-white flex items-center gap-1.5 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                  Native Application Authentication
                </strong>
                <p className="text-[#94A3B8] text-[11px]">
                  Customers register and sign in through the application's local user database. Corporate Active Directory/LDAP credentials are not required or exposed.
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
                  <p className="text-[11px] text-[#94A3B8] font-mono">*.zerotrust.lan (admins, it_ops, security, users)</p>
                </div>
              </div>
              <span className="status-badge-accent font-mono font-bold">
                Group-Scoped 2FA
              </span>
            </div>

            <p className="text-xs text-[#F1F5F9]/80 font-sans leading-relaxed">
              Internal engineering tools, management consoles (Portainer, Traefik, Keycloak), and administration endpoints mandate <code className="text-[#38BDF8] bg-black/40 px-1 py-0.5 rounded font-mono">policy: two_factor</code> via Authelia forward-auth, strictly scoped by LDAP-derived group membership.
            </p>

            <div className="space-y-2 text-xs font-sans">
              <div className="bg-[#0F172A] p-3 rounded border border-[#334155] space-y-1">
                <strong className="text-white flex items-center gap-1.5 font-mono text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                  LDAP Security Group Scoping (ou=Security_Groups)
                </strong>
                <p className="text-[#94A3B8] text-[11px]">
                  Admin interfaces for Keycloak and Traefik are restricted to <code className="text-white font-mono">group:admins</code> with an immediate explicit deny. Portainer (Docker socket) is restricted to <code className="text-white font-mono">group:admins</code> and <code className="text-white font-mono">group:it_ops</code>.
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

        {/* VISUAL FLOW CHART (INTERACTIVE CUSTOM COMPONENT) */}
        <div className="pro-card p-5 space-y-3 border-[#38BDF8]/40 shadow-lg">
          <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-[#38BDF8]" />
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span>Visual Authentication Flow — Customer Bypass vs. Employee 2FA Gate</span>
                </h4>
                <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                  Path-based decision tree executed at the Traefik v3 reverse proxy and Authelia v4.39 forward-auth layer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                TRAEFIK + AUTHELIA PIPELINE
              </span>
            </div>
          </div>

          {/* Interactive Flow Diagram Container (Mermaid-Free Native React/SVG) */}
          <CustomerVsEmployeeFlow />
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
                  `access_control:\n  default_policy: deny\n  rules:\n    # 1. Authelia portal — bypass (is the auth layer itself)\n    - domain: "authelia.zerotrust.lan"\n      policy: bypass\n\n    # 2. Keycloak OIDC protocol endpoints — bypass (required for OAuth2 flow)\n    - domain: "keycloak.zerotrust.lan"\n      resources:\n        - "^/realms/.*/protocol/openid-connect/.*"\n        - "^/realms/.*/login-actions/.*"\n        - "^/health/.*"\n        - "^/js/.*"\n        - "^/resources/.*"\n        - "^/realms/.*/account/.*"\n      policy: bypass\n\n    # 3. Keycloak admin interfaces — two_factor, group:admins only, explicit deny otherwise\n    - domain: "keycloak.zerotrust.lan"\n      policy: two_factor\n      subject: "group:admins"\n    - domain: "keycloak.zerotrust.lan"\n      policy: deny\n\n    # 4. Traefik dashboard — two_factor, group:admins only, explicit deny otherwise\n    - domain: "traefik.zerotrust.lan"\n      policy: two_factor\n      subject: "group:admins"\n    - domain: "traefik.zerotrust.lan"\n      policy: deny\n\n    # 5. Mailpit SMTP sinkhole — bypass (dev/test SMTP sinkhole, documented known limitation)\n    - domain: "mailpit.zerotrust.lan"\n      policy: bypass\n\n    # 6. Portainer (Docker socket, root-equivalent power) — two_factor, admins or it_ops, explicit deny otherwise\n    - domain: "portainer.zerotrust.lan"\n      policy: two_factor\n      subject:\n        - "group:admins"\n        - "group:it_ops"\n    - domain: "portainer.zerotrust.lan"\n      policy: deny\n\n    # (juiceshop.zerotrust.lan has NO Authelia policy — public-facing, protected only by Coraza WAF)\n\n    # 7. Wildcard fallback — two_factor, any authenticated user\n    - domain: "*.zerotrust.lan"\n      policy: two_factor`,
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2 bg-[#0F172A] border border-amber-500/30 rounded p-3 text-xs text-[#F1F5F9]/90 font-sans">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-mono">[RULE_FALLTHROUGH_FIX] Explicit Deny Requirement:</strong> Authelia evaluates rules top-to-bottom and matches on domain + resources + subject. When only the subject fails to match, it falls through to subsequent rules. Without an explicit <code className="text-amber-300">policy: deny</code> rule immediately following the group rule, non-admin users fall through to the wildcard <code className="text-sky-300">*.zerotrust.lan</code> rule and are granted access.
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#0F172A] border border-emerald-500/30 rounded p-3 text-xs text-[#F1F5F9]/90 font-sans">
              <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#4ADE80] font-mono">[IN-BROWSER_ISOLATION] TOTP MFA Security Boundary:</strong> TOTP MFA secrets are rendered <span className="text-white font-semibold">once in-browser</span> during authenticated enrollment and <span className="text-[#4ADE80] font-semibold">NEVER transit email / Mailpit</span>. This is safe by design and completely distinct from the mail-sinkhole issue documented in the Security Debt Register.
              </div>
            </div>
          </div>
        </div>

        {/* Live Authelia Access Control Ruleset Specification & Evaluation Matrix */}
        <div className="pro-card p-5 space-y-4 border-[#38BDF8]/40 shadow-xl">
          <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#38BDF8]" />
              <div>
                <h4 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <span>Live Authelia Access Control Ruleset Specification & Evaluation Matrix</span>
                </h4>
                <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
                  Field-verified top-to-bottom rule order executed at the forward-auth boundary. Explicitly maps protocol bypasses, group-restricted administration endpoints, and the critical explicit deny rules preventing wildcard fallthrough.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                11 Rules Enforced
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                3 Fallthrough Blockers
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Coraza Decoupled
              </span>
            </div>
          </div>

          {/* Interactive Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#94A3B8] font-mono flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Rule Filter:</span>
            </span>
            {[
              { id: 'all', label: 'All Rules (11)', count: 11 },
              { id: 'bypass', label: 'Bypasses (3)', count: 3 },
              { id: 'group', label: 'Group-Restricted Admin (3)', count: 3 },
              { id: 'deny', label: 'Fallthrough Deny Rules (3)', count: 3 },
              { id: 'wildcard', label: 'Decoupled / Wildcard (2)', count: 2 },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedRuleCategory(f.id)}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-mono ${
                  selectedRuleCategory === f.id
                    ? 'bg-[#38BDF8] text-black font-bold shadow-sm'
                    : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto rounded border border-[#334155]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0F172A] text-[#94A3B8] border-b border-[#334155] font-mono text-[11px]">
                  <th className="p-3 w-16">Seq</th>
                  <th className="p-3 w-56">Domain & Resources</th>
                  <th className="p-3 w-40">Policy & Subject</th>
                  <th className="p-3 w-44">Rule Type</th>
                  <th className="p-3">Security Rationale & Hardening</th>
                  <th className="p-3 w-52">Live Verdict (<code className="text-amber-300">testuser</code>)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155] bg-[#1E293B]/60">
                {filteredAutheliaRules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-white text-center">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {r.order}
                      </span>
                    </td>
                    <td className="p-3 font-mono">
                      <div className="text-white font-bold">{r.domain}</div>
                      {r.resources && r.resources.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          <span className="text-[10px] text-sky-400 block font-sans">Scoped Resource Regexes:</span>
                          {r.resources.slice(0, 2).map((res, i) => (
                            <div key={i} className="text-[10px] text-slate-400 bg-slate-900/90 px-1 py-0.2 rounded border border-slate-800 truncate max-w-xs">
                              {res}
                            </div>
                          ))}
                          {r.resources.length > 2 && (
                            <span className="text-[9px] text-slate-500 italic">
                              +{r.resources.length - 2} more resource patterns
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border text-center ${
                            r.policy === 'bypass'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              : r.policy === 'two_factor'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          policy: {r.policy}
                        </span>
                        {r.subject && (
                          <span className="text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {r.subject}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          r.type === 'Bypass'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : r.type === 'Group-Restricted Admin'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : r.type === 'Fallthrough Deny'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : r.type === 'Decoupled'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        }`}
                      >
                        {r.type}
                      </span>
                      <div className="text-[11px] text-slate-300 mt-1">{r.description}</div>
                    </td>
                    <td className="p-3 text-[#CBD5E1] text-xs leading-relaxed font-sans">
                      {r.rationale}
                    </td>
                    <td className="p-3 font-mono">
                      <div
                        className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center justify-between gap-1.5 ${
                          r.testuserVerdict.color === 'rose'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                            : r.testuserVerdict.color === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                        }`}
                      >
                        <span>{r.testuserVerdict.status}</span>
                        {r.testuserVerdict.color === 'rose' ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans mt-1 leading-snug">
                        {r.testuserVerdict.detail}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Deep-Dive Architectural Explainer Card */}
          <div className="p-4 bg-[#0F172A] border border-[#334155] rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Architectural Post-Mortem: Authelia Rule Fallthrough on Subject Mismatch</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#1E293B] p-3 rounded border border-slate-800">
                <span className="text-rose-400 font-mono font-bold block mb-1 uppercase text-[10px]">
                  1. The Vulnerability Trap
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Restricting <code className="text-rose-300 font-mono">keycloak.zerotrust.lan</code> and <code className="text-rose-300 font-mono">traefik.zerotrust.lan</code> to <code className="text-rose-300 font-mono">subject: group:admins</code> initially had <strong className="text-white">zero actual enforcement effect</strong>. Non-admin users were granted access regardless.
                </p>
              </div>

              <div className="bg-[#1E293B] p-3 rounded border border-slate-800">
                <span className="text-amber-400 font-mono font-bold block mb-1 uppercase text-[10px]">
                  2. Root Cause Mechanics
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Authelia evaluates rules top-to-bottom and requires ALL criteria (domain + resources + subject) to match. A subject mismatch alone <strong className="text-white">does NOT deny</strong>; evaluation falls through to subsequent rules, eventually matching the permissive wildcard <code className="text-sky-300 font-mono">*.zerotrust.lan</code> (two_factor, no subject filter).
                </p>
              </div>

              <div className="bg-[#1E293B] p-3 rounded border border-slate-800">
                <span className="text-emerald-400 font-mono font-bold block mb-1 uppercase text-[10px]">
                  3. The Hardening Fix
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  An explicit <code className="text-emerald-300 font-mono">policy: deny</code> rule was added immediately after each group-restricted rule for the exact same domain, blocking non-matching subjects before wildcard evaluation is ever reached.
                </p>
              </div>
            </div>

            {/* Live Verification Summary Matrix */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-300 mb-2 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Verification Results with <code className="text-amber-300">testuser</code> (LDAP Groups: <code className="text-sky-300">it_ops</code>, <code className="text-sky-300">users</code> — non-admin):</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="bg-[#1E293B] p-2 rounded border border-rose-500/30 flex items-center justify-between">
                  <span className="text-slate-300">keycloak.zerotrust.lan</span>
                  <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">403 DENIED</span>
                </div>
                <div className="bg-[#1E293B] p-2 rounded border border-rose-500/30 flex items-center justify-between">
                  <span className="text-slate-300">traefik.zerotrust.lan</span>
                  <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">403 DENIED</span>
                </div>
                <div className="bg-[#1E293B] p-2 rounded border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-slate-300">portainer.zerotrust.lan</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">2FA ALLOWED (it_ops)</span>
                </div>
                <div className="bg-[#1E293B] p-2 rounded border border-sky-500/30 flex items-center justify-between">
                  <span className="text-slate-300">juiceshop.zerotrust.lan</span>
                  <span className="text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded">BYPASSED (WAF-only)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ROLE-BASED ACCESS MAPPING TABLE (DASHBOARD CORE) */}
      <section className="space-y-4">
        <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FBBF24]" />
            <h3 className="pro-title text-white">
              2. Role-Based Access Mapping (Zone 2 — Active Directory)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#FBBF24] bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 font-mono">
              Domain: aegis.corp
            </span>
            <span className="text-xs text-[#94A3B8] bg-[#0F172A] px-2.5 py-1 rounded border border-[#334155] font-mono">
              {ROLE_MAPPINGS.length} AD Security Groups
            </span>
          </div>
        </div>

        {/* Responsive Filter Bar */}
        <div className="pro-card p-3.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-mono shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span>Filter by Group:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-mono ${
                  selectedGroup === 'all'
                    ? 'bg-[#38BDF8] text-black font-bold shadow-sm glow-cyan-active'
                    : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
                }`}
              >
                All ({ROLE_MAPPINGS.length})
              </button>
              {ROLE_MAPPINGS.map((r) => (
                <button
                  key={r.group}
                  onClick={() => setSelectedGroup(r.group)}
                  className={`px-2 py-1 rounded text-xs transition-all cursor-pointer font-mono flex items-center gap-1.5 ${
                    selectedGroup === r.group
                      ? 'bg-[#FBBF24] text-black font-bold shadow-sm glow-amber-hover'
                      : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    r.color === 'emerald' ? 'bg-emerald-400' :
                    r.color === 'amber' ? 'bg-amber-400' :
                    r.color === 'sky' ? 'bg-sky-400' :
                    r.color === 'blue' ? 'bg-blue-400' :
                    r.color === 'rose' ? 'bg-rose-400' : 'bg-purple-400'
                  }`}></span>
                  <span>{r.group}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search group, role, or scope..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#0F172A] border border-[#334155] rounded text-xs text-[#F1F5F9] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#38BDF8] font-sans"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-2 text-[#94A3B8] hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Wrap tables in governance-dashboard grid */}
        <div className="governance-dashboard">
          {/* Readability-Prioritized Interactive Mapping Table */}
          <div className="pro-card overflow-hidden shadow-xl border-[#334155]">
            {/* Header Banner */}
            <div className="px-4 py-2.5 bg-[#0B1120] border-b border-[#334155] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94A3B8] font-mono">
              <span className="flex items-center gap-1.5 text-white/90">
                <HelpCircle className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span className="font-bold text-[#FBBF24]">Interactive Column Dictionary:</span>
                <span className="hidden sm:inline text-[#94A3B8]">Hover over or tap any column header for technical definitions.</span>
              </span>
              <span className="text-[#38BDF8] flex items-center gap-1">
                <span>Displaying {filteredRoles.length} of {ROLE_MAPPINGS.length} security mappings</span>
              </span>
            </div>

            {/* Table Container with Smooth Scroll & Min-Width for Pristine Readability */}
            <div className="governance-table-container">
              <table className="w-full min-w-[960px] text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="terminal-panel-header bg-[#0F172A] text-[#FBBF24] font-mono">
                    <ColumnHeaderTooltip
                      title="AD Security Group"
                      tooltipTitle="Active Directory Security Group"
                      definition="The primary identity container in Active Directory (aegis.corp). Access policies, token claims, and gateway permissions bind strictly to group membership rather than individual user accounts or corporate hierarchy."
                      spec="Queried via LDAP/Kerberos and mapped to Keycloak OIDC group claims."
                      align="left"
                    />
                    <ColumnHeaderTooltip
                      title="Example Role"
                      tooltipTitle="Organizational Job Role"
                      definition="Representative business title corresponding to the Active Directory group to demonstrate typical user responsibilities within the organization."
                      spec="Assigned during Step 1 (AD Provisioning) of the onboarding lifecycle."
                      align="left"
                    />
                    <ColumnHeaderTooltip
                      title="Session Length"
                      tooltipTitle="Session Length (Session Lifetime / TTL)"
                      definition="The maximum active duration (Session Length / TTL) for Keycloak authentication tokens and Authelia session cookies before a full credential re-authentication is strictly required."
                      spec="Enforced via Redis session cache and HTTP-only forward-auth session cookies."
                      align="left"
                    />
                    <ColumnHeaderTooltip
                      title="MFA Re-check Interval"
                      tooltipTitle="MFA Re-check Interval"
                      definition="The maximum duration an authenticated session may access sensitive or protected resources before requiring a fresh TOTP or hardware FIDO2 verification challenge."
                      spec="Mitigates session-cookie hijacking by enforcing step-up verification on privileged endpoints (e.g. /admin.*)."
                      align="left"
                    />
                    <ColumnHeaderTooltip
                      title="Enforced Access Scope"
                      tooltipTitle="Enforced Authorization Scope"
                      definition="The designated internal applications, development repositories, and departmental systems accessible to members of this group according to Authelia gateway forward-auth rules."
                      spec="Evaluated dynamically at Traefik reverse proxy based on AD group claims."
                      align="left"
                    />
                    <ColumnHeaderTooltip
                      title="Explicit Restrictions"
                      tooltipTitle="Explicit Security Denials"
                      definition="Administrative consoles, container orchestrators, and raw SOC telemetry backends strictly denied to this group to maintain least-privilege isolation and prevent lateral movement."
                      spec="Enforced via default-deny gateway access control rules."
                      align="left"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155] text-[#F1F5F9]/90">
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#94A3B8] font-mono">
                        No Active Directory group mappings match current filter "{searchFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((r, index) => (
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
                        <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap min-w-[190px]">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                              r.color === 'emerald' ? 'bg-emerald-400' :
                              r.color === 'amber' ? 'bg-amber-400' :
                              r.color === 'sky' ? 'bg-sky-400' :
                              r.color === 'blue' ? 'bg-blue-400' :
                              r.color === 'rose' ? 'bg-rose-400' : 'bg-purple-400'
                            }`}></span>
                            <span>{r.group}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-[#94A3B8] font-medium min-w-[130px] whitespace-nowrap">{r.role}</td>
                        <td className="p-3.5 font-mono font-semibold text-[#38BDF8] min-w-[120px] whitespace-nowrap">{r.sessionLength}</td>
                        <td className="p-3.5 font-mono min-w-[160px] whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded text-[11px] inline-block font-mono ${
                            r.mfaInterval.includes('1h') || r.mfaInterval.includes('hardware') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' :
                            r.mfaInterval.includes('2h') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' :
                            'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {r.mfaInterval}
                          </span>
                        </td>
                        <td className="p-3.5 min-w-[280px]">
                          <div className="font-medium text-white">{r.scope}</div>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">{r.description}</div>
                        </td>
                        <td className="p-3.5 text-[11px] min-w-[220px]">
                          <div className="flex flex-wrap gap-1.5">
                            {r.deniedDomains.map((d) => (
                              <span key={d} className="bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                                ✕ {d}
                              </span>
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary Bar */}
            <div className="px-4 py-2.5 bg-[#0B1120] border-t border-[#334155] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#94A3B8] font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>All policies strictly enforced at Traefik Forward-Auth & Keycloak OIDC layer</span>
              </div>
              <div className="text-xs">
                Filter: <strong className="text-white">{selectedGroup === 'all' ? 'All AD Groups' : selectedGroup}</strong>
              </div>
            </div>
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

