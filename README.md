# AEGIS

**A Zero Trust Identity Gateway — continuous verification at every trust boundary.**

---

## The perimeter is dead

For three decades, enterprise security rested on a single, brittle assumption:
*if a request originates from inside the trusted network, it is trustworthy*.
Firewalls drew a line. VPN concentrators extended it. Everything behind the
line — databases, internal APIs, admin panels — was implicitly trusted because
of *where* the packet came from, not *who* sent it.

That model is broken. Not in theory — in production, at nation-state scale.

The perimeter does not exist anymore. Users are on personal devices, in cafés,
on cellular networks, behind CGNAT. Services live in three clouds and two
on-prem clusters. Admin consoles are one leaked credential away from the
public internet. "Inside the network" stopped being a meaningful security
boundary years ago, and IP-based trust became the single largest structural
vulnerability in modern enterprise security.

Attackers have known this longer than most defenders.

---

## The AI-accelerated threat

The threat landscape of the last five years is qualitatively different:

**Reconnaissance is automated.** What used to take a skilled operator a week
now takes a script an hour. Attack-surface enumeration, credential stuffing,
API fuzzing — all run at machine speed.

**Social engineering is generated.** Deepfaked voice, deepfaked video,
spear-phishing emails written by language models in the target's own voice.
The "human firewall" that perimeter security relied on as a fallback is
actively degraded.

**Exploits are chained.** A single leaked credential becomes the entry point
for a full kill chain: initial access, privilege escalation, lateral movement,
persistence, exfiltration — often without any malware touching disk.
Endpoint detection sees nothing because nothing needs to be installed.

**Dwell time is compressed.** Nation-state actors used to stay inside a
network for months. AI-assisted operators move from initial access to domain
admin in hours.

When the attacker has better tooling than the defender, adding more firewalls
is not a strategy. Removing the trust assumptions they were built on is.

---

## Enter AEGIS

**AEGIS** is a Zero Trust Identity Gateway. Named for the mythological shield
that protected its bearer not by standing between them and the threat, but by
making the bearer their own defense — AEGIS authenticates and authorizes every
request, regardless of its origin, its network position, or the identity of
the person behind it.

The core premise:

> No request is trusted because of *where* it comes from. Every request is
> verified — continuously — against *who* is making it and *what* they are
> allowed to do.

This is not a new idea. It is the formalized conclusion of a decade of
industry consensus, most famously articulated by Google in their
**BeyondCorp** papers (2014–2016) and codified by NIST SP 800-207
(*Zero Trust Architecture*, 2020).

---

## BeyondCorp heritage — continuous verification via reverse identity proxy

BeyondCorp's central architectural innovation was the **reverse identity
proxy**: an enforcement point sitting between the user and every protected
resource, terminating access at the application layer rather than the network
layer. Every request is intercepted, identity is re-verified, and the response
is authorized against policy — *before* the resource is ever contacted.

AEGIS implements this pattern directly:

```
┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Client  │──►│   Traefik    │──►│   Authelia   │──►│   Service    │
│ (any IP) │   │  (ingress)   │   │  (identity)  │   │ (protected)  │
└──────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                       │                  │
                       │                  ├─► LDAP bind to AD
                       │                  ├─► MFA check (TOTP)
                       │                  ├─► Group membership check
                       │                  └─► Access policy evaluation
                       │
                       └─► Forward-auth: request only reaches the
                           service if identity + policy permit
```

Two properties distinguish this from a traditional reverse proxy with
authentication bolted on:

1. **No backend is directly reachable.** The `auth_net` enclave has no route
   to the outside. The only path to a protected service is through the
   enforcement point.
2. **Identity is re-verified on every request, not just at login.** Sessions
   exist, but group membership that governs authorization is resolved from
   the directory on each access decision — not cached at login and trusted
   forever.

The result: revoking a user's access is a single operation in the directory.
It takes effect on the next request. No logout propagation, no token
revocation list, no sync delay.

---

## What AEGIS actually implements

