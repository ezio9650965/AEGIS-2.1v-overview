# Zone 4 — SOAR + Active Response Design

**Status:** Design reference — revised after Webhook connector license block
**Related:**
- [`soar-v2.md`](./soar-v2.md) — implementation spec for the chosen integration
- [`soar.md`](./soar.md) — current (deprecated) pipeline state
- [`dashboards.md`](./dashboards.md) — Kibana dashboards reference

This document defines the target architecture for the AEGIS SOAR pipeline
and its identity-aware active response capability. It supersedes earlier
versions that assumed a Kibana → Shuffle webhook integration, which turned
out to require a paid license.

---

## 1. Design principles

Three decisions drive the entire design.

### 1.1 Identity-first response

Every response either proves the identity again, reduces the identity's
authority, or removes it.

- **IPs are untrusted by nature** — they change, they NAT, they get shared.
- **Identities are the invariant.** `salima` is `salima` regardless of source IP.
- **Every response is reversible.** Quarantine → remove later. Disable →
  re-enable later. Nothing is permanent without a human decision.

**Nuance:** this does not mean "never touch an IP." It means **identity
response is primary; IP-block is a supplementary tool** used only for
volume-based attacks and post-compromise containment, always time-bounded.

### 1.2 License reality

The Kibana instance runs on the free tier. The Webhook connector requires a
**Gold license**. Any design that assumes Kibana → HTTP → Shuffle does not
work.

Solution: Kibana already writes every detection alert to
`.alerts-security.alerts-default`. That index serves as the integration queue.
Shuffle pulls from it on a schedule. No connector required. See
[`soar-v2.md`](./soar-v2.md) for the implementation.

### 1.3 Detection vs. raw events

Wazuh produces raw events. Kibana detection rules produce **signals** — events
that already passed a rule.

The pipeline consumes signals, not raw events:

| Signal source | Volume | Quality | Used for SOAR? |
|---|---|---|---|
| `wazuh-alerts-*` (raw) | Very high | Low — needs filtering | ❌ |
| `.alerts-security.alerts-default` | Low | High — already filtered by rule | ✅ |

---

## 2. Current vs. target

| Capability | Current (`soar.md`) | Target |
|---|---|---|
| Trigger | Logstash polls `wazuh-alerts-*` | Shuffle schedule polls `.alerts-security.alerts-default` |
| Detection layer | None (raw Wazuh level ≥ 10) | Kibana detection rules |
| Enrichment | MISP (unconditional) | MISP (conditional, public IPs only) |
| Decision | None — all alerts notified | Rule → playbook mapping (static) |
| Response | Discord notify only | Level 1 revoke + Level 4 disable |
| Feedback | None | Acknowledge API + `aegis-soar-log` index |
| Failure mode | Logstash down → alerts lost | Shuffle down → alerts wait as `open` |

---

## 3. Target workflow graph

```
┌──────────────────────────────────────────────────────────────────┐
│ Kibana detection rule fires                                      │
│ (source: wazuh-alerts-4.x-*, correlation rules, all 8 custom)    │
└──────────────────────────────┬───────────────────────────────────┘
                               │ writes alert document
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ Elasticsearch index                                              │
│   .alerts-security.alerts-default                                │
│   Field: kibana.alert.workflow_status = "open"                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ Shuffle polls every 60s
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ Shuffle workflow: aegis_alerts_v2                                │
│                                                                  │
│   1. Schedule trigger                                            │
│   2. HTTP GET — pull open alerts                                 │
│   3. Normalize (Python) — flatten hits, extract fields           │
│   4. For each alert:                                             │
│        ├─ Conditional enrichment                                 │
│        │    if source.ip exists and is public:                   │
│        │        → MISP lookup                                    │
│        │    else:                                                │
│        │        → skip enrichment                                │
│        │                                                          │
│        ├─ Rule → playbook mapping                                │
│        │    switch(rule.name):                                   │
│        │      "Privileged Group Add"  → REVOKE                   │
│        │      "Authelia Brute Force"  → NOTIFY                   │
│        │      "Web Attack Pattern"    → NOTIFY                   │
│        │      "Group ACL Denial"      → NOTIFY                   │
│        │      default                 → NOTIFY                   │
│        │                                                          │
│        ├─ Execute response (if any)                              │
│        │    → Wazuh Active Response on target agent              │
│        │                                                          │
│        ├─ Discord notify (enriched + action status)              │
│        │                                                          │
│        ├─ Kibana acknowledge API                                 │
│        │    PUT workflow_status = "acknowledged"                 │
│        │                                                          │
│        └─ Write to aegis-soar-log (audit trail)                  │
└──────────────────────────────────────────────────────────────────┘
```

