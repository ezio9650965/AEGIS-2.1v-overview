# AEGIS v2.1

**Sovereign Zero-Trust Access Gateway & Hybrid MSSP SOC Architecture**

PFE 2026 final-year project — Network Security Architecture
Author: Taibi Mohamed Anis ("Ezio") · Built with [Eagle]

---

## What AEGIS Is

AEGIS is a Zero-Trust access architecture built on the "never trust, always
verify" model. It combines two things that are usually sold as separate
products:

1. **An identity-aware access gateway** — sits in front of every internal
   service. No request, internal or external, is trusted based on where it
   came from. Every request is verified against identity and MFA before it
   reaches anything.
2. **A Security Operations Center (SOC)** — continuous behavioral telemetry
   (network + endpoint), MITRE ATT&CK-mapped detection, threat intelligence
   enrichment, and automated response.

This is not a firewall replacement. A perimeter firewall decides what gets
*near* the network. AEGIS decides, per request, whether a specific identity
should reach a specific resource — regardless of which side of the network
boundary that request originates from.

---

## Architecture: Four Zones

```
Zone 1 — Threatscape        Red-team emulation environment
Zone 2 — Enterprise Grid    Simulated corporate network (AD, endpoints, DB)
Zone 3 — ZTA Gateway        The access gateway itself (this is the core product)
Zone 4 — MSSP SOC           Remote SIEM/SOAR cluster
```

### Zone 3 — ZTA Gateway *(core, verified working)*

Runs on Ubuntu Server 24.04, Docker-based, split across two isolated bridge
networks:

- **`proxy_net`** (DMZ, internet-facing): Traefik (edge router, TLS
  termination), Coraza WAF (OWASP CRS, custom `xcaddy` build), Suricata IDS
  (Emerging Threats Open ruleset)