| Zero Trust principle | AEGIS implementation |
|---|---|
| **Never trust, always verify** | Traefik forward-auth on every protected route; no backend exposed directly |
| **Least privilege** | `default_policy: deny`; access granted only via explicit AD group match |
| **Assume breach** | `auth_net` is `internal: true` — no egress from the enclave; segmented zones |
| **Verify explicitly** | MFA (TOTP) enforced on every protected surface; session elevation for identity changes |
| **Single source of truth** | Active Directory is the sole identity provider; Authelia and Keycloak are read-only consumers |
| **Continuous audit** | Every auth decision, every request, every WAF hit — logged and shipped to the SOC |
| **Group-based authorization** | No per-user policy anywhere; roles derive exclusively from AD group membership |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│  Zone 1 — Public                                                    │
│  Juice Shop  ·  WAF target                                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│  Zone 3 — Enforcement (this repo)                                   │
│                                                                     │
│   Traefik ──► Authelia ──► Keycloak ──► Postgres / Redis            │
│   (ingress)   (identity)   (OIDC)                                   │
│                                                                     │
│   Coraza (WAF)  ·  Mailpit  ·  Portainer  ·  oidc-proxy             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │  LDAP (read-only)
┌────────────────────────────────▼────────────────────────────────────┐
│  Zone 2 — Enterprise                                                │
│  Active Directory  ·  aegis.corp  ·  Users + Groups + GPOs          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│  Zone 4 — SOC (planned)                                             │
│  Wazuh  ·  Elasticsearch  ·  Kibana  ·  Shuffle  ·  MISP            │
└─────────────────────────────────────────────────────────────────────┘
```

Every request crosses the Zone 3 enforcement layer. Zone 2 holds the identity
truth. Zone 4 observes everything. **No layer trusts another because of where
it sits.**

---

## Repository map

| Document | Contents |
|---|---|
| **[docs/gateway-setup/BUILD-PLAN.md](docs/gateway-setup/BUILD-PLAN.md)** | **Start here** — zero-to-AD-federation build plan, phase by phase |
| [docs/gateway-setup/gateway-structure.md](docs/gateway-setup/gateway-structure.md) | File layout, network topology, volumes, container inventory |
| [docs/gateway-setup/configuration.md](docs/gateway-setup/configuration.md) | Service-by-service configuration reference + federation deep dive |
| [docs/gateway-setup/soc-integration.md](docs/gateway-setup/soc-integration.md) | Zone 4 integration (planned — blocked on network access) |

### Reading order

1. **New to AEGIS?** Read this README, then `gateway-structure.md` for the
   big picture.
2. **Building from scratch?** Go straight to `BUILD-PLAN.md`. Follow it top
   to bottom.
3. **Debugging a deployment?** `configuration.md` § 11 and `BUILD-PLAN.md`
   Appendix A — every known failure mode with its fix.
4. **Extending to a new service?** `configuration.md` § 6 has the Compose
   pattern; § 8 covers access control rules.

---

## What this repository is — and is not

**Is:**

- A reference implementation of Zero Trust identity federation on a
  segmented lab deployment
- A verifiable build plan — every step in `BUILD-PLAN.md` has been executed
  end-to-end on the reference deployment
- A documented example of BeyondCorp-style architecture using
  production-grade open-source components
- A teaching artifact — every design decision is justified, every failure
  mode is recorded

**Is not:**

- A production deployment. Several hardening items are deferred and
  documented in `configuration.md` Appendix C: LDAPS on the AD bind, secret
  rotation, permanent admin replacement, ECS normalization.
- A complete SOC. Zone 4 is designed but not integrated — the lab is on a
  separate network segment.

---

## Key results (verified end-to-end)

- A user created in Active Directory can authenticate to every protected
  gateway service with **zero configuration changes** to Authelia, Traefik,
  or Keycloak.
- Disabling an AD account revokes gateway access **on the next request** —
  no cache, no propagation delay.
- AD group membership flows into both Authelia's ACL engine (via LDAP) and
  Keycloak's OIDC tokens (via the `groups` claim).
- The gateway's local identity state is fully disposable — every identity
  decision derives from the directory.

This is the Zero Trust property being demonstrated: **a single policy decision
point per trust boundary, enforced continuously, with full auditability.**

---

## Credits and heritage

- **BeyondCorp** — Google's 2014–2016 papers on replacing perimeter security
  with identity-based access control. The architectural model AEGIS follows.
- **NIST SP 800-207** — *Zero Trust Architecture* (2020). The formal
  specification of the principles implemented here.
- **Open-source stack** — Traefik, Authelia, Keycloak, Coraza, PostgreSQL,
  Redis, Mailpit, Portainer, Wazuh.

---

*The perimeter is a memory. The identity is the boundary.*
---

## Architecture: Four Zones

```
Zone 1 — Threatscape        Red-team emulation & attack surface (Atomic Red Team, SQL Injection, XSS, Directory Fuzzing, Path Traversal, Brute Force/Password Spraying)
Zone 2 — Target Grid        Target enterprise network (CORP-DC01 AD DS, CORP-PC01, CORP-WEB01 Juice Shop, Keycloak ↔ AD Federation)
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

### Zone 2 — Target Grid *(Active Subnet / In-Progress)*

