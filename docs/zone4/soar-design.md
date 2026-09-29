# Zone 4 — SOAR + Active Response Design

**Status:** Design reference — implementation pending
**Related:** [`soar.md`](./soar.md) (current pipeline state) · [`dashboards.md`](./dashboards.md)

This document defines the target architecture for the AEGIS SOAR pipeline
and its identity-aware active response capability. It complements the current
implementation reference in `soar.md`, which captures what is running today.

---

## 1. Design principle

The single most important design decision:

> **No IP blocks.**

Every response either proves the identity again, reduces the identity's
authority, or removes it.

Rationale:

- **IPs are untrusted by nature** — they change, they NAT, they get shared.
  Blocking one doesn't stop the actor.
- **Identities are the invariant.** `salima` is `salima` regardless of source
  IP. Responding to her identity is durable.
- **Every response is reversible.** Add to quarantine → remove later. Disable
  account → re-enable later. Nothing is permanent without a human decision.

This follows directly from the Zero Trust model of AEGIS — identity is the
perimeter, not network position.

---

## 2. Current state vs. target state

| Capability | Current (`soar.md`) | Target (this design) |
|---|---|---|
| Trigger | Logstash `rule.level ≥ 12` | Multi-source scoring (severity + IOC + baseline) |
| Enrichment | MISP restSearch | MISP + AD group lookup + session context |
| Decision | None — all alerts notified | Confidence-scored, auto-respond at ≥ 60 |
| Response | Discord notify only | 4-level ladder: revoke / step-up / narrow / disable |
| Feedback | None | Every action written to `aegis-responses-*` |
| Verification | None | Post-action re-query to confirm |

The gap is a **decision layer** between enrichment and notification, plus a
**response execution layer** that talks back to Zone 3.

---

## 3. Target workflow graph — `aegis_soar_v1`

```
                          ┌───────────────────┐
                          │  Webhook Trigger  │
                          │  (from Logstash)  │
                          └─────────┬─────────┘
                                    │ raw Wazuh alert
                                    ▼
                          ┌───────────────────┐
                          │  Extract Fields   │
                          │  (Shuffle Tools)  │
                          └─────────┬─────────┘
                                    │ normalized object
                                    ▼
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
     ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
     │  MISP Search   │   │  AD Group      │   │  Session       │
     │  (IP, hash)    │   │  Lookup        │   │  Context       │
     └────────┬───────┘   └────────┬───────┘   └────────┬───────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │ enriched
                                   ▼
                          ┌───────────────────┐
                          │  Score Confidence │
                          │  (Script node)    │
                          └─────────┬─────────┘
                                    │ score 0–100
                                    ▼
                          ┌───────────────────┐
                          │  Decision Branch  │
                          └─────────┬─────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
         score ≥ 60            score 30–59           score < 30
              │                     │                     │
              ▼                     ▼                     ▼
     ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
     │ Auto-Respond   │   │ Analyst Queue  │   │ Log + Close    │
     │ (Level 1–2)    │   │ (Discord DM)   │   │ (aegis-alerts) │
     └────────┬───────┘   └────────┬───────┘   └────────────────┘
              │                    │
              ▼                    ▼
     ┌────────────────┐   ┌────────────────┐
     │ Response       │   │ Discord        │
     │ Execution      │   │ Notify Only    │
     └────────┬───────┘   └────────────────┘
              │
              ▼
     ┌────────────────┐
     │ Discord Alert  │
     │ + Action Log   │
     └────────┬───────┘
              │
              ▼
     ┌────────────────┐
     │ Verify + Write │
     │ to aegis-      │
     │ responses-*    │
     └────────────────┘
```

**Four nodes are new** compared to the current graph. Everything else is
re-ordered or re-configured.

---

## 4. Node specification

### 4.1 Node 1 — Extract Fields

**Purpose:** normalize the raw Wazuh alert into a flat object used by all
downstream nodes.

**Configuration** (fixes outstanding issue S-1 from `soar.md`):

```json
{
  "alert_id":     "$id",
  "rule_id":      "$rule.id",
  "rule_level":   "$rule.level",
  "rule_desc":    "$rule.description",
  "agent_name":   "$agent.name",
  "agent_id":     "$agent.id",
  "src_ip":       "$data.srcip",
  "src_user":     "$data.srcuser",
  "target_user":  "$data.win.eventdata.targetUserName",
  "event_code":   "$data.win.system.eventID",
  "timestamp":    "$@timestamp"
}
```

**Why the current config fails:** the existing node uses `$exec.X`. Shuffle
7.x+ may wrap payloads in an array or drop the `exec` prefix depending on
trigger type. Try `$X` first, then `$exec.0.X` if that returns empty.

### 4.2 Node 2 — MISP Search

