# Zone 4 — SOAR + Active Response Design

**Status:** Phase 1 in progress — Schedule → ES query → Normalize verified on live alerts (2026-09-30). Discord, acknowledge and audit-log nodes being wired.
**Related:**
- [`SOAR.md`](./SOAR.md) — legacy Logstash pipeline (deprecated, kept for the "what we tried" narrative)
- [`dashboards.md`](./dashboards.md) — Kibana dashboards and detection rules reference
- `soar/normalize_shuffle.py` — Normalize node source (Shuffle Execute Python). `soar/normalize_standalone.py` — fallback variant that queries ES itself

This document defines the target architecture for the AEGIS SOAR pipeline and its identity-aware active response. It supersedes earlier versions that assumed a Kibana → Shuffle webhook (blocked by license) and a confidence-scoring decision layer (removed).

---

## 1. Design principles

### 1.1 Identity-first response

Every response either proves the identity again, reduces the identity's authority, or removes it.

- **IPs are untrusted by nature** — they change, they NAT, they get shared.
- **Identities are the invariant.** `salima` is `salima` regardless of source IP.
- **Every response is reversible.** Revoke → user logs in again. Disable → re-enable. Nothing is permanent without a human decision.

**Nuance:** this does not mean "never touch an IP." Identity response is primary; IP-block is a supplementary tool for volume-based attacks and post-compromise containment, always time-bounded.

### 1.2 License reality

The Kibana instance runs on the free tier. The Webhook connector requires a **Gold license**, so Kibana → HTTP → Shuffle is not available.

Solution: Kibana already writes every detection alert to `.alerts-security.alerts-default`. That index is the integration queue. Shuffle pulls from it on a schedule. No connector required.

### 1.3 Signals, not raw events

| Signal source | Volume | Quality | Used for SOAR? |
|---|---|---|---|
| `wazuh-alerts-*` (raw) | Very high | Low — needs filtering | No |
| `.alerts-security.alerts-default` | Low | High — already passed a rule | Yes |

Evidence: the raw Wazuh event behind `AEGIS - Privileged Group Add` (event 4728) has `rule.level: 5`. The legacy Logstash filter (`rule.level >= 10/12`) could never have forwarded it. Detection quality comes from Kibana rules, not Wazuh severity.

---

## 2. Current vs. target

| Capability | Legacy (`SOAR.md`) | Target |
|---|---|---|
| Trigger | Logstash polls `wazuh-alerts-*` | Shuffle schedule polls `.alerts-security.alerts-default` |
| Detection layer | None (raw Wazuh level threshold) | Kibana detection rules |
| Enrichment | MISP, unconditional | MISP, only when the alert has a usable IP |
| Decision | None — everything notified | Static rule → playbook map with guard rails |
| Response | Discord notify only | Level 1 revoke + Level 4 disable |
| Feedback | None | Acknowledge in Kibana + `aegis-soar-log` index |
| Dedupe | None (2-minute window re-sent alerts) | Alert acknowledged after processing |
| Failure mode | Logstash down → alerts lost | Shuffle down → alerts wait as `open` |

---

## 3. Target workflow graph

```
Kibana detection rule fires (every 1–5 min)
        │ writes alert document
        ▼
.alerts-security.alerts-default   (workflow_status = "open")
        │
        │ Shuffle Schedule, every 60 s
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Shuffle workflow: aegis_alerts_v2                           │
│                                                             │
│  Schedule ─► Http 1 (ES _search, open alerts, size 20)      │
│                 └─► Normalize (Python) ─► list of alerts    │
│                        │  per alert (.#):                   │
│                        ├─ enrich == true ─► MISP Search     │
│                        ├─ action == REVOKE ─► Wazuh AR      │
│                        ├─ notify == true ─► Discord         │
│                        ├─ ack ─► ES _update_by_query (ids)  │
│                        └─ log ─► aegis-soar-log/_doc        │
└─────────────────────────────────────────────────────────────┘
```

**Logstash is not in this design.** It is stopped (`docker stop logstash`, `docker update --restart=no logstash`) and the container is kept for the report.