Target enterprise infrastructure (`aegis.corp` on `192.168.50.0/24` via `ens34`):
- **CORP-DC01** (`192.168.50.10`): Windows Server 2022 Active Directory Domain Controller serving as the **primary enterprise identity store** for corporate credentials and security groups.
- **CORP-PC01** (`192.168.50.100`): Domain-joined Windows 10 workstation ("Patient Zero") instrumented with Sysmon v15 and Wazuh Agent 002 (Active Response target).
- **CORP-WEB01** (`192.168.50.20`): Target web host running OWASP Juice Shop on port 3000, micro-segmented on `VMnet3`, shielded inline by Coraza WAF (CRS v4) and decoupled from Authelia for public e-commerce access.
- **Keycloak ↔ Active Directory Federation**: Core identity bridging resource federating AD DS (`CORP-DC01`) with Keycloak via scheduled LDAP/OIDC sync to eliminate siloed credential databases.
- *Note*: Standalone PostgreSQL server `CORP-DB01` has been removed from the topology in favor of enterprise AD identity federation and WAF-shielded web services.

### Zone 1 — Threatscape *(Attack Surface & Red Team Engine)*

Red-team adversary station and automated execution framework designed to simulate realistic adversary behaviors:
- **Atomic Red Team**: Automated execution framework triggering mapped MITRE ATT&CK technique batteries against target hosts (tactics: Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Spraying).
- **Web Application Exploitation**: SQL Injection (SQLi) & Cross-Site Scripting (XSS) via automated tools (sqlmap) and manual crafting targeting `CORP-WEB01` endpoints.
- **Directory Fuzzing & Path Traversal**: Wordlist probing via `gobuster`, `ffuf`, and `dirbuster` against edge proxy routing and internal API paths.
- **Credential Attacks**: Brute force authentication attacks and password spraying against edge login portals and Active Directory accounts.
- **C2 & Binary Detonation**: Sliver C2 server (mTLS/DNS listeners), Mimikatz memory credential harvesting, and airgapped REMnux malware analysis sandbox.

#### Attack Testing Methodology: Kali vs. Atomic Red Team

Two complementary attack-testing methodologies validate AEGIS detection and response:

- **Kali Linux (Manual Kill-Chain):** Demonstrates one full, realistic, narrative attack chain end-to-end for the live jury demo (SQLi initial access via CORP-WEB01 Juice Shop → LSASS memory dump via Mimikatz on Patient Zero → Sliver C2 beaconing and exfiltration).
- **Atomic Red Team (ATT&CK Coverage Matrix):** Provides breadth across MITRE ATT&CK techniques by executing discrete, highly focused test cases individually via `invoke-atomicredteam` (Windows) and the Linux/bash runner. Grouped by tactic (Execution, Persistence, Privilege Escalation, Defense Evasion, Exfiltration), each test produces a per-technique pass/fail coverage matrix (technique ID → detected by Wazuh/Sysmon/Zeek/Suricata), directly extending the MITRE ATT&CK tagging already proven in `local_rules.xml` `mitre.id` fields (e.g. rule 100100 / T1190).

---

## The Access Control Model

**One overarching policy applies behind this gateway: `default_policy: deny`, with `two_factor` required for internal resources.** 

The live policy enforces strict structural and group-based controls:
- **Public Customer Application Decoupled from Authelia**: OWASP Juice Shop (`juiceshop.zerotrust.lan`) is decoupled from Authelia Forward-Auth entirely. It serves as a public-facing e-commerce storefront protected exclusively inline by Coraza WAF (OWASP Core Rule Set), inspecting requests for SQLi, XSS, and RCE without requiring corporate credentials.
- **Self-Authentication Bypass**: Authelia's own login portal (`authelia.zerotrust.lan`) is bypassed because it is the Forward-Auth provider itself.
- **OIDC Protocol Bypass**: Keycloak's OIDC protocol endpoints (`/realms/*/protocol/openid-connect/*`, `/realms/*/login-actions/*`) are bypassed so relying parties and browser flows can complete OAuth2 token exchanges without authentication deadlocks.
- **Role-Based Administrative Restrictions**:
  - `keycloak.zerotrust.lan` admin console: Restricted strictly to `group:admins` with mandatory 2FA, immediately followed by an explicit `policy: deny` rule.
  - `traefik.zerotrust.lan` dashboard: Restricted strictly to `group:admins` with mandatory 2FA, immediately followed by an explicit `policy: deny` rule.
  - `portainer.zerotrust.lan` (Docker socket manager): Restricted to `group:admins` OR `group:it_ops` with mandatory 2FA, followed by an explicit `policy: deny` rule.
- **Explicit Deny Hardening**: Authelia does not implicitly deny on subject mismatch alone. Explicit `policy: deny` rules were placed after each group restriction before the catch-all wildcard rule (`*.zerotrust.lan`, `policy: two_factor`) is reached.
- **Development Sinkhole**: Mailpit (`mailpit.zerotrust.lan`) is bypassed for dev/testing verification.

See `src/components/GovernancePolicyView.tsx` and `src/components/zones/` for interactive policy simulations and live configuration inspections.

### Zero Trust Governance Model