Already working (verified in `soar.md` §7.1). Keep as-is.

Extension for hash-based alerts:

```json
{
  "value": "$extract_fields.src_ip",
  "type": "ip-src",
  "returnFormat": "json"
}
```

For Sysmon alerts containing `file-hash-sha256`, add a parallel MISP lookup
on that hash type.

### 4.3 Node 3 — AD Group Lookup *(new)*

**Purpose:** for identity-relevant alerts, determine whether the user is
privileged. This is the most important scoring input.

**Two paths — pick the simplest that works:**

**Path A — parse the alert directly (no lookup needed).**

For AD group-change alerts (4728/4732/4756), the fields are already present:

- `data.win.eventdata.memberName` = `CN=salima,OU=Finance_Sales,...`
- `data.win.eventdata.targetUserName` = `GRP_IT_Admin`

So `is_privileged` = `targetUserName in (GRP_IT_Admin, GRP_Web_Ops)`.

**Path B — query Wazuh syscollector** for users not covered by path A:

```
GET http://10.16.64.156:55000/syscollector/{agent_id}/users?wait_for_complete=true
```

**Output:**
```json
{
  "is_privileged": true,
  "target_group": "GRP_IT_Admin",
  "changed_user": "salima"
}
```

### 4.4 Node 4 — Session Context *(new)*

**Purpose:** is the user currently authenticated? From where? For how long?

**Method:** Elasticsearch query for recent Authelia logins by the same user.

```
POST https://10.16.64.155:9200/authelia-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"term": {"username.keyword": "<user>"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "sort": [{"@timestamp": "desc"}],
  "size": 1
}
```

**Output:**
```json
{
  "has_active_session": true,
  "last_login": "2026-09-29T14:32:11Z",
  "last_ip": "192.168.50.11",
  "session_age_minutes": 47
}
```

### 4.5 Node 5 — Score Confidence *(new — the decision brain)*

**Purpose:** turn three signals into a numeric decision.

**Score model:**

| Signal | Weight | Condition |
|---|---|---|
| MISP IOC match | +40 | `misp.x_result_count > 0` |
| AD user is privileged | +25 | `ad_group.is_privileged` |
| Rule level ≥ 12 | +20 | `rule_level >= 12` |
| Rule level 10–11 | +10 | `10 <= rule_level < 12` |
| Outside baseline (new IP) | +15 | `session.last_ip != src_ip` |
| Recent privileged change (<5m) | +20 | `event_code in (4728, 4732, 4756)` |
| Source IP in scan list | +10 | Suricata feed flagged this IP |
| Alert inside change window | −30 | calendar feed flag |
| User is a service account | −40 | username matches `^svc-` |

**Decision thresholds:**

| Score | Action | Rationale |
|---|---|---|
| ≥ 60 | Auto-respond (Level 1–2) | High confidence — act now, notify after |
| 30–59 | Analyst queue | Medium confidence — human decides |
| < 30 | Log + close | Low confidence — likely noise |

**Implementation:** a Shuffle "Execute Python" node with the scoring logic.
Reads the enriched object, returns `{"score": 85, "reason": "..."}`.

### 4.6 Node 6 — Decision Branch

**Preferred:** Shuffle "Router" node — routes on `score`.

**Fallback if the Router node fails to load** (known issue from earlier
development): three separate sub-workflows, each triggered by the same
webhook, each with a filter at the top:

- Workflow A: only runs if `score >= 60`
- Workflow B: only runs if `30 <= score < 60`
- Workflow C: only runs if `score < 30`

Less elegant, functionally equivalent.

### 4.7 Node 7a — Auto-Respond (score ≥ 60)

**The response level is determined by the alert type, not the score.**
Score decides *whether* to act; the alert decides *which* action.

| Alert | Response level | Action |
|---|---|---|
| AD group change → privileged group | **Level 1** | Revoke Keycloak sessions for changed user |
| SSH brute force + MISP match | **Level 1** | Revoke Authelia sessions for target user |
| User disabled in AD + continued auth | **Level 2** | Force re-auth on next request |
| Behavioral anomaly (baseline breach) | **Level 3** | Add to `GRP_QUARANTINE` for 15 min |
| Confirmed compromise (2+ signals) | **Level 4** | Disable AD account |

#### Implementation via Wazuh Active Response

Zone 4 → Wazuh manager API → sends AR command → Wazuh agent on target host
executes. This is the recommended mechanism (see §5 for trust boundary
analysis).

**Level 1 — Revoke Authelia session**

Agent: `ztagateway` (ID 004)