---

## 4. Alert data shape (verified on live alerts)

Alert documents in `.alerts-security.alerts-default` mix two styles. This broke the first design's `pick()` helper.

- **Flat dotted keys** at the top of `_source`: `kibana.alert.*`, `event.kind`, and the threshold group-by fields (`ClientHost.keyword`, `remote_ip.keyword`, `RouterName.keyword`).
- **Nested objects** copied from the source event: `agent`, `data`, `rule`, `source`, `host`, `destination`.

The lookup must try the flat key first, then walk the nested path (`g()` in `normalize_shuffle.py`).

The alias `.alerts-security.alerts-default` resolves to two backing indices (`.internal.alerts-security.alerts-default-000001` and `-000002`). Use the alias for search and `_update_by_query`. A direct `_update/<id>` on the alias fails for documents living in the non-write index.

### Field map per detection type

| Detection | Type | User | Group | IP source |
|---|---|---|---|---|
| Privileged Group Add | query | `data.win.eventdata.memberName` (`CN=salima,OU=…` → parse CN) | `data.win.eventdata.targetUserName` | none |
| Suricata Priority Alert | query | none | none | `source.ip` |
| Web Attack Pattern | query | none | none | `ClientHost` |
| Authelia Brute Force / TOTP Bypass / ACL probe | threshold | none | none | `kibana.alert.threshold_result.terms[0].value` (field `remote_ip.keyword`) |
| Traefik Directory Fuzzing | threshold | none | none | `terms[0].value` (field `ClientHost.keyword`) |
| Traefik 5xx Storm | threshold | none | none | `terms[0].value` is a **router name**, not an IP → rejected by IP validation |

### Normalize output contract

One object per alert: `alert_id`, `index`, `rule`, `severity`, `risk`, `host`, `user`, `group`, `src_ip`, `event_code`, `ts`, `age_min`, `action` (`REVOKE` | `NOTIFY`), `enrich` (bool), `notify` (bool), plus display-safe copies `d_host`, `d_user`, `d_group`, `d_ip` (`"-"` when empty — Discord rejects empty embed values).

---

## 5. Node specification

### 5.1 Schedule trigger
Every 60 seconds. Keep it **stopped** while nodes are being rewired; a half-wired workflow with no acknowledge step re-sends the same alerts every minute.

### 5.2 Http 1 — pull open alerts
```
POST https://10.16.64.155:9200/.alerts-security.alerts-default/_search
Body:    {"size":20,"sort":[{"@timestamp":"asc"}],"query":{"term":{"kibana.alert.workflow_status":"open"}}}
Headers: Content-Type=application/json
Auth:    basic (elastic)      Verify: False
```
- Shuffle's HTTP app takes headers as `key=value`. `Content-Type: application/json` (colon) is silently dropped and ES answers **406**.
- `size: 20` bounds a burst so the workflow cannot stall; oldest alerts first.

### 5.3 Normalize (Execute Python)
Source: `soar/normalize_shuffle.py`. Reads the HTTP node result, returns a JSON list on stdout (`$normalize.message`).

Built-in guard rails:
- **REVOKE only if** the rule is `AEGIS - Privileged Group Add` **and** `group ∈ {GRP_IT_Admin, GRP_Web_Ops}` **and** a user was parsed **and** the alert is younger than 15 minutes. Otherwise it downgrades to NOTIFY. (The Kibana rule matches *any* 4728, so the group check is mandatory.)
- **`notify`** is true for severity `medium`/`high`/`critical`, or when an action is set. `low` (e.g. Group ACL Denial, ~380 alerts/week) is acknowledged and logged but not sent to Discord.
- **`enrich`** is true for any valid, non-loopback, non-multicast IP. Private addresses are deliberately allowed in this lab: the seeded MISP IOC is the Kali box (`192.168.19.183`, RFC1918). In production, restrict to public IPs.