The AEGIS Zero-Trust governance architecture maps classical perimeter trust models to explicit identity verification, micro-segmentation, and dynamic authorization propagation:

#### 1. Core Principle Mapping
- **Never trust / always verify**: Forward-Auth enforced on every single inbound HTTP request at the Traefik reverse proxy via Authelia (`/api/authz/forward-auth`). Direct network access to backend application ports or databases is eliminated.
- **Least privilege**: `default_policy: deny` with explicit group-match grants only. Access is strictly scoped to authorized business functions; non-matching identities are rejected before falling through to permissive wildcards.
- **Assume breach**: Multi-zone network isolation. Sensitive identity services reside on the `auth_net` Docker bridge marked `internal: true` with zero external routing and no host port exposure.
- **Verify explicitly**: Step-up MFA/TOTP enforced across all enclaves except the self-authentication portal infrastructure itself.
- **Single source of truth**: Active Directory (`CORP-DC01`, `aegis.corp`) serves as the central identity authority; Authelia and Keycloak function strictly as enforcement-only layers.
- **Continuous audit**: Every authentication and authorization decision is logged out-of-band to dedicated indices (`wazuh-alerts-authelia-*`, `wazuh-alerts-keycloak-*`) and shipped to Zone 4 for SIEM ingestion and SOAR triage.

#### 2. Group-Based Administration Model
Authorization propagation follows a clean architectural pipeline:
```
Active Directory Group (Business Authorization Unit)
        │
        ▼
Keycloak Realm Role (Application-Facing IdP Role)
        │
        ▼
Authelia Access Rule (Gateway Policy Enforcement)
        │
        ▼
Target Application (OIDC Token Claims / Header Ingestion)
```
**Propagation Guarantee**: Granting or revoking administrative access is executed strictly via a **single Active Directory group membership change** (e.g., adding or removing an operator from `GRP_IT_Admin`). This change propagates dynamically across all relying parties without touching Authelia configuration files, without modifying roles inside Keycloak UI, and without requiring a gateway restart.

#### 3. Access Control Policy Matrix

| Resource | Domain / Path | Policy | Authorized Group / Identity | Governance Note |
|---|---|---|---|---|
| **Authelia Portal** | `authelia.zerotrust.lan` | `bypass` | Any | Self-authentication gateway layer itself (cannot gate its own login flow) |
| **Mailpit UI** | `mailpit.zerotrust.lan` | `bypass` | Any | Development & testing SMTP sinkhole (non-production, see Security Notes) |
| **Keycloak Admin Console** | `keycloak.zerotrust.lan` | `two_factor` | `GRP_IT_Admin` | Identity provider configuration; explicit deny rule immediately follows |
| **Traefik Dashboard** | `traefik.zerotrust.lan` | `two_factor` | `GRP_IT_Admin` | Edge routing management; explicit deny rule immediately follows |
| **Portainer CE** | `portainer.zerotrust.lan` | `two_factor` | `GRP_IT_Admin` | Root-equivalent Docker management; explicit deny immediately follows |
| **Internal Workloads** | `*.zerotrust.lan` | `two_factor` | Any Authenticated | Default catch-all for authenticated enterprise personnel |
| **CORP-WEB01 (Juice Shop)** | `juiceshop.zerotrust.lan` | Public (No Authelia) | Public / Customers | Decoupled from Authelia; inspected inline exclusively by Coraza WAF (CRS v4) |

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
- **CRITICAL SOC VISIBILITY GAP — No Wazuh Agent on CORP-DC01 (Active Directory) [HIGHEST PRIORITY GAP]**:
  Critical SOC visibility gap — no Wazuh agent on CORP-DC01 (Active Directory). Five of six planned identity/network log sources are ingested and confirmed working (Authelia, Keycloak, Traefik, Coraza, Zeek/Suricata), but Active Directory itself is not. This means: a user added to GRP_IT_Admin, a security group modified, a disabled account re-enabled, or Kerberos authentication anomalies currently produce zero SOC visibility. Given the project's core thesis is closing exactly this kind of institutional blind spot, this is ranked as the highest-priority remaining gap — higher than completing the Authelia->AD migration itself. Planned remediation: install a Wazuh agent on CORP-DC01 pointed at minisoc2 (10.16.64.156:1514), configure ossec.conf to collect the Windows Security event log channel, with priority on event IDs 4720 (user created), 4726 (user deleted), 4732 (member added to security-enabled group), 4733 (member removed), 4740 (account locked out), and 4625 (failed logon).

