import React, { useState } from 'react';
import { FolderTree, Copy, Check, FileText, Folder } from 'lucide-react';

export const FileStructureView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const fileTreeText = `~/aegis/
├── gateway/
│   ├── docker-compose.yml              # Core Gateway: Traefik, Authelia, Keycloak, Postgres, Redis, Portainer, Coraza, Suricata
│   ├── .env                            # Centralized active secrets (single source of truth)
│   ├── traefik/
│   │   ├── traefik.yml                 # Static config (entrypoints, logging, providers)
│   │   ├── traefik-dynamic.yml         # Dynamic routing, middlewares, TLS cert references
│   │   └── certs/
│   │       ├── zerotrust.crt           # Wildcard SAN cert (*.zerotrust.lan)
│   │       └── zerotrust.key           # Private key
│   ├── authelia/
│   │   ├── configuration.yml           # MFA policy, Argon2id settings, OIDC provider config
│   │   ├── users_database.yml          # Local user store with unique Argon2id hashes
│   │   └── oidc.key                    # RSA-2048 private key file
│   ├── keycloak/
│   │   └── .env                        # KC environment config (KC_DB_PASSWORD, admin creds)
│   ├── postgres/
│   │   └── init-scripts/
│   │       └── init.sql                # Initial DB user & schema creation
│   ├── coraza/
│   │   ├── Caddyfile                   # Coraza WAF proxy configuration
│   │   └── rules/                      # OWASP Core Rule Set rules
│   └── zeek/
│       └── node.cfg                    # Zeek 5-node cluster config (br_proxy, ens34, ens33)
├── soc/
│   ├── docker-compose.yml              # 9 services: 4 Shuffle, 4 MISP, Logstash, Mailpit
│   ├── .env                            # NOT committed — real secrets, gitignored
│   ├── .env.example                    # Committed — same variable names, placeholder values
│   ├── logstash/
│   │   ├── pipeline/
│   │   │   └── logstash.conf           # ES query (rule.level >= 12) -> Shuffle webhook
│   │   └── config/
│   │       └── logstash.yml
│   ├── playbooks/
│   │   ├── brute-force.md              # L1 Playbook: Auth failure triage
│   │   ├── malware.md                  # L1 Playbook: Malware containment
│   │   └── exfiltration.md             # L1 Playbook: Data exfiltration response
│   ├── dashboards/
│   │   ├── metrics.ndjson              # Kibana export: MTTD/MTTR metrics
│   │   └── mitre-matrix.ndjson         # Kibana export: MITRE ATT&CK coverage
│   └── wazuh/
│       └── rules/
│           └── local_rules.xml         # Custom detection rules with MITRE ATT&CK tags (minisoc2)
├── grid/
│   ├── corp-dc01/                      # Active Directory scripts & Windows Event Forwarding configs
│   ├── corp-pc01/                      # Sysmon v15 XML config & Wazuh agent configuration
│   └── corp-db01/                      # Ubuntu auditd rules & PostgreSQL audit config
└── docs/
    ├── architecture.md                 # Complete system design & network documentation
    ├── kill-chain.md                   # Threat modeling & attack scenario mapping
    ├── mitre-mapping.md                # Comprehensive rule-to-technique matrix
    └── demo-script.md                  # 15-minute jury demonstration transcript`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fileTreeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="pro-title flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#38BDF8]" />
              <span>Section 10: Master Directory Tree Blueprint</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 font-sans">
              Final directory blueprint for the unified `~/aegis/` workspace containing gateway services, SOC configurations, corporate grid scripts, and playbooks.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 text-xs font-semibold transition-all font-mono cursor-pointer"
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
      </div>
    </div>
  );
};