**Logstash is not in this design.** It gets stopped. The container stays
deployed (for the "what we tried" narrative in the report) but is no longer
part of the live pipeline.

---

## 4. Node specification

Detailed node configuration is in [`soar-v2.md`](./soar-v2.md) §5. This
section covers the design intent.

### 4.1 Node 1 — Schedule trigger

Poll every 60 seconds. Shuffle's built-in trigger, no external dependency.

### 4.2 Node 2 — HTTP GET from `.alerts-security.alerts-default`

Query filters:
- `kibana.alert.workflow_status: "open"`
- `size: 20`
- sort ascending by `@timestamp`

**Why bounded size:** prevents a burst of alerts from stalling the workflow.
If the workflow ever lags behind reality, size can be raised.

### 4.3 Node 3 — Normalize (Python)

Two jobs:

1. **Flatten** the Elasticsearch `hits.hits[]` array into a simple list
2. **Extract** the fields downstream nodes need, with fallbacks across Wazuh
   field paths

The extraction paths are non-uniform because Wazuh doesn't ship ECS-normalized
fields yet. The Python node has a `pick()` helper that tries multiple paths:

```python
def pick(doc, *paths):
    for p in paths:
        v = doc
        for k in p.split("."):
            v = (v or {}).get(k) if isinstance(v, dict) else None
        if v:
            return v
    return ""
```

Fields extracted:
- `alert_id` — from `kibana.alert.uuid`
- `rule_name` — from `kibana.alert.rule.name`
- `severity`, `risk_score`
- `host`, `user`, `target_group`, `source_ip`, `event_code`

Full code in [`soar-v2.md`](./soar-v2.md) §5.3.

### 4.4 Conditional enrichment

**No enrichment by default.** Only enrich when the alert has an observable
that MISP understands.

| Observable | Enrich? | Why |
|---|---|---|
| Public IP | ✅ MISP IP lookup | External indicator likely to be in feeds |
| Private IP (RFC1918) | ❌ | No external signal — MISP has nothing |
| File hash | ✅ MISP hash lookup | Malware feed lookup |
| Domain | ✅ MISP domain lookup | C2 / phishing lookup |
| Username only | ❌ | No IOC type |
| Hostname only | ❌ | No IOC type |

**Why:** the current pipeline enriches every alert regardless of observable.
This is waste — MISP returns empty for internal IPs and usernames.

**Implementation:** a Python node returns `{"enrich": true/false}`, and a
Condition/Router node branches on it.

### 4.5 Rule → playbook mapping (static, not scored)

**The previous design used a confidence-scoring model with arbitrary weights.**
That was wrong. It was uncalibrated, had inputs that don't exist (Suricata
scan list, calendar feed), double-counted (rule level AND event code), and
would let an attacker trigger revocations against other users.

**Replace with a static mapping.** Each rule name maps to one response:

| Kibana rule name | Response | Rationale |
|---|---|---|
| `AEGIS - Privileged Group Add` | **REVOKE** | Privilege escalation in progress |
| `AEGIS - Authelia Brute Force` | NOTIFY | Rate-limited already; notify for awareness |
| `AEGIS - Authelia TOTP Bypass Attempt` | NOTIFY | Could be user error or attack |
| `AEGIS - Web Attack Pattern (SQLi/XSS/Traversal)` | NOTIFY | WAF already blocked; notify |
| `AEGIS - Suricata Priority Alert` | NOTIFY | Network-layer; different response not ready |
| `AEGIS - Traefik Directory Fuzzing` | NOTIFY | Usually scanner noise |
| `AEGIS - Traefik 5xx Storm` | NOTIFY | Availability, not security |
| `AEGIS - Group ACL Denial` | NOTIFY | Expected behavior — user confusion |
| *(default)* | NOTIFY | Any unrecognized rule |

**Extensibility:** adding a new detection with a different response is one
line in the mapping. No new workflow, no new node.

**Future:** when the design is mature, introduce a **behavioral** (not
weighted) refinement — for instance, if the same rule fires 3 times in
5 minutes from the same user, escalate from NOTIFY to REVOKE. Until that
signal is validated, keep it static.

### 4.6 Response execution — Wazuh Active Response

Zone 4 → Wazuh manager API → AR command → agent executes on target host.

```
POST https://10.16.64.156:55000/active-response
Body: {"command": "aegis-revoke-session", "arguments": ["<target>"], "agents_list": ["004"]}
Auth: Bearer token (from /security/user/authenticate)
```