#### Cross-Source Correlation Value (Why Closing the AD Visibility Gap Matters)
Closing the AD-visibility gap matters beyond just "one more log source" — it is the architectural prerequisite for multi-stage threat detection across the sovereign Zero-Trust estate. Once all six sources (Authelia, Keycloak, Traefik, Coraza, Zeek/Suricata, and Active Directory) are ECS-normalized and flowing, the following cross-source correlations become possible:
1. **AD Group Change Followed Immediately by Keycloak Admin Login**: An AD group change (e.g. user added to `GRP_IT_Admin`, Event ID 4732) followed immediately by a Keycloak admin login (`wazuh-alerts-keycloak-*`). Indicates potential AD compromise resulting in immediate privilege escalation into the identity provider.
2. **Authelia Brute-Force Pattern + Suricata Scan from Same Source IP**: An Authelia brute-force pattern (`wazuh-alerts-authelia-*`, 5+ failed 1FA attempts) combined with a Suricata network port/vulnerability scan (`filebeat-suricata-*`) originating from the exact same source IP, indicating a coordinated credential attack.
3. **Coraza WAF Block Followed by Authelia Failure and Keycloak Token Request**: A Coraza WAF block on `juiceshop` (`filebeat-coraza-*`, HTTP 403) followed by an Authelia auth failure, followed by a Keycloak token request from the same source IP — revealing active exploitation attempting a lateral pivot from external web applications to enterprise identity layers.
4. **AD Account Disabled while Authelia Auth Attempts Continue**: An Active Directory account disabled (Event ID 4725 / UAC bitmask flag 2) while Authelia authentication attempts continue at the gateway under that username — a key indicator of a stale session or session hijack.
5. **New Admin Group Addition Followed Immediately by Admin Console Access**: A new member added to `GRP_IT_Admin` followed immediately by administrative console access (Keycloak, Portainer, or Traefik) — a primary indicator of suspicious privilege escalation.
6. **Kerberos Authentication Failures Across Multiple Hosts**: Multiple Kerberos authentication failures and abnormal ticket requests (Event IDs 4768, 4769, 4771) across multiple endpoints — signaling Kerberoasting or pass-the-ticket adversary tradecraft.

*Prerequisite Technical Requirement*: This correlation capability fundamentally requires Wazuh's own event fields to be ECS-normalized (`source.ip`, `user.name`, `event.outcome`) for EQL "sequence by" queries to work across indices — already identified as the project's largest remaining technical gap (existing item `l33`).

- **Bind credential (`svc-keycloak`) stored in plaintext**: Bind credential (`svc-keycloak`) stored in Keycloak's provider configuration and in Authelia's plaintext YAML, not a secret manager. Acceptable for this lab environment given the isolated `ext_net` bridge with no LAN exposure, but must not be presented as production-ready without this caveat. Production remediation: HashiCorp Vault, CyberArk, or Keycloak's own secret SPI.
- **AD LDAP bind currently uses plaintext `ldap://` (no LDAPS/TLS)**: Acceptable given network isolation on `ext_net`, flagged as a pre-production hardening item, not a currently exploitable gap given the topology.
- **Scoping distinction — Ingress vs. Bidirectional Egress Enforcement**: Ingress Zero-Trust enforcement (Traefik edge reverse proxy + Authelia Forward-Auth MFA + Coraza WAF request inspection) is currently distinct from full bidirectional egress traffic enforcement. In the current implementation, ingress policy enforces authentication and filtering on inbound requests to protected internal workloads; however, outbound egress traffic originating from internal workloads, containers, or hosts is not yet routed through a mandatory egress proxy or transparent Zero-Trust egress gateway filter.
- **"Too many fields for JSON decoder" flood on minisoc2**: Root cause unresolved; observed during alert ingestion. May be silently dropping Wazuh alerts.
- **logstash.conf TLS still disabled**: Elasticsearch CA certificate was never copied from minisoc1 to minisoc3; transport currently runs with `ssl_certificate_verification => false`.
- **Full .env exposed in chat session / plaintext credentials**: All secrets in it (`ES_PASSWORD`, `MISP_MYSQL_ROOT_PASSWORD`, `MISP_MYSQL_PASSWORD`, `MISP_ADMIN_PASSWORD`, `MISP_GPG_PASSPHRASE`, `REDIS_PASSWORD`, `SHUFFLE_OPENSEARCH_PASSWORD`), plus elastic superuser and Keycloak admin passwords pasted in chat sessions, must be treated as burned and rotated.
- **Plaintext secrets remaining in `authelia/configuration.yml`**: Plaintext secrets remaining in `authelia/configuration.yml` (`storage.encryption_key`, `storage.postgres.password`, `session.redis.password`, `identity_validation.reset_password.jwt_secret`, OIDC `client_secret`) — need migration to `AUTHELIA_*`-prefixed environment variables.
- **Session secrets burned during OIDC debugging — credential rotation required**: New secrets burned by exposure during this session's debugging, requiring rotation before defense: `LDAP_ADMIN_PASSWORD`, `LDAP_CONFIG_PASSWORD`, `LDAP_BIND_PASSWORD`, Authelia's OIDC RSA private key, Authelia `storage.encryption_key`, Authelia OIDC client secret for Keycloak, Authelia session secret, Redis password, Postgres Authelia password. (These are in addition to the already-flagged Elasticsearch and Keycloak admin passwords.)
- **Stray "AEGIS.CORP" realm in Keycloak pending deletion**: A stray "AEGIS.CORP" realm was created in Keycloak during earlier UI experimentation and needs deletion before defense (do not confuse with the actual planned Zone 2 `aegis.corp` Active Directory domain, which remains unbuilt — `l1`).
- **Temporary/bootstrap Keycloak admin account still in use**: Temporary/bootstrap Keycloak admin account is still in use; needs a permanent admin created and the bootstrap account removed.
- **Missing `sn`/`givenName` attributes on LDAP users**: LDAP users (`testuser`, `ezio`) were initially missing `sn` and `givenName` attributes, which caused a Keycloak First-Broker-Login profile-completion prompt/failure; requires permanent schema attribute standardization in bootstrap LDIF.
- **Abandoned truststore debugging artifacts pending cleanup**: Abandoned truststore debugging artifacts (`traefik/certs/truststore.p12`, `keycloak-cacerts-with-aegis.p12`, stale JVM env vars from the failed truststore fix attempts) need cleanup.
- **oidc-proxy inter-container HTTP communication (Acceptable Risk / Scoped)**: `oidc-proxy`'s use of plain HTTP between containers on internal Docker bridge (`auth_net`, `internal: true`, no external route) is flagged as architecturally acceptable (internal isolated Docker network namespace with no host port exposure), not a residual risk or vulnerability — stated here explicitly so it is not read as an overlooked security gap.