Variable resolution notes (Shuffle):
- `$http_1.body` resolved under **Test Action** and manual **Run**. In an earlier scheduled run it arrived empty (`input not resolved`). Re-check after the workflow is fully wired.
- Fallback 1: use `raw = r'''$http_1'''` (the script accepts the whole node result).
- Fallback 2: `soar/normalize_standalone.py` performs the ES query itself and removes the substitution dependency (drops Http 1).
- Insert variables with the **+** picker so node names are exact.

### 5.4 Conditional MISP enrichment
Branch on `$normalize.message.#.enrich == true`. Body:
```json
{"value":"$normalize.message.#.src_ip","type":"ip-src","returnFormat":"json"}
```
Skipped for alerts without a usable IP (group changes, router names, username-only alerts).

### 5.5 Rule → playbook mapping (static, not scored)

| Kibana rule | Response | Rationale |
|---|---|---|
| `AEGIS - Privileged Group Add` | **REVOKE** (guarded, see 5.3) | Privilege escalation in progress |
| `AEGIS - Authelia Brute Force` | NOTIFY | Awareness |
| `AEGIS - Authelia TOTP Bypass Attempt` | NOTIFY | Could be user error or attack |
| `AEGIS - Web Attack Pattern (SQLi/XSS/Traversal)` | NOTIFY | WAF already blocked |
| `AEGIS - Suricata Priority Alert` | NOTIFY | Network layer; no response ready |
| `AEGIS - Traefik Directory Fuzzing` | NOTIFY | Usually scanner noise |
| `AEGIS - Traefik 5xx Storm` | NOTIFY | Availability, not security |
| `AEGIS - Group ACL Denial` (+ probe) | log only (`low`) | Expected behaviour — user confusion |
| *(default)* | NOTIFY | Unrecognised rule |

Adding a detection with a different response is one line in the `PLAYBOOK` dict. No new node.

The earlier confidence-scoring model (weights, thresholds) was removed: uncalibrated, used inputs that do not exist (scan list, calendar feed), double-counted rule level and event code, and let an attacker trigger revocations against other users.

**Rule coverage gap:** `AEGIS - Privileged Group Add` currently queries `data.win.system.eventID: "4728"` only. Extend to `(4728 or 4732 or 4756)` (global / local / universal groups).

### 5.6 Wazuh Active Response (Level 1 / Level 4)
```
POST https://10.16.64.156:55000/security/user/authenticate?raw=true   (basic auth → plain-text JWT, ~15 min)
PUT  https://10.16.64.156:55000/active-response
     {"command":"aegis-revoke-session","arguments":["<user>"],"agents_list":["004"]}
     Authorization: Bearer <token>
```
- Rebuild the auth node from scratch; the legacy `GetWazuhToken` node had a malformed body and was deleted.
- AR scripts receive JSON on **stdin**; API-supplied arguments arrive in `parameters.extra_args`, not `$1`, and there is no `parameters.alert` for API-triggered runs.
- Zone 4 → Zone 3 traffic stays inside the authenticated Wazuh control plane; no new firewall rules.

### 5.7 Discord notification
```json
{"embeds":[{"title":"🚨 $normalize.message.#.rule","color":15158332,"fields":[
 {"name":"Severity","value":"$normalize.message.#.severity","inline":true},
 {"name":"Host","value":"$normalize.message.#.d_host","inline":true},
 {"name":"User","value":"$normalize.message.#.d_user","inline":true},
 {"name":"Source IP","value":"$normalize.message.#.d_ip","inline":true},
 {"name":"Action","value":"$normalize.message.#.action","inline":true}]}]}
```
`.#` is Shuffle's per-item loop (one message per alert) — confirm in the UI that Discord shows one result per alert. No interactive buttons (needs a Discord bot application; out of scope). MISP match count is added once the MISP branch is wired.

