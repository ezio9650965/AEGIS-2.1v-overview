# AEGIS Zone 4 SOAR Implementation & Automation Checklist

**Project:** AEGIS PFE 2026 — Zero-Trust SOC Platform  
**Target Environment:** Zone 4 (MSSP SOC) — `minisoc3` (Automation & Threat Intel Node)  
**Status:** Operational / End-to-End Verified  
**Date:** September 24, 2026  

---

## 1. Architectural Overview & Telemetry Pipeline

The AEGIS SOAR architecture orchestrates detection-to-containment across all four security zones:

```
[Attacker (Zone 1)] 
       │
       ▼ (Attack Traffic)
[ZTA Gateway (Zone 3)] ──(Syslog / Eve / Conn)──► [Filebeat] ──► [Elasticsearch (minisoc1)]
       │ (Wazuh Agent 4.7)                                              ▲
       ▼                                                                │
[Wazuh Manager (minisoc2)] ──(Rule Match Alert)──► [wazuh-alerts-*] ───┘
       │
       ▼ (Forward High-Severity Alerts: Level >= 10)
[Logstash (minisoc3)] ──(HTTP POST Webhook)
       │
       ▼
[Shuffle SOAR: aegis_soar_v1 (minisoc3)]
       ├─► [1. Webhook Trigger] (Parses Wazuh JSON alert)
       ├─► [2. Set Variable Node] (Extracts srcip, agent_id, rule_level, rule_id)
       ├─► [3. MISP Threat Intel Node] (restSearch lookup via raw HTTP POST)
       ├─► [4. Discord Notification Node] (Dispatches enriched incident card)
       └─► [5. Wazuh Active Response Node] (PUT /active-response host-deny)
```

---

## 2. Infrastructure & Container Health (minisoc3)

All automation and threat intelligence workloads run containerized on `minisoc3` (`10.16.64.157`):

- [x] **Shuffle Backend (`shuffle-backend`)**: Healthy, connected to OpenSearch cluster.
- [x] **Shuffle Frontend (`shuffle-frontend`)**: Exposed on internal port 3001, reverse-proxied via Nginx.
- [x] **Shuffle Orborus (`shuffle-orborus`)**: Docker-socket daemon orchestrating ephemeral worker execution.
- [x] **Shuffle OpenSearch (`shuffle-opensearch`)**: Deployed via `docker-compose.override.yml`, healthy.
- [x] **Shuffle Subtenant (`shuffle-subtenant`)**: Multi-tenant database worker operational.
- [x] **MISP Core (`misp-core`)**: Healthy on port 8443 (internal TLS), running official `misp-docker` v2.4+.
- [x] **MISP Modules (`misp-modules`)**: Python enrichment microservices active.
- [x] **MISP Database (`misp-db`)**: MariaDB backend healthy and schema initialized.
- [x] **MISP Redis (`misp-redis`)**: Job queue cache running.
- [x] **Nginx Reverse Proxy on minisoc3**: Reverse proxy operational providing single-domain access:
  - `shuffle.dz` → `http://127.0.0.1:3001`
  - `misp.dz` → `https://127.0.0.1:8443` (TLS proxy block with `proxy_ssl_verify off`)
  - `kibana.dz` → `http://10.16.64.156:5601` (cross-node proxy to minisoc2)
  - Resolved locally on analyst workstation via `hosts` file DNS.

---

## 3. Workflow Implementation: `aegis_soar_v1`

- [x] **Node 1: Webhook Trigger (`wazuh_alert_listener`)**:
  - Webhook URL: `http://shuffle.dz/api/v1/hooks/webhook_misp_enrichment`
  - Triggered automatically by Logstash upon receiving alerts with `rule.level >= 10`.
  - Verified live: Synthetic Wazuh alert payload (`rule.level=12`, `srcip=192.168.19.183`) received instantly.

- [x] **Node 2: Variable Normalization (`set_alert_variables`)**:
  - Normalizes heterogeneous alert schemas across network and host decoders.
  - Extracts key entities: `srcip`, `agent_id`, `rule_level`, `rule_id`, and `rule_description`.
  - Handles Sysmon process alerts where IP is positioned at `$exec.agent.ip` rather than `$exec.data.srcip`.