### Lessons Learned & Engineering Reflections (Identity Migration & OIDC Federation)
- **Authelia access_control rule fallthrough on subject mismatch**: Authelia evaluates access_control rules top-to-bottom and applies the first FULL match (domain + resources + subject) — but a subject mismatch alone does not deny; it falls through to later matching rules, including a permissive wildcard. An explicit `policy: deny` rule is required immediately after each group-restricted rule for the same domain to prevent unauthorized access.
- **Authelia environment variable substitution allow-list**: Authelia's configuration file env-var substitution is strictly allow-listed — only variables with `AUTHELIA_*` or `X_AUTHELIA_*` prefixes are honored. Arbitrary `${VAR}` syntax fails silently, leaving variables unexpanded or falling back to default values.
- **LDAP Result Code 32 ("No Such Object") semantics**: In OpenLDAP, Result Code 32 can indicate an Access Control List (ACL) denial rather than the literal absence of an object or subtree. This was conclusively diagnosed by re-executing the identical search query as `cn=admin,dc=zerotrust,dc=lan`, which successfully returned the entries that `authelia-bind` was denied.
- **Keycloak 26.x HTTP client truststore limitations & sidecar mitigation**: Keycloak 26.x's internal HTTP client (`SimpleHttpRequest`) does not honor its own configured truststore for outbound OIDC discovery and token exchange requests. Multiple standard Java/Keycloak remediations (`KC_TRUSTSTORE_PATHS`, `JAVA_TOOL_OPTIONS`, direct JVM `cacerts` certificate injection) were attempted and failed. The working and robust mitigation was introducing an internal Caddy sidecar proxy (`oidc-proxy`) on `auth_net` that handles server-to-server OIDC calls over plain HTTP within the trusted internal Docker bridge, while Traefik continues to terminate TLS for all browser-facing traffic. This is framed as a deliberate architectural mitigation aligned with Zero-Trust's "enforce trust at the boundary" principle, not a temporary workaround.
- **Authelia OIDC issuer header validation**: Authelia's OIDC issuer resolution strictly depends on the incoming `Host`, `X-Forwarded-Proto`, and `X-Forwarded-Host` request headers matching its configured issuer URL (`https://auth.zerotrust.lan`) exactly. Any intermediary reverse proxy or broker must rewrite or pass through these headers consistently; otherwise, token requests and discovery calls are rejected with HTTP 400.
- **OIDC token_endpoint_auth_method alignment**: The token endpoint authentication method must match identically between the relying party and identity provider. Keycloak defaults to `client_secret_post` (passing client credentials in the HTTP POST body), whereas Authelia enforces `client_secret_basic` (HTTP Basic Authorization header). Both mechanisms are fully OAuth 2.0 / OIDC spec-compliant; the failure was a configuration divergence, not an implementation bug on either side.
- **Cross-user authentication-bypass vector in Authelia TOTP storage**: A genuine security finding was identified in Authelia's data model: user MFA/TOTP device secrets are persisted in PostgreSQL keyed strictly by username, entirely decoupled from the LDAP directory backend. Deleting a user from LDAP does not purge their registered MFA tokens from PostgreSQL. If a username is subsequently reissued to a different individual, the new identity inherits the previous user's active TOTP secret, creating a cross-user authentication-bypass vector unless an explicit database storage cleanup step is integrated into user deprovisioning workflows.