### 5.8 Acknowledge
Runs after Discord succeeds. Proven call (same mechanism used to clear the initial 799-alert backlog):
```
POST https://10.16.64.155:9200/.alerts-security.alerts-default/_update_by_query?conflicts=proceed
{"script":{"source":"ctx._source['kibana.alert.workflow_status']='acknowledged'"},
 "query":{"ids":{"values":["$normalize.message.#.alert_id"]}}}
```
Works through the alias regardless of the backing index. Alternative (untested): Kibana `POST /kibana/api/detection_engine/signals/status` with `kbn-xsrf: true`, auth, `{"signal_ids":[…],"status":"acknowledged"}` — note the `/kibana` base path.

### 5.9 Audit trail — `aegis-soar-log`
One document per processed alert via `POST https://10.16.64.155:9200/aegis-soar-log/_doc`:
```json
{"@timestamp":"...","alert_id":"...","rule_name":"...","severity":"high",
 "host":"CORP-DC01","user":"salima","source_ip":"","action":"revoke_session",
 "action_status":"success","discord_status":204,"misp_matches":0,"verified":true}
```
Durable record of everything the SOAR did; feeds the Response Actions Log dashboard (`dashboards.md` §10.4).

---

## 6. Response ladder

| Level | Action | When | Implementation |
|---|---|---|---|
| **1 — Revoke** | Destroy Authelia/Keycloak sessions of the user | Privileged group add (guarded) | Wazuh AR on gateway agent (004) |
| **4 — Disable** | Disable AD account | Confirmed compromise (multiple signals) | Wazuh AR on CORP-DC01 agent (006) |

Level 2 (step-up/WebAuthn) — dropped: Authelia has no per-session elevation API. Level 3 (quarantine group) — dropped: extra AD group and cleanup job for little gain. Both remain documented as future work.

### 6.1 Revoke — the PFE headline
1. Admin (or attacker) adds `salima` to `GRP_IT_Admin` on CORP-DC01 (event 4728).
2. Kibana rule `AEGIS - Privileged Group Add` fires; alert lands in the queue index.
3. Shuffle picks it up; Normalize → user `salima`, group `GRP_IT_Admin`, action REVOKE.
4. Wazuh AR call → `aegis-revoke-session salima` on the gateway agent.
5. Discord: session revoked. Alert acknowledged. `aegis-soar-log` records the action.

Verification: the session cookie no longer works; reloading `https://traefik.zerotrust.lan` returns the login page.

### 6.2 Known caveat — Authelia session encryption
Authelia may encrypt session values in Redis. If `redis-cli GET <key>` returns ciphertext, the script cannot find the user's sessions.
1. Check whether the key name contains a username hash (test empirically).
2. Otherwise maintain a `username → session_id` map from Authelia logs in a separate Redis hash and have the AR script read that.

**Test this before building the AR script.**

---

## 7. End-to-end timing

Kibana rules run on a schedule (currently **5 min**). The earlier "≈2 minutes" estimate assumed 60 s rules and was wrong.

| Step | Default rules (5 m) | Tuned (1 m rule) |
|---|---|---|
| Event 4728 shipped to ES | ~5 s | ~5 s |
| Kibana rule fires | ≤ 5 min | ≤ 1 min |
| Shuffle poll | ≤ 60 s | ≤ 60 s |
| AR + Discord + ack | ~5–10 s | ~5–10 s |
| **Total** | **≤ ~6.5 min** | **≤ ~2.5 min** |

For the demo, set the `Privileged Group Add` rule to a 1-minute interval (keep the `now-10m` lookback; Kibana does not re-alert on the same source event).

---

## 8. Phased rollout

### Phase 1 — Alerts-index pull end-to-end

- [x] Logstash stopped, restart disabled
- [x] Backlog cleared: 799 stale `open` alerts acknowledged (prevents replaying old alerts, incl. an old `salima` group add that would have triggered a real revoke)
- [x] Shuffle → ES reachable; `Content-Type=application/json` header format fixed (406 → 200)
- [x] Normalize verified on live alerts (2 Suricata alerts → 2 correct objects, `enrich: true`, `action: NOTIFY`)
- [ ] Normalize → Discord with the new body (per-alert loop verified)
- [ ] Acknowledge node; confirm alerts flip to `acknowledged`
- [ ] `aegis-soar-log` write
- [ ] Re-enable Schedule; confirm scheduled runs resolve input (else use fallbacks in 5.3)
- [ ] Conditional MISP branch
- [ ] Export the workflow JSON to the repo