```bash
# Script: /var/ossec/active-response/bin/aegis-revoke-session
#!/bin/bash
# Reads alert JSON from stdin, extracts target user, revokes Redis sessions

read -r ALERT
TARGET=$(echo "$ALERT" | jq -r '.parameters.alert.data.win.eventdata.memberName // .parameters.alert.data.srcuser' | sed 's/CN=//;s/,.*//')

for key in $(docker exec redis redis-cli --scan --pattern "authelia:session:*"); do
  USER=$(docker exec redis redis-cli GET "$key" | jq -r .username)
  if [ "$USER" = "$TARGET" ]; then
    docker exec redis redis-cli DEL "$key"
    echo "Revoked session for $USER ($key)" >> /var/ossec/logs/active-responses.log
  fi
done
```

**Level 1 — Revoke Keycloak session**

```
DELETE https://keycloak.zerotrust.lan/admin/realms/aegis/users/{user_id}/sessions
```

Requires admin token. Reuse the Wazuh Auth node (currently orphaned).

**Level 4 — Disable AD account**

Agent: `CORP-DC01` (ID 006)

```powershell
# Script: C:\Program Files (x86)\ossec-agent\active-response\bin\aegis-disable-account.cmd
Disable-ADAccount -Identity %TARGET_USER%
```

### 4.8 Node 7b — Analyst Queue (score 30–59)

Discord DM to the on-call analyst with **interactive buttons**:

- **Acknowledge** → marks incident as triaged
- **Escalate to Level 1** → runs the revoke action
- **Close as FP** → adds an exclusion rule

**Prerequisite:** Discord interaction webhook. Separate from the alert
webhook. Shuffle needs a second webhook receiver to handle button clicks.

**Current status:** not implemented. Requires a Discord application with
interaction endpoint configured.

### 4.9 Node 7c — Log + Close (score < 30)

Write to `aegis-alerts-low-*` index. No notification. Analyst reviews weekly.

### 4.10 Node 8 — Verify + Write Response Log *(new)*

**Purpose:** confirm the action worked, then record it.

**Verification by level:**

| Level | Verify |
|---|---|
| 1 | Query Authelia Redis — session key gone? |
| 2 | Query Authelia session — is elevated factor required? |
| 3 | Query AD — is user in `GRP_QUARANTINE`? |
| 4 | Query AD — is account disabled? |

**Failure handling:** if verification fails, escalate to human immediately
via Discord mention.

**Write to `aegis-responses-*`:**

```json
{
  "timestamp": "2026-09-29T15:12:33Z",
  "trigger": {
    "rule_id": "4728",
    "rule_level": 12,
    "score": 85
  },
  "target": {
    "user": "salima",
    "session_id": "abc123"
  },
  "action": {
    "level": 1,
    "type": "revoke_session",
    "system": "authelia"
  },
  "verification": {
    "checked_at": "2026-09-29T15:12:35Z",
    "success": true
  },
  "auto_closed": false,
  "requires_human": false
}
```

This index becomes the **audit trail**. Every action has a durable record.
The Response Actions Log dashboard queries this index.

---

## 5. Trust boundary — Zone 4 → Zone 3

Zone 4 lives on `10.16.64.0/25`. Zone 3 lives on `192.168.50.0/24`. The
response layer needs a path from Zone 4 back to Zone 3.

### Option A — Wazuh Active Response *(recommended)*

Zone 4 → Wazuh manager API → AR command → agent executes on target host.

**Pros:**
- Uses existing Wazuh infrastructure
- Traffic is already authenticated
- AR scripts run with agent's privileges
- Cleanest trust model — no new firewall rules
- AR scripts are versioned with the agent config

**Cons:**
- Requires writing AR scripts in `/var/ossec/active-response/bin/` on
  target agents
- Requires `active-response` enabled on minisoc2

**Enablement on minisoc2** (`/var/ossec/etc/ossec.conf`):

```xml
<command>
  <name>aegis-revoke-session</name>
  <executable>aegis-revoke-session</executable>
  <timeout_allowed>no</timeout_allowed>
</command>

<active-response>
  <command>aegis-revoke-session</command>
  <location>defined-agent</location>
  <agent_id>004</agent_id>
</active-response>
```

### Option B — Direct API from Shuffle to Authelia/Keycloak

Zone 4 → HTTP to Authelia / Keycloak admin APIs.

**Verdict:** not viable for Authelia. Authelia has no admin API for session
revocation. Keycloak alone would work but Authelia is the blocker.

### Option C — SSH from Zone 4 to gateway

**Verdict:** acceptable for lab, avoid for production. Expands attack
surface; credentials management is ugly.

**Choose Option A.**

---

## 6. What this enables

### Demonstration flow (single end-to-end)

Once the design is implemented:

1. On DC01, add `salima` to `GRP_IT_Admin` (simulating privilege escalation)
2. Wazuh fires rule 4728 at level 12 → Logstash → Shuffle within ~60s
3. Scoring: privileged group + AD change → score ≥ 65
4. Auto-respond: revoke all Authelia sessions for `salima`
5. Discord alert appears: "Action taken — session revoked"
6. `aegis-responses-*` index has the record
7. Verify: attempt to use `salima`'s session → login page
8. Cleanup: remove her from the group

### Comparison to current state

**Today:** steps 1–2 work; 3 is absent; 4–7 do not happen.
**Target:** all 8 steps work, demonstrated live.

That demonstration is the PFE headline: **detection → decision → action →
verification → audit.**

---

## 7. Phased rollout

Approximate effort: **9 hours total**, spread over 2–3 sessions.

### Phase 1 — Fix the pipeline (1h)

**Prerequisite for everything else.**

1. Fix S-1: `Shuffle Tools 1` field extraction (`$X` instead of `$exec.X`)
2. Fix S-2: Logstash threshold `≥ 10` (from `≥ 12`)
3. Trigger a real level-10 alert — confirm end-to-end to Discord
4. Commit the working Shuffle workflow JSON export

**Done when:** a real Wazuh alert reaches Discord with non-empty fields.

### Phase 2 — Wazuh Active Response enablement (2h)

1. Enable `<active-response>` on minisoc2 (`ossec.conf`)
2. Write `/var/ossec/active-response/bin/aegis-revoke-session` on gateway agent
3. Make it executable, restart the gateway agent
4. Test AR trigger manually:

```bash
curl -X PUT https://10.16.64.156:55000/active-response \
  -u wazuh:wazuh \
  -H "Content-Type: application/json" \
  -d '{"command":"aegis-revoke-session","agents_list":["004"]}'
```

5. Confirm the script ran — check `/var/ossec/logs/active-responses.log` on
   the gateway

**Done when:** a manual AR call successfully revokes a test session.

### Phase 3 — Integrate into Shuffle (3h)

1. Add `Score Confidence` node to `aegis_soar_v1`
2. Add decision branch (Router, or three sub-workflows)
3. Add `Auto-Respond` node → Wazuh AR call
4. Add `Verify + Write Response Log` node
5. Test the full loop with a DC01 group change

**Done when:** the DC01 group change triggers an automatic session revoke
and a Discord alert with "action taken."

### Phase 4 — Quarantine + Disable (2h)

1. Same AR pattern, different scripts on DC01 agent
2. Add AD group add / account disable commands
3. Test on a throwaway AD user

**Done when:** Level 3 and Level 4 responses work end-to-end.

### Phase 5 — Feedback dashboard (1h)

1. Create `aegis-responses-*` data view in Kibana
2. Build the Response Actions Log dashboard
3. Add detection rule: "response ineffective" — a response in
   `aegis-responses-*` followed by successful auth by the same user within
   5 min

**Done when:** the SOAR's own actions are visible and monitored.

---

## 8. Priority order

Start with **Phase 1 + Phase 2**. Get one action (session revoke) working
end-to-end.

**Skip Levels 2 and 3 initially.** Revoke + Disable cover 90% of use cases.
Step-up (WebAuthn re-enrollment) is a deep change to Authelia config.
Quarantine is nice-to-have.

**Recommended order:**
1. Fix the pipeline (Phase 1) — 1h
2. Get Wazuh AR running the session revoke (Phase 2) — 2h
3. Wire it into Shuffle (Phase 3, Level 1 only) — 3h
4. Demonstrate end-to-end
5. Only then add Level 4 (disable) and Level 3 (quarantine)

---

## 9. Verification checklist before closing Phase 1

- [ ] Shuffle Tools 1 returns non-empty fields on test
- [ ] Logstash threshold changed to `≥ 10`
- [ ] SSH brute-force test triggers the pipeline
- [ ] Discord receives the alert with populated Rule, Agent, Source IP
- [ ] `aegis_soar_v1` workflow exported to JSON, committed to repo
- [ ] MISP Search node returns at least one match on `192.168.19.183`
- [ ] Duplicate `.conf.bak` files removed from Logstash pipeline dir

---

## 10. Open questions

1. **Does the Wazuh API accept AR calls from minisoc2 itself?** Port 55000
   was refused from the gateway. Verify from minisoc2 first.
2. **Is Authelia's Redis reachable via `docker exec` from the gateway host?**
   The AR script uses `docker exec redis ...`. Confirm the gateway host has
   the `docker` binary and the `redis` container is visible.
3. **Does Discord support interactive buttons for the DM channel?** Requires
   a Discord application, not just a webhook. May need to skip Level 7b
   buttons for the PFE and use plain notifications instead.

---

## 11. Change log

| Date | Change |
|---|---|
| 2026-09-29 | Design document created — target SOAR graph, scoring model, phased rollout |

---

*End of SOAR design reference.*