### Resolved Issues & Architectural Debt
- **Coraza WAF Routing Bypass — RESOLVED**:
  - *Root Cause*: Traefik's dynamic router (`traefik-dynamic.yml`) routed `juiceshop.zerotrust.lan` traffic directly to the target container, skipping the Coraza WAF container entirely.
  - *Real Fix*: Repointed Traefik dynamic routing to `http://coraza:8080`, verified Coraza inline request inspection with OWASP Core Rule Set, decoupled Juice Shop from Authelia (WAF-only protection), adjusted Coraza log permissions to `0755` for Filebeat ingestion, and verified live HTTP 403 blocks against SQLi, UNION, and XSS attack payloads.
- **Zeek & Suricata Log Ingestion & Mapping Collisions — RESOLVED**:
  - *Root Cause*: Forcing Zeek and Suricata raw events through the same Wazuh archives index/mapping (`wazuh-archives-4.x-*`) caused Elasticsearch mapping collisions (`data.id` keyword vs. object; `data.service` object vs. string), dropping real events with HTTP 400.
  - *Real Fix*: Installed Filebeat directly on `ztagateway` (where raw log files reside: `/opt/zeek/spool/manager/{conn,dns}.log` and `/var/log/suricata/eve.json`), using native Filebeat Zeek and Suricata modules, shipping to their own ECS-normalized data stream (`.ds-filebeat-8.19.13-*`, `event.module: zeek` / `suricata`), completely separate from `wazuh-archives-*`.
  - *Verification*: Verified with real data: 931+ Zeek connection events, 93,000+ Suricata events, zero mapping errors.
  - *Pipeline Rollback*: The now-unnecessary `aegis-zeek-normalize` ingest pipeline call was rolled back from the Wazuh archives pipeline (restored from backup, re-verified empty via `_ingest/pipeline` inspection).
  - *Dashboards*: Kibana dashboards built and confirmed rendering real data: `[Filebeat Zeek] Overview`, `[Filebeat Suricata] Events Overview`, `[Filebeat Suricata] Alert Overview`, plus a new combined `"AEGIS Network Overview (Zeek+Suricata)"` dashboard. Closes checklist items `l14` and `l15`.
- **Per-Source Alert Index Split & Kibana Security Dashboards — RESOLVED**:
  - *Root Cause*: Aggregating Authelia authentication events, Coraza WAF blocks, and Keycloak OIDC logs into a single generic index caused high ingestion latency and field clashes.
  - *Real Fix*: Implemented per-source split on minisoc2/minisoc1 (`wazuh-alerts-authelia-*`, `wazuh-alerts-coraza-*`, `wazuh-alerts-keycloak-*`), generated encryption keys in `kibana.yml`, and deployed two dedicated production dashboards: "Identity & Access Security Overview" and "Edge WAF Security Overview".
- **F-025: Shuffle Built-in MISP App Forces GET — RESOLVED**: Replaced Shuffle's buggy MISP node with a generic HTTP node issuing POST to `https://misp-core/attributes/restSearch` with raw API key authorization.
- **F-026: Wazuh Active Response API Parameter Evolution — RESOLVED**: Removed deprecated `custom` boolean field for Wazuh API 4.7+ and identified mandatory `agents_list` query parameter for targeted execution.
- **F-027: Nginx Reverse Proxy for Zone 4 Dashboards — RESOLVED**: Configured Nginx reverse proxy on minisoc3 for `shuffle.dz`, `misp.dz`, and `kibana.dz`, aligning service base-URLs and eliminating unstable SSH tunnels.
- **F-028: minisoc3 Partial Outage After Docker Restart — RESOLVED**: Host sshd and Nginx recovered following high-memory container recreation; all `.dz` proxy domains and SSH access operational.

---

## Status Summary