**Done when:** an alert from Kibana reaches Discord with populated fields, is acknowledged, and appears in `aegis-soar-log` — without manual clicks.

### Phase 2 — Wazuh Active Response infrastructure (2 h)
1. Verify the Wazuh API on 55000 is reachable **from minisoc3** (it was refused from the gateway earlier).
2. Test Authelia Redis session format (§6.2).
3. Enable the command/`<active-response>` blocks in `ossec.conf` on minisoc2.
4. Write `aegis-revoke-session` on the gateway agent (read stdin JSON, `parameters.extra_args`).
5. Manual AR call with a bearer token; confirm in `/var/ossec/logs/active-responses.log`.

**Done when:** a manual AR call revokes a test session.

### Phase 3 — Wire revoke into Shuffle (2 h)
Auth node → AR node behind `action == REVOKE`; test with a real DC01 group change; verify the session is dead.

### Phase 4 — Level 4 disable (1 h)
`aegis-disable-account` on the DC01 agent; extend the mapping; test on a throwaway AD user.

### Phase 5 — Feedback dashboard (1 h)
`aegis-soar-log` data view, Response Actions Log dashboard, and a "response ineffective" rule (response followed by successful auth of the same user within 5 min).

**Order:** Phase 1 → 2 → 3, demonstrate end-to-end, then Phases 4–5.

---

## 9. Shuffle / integration gotchas (learned the hard way)

| Symptom | Cause | Fix |
|---|---|---|
| ES returns `406 Content-Type header [] is not supported` | Headers entered as `Content-Type: application/json` | Use `Content-Type=application/json` |
| Normalize: `Syntax Error … (<unknown>, line 0)` / `input not resolved` | Variable substituted as an empty string | Use the **+** picker; try `$http_1`; fall back to standalone script |
| Field extraction returns `?` or empty | `kibana.alert.*` are flat keys, not nested | Flat-then-nested lookup (`g()`) |
| `docker exec shuffle-backend curl` fails | No curl in the image | Test from a Shuffle HTTP node instead |
| Same alert sent every minute | No acknowledge step | Keep Schedule stopped until ack is wired |
| Discord 400 | Empty embed field value | Use `d_*` display fields |

---

## 10. Open questions

1. Does the Wazuh API on 55000 accept AR calls from minisoc3?
2. Is Authelia's Redis session data readable (§6.2)?
3. Does the deployed Shuffle version run Discord/ack once per item with `.#` (and honour conditions on the loop)?
4. Do scheduled executions resolve `$http_1.body`, or is the standalone variant needed?

---

## 11. Pre-publication checklist

Before the repository is made public or shared:

- [ ] Rotate the Elasticsearch `elastic` password and issue a scoped API key for Shuffle (read `.alerts-security.alerts-default`, update workflow status, write `aegis-soar-log`)
- [ ] Rotate the MISP API key and Discord webhook URL; store them as Shuffle secrets
- [ ] Remove plaintext credentials from `SOAR.md` and `docs/`
- [ ] Rotate Wazuh API credentials (`wazuh` / `wazuh-wui`)
- [ ] Remove `soar-v2.md` links or add the file; fix `soar.md` / `SOAR.md` casing

---

## 12. Change log

| Date | Change |
|---|---|
| 2026-09-29 | Initial design — assumed Kibana webhook → Shuffle (blocked by license) |
| 2026-09-30 | Rewrite: alerts-index pull; removed confidence scoring; ladder reduced to Revoke + Disable; removed Discord buttons |
| 2026-09-30 | Phase 1 findings: real alert field map (flat + nested keys); REVOKE guard rails (privileged-group check, 15-min age); acknowledge via `_update_by_query`; enrichment allows private IPs in the lab; corrected latency (rules run every 5 min); Shuffle header format; Logstash stopped; 799-alert backlog cleared; Normalize verified live |

---

*End of SOAR design reference.*
