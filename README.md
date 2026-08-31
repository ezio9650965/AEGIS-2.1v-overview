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

### Zone 4 — MSSP SOC *(partially verified)*

Three AlmaLinux 9.3 nodes, native package installs (not Docker) on the two
pre-existing nodes:

| Node | Role | Status |
|---|---|---|
| minisoc1 "The Vault" | Elasticsearch 8.19.13, 8GB JVM heap | Operational (pre-existing) |
| minisoc2 "The Brain" | Wazuh Manager 4.7 + Kibana | Operational (pre-existing) |
| minisoc3 "The Executor" | Shuffle SOAR + MISP + Logstash | Infrastructure deployed and verified this cycle |

minisoc3 replaced an earlier disconnected Scikit-Learn anomaly-detection
script — that pipeline had no live Elasticsearch ingestion and no working
hook into Wazuh's response system, and was removed rather than debugged
further. It now runs 9 containers: a 4-container Shuffle SOAR stack
(frontend/backend/orborus/database), a 4-container official MISP stack
(core/modules/mariadb/valkey — the previously used third-party
`coolacid/misp-docker` image is deprecated and unavailable), Logstash, and
Mailpit.

**Verified:** all 9 containers healthy; direct query against minisoc1
confirms Logstash's Elasticsearch connectivity and query logic are correct.
**Not yet built:** the actual Shuffle workflow graph (webhook receiver →
MISP reputation lookup → Keycloak session revocation / Wazuh Active
Response) exists as infrastructure only — the automation logic itself is
still to be built. No live attack has been run end-to-end through the
pipeline yet.

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

---

## The Access Control Model

Two distinct policies exist behind the same gateway — this distinction
matters and is a deliberate design choice, not an oversight:

- **Customer-facing paths** (e.g. the Juice Shop storefront): `policy:
  bypass` in Authelia. No employee MFA. Customers use the application's own
  account system, if any. Forcing enterprise MFA onto a public storefront
  would be a UX failure dressed up as security.
- **Employee/admin paths** (internal tools, admin panels, the SOC itself):
  `policy: two_factor`, scoped by Active Directory group membership through
  Keycloak. Sensitive paths (e.g. an application's `/admin` route) re-check
  MFA even within an already-valid general session — the specific
  mitigation against a hijacked session cookie silently inheriting admin
  access.

Access maps to job function via group membership, never to title —
onboarding, role changes, and offboarding are single directory edits, not
gateway reconfigurations. See `docs/architecture.md` for the full
role-mapping table and the onboarding/offboarding sequence.

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
zero-issue development. Full register in `docs/architecture.md`.

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

---

## Status Summary

| Zone | Status |
|---|---|
| Zone 3 (Gateway) | Built, hardened, sensors verified |
| Zone 4 minisoc1/2 | Pre-existing, operational |
| Zone 4 minisoc3 | Infrastructure deployed and verified; SOAR workflow not yet built |
| Zone 4 detection rules on minisoc2 | Drafted; deployment not yet confirmed |
| Zone 4 OpenLDAP ingestion | Not started |
| Zone 2 (Enterprise Grid) | Not built |
| Zone 1 (Threatscape) | Not built |

This project intentionally documents what is *not* done alongside what is —
an inflated completion claim would not survive a jury's first technical
question.

---

## Repository Structure

See `docs/architecture.md` for the full file structure and per-file
purpose. Top-level layout:

```
~/aegis/
├── gateway/    Zone 3 — Docker Compose stack, Traefik/Authelia/Keycloak
│               configs, Coraza WAF, Zeek node config
├── soc/        Zone 4 — minisoc3 Docker Compose stack, Wazuh rules,
│               L1 playbooks, Kibana dashboard exports
├── grid/       Zone 2 — endpoint configs (planned)
└── docs/       Architecture docs, MITRE mapping, demo script
```

---

## Getting Started

This is a research/academic project, not a packaged installable product.
Reproducing it requires: a Docker host for Zone 3, three AlmaLinux nodes
(or equivalent) for Zone 4, and the credentials/network topology defined
in your own `.env` files (never committed — see `.env.example` for the
required variable names).

Full setup notes: `docs/architecture.md`

---

## License

Academic project — PFE 2026. Licensing terms TBD.