| Zone | Status |
|---|---|
| Zone 3 (Gateway) | Built, hardened, sensors verified, Coraza WAF verified inline, group-based access control active |
| Zone 4 minisoc1/2 | Pre-existing, operational |
| Zone 4 minisoc3 | Infrastructure deployed and verified (5-container Shuffle with shuffle-opensearch, 4-container MISP, Logstash webhook wired, Nginx .dz HTTPS proxy) |
| Zone 4 | Detection rules (7 active) | Deployed and firing on real attack data |
| Zone 4 | SOAR workflow (webhook→MISP→Discord) | Built and verified end-to-end |
| Zone 4 | Nginx reverse proxy | Deployed and operational (shuffle.dz / misp.dz / kibana.dz) |
| Zone 4 | Wazuh Active Response | API reachable, agent-side execution pending |
| Zone 4 | Keycloak↔AD federation | Operational (verified: 6 users, 3 groups synced, read-only LDAP federation on ext_net bridge) |
| Zone 3 | Authelia→AD migration (l38) | Proposed / Drafted (not yet applied; config drafted, single source of truth target) |
| Zone 2 | CORP-DC01 Wazuh Agent | CRITICAL GAP (highest priority remaining: 0 visibility on AD group/account events) |
| Zone 4 Zeek/Suricata Ingestion & Dashboards | Operational: Dedicated Filebeat ECS data streams (.ds-filebeat-8.19.13-*) and 4 verified Kibana dashboards |
| Zone 4 OpenLDAP & Identity/WAF Telemetry | Completed: Stages 1-3 (OpenLDAP + Authelia LDAP + Keycloak OIDC via oidc-proxy) + Per-source index split + 2 dedicated Kibana dashboards |
| Zone 2 (Target Grid) | Active Subnet: CORP-DC01 (AD DS), CORP-PC01, and CORP-WEB01 (Juice Shop) active on 192.168.50.0/24 with cross-zone routing verified; Keycloak ↔ AD federation integrated |
| Zone 1 (Threatscape) | Configured & Ready (Atomic Red Team, SQLi/XSS, Directory Fuzzing, Path Traversal, Brute Force / Password Spraying) |
| Atomic Red Team coverage testing | Scheduled / In-Progress |

### Key Migration Checklist Items & Active Work Streams

- [ ] **Item l38 — Migrate Authelia authentication backend from OpenLDAP to Active Directory**
  - **Category**: High
  - **Completed**: `false` (Proposed / Drafted, not yet applied)
  - **Notes**: Configuration drafted, not yet applied. Target: single source of truth for identity across Zone 3 (gateway) — currently Authelia authenticates against OpenLDAP (`dc=zerotrust,dc=lan`) while Keycloak is already federated to Active Directory, meaning two directories independently hold user identity and an AD-disabled user would remain authenticated at the gateway. Planned config: `authentication_backend.ldap.implementation: activedirectory`, bind DN `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp`, `users_filter` includes `(!(userAccountControl:1.2.840.113556.1.4.803:=2))` to exclude disabled AD accounts in real time (no cache/sync delay). Requires rewriting `access_control` to use AD group names (`GRP_IT_Admin`, `GRP_Finance`, `GRP_Web_Ops`) instead of OpenLDAP's (`admins`, `it_ops`) — the explicit-deny-after-group-match pattern (documented lesson from the earlier fallthrough bug) is carried forward as a mandatory pattern, not optional. OpenLDAP is retained post-migration as a documented break-glass path only (small set of recovery accounts), not the primary identity source.
- [ ] **Item l33 — Wazuh ECS Field Normalization**
  - **Category**: High
  - **Completed**: `false` (Prerequisite for cross-source sequence correlation)
  - **Notes**: Normalize legacy Wazuh archive and alert fields into Elastic Common Schema (ECS) to enable unified querying and rule correlation alongside native Filebeat Zeek/Suricata data streams.

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
│   ├── DeploymentGuideView.tsx Standalone replication guide (§1–§11 at /deployment)
│   ├── MasterTopologyView.tsx
│   ├── SubTopologiesView.tsx
│   ├── FileStructureView.tsx
│   └── ...             Other report sections (roadmap, security
│                       debt register, jury demo script, etc.)
├── data/
│   ├── reportData.ts   Task/status tracking data consumed by the
│   │                   dashboard views above
│   └── deploymentGuideData.ts Commands, verification matrix, & secrets list
└── App.tsx
```

Live deployment configs referenced throughout the app (Docker Compose,
Traefik, Authelia, Keycloak, etc.) are not stored as separate files in this
repo — they're embedded, redacted, and downloadable directly from the
relevant zone's page on the live site.

A complete, standalone reproduction walkthrough is available directly in the web app under the top-level **Deployment Guide** section (`/deployment`), covering §1–§11 with copy-pasteable commands, verification checks, and troubleshooting post-mortems for the OpenLDAP + Authelia + Keycloak + Coraza stack.

---

## Getting Started

This is a research/academic project, not a packaged installable product.
Reproducing it requires: a Docker host for Zone 3, three AlmaLinux nodes
(or equivalent) for Zone 4, and the credentials/network topology defined
in your own `.env` files (never committed — see `.env.example` for the
required variable names).

For an end-to-end replication of the Zone 3 Identity & WAF stack from scratch, consult the interactive **Deployment Guide** (`/deployment`) in the dashboard or `docs/SETUP.md`.

Deploying this in a real organization (not just a lab)? See `docs/DEPLOYMENT.md` for the enterprise rollout walkthrough — placement, identity migration strategy, connecting to a remote SOC, and a known gap around host-level monitoring of the gateway itself.

---

## License

Academic project — PFE 2026. Licensing terms TBD.