- [x] **Node 3: MISP Threat Intelligence Lookup (`misp_restsearch_http`)**:
  - Method: Generic HTTP node issuing HTTP `POST` to `https://misp-core/attributes/restSearch`.
  - Authentication: Raw API key in `Authorization: <key>` header (no `Bearer` prefix).
  - Search Criteria: `{"value": "$set_alert_variables.srcip", "type": "ip-src", "returnFormat": "json"}`.
  - Verification: Tested against seeded test attacker IP `192.168.19.183` (Event #2 "AEGIS test IOC"); returned HTTP 200 with `X-Result-Count: 1`.
  - Architecture note: Bypassed Shuffle built-in MISP app node due to hardcoded GET defect (see **F-025**).

- [x] **Node 4: SOC Analyst Notification (`discord_alert_dispatch`)**:
  - Webhook POST to dedicated SOC alert channel.
  - Formatted Markdown payload displaying:
    - Rule ID and Severity Level (e.g. Level 12)
    - Source IP and Host Agent Identifier
    - Threat Intelligence Match Status (`MISP IOC MATCH: TRUE / Count: 1`)
    - Recommended Triage Actions (Contain Host / Revoke Session)
  - Verified live: Discord notification confirmed received during synthetic alert test.

- [ ] **Node 5: Automated Host Containment (`wazuh_active_response`)**:
  - Status: API Reachable (HTTP 200) / Agent Execution Deferred to Post-Defense.
  - API call executes: `PUT https://minisoc2:55000/active-response` with `command: "host-deny"`.
  - Verified: Dropped legacy `custom` parameter per Wazuh 4.7+ API schema (see **F-026**).
  - Remaining tuning: Agent-side execution requires `agents_list=<id>` query parameter (`affected_items: 0` currently observed without explicit target).

- [ ] **Node 6: Dynamic Severity Branching (`if_else_routing`)**:
  - Status: Scoped Out / Deferred.
  - The Shuffle conditional branching app node fails to load due to restricted outbound Docker image pulling in the air-gapped lab.
  - Workflow deliberately executes in a linear pipeline: `Ingest -> Normalize -> Enrich -> Notify`.

---

## 4. Engineering Findings & Security Debt Resolution

| ID | Title | Status | Technical Root Cause & Remediation |
|---|---|---|---|
| **F-025** | Shuffle Built-in MISP App Forces GET | Resolved | Shuffle MISP-branded app hardcodes GET transport; replaced with generic HTTP node issuing POST to `/attributes/restSearch`. |
| **F-026** | Wazuh Active Response API Rejects `custom` | Resolved | Wazuh API 4.7+ removed `custom` boolean field. Dropped parameter; command passed directly as `"host-deny"`. |
| **F-027** | Nginx Reverse Proxy for Zone 4 Dashboards | Resolved | MISP `MISP_BASEURL` redirect loop broke SSH port forwarding. Built dedicated Nginx `.dz` domain proxy with matched base URLs. |
| **F-028** | minisoc3 Partial Outage After Docker Restart | Resolved | High memory pressure (74% boot RAM) during container recreate hung sshd and Nginx. Recovered and verified operational. |

---

## 5. Remaining SOAR & Threat Intel Worklist

- [x] **Item l10**: Deploy Shuffle SOAR workflow (`aegis_soar_v1`) end-to-end.
- [x] **Item l28a**: MISP single-alert on-demand threat intel enrichment via restSearch.
- [ ] **Item l28**: Scale-out indicator matching across all incoming alert streams (Elastic Indicator Match rules or scheduled pull).
- [ ] **Item l37**: Rebuild lost Edge WAF Security Kibana Dashboard (`filebeat-coraza-*`).
- [ ] **Wazuh AR Agent Tuning**: Refine `agents_list` query parameter for live host network disconnection.
- [ ] **Keycloak Session Revocation**: Automated token invalidation via admin REST API (requires cross-zone route from Zone 4 to Zone 3 `auth_net`).

---

*Last updated: 2026-09-24*
