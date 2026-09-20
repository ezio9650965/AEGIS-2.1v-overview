import React, { useState } from 'react';
import { FolderTree, Copy, Check, Terminal } from 'lucide-react';

export const Zone3FileStructure: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const fileTreeText = `~/zerotrust-network/
├── docker-compose.yml              # Multi-container orchestration: Traefik, Authelia, Keycloak, OpenLDAP, oidc-proxy, Postgres, Redis, Mailpit, Coraza
├── .env                            # Environment variables and gateway service credentials (central source of truth)
├── authelia/                       # Zero Trust Forward-Auth engine and session boundary
│   ├── configuration.yml           # Access control policy, LDAP auth backend, OIDC provider config
│   ├── users_database.yml          # Deprecated local user repository (migrated to OpenLDAP in Stage 2)
│   ├── oidc.key                    # RSA private key used to sign OpenID Connect identity tokens
│   └── authelia.log                # Authentication runtime event and audit log
├── ldap/                           # OpenLDAP centralized directory service (dc=zerotrust,dc=lan)
│   └── bootstrap/                  # LDIF schema bootstrap: ou=People, ou=Groups, ou=Security_Groups, service accounts
├── oidc-proxy/                     # Permanent internal Caddy sidecar proxy handling server-to-server OIDC calls on auth_net
│   └── Caddyfile                   # Internal reverse proxy routing :8080 to authelia:9091, mitigating Keycloak 26.x truststore limitation
├── coraza/                         # Coraza Web Application Firewall (WAF) proxy container
│   ├── Dockerfile                  # Custom Caddy image build with Coraza WAF plugin compiled
│   ├── Caddyfile                   # Reverse proxy routing rules and WAF directives for Coraza
│   └── rules/                      # OWASP Core Rule Set (CRS) v4 detection rules and data files
│       ├── crs-setup.conf          # OWASP CRS core configuration (paranoia levels, anomaly thresholds)
│       ├── REQUEST-*.conf          # Inbound request inspection rules (SQLi, XSS, RCE, LFI, SSRF, method enforcement)
│       ├── RESPONSE-*.conf         # Outbound response inspection rules (data leakages, error disclosure, webshells)
│       └── *.data                  # Signature data lists (shell commands, user-agent scanners, restricted files)
├── keycloak/                       # Central Identity Provider (IdP) for SSO and OIDC
│   └── .env                        # Keycloak service environment config (database password, admin credentials)
├── mailpit/                        # Local SMTP testing server and email trap (for registration & password resets)
├── postgres/                       # Persistent relational database backing Authelia and Keycloak
│   └── init-scripts/
│       └── init.sql                # Initial database creation and role provisioning script for gateway services
├── redis/                          # In-memory key-value store for Authelia session state and rate limiting
├── traefik/                        # Edge reverse proxy, TLS termination, and traffic router
│   ├── traefik.yml                 # Static Traefik configuration (entrypoints :80/:443, logging, Docker provider)
│   ├── traefik-dynamic.yml         # Dynamic routing rules, TLS configuration, and middleware chains (WAF & forward-auth)
│   └── certs/                      # TLS certificates directory
│       ├── zerotrust.crt           # Wildcard SAN certificate for *.zerotrust.lan domains
│       └── zerotrust.key           # Private key for the wildcard TLS certificate
└── traefik_logs/                   # Access logging directory mounted to host
    └── access.log                  # Traefik HTTP access log capturing all gateway ingress traffic`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fileTreeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm md:text-base font-bold text-[#38BDF8] flex items-center gap-2 font-mono uppercase tracking-wider">
            <FolderTree className="w-5 h-5 text-[#38BDF8]" />
            <span>Zone 3: Gateway Host File Structure</span>
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1 font-sans">
            Audited directory hierarchy and configuration files on host <code className="text-[#38BDF8] font-mono">ztagateway:~/zerotrust-network/</code> with single-line purpose annotations.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 text-xs font-semibold transition-all font-mono cursor-pointer self-start sm:self-auto"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#4ADE80]" />
              <span className="text-[#4ADE80]">Copied Tree!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Directory Tree</span>
            </>
          )}
        </button>
      </div>

      {/* Tree Render */}
      <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-4 overflow-x-auto text-xs font-mono text-[#F1F5F9]/90">
        <pre className="text-[#4ADE80] leading-relaxed">{fileTreeText}</pre>
      </div>

      {/* Terminal Context Banner */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-[#94A3B8] font-mono">
        <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
        <span>Verified from live host: <code className="text-white">ezio@ztagateway:~/zerotrust-network$</code></span>
      </div>
    </div>
  );
};