**Trust boundary:** this keeps Zone 4 → Zone 3 traffic inside the Wazuh
control plane, which is already authenticated and audited. No new firewall
rules.

Detailed enablement steps in §7 Phase 2.

### 4.7 Discord notification

Standard embed per alert:

```json
{
  "embeds": [{
    "title": "🚨 {{rule_name}}",
    "color": 15158332,
    "fields": [
      {"name": "Severity", "value": "{{severity}}"},
      {"name": "Host", "value": "{{host}}"},
      {"name": "User", "value": "{{user}}"},
      {"name": "Source IP", "value": "{{source_ip}}"},
      {"name": "MISP matches", "value": "{{misp_count}}"},
      {"name": "Action taken", "value": "{{action_status}}"}
    ]
  }]
}
```

**No interactive buttons.** They require a Discord bot application with an
interaction endpoint — out of scope for the PFE. Plain notifications only.

### 4.8 Acknowledge in Kibana

After Discord succeeds:

```
POST http://10.16.64.156:5601/api/detection_engine/signals/status
Header: kbn-xsrf: true
Body: {"signal_ids": ["<alert_uuid>"], "status": "acknowledged"}
```

The alert flips from `open` to `acknowledged` in Kibana's UI. The next poll
doesn't pick it up.

**Fallback** if the API path is wrong for the deployed version — direct ES
update:

```
POST https://10.16.64.155:9200/.alerts-security.alerts-default/_update/<doc_id>
Body: {"doc": {"kibana.alert.workflow_status": "acknowledged"}}
```

### 4.9 Audit trail — `aegis-soar-log`

Every processed alert writes one document:

```json
{
  "@timestamp": "...",
  "alert_id": "...",
  "rule_name": "AEGIS - Privileged Group Add",
  "severity": "high",
  "host": "CORP-DC01",
  "user": "salima",
  "source_ip": "",
  "action": "revoke_session",
  "action_status": "success",
  "discord_status": 204,
  "verified": true
}
```

This index is the durable record of everything the SOAR did. A future Kibana
dashboard visualizes it (see [`dashboards.md`](./dashboards.md) §10.4).

---

## 5. Response ladder — simplified

The previous four-level ladder is pruned to two levels.

| Level | Action | When | Implementation |
|---|---|---|---|
| **1 — Revoke** | Destroy Authelia/Keycloak sessions | Privilege escalation detected | Wazuh AR on gateway agent |
| **4 — Disable** | Disable AD account | Confirmed compromise (multiple signals) | Wazuh AR on DC01 agent |

**Level 2 (Step-up / WebAuthn)** — dropped. Authelia has no API for
per-session elevation. Would require deep config changes and re-enrollment
of all users. Not viable within the project timeline.

**Level 3 (Quarantine)** — dropped. Adds a new AD group and a scheduled
cleanup task. High complexity, low additional value over Revoke/Disable for
the PFE.

**Revoke + Disable cover the PFE demonstration.** Levels 2 and 3 remain
documented as future work.

### 5.1 Revoke — the PFE headline

Flow:

1. Attacker adds `salima` to `GRP_IT_Admin`
2. Kibana rule `AEGIS - Privileged Group Add` fires
3. Alert lands in `.alerts-security.alerts-default`
4. Shuffle picks it up within 60s
5. Normalize → user = `salima`, group = `GRP_IT_Admin`
6. Rule → playbook mapping: REVOKE
7. Wazuh AR call to gateway agent: `aegis-revoke-session salima`
8. Agent script:
   - Iterates Authelia Redis session keys
   - Deletes those belonging to `salima`
9. Discord alert: "Session revoked for salima"
10. Kibana alert → acknowledged
11. `aegis-soar-log` records the action

**Verification:** the session cookie no longer works. Reloading
`https://traefik.zerotrust.lan` returns the login page.

### 5.2 Known caveat — Authelia session encryption

Authelia may encrypt session values in Redis. If `redis-cli GET <key>` returns
ciphertext, the session-revoke script cannot parse it to find the username.

**Two workarounds:**

1. **Index sessions by username.** When Authelia creates a session, the key
   name sometimes includes a hash of the username. Test empirically.
2. **Maintain a user→session map.** A small process watches Authelia logs and
   writes `username → session_id` to a separate Redis hash. The AR script
   reads this map instead of parsing session values.

**Test before Phase 2.** If Redis values are encrypted, plan for workaround 2.

---

## 6. What this enables

### 6.1 The end-to-end demonstration

Once implemented:

| Step | Time |
|---|---|
| Add salima to GRP_IT_Admin in AD | T+0 |
| Wazuh sees event 4728, ships to ES | T+5s |
| Kibana rule fires | T+60s (rule schedule) |
| Shuffle picks up alert | T+120s (poll cycle) |
| Authelia sessions for salima revoked | T+125s |
| Discord alert delivered | T+130s |
| Verification: session no longer valid | T+130s |

**Total: ~2 minutes from attack to response.** Acceptable for the PFE.

### 6.2 Comparison to current state

**Today:** detection works (Kibana rules fire). Response does not exist.
**Target:** detection → decision → response → verification → audit.

---

## 7. Phased rollout

**Revised total: 8 hours** across 2 sessions. Skipped Level 2 and Level 3,
removed scoring model, simplified the graph.

### Phase 1 — Alerts-index pull working end-to-end (2h)

1. Build `aegis_alerts_v2` workflow in Shuffle — see [`soar-v2.md`](./soar-v2.md) §5
2. Wire Schedule → HTTP GET → Normalize → Discord → Acknowledge → Log
3. **No response execution yet.** Just notifications.
4. Sample one alert per rule first (§4.4 in `soar-v2.md`)
5. Test: fire `AEGIS - Privileged Group Add`, confirm Discord within 2 min
6. Confirm `aegis-soar-log` has the record

**Done when:** an alert from Kibana reaches Discord with populated fields
and is acknowledged.

### Phase 2 — Wazuh Active Response infrastructure (2h)

1. Enable `<active-response>` on minisoc2 (`ossec.conf`)
2. Write `/var/ossec/active-response/bin/aegis-revoke-session` on gateway agent
3. Make it executable, restart gateway agent
4. Verify Redis session format (encrypted or not)
5. Test AR call manually:

```bash
TOKEN=$(curl -sk -X POST https://10.16.64.156:55000/security/user/authenticate \
  -u wazuh:wazuh | jq -r .data.token)

curl -sk -X PUT https://10.16.64.156:55000/active-response \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"command":"aegis-revoke-session","arguments":["salima"],"agents_list":["004"]}'
```

6. Confirm the script ran — check `/var/ossec/logs/active-responses.log` on
   the gateway

**Done when:** a manual AR call successfully revokes a test session.

### Phase 3 — Wire Revoke into Shuffle (2h)

1. Add Conditional Response node to `aegis_alerts_v2`
2. Add rule → playbook mapping
3. Add HTTP node calling Wazuh AR API
4. Test the full loop with a DC01 group change
5. Verify session revoke worked — attempt to use salima's cookie

**Done when:** the DC01 group change triggers an automatic session revoke,
Discord shows the action, and Kibana marks the alert acknowledged.

### Phase 4 — Level 4 disable (1h)

1. Write `aegis-disable-account` on DC01 agent
2. Extend the rule mapping
3. Test on a throwaway AD user

**Done when:** "Confirmed compromise" scenario disables the account.

### Phase 5 — Feedback dashboard (1h)

1. Create `aegis-soar-log` data view in Kibana
2. Build Response Actions Log dashboard
3. Alert on "response ineffective" — response in `aegis-soar-log` followed by
   successful auth by the same user within 5 min

**Done when:** the SOAR's own actions are visible and monitored.

---

## 8. Priority order

Skip Levels 2 and 3. Revoke + Disable cover the PFE.

**Recommended order:**
1. Phase 1 — Alerts-index pull (2h) ← **Start here**
2. Phase 2 — Wazuh AR infrastructure (2h)
3. Phase 3 — Wire revoke into Shuffle (2h)
4. Demonstrate end-to-end
5. Only then Phase 4 and Phase 5

---

## 9. Open questions

1. **Does the Wazuh API on 55000 accept AR calls from minisoc3?** Port 55000
   was refused from the gateway earlier. Verify from minisoc3 first.
2. **Is Authelia's Redis session data encrypted?** The revoke script depends
   on parsing `username` from session values. Test empirically:
   `docker exec redis redis-cli KEYS 'authelia:session:*'` then GET one.
3. **Does the Shuffle version in deployment support `For Each`?** If not, use
   a Python node with an internal loop. Check in the UI.
4. **Does the Kibana acknowledge API path match the deployed version?**
   Fallback is direct ES `_update`.

---

## 10. Change log

| Date | Change |
|---|---|
| 2026-09-29 | Initial design — assumed Kibana webhook → Shuffle (blocked by license) |
| 2026-09-30 | **Rewrite.** Webhook connector requires Gold license. Pivot to alerts-index pull. Removed confidence scoring model. Simplified ladder to Revoke + Disable. Removed Discord buttons. Removed Level 2 and Level 3. Consolidated with `soar-v2.md` (implementation spec). |

---

*End of SOAR design reference.*