- **`auth_net`** (`internal: true`, kernel-isolated, no host port exposure):
  Authelia (forward-auth, MFA, OIDC), Keycloak (identity provider),
  OpenLDAP (`osixia/openldap:1.5.0` directory service, base DN `dc=zerotrust,dc=lan`),
  `oidc-proxy` (permanent internal Caddy sidecar proxy handling server-to-server OIDC calls between Keycloak and Authelia over plain HTTP on `auth_net`, mitigating Keycloak 26.x's confirmed truststore limitation),
  PostgreSQL (identity vault), Redis (session cache), Mailpit (dev/test
  SMTP sinkhole — **not** production-safe, see Security Notes), Portainer

Host-level: Zeek network traffic analysis, deployed as a 5-node cluster
(manager/proxy/3 workers) monitoring all three relevant interfaces
(`br_proxy`, plus the two physical NICs) — a single-interface setup misses
traffic that doesn't cross the Docker bridge.

Only four ports are ever exposed to the host: `80`, `443`, `1514`, `1515`.
Everything else — the database, the session cache, the identity provider's
management interface — has no route to the internet or the host, enforced
at the kernel network-namespace level, not by application-layer
configuration that could be misconfigured away.

### Zone 3 — Known Gap: Network Segmentation Is Not Yet Implemented

The gateway is dual-homed by design (`ens33` on the DHCP-assigned
Ministry-facing subnet, `ens34` statically configured on a separate
`192.168.50.0/24` segment intended to isolate target/endpoint traffic
behind the gateway's kernel routing).

**As currently deployed, `ens34` is provisioned but unused.** Verified via
live `ip route` and `iptables`/`nft` inspection: the Windows 10 endpoint
and the Juice Shop target both sit on the same flat `192.168.19.0/24`
subnet as the gateway's external-facing interface — not behind the
intended isolation boundary. The Docker-level segmentation (`auth_net`
marked `internal: true`, verified via nftables `DOCKER-INTERNAL` chain) is
real and enforced; the VM/network-level segmentation between the gateway
and its targets is not, yet.

This is stated here directly, not only in the interactive diagram on the
live site, because it is the single most consequential gap between this
project's stated threat model and its current verified state.

**Ingress Scope vs. Full Bidirectional Enforcement:**
AEGIS's current ingress model (Traefik reverse-proxying inbound traffic to protected services) should not be confused with a full transparent gateway enforcing all traffic, including outbound/browsing traffic from internal endpoints. That is not yet implemented — it depends on completing the already-documented network segmentation gap (ens34 unused, endpoints not routed behind the gateway). Ingress Zero-Trust enforcement (Traefik + Authelia + Coraza) is proven and verified. Full bidirectional/egress traffic enforcement through the gateway is a documented future-work item, dependent on resolving the existing network segmentation gap.

### Zone 4 — MSSP SOC *(partially verified)*

Three AlmaLinux 9.3 nodes, native package installs (not Docker) on the two
pre-existing nodes:

| Node | Role | Status |
|---|---|---|
| minisoc1 "The Vault" | Elasticsearch 8.19.13, 8GB JVM heap | Operational (pre-existing) |
| minisoc2 "The Brain" | Wazuh Manager 4.7 + Kibana | Operational (pre-existing) |
| minisoc3 "The Executor" | Shuffle SOAR (5 containers) + MISP + Logstash | Infrastructure deployed and verified this cycle; Nginx .dz reverse proxy |

minisoc3 replaced an earlier disconnected Scikit-Learn anomaly-detection
script — that pipeline had no live Elasticsearch ingestion and no working
hook into Wazuh's response system, and was removed rather than debugged
further. The stack runs a 5-container Shuffle SOAR stack (frontend, backend,
orborus, database, plus added shuffle-opensearch — Shuffle's backend
migrated MongoDB → OpenSearch, not in original compose plan), a 4-container
official MISP stack (core/modules/mariadb/valkey — the previously used
third-party `coolacid/misp-docker` image is deprecated and unavailable),
Logstash, and Mailpit.

**Verified:** 9-container stack verified healthy. MISP/Shuffle/Kibana dashboards
reachable via Nginx reverse proxy (misp.dz, shuffle.dz, kibana.dz) on minisoc3,
resolved via hosts-file DNS. MISP_BASEURL bug fixed and login cookie issue resolved
by adding TLS (self-signed) port 443 server block for misp.dz (secure-flagged cookie
no longer dropped) and clearing stale CSRF token. Shuffle backend crash-loop
resolved by adding shuffle-opensearch service and backend env vars via
docker-compose.override.yml. Logstash ${SHUFFLE_WEBHOOK} corrected via override file
to live webhook URL. Direct query against minisoc1 confirms Logstash's Elasticsearch
connectivity and query logic are correct.
**In progress / Not yet complete:** Shuffle SOAR workflow `misp_enrichment` created
with live webhook trigger and MISP node (Search events / restSearch, 200 success:true);
enrichment returned a verified single-attribute match against a real published MISP event.
Decision/branch node (match -> action) in progress. Real end-to-end live alert test (l10b)
flowed Wazuh -> Elasticsearch -> Logstash -> Shuffle webhook unprompted. Centralized identity
migration (l10c) completed across Stages 1-3 (OpenLDAP directory service deployed, Authelia
migrated to LDAP backend with MFA verified, Keycloak federated as relying party via oidc-proxy).
Keycloak session revocation: cross-zone route to Gateway (192.168.19.173) confirmed unreachable
from minisoc3; dropped from automated Shuffle workflow, designated as a manual step in demo playbook.

### Zone 2 — Enterprise Grid *(not built)*

Planned: a 4-node simulated corporate network (`aegis.corp`) — Windows
Server domain controller, a domain-joined Windows 10 workstation
("Patient Zero"), a Linux database host, and the web target (OWASP Juice
Shop). Juice Shop and Patient Zero are confirmed live on the Zone 3 LAN
segment already; the rest of Zone 2 (AD domain, additional endpoints) is
not yet deployed.

### Zone 1 — Threatscape *(not built)*

Planned red-team emulation environment (Kali Linux, C2 framework, malware
analysis sandbox) for generating reproducible attack scenarios against the
rest of the environment. Not started.

#### Attack Testing Methodology: Kali vs. Atomic Red Team

Two complementary attack-testing methodologies validate AEGIS detection and response:

- **Kali Linux (Manual Kill-Chain):** Demonstrates one full, realistic, narrative attack chain end-to-end for the live jury demo (SQLi initial access via Juice Shop → LSASS memory dump via Mimikatz on Patient Zero → Sliver C2 beaconing and exfiltration).
- **Atomic Red Team (ATT&CK Coverage Matrix):** Provides breadth across MITRE ATT&CK techniques by executing discrete, highly focused test cases individually via `invoke-atomicredteam` (Windows) and the Linux/bash runner. Grouped by tactic (Execution, Persistence, Privilege Escalation, Defense Evasion, Exfiltration), each test produces a per-technique pass/fail coverage matrix (technique ID → detected by Wazuh/Sysmon/Zeek/Suricata), directly extending the MITRE ATT&CK tagging already proven in `local_rules.xml` `mitre.id` fields (e.g. rule 100100 / T1190).

---

## The Access Control Model

**One policy applies behind this gateway: `default_policy: deny`, with
`two_factor` required everywhere.** There is no public-facing bypass domain
— an earlier design draft described a customer-storefront bypass path, but
that was never implemented and has been removed from this documentation to
match the real deployed configuration.

The only bypass rules that exist are narrow and structural, not
access-level exceptions:
- Authelia's own login portal (`authelia.zerotrust.lan`) — it IS the auth
  layer, so it can't gate itself.
- Keycloak's OIDC protocol/callback endpoints
  (`/realms/*/protocol/openid-connect/*`, `/realms/*/login-actions/*`, and
  a few static asset paths) — these must stay reachable for the OAuth2
  authorization-code flow to complete before a session exists at all.

Everything else — Keycloak's admin console, the Traefik dashboard,
Portainer, Mailpit, and any application placed behind this gateway —
requires a full MFA-backed session. See `src/components/zones/` in this
repo for the live, interactive version of this policy with the actual
redacted config file.

---

## MSSP Service Model (Zone 4)

AEGIS SOC analysts perform primary triage on raw, MITRE-tagged alerts. A
client's own IT/DevOps team receives a restricted, summarized view — not
raw access to the shared SOC console — unless an incident is confirmed and
escalated directly. This tiering is the actual value of the MSSP model:
clients are paying for expert triage, not just a dashboard.

---

## Security Notes

A running list of real issues found and fixed during development — kept
here deliberately rather than hidden, because a defensible security debt
register is stronger evidence of engineering rigor than a claim of
zero-issue development. Full register: see the Security Debt view on the live site (src/components/SecurityDebtView.tsx).

Highlights:
- **Mailpit is dev/test-only.** It sinks all outbound mail including
  account-activation and password-reset links. A production deployment
  must replace it with a hardened SMTP relay (SPF/DKIM/DMARC, TLS) and use
  single-use, short-expiry links. TOTP MFA secrets are unaffected by this —
  they are shown once in-browser during authenticated enrollment and never
  transit email.
- Hardcoded RSA key, weak Argon2id parameters, 1-year session persistence,
  and orphaned `.env` files with stale credentials were all present in the
  initial build and have been fixed — see the Security Debt Register for
  the full before/after with verification evidence for each.

### Known Issues & Active Security Debt (Unresolved / Under Active Investigation)
- **Coraza WAF routing bypass**: Traefik's dynamic config (`traefik-dynamic.yml`) routes Juice Shop traffic directly, skipping WAF inspection entirely. Coraza container is healthy and running, but receives zero traffic (`coraza_logs/access.log` last write predates this finding by days). Fix identified (repoint the juiceshop service to `http://coraza:8080`) but not yet applied as of September 19, 2026.
- **Scoping distinction — Ingress vs. Bidirectional Egress Enforcement**: Ingress Zero-Trust enforcement (Traefik edge reverse proxy + Authelia Forward-Auth MFA + Coraza WAF request inspection) is currently distinct from full bidirectional egress traffic enforcement. In the current implementation, ingress policy enforces authentication and filtering on inbound requests to protected internal workloads; however, outbound egress traffic originating from internal workloads, containers, or hosts is not yet routed through a mandatory egress proxy or transparent Zero-Trust egress gateway filter.
- **"Too many fields for JSON decoder" flood on minisoc2**: Root cause unresolved; observed during alert ingestion. May be silently dropping Wazuh alerts.
- **logstash.conf TLS still disabled**: Elasticsearch CA certificate was never copied from minisoc1 to minisoc3; transport currently runs with `ssl_certificate_verification => false`.
- **Full .env exposed in chat session / plaintext credentials**: All secrets in it (`ES_PASSWORD`, `MISP_MYSQL_ROOT_PASSWORD`, `MISP_MYSQL_PASSWORD`, `MISP_ADMIN_PASSWORD`, `MISP_GPG_PASSPHRASE`, `REDIS_PASSWORD`, `SHUFFLE_OPENSEARCH_PASSWORD`), plus elastic superuser and Keycloak admin passwords pasted in chat sessions, must be treated as burned and rotated.
- **Plaintext secrets remaining in `authelia/configuration.yml`**: Plaintext secrets remaining in `authelia/configuration.yml` (`storage.encryption_key`, `storage.postgres.password`, `session.redis.password`, `identity_validation.reset_password.jwt_secret`, OIDC `client_secret`) — need migration to `AUTHELIA_*`-prefixed environment variables.
- **Session secrets burned during OIDC debugging — credential rotation required**: New secrets burned by exposure during this session's debugging, requiring rotation before defense: `LDAP_ADMIN_PASSWORD`, `LDAP_CONFIG_PASSWORD`, `LDAP_BIND_PASSWORD`, Authelia's OIDC RSA private key, Authelia `storage.encryption_key`, Authelia OIDC client secret for Keycloak, Authelia session secret, Redis password, Postgres Authelia password. (These are in addition to the already-flagged Elasticsearch and Keycloak admin passwords.)
- **Stray "AEGIS.CORP" realm in Keycloak pending deletion**: A stray "AEGIS.CORP" realm was created in Keycloak during earlier UI experimentation and needs deletion before defense (do not confuse with the actual planned Zone 2 `aegis.corp` Active Directory domain, which remains unbuilt — `l1`).
- **Temporary/bootstrap Keycloak admin account still in use**: Temporary/bootstrap Keycloak admin account is still in use; needs a permanent admin created and the bootstrap account removed.
- **Missing `sn`/`givenName` attributes on LDAP users**: LDAP users (`testuser`, `ezio`) are missing `sn` and `givenName` attributes, which caused a Keycloak First-Broker-Login profile-completion prompt/failure; needs fixing at the LDAP source plus an update to Authelia's attribute map (`given_name`/`family_name`).
- **Abandoned truststore debugging artifacts pending cleanup**: Abandoned truststore debugging artifacts (`traefik/certs/truststore.p12`, `keycloak-cacerts-with-aegis.p12`, stale JVM env vars from the failed truststore fix attempts) need cleanup.
- **oidc-proxy inter-container HTTP communication (Acceptable Risk / Scoped)**: `oidc-proxy`'s use of plain HTTP between containers on internal Docker bridge (`auth_net`, `internal: true`, no external route) is flagged as architecturally acceptable (internal isolated Docker network namespace with no host port exposure), not a residual risk or vulnerability — stated here explicitly so it is not read as an overlooked security gap.

### Lessons Learned & Engineering Reflections (Identity Migration & OIDC Federation)
- **Authelia environment variable substitution allow-list**: Authelia's configuration file env-var substitution is strictly allow-listed — only variables with `AUTHELIA_*` or `X_AUTHELIA_*` prefixes are honored. Arbitrary `${VAR}` syntax fails silently, leaving variables unexpanded or falling back to default values.
- **LDAP Result Code 32 ("No Such Object") semantics**: In OpenLDAP, Result Code 32 can indicate an Access Control List (ACL) denial rather than the literal absence of an object or subtree. This was conclusively diagnosed by re-executing the identical search query as `cn=admin,dc=zerotrust,dc=lan`, which successfully returned the entries that `authelia-bind` was denied.
- **Keycloak 26.x HTTP client truststore limitations & sidecar mitigation**: Keycloak 26.x's internal HTTP client (`SimpleHttpRequest`) does not honor its own configured truststore for outbound OIDC discovery and token exchange requests. Multiple standard Java/Keycloak remediations (`KC_TRUSTSTORE_PATHS`, `JAVA_TOOL_OPTIONS`, direct JVM `cacerts` certificate injection) were attempted and failed. The working and robust mitigation was introducing an internal Caddy sidecar proxy (`oidc-proxy`) on `auth_net` that handles server-to-server OIDC calls over plain HTTP within the trusted internal Docker bridge, while Traefik continues to terminate TLS for all browser-facing traffic. This is framed as a deliberate architectural mitigation aligned with Zero-Trust's "enforce trust at the boundary" principle, not a temporary workaround.
- **Authelia OIDC issuer header validation**: Authelia's OIDC issuer resolution strictly depends on the incoming `Host`, `X-Forwarded-Proto`, and `X-Forwarded-Host` request headers matching its configured issuer URL (`https://auth.zerotrust.lan`) exactly. Any intermediary reverse proxy or broker must rewrite or pass through these headers consistently; otherwise, token requests and discovery calls are rejected with HTTP 400.
- **OIDC token_endpoint_auth_method alignment**: The token endpoint authentication method must match identically between the relying party and identity provider. Keycloak defaults to `client_secret_post` (passing client credentials in the HTTP POST body), whereas Authelia enforces `client_secret_basic` (HTTP Basic Authorization header). Both mechanisms are fully OAuth 2.0 / OIDC spec-compliant; the failure was a configuration divergence, not an implementation bug on either side.
- **Cross-user authentication-bypass vector in Authelia TOTP storage**: A genuine security finding was identified in Authelia's data model: user MFA/TOTP device secrets are persisted in PostgreSQL keyed strictly by username, entirely decoupled from the LDAP directory backend. Deleting a user from LDAP does not purge their registered MFA tokens from PostgreSQL. If a username is subsequently reissued to a different individual, the new identity inherits the previous user's active TOTP secret, creating a cross-user authentication-bypass vector unless an explicit database storage cleanup step is integrated into user deprovisioning workflows.

### Resolved Issues & Architectural Debt
- **Zeek & Suricata Log Ingestion & Mapping Collisions — RESOLVED**:
  - *Root Cause*: Forcing Zeek and Suricata raw events through the same Wazuh archives index/mapping (`wazuh-archives-4.x-*`) caused Elasticsearch mapping collisions (`data.id` keyword vs. object; `data.service` object vs. string), dropping real events with HTTP 400.
  - *Real Fix*: Installed Filebeat directly on `ztagateway` (where raw log files reside: `/opt/zeek/spool/manager/{conn,dns}.log` and `/var/log/suricata/eve.json`), using native Filebeat Zeek and Suricata modules, shipping to their own ECS-normalized data stream (`.ds-filebeat-8.19.13-*`, `event.module: zeek` / `suricata`), completely separate from `wazuh-archives-*`.
  - *Verification*: Verified with real data: 931+ Zeek connection events, 93,000+ Suricata events, zero mapping errors.
  - *Pipeline Rollback*: The now-unnecessary `aegis-zeek-normalize` ingest pipeline call was rolled back from the Wazuh archives pipeline (restored from backup, re-verified empty via `_ingest/pipeline` inspection).
  - *Dashboards*: Kibana dashboards built and confirmed rendering real data: `[Filebeat Zeek] Overview`, `[Filebeat Suricata] Events Overview`, `[Filebeat Suricata] Alert Overview`, plus a new combined `"AEGIS Network Overview (Zeek+Suricata)"` dashboard. Closes checklist items `l14` and `l15`.

---

## Status Summary

| Zone | Status |
|---|---|
| Zone 3 (Gateway) | Built, hardened, sensors verified |
| Zone 4 minisoc1/2 | Pre-existing, operational |
| Zone 4 minisoc3 | Infrastructure deployed and verified (5-container Shuffle with shuffle-opensearch, 4-container MISP, Logstash webhook wired, Nginx .dz HTTPS proxy); SOAR workflow in progress (misp_enrichment trigger & MISP node verified) |
| Zone 4 detection rules on minisoc2 | Verified operational: Rule 100100 confirmed firing with T1190 via wazuh-logtest; mitre.id fields validated in local_rules.xml |
| Zone 4 Zeek/Suricata Ingestion & Dashboards | Operational: Dedicated Filebeat ECS data streams (.ds-filebeat-8.19.13-*) and 4 verified Kibana dashboards |
| Zone 4 OpenLDAP ingestion | Completed (Stages 1-3: OpenLDAP + Authelia LDAP backend + Keycloak OIDC federation via oidc-proxy) |
| Zone 2 (Enterprise Grid) | Not built |
| Zone 1 (Threatscape) | Not built |
| Atomic Red Team coverage testing | Not started |

This project intentionally documents what is *not* done alongside what is —
an inflated completion claim would not survive a jury's first technical
question.

---

## Repository Structure

This repository is the project's interactive documentation site (React +
Vite), not a raw deployment tree. The actual gateway/SOC deployment configs
live on their respective hosts and are reproduced here, redacted, inside
the app itself — see `src/components/zones/Zone3ConfigFilesViewer.tsx`.

```
src/
├── components/
│   ├── zones/          Per-zone deep-dive views (topology, file
│   │                   structure, redacted configs) — Zone 3 is
│   │                   the reference implementation
│   ├── MasterTopologyView.tsx
│   ├── SubTopologiesView.tsx
│   ├── FileStructureView.tsx
│   └── ...             Other report sections (roadmap, security
│                       debt register, jury demo script, etc.)
├── data/
│   └── reportData.ts   Task/status tracking data consumed by the
│                       dashboard views above
└── App.tsx
```

Live deployment configs referenced throughout the app (Docker Compose,
Traefik, Authelia, Keycloak, etc.) are not stored as separate files in this
repo — they're embedded, redacted, and downloadable directly from the
relevant zone's page on the live site.

---

## Getting Started

This is a research/academic project, not a packaged installable product.
Reproducing it requires: a Docker host for Zone 3, three AlmaLinux nodes
(or equivalent) for Zone 4, and the credentials/network topology defined
in your own `.env` files (never committed — see `.env.example` for the
required variable names).

Full setup notes: `docs/SETUP.md`

Deploying this in a real organization (not just a lab)? See `docs/DEPLOYMENT.md` for the enterprise rollout walkthrough — placement, identity migration strategy, connecting to a remote SOC, and a known gap around host-level monitoring of the gateway itself.

---

## License

Academic project — PFE 2026. Licensing terms TBD.
