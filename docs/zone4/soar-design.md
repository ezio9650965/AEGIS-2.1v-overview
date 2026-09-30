# Zone 4 — SOAR + Active Response Design

**Status:** Phase 1 core loop verified (2026-09-30) — ES query → Normalize → Discord (severity-routed) → Acknowledge → Audit Log. All 5 pipeline nodes verified on live Kibana alerts. Remaining: scheduled runs, conditional MISP, Wazuh Active Response.

**Related Documents:**
- `SOAR.md` — Legacy Logstash pipeline (deprecated, kept for historical context).
- `dashboards.md` — Kibana dashboards and detection rules reference.
- `discord-structure.md` — Discord server layout and severity routing.
- `NEW-FEATURES.md` — Future enhancements backlog.
- `soar/normalize_shuffle.py` — Normalize node source (Shuffle Execute Python).
- `soar/normalize_standalone.py` — Fallback variant that queries ES independently.
- `workflows/aegis_alerts_v2.json` — Exported Shuffle workflow definition.

This document defines the target architecture for the AEGIS SOAR pipeline and its identity-aware active response. It supersedes earlier versions that assumed a Kibana → Shuffle webhook (blocked by license) and a confidence-scoring decision layer (removed).

---

## 1. Design Principles

### 1.1 Identity-First Response
Every response either proves the identity again, reduces the identity's authority, or removes it.
- IPs are untrusted by nature — they change, they NAT, they get shared.
- Identities are the invariant. `salima` is `salima` regardless of source IP.
- Every response is reversible. Revoke → user logs in again. Disable → re-enable. Nothing is permanent without a human decision.
- **Nuance:** This does not mean "never touch an IP." Identity response is primary; IP-block is a supplementary tool for volume-based attacks and post-compromise containment, always time-bounded.

### 1.2 License Reality
The Kibana instance runs on the free tier. The Webhook connector requires a Gold license, so Kibana → HTTP → Shuffle is not available.
**Solution:** Kibana already writes every detection alert to `.alerts-security.alerts-default`. That index is the integration queue. Shuffle pulls from it on a schedule. No connector required.

### 1.3 Signals, Not Raw Events
| Signal Source | Volume | Quality | Used for SOAR? |
| :--- | :--- | :--- | :--- |
| `wazuh-alerts-*` (raw) | Very high | Low — needs filtering | No |
| `.alerts-security.alerts-default` | Low | High — already passed a rule | Yes |

**Evidence:** The raw Wazuh event behind `AEGIS - Privileged Group Add` (event 4728) has `rule.level: 5`. The legacy Logstash filter (`rule.level >= 10/12`) could never have forwarded it. Detection quality comes from Kibana rules, not Wazuh severity.

### 1.4 Bypass Shuffle HTTP for Loops
Shuffle's HTTP app cannot resolve dynamic URL variables inside loop nodes (`.#`). When per-item routing is required (e.g., severity → different Discord webhooks), the HTTP request is performed inside an `Execute Python` node using the `requests` library. This guarantees the URL used is the one computed per alert.

---

## 2. Current vs. Target Architecture

| Capability | Legacy (`SOAR.md`) | Target |
| :--- | :--- | :--- |
| **Trigger** | Logstash polls `wazuh-alerts-*` | Shuffle schedule polls `.alerts-security.alerts-default` |
| **Detection Layer** | None (raw Wazuh level threshold) | Kibana detection rules |
| **Enrichment** | MISP, unconditional | MISP, only when the alert has a usable IP |
| **Decision** | None — everything notified | Static rule → playbook map with guard rails |
| **Response** | Discord notify only | Level 1 revoke + Level 4 disable |
| **Notification** | Single Discord channel | Severity-routed across 4 channels |
| **Feedback** | None | Acknowledge in Kibana + `aegis-soar-log` index |
| **Dedupe** | None (2-minute window re-sent alerts) | Alert acknowledged after processing |
| **Failure Mode** | Logstash down → alerts lost | Shuffle down → alerts wait as open |

---

## 3. Target Workflow Graph

```text
Kibana detection rule fires (every 1–5 min)
        │ writes alert document
        ▼
.alerts-security.alerts-default   (workflow_status = "open")
        │
        │ Shuffle Schedule, every 60 s
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ Shuffle workflow: aegis_alerts_v2                                │
│                                                                  │
│  Schedule ─► Http 1 (ES _search, open alerts, size 20)           │
│                 └─► Normalize (Python) ─► list of alert objects  │
│                        │  per alert (.#):                        │
│                        ├─ enrich == true ─► MISP Search          │
│                        ├─ action == REVOKE ─► Wazuh AR           │
│                        ├─ discord_python (requests.post)         │
│                        │    └─ picks webhook by severity         │
│                        ├─ ack ─► ES _update_by_query (ids)       │
│                        └─ log ─► aegis-soar-log/_doc             │
└──────────────────────────────────────────────────────────────────┘
Note: Logstash is not in this design. It is stopped (docker stop logstash, docker update --restart=no logstash) and the container is kept for the report.

Node Legend
Node	Type	Purpose
Schedule	Shuffle trigger	Polls every 60 s
Http 1	HTTP (POST)	ES _search for open alerts
Normalize	Execute Python	Field extraction, guard rails, message formatting, webhook routing
MISP	HTTP (POST)	Conditional enrichment (only if enrich == true)
Wazuh AR	HTTP (POST)	Level 1 revoke (only if action == REVOKE)
discord_python	Execute Python	Sends messages via requests.post to per-alert webhook
Ack	HTTP (POST)	ES _update_by_query to set workflow_status = acknowledged
Log	HTTP (POST)	Writes audit document to aegis-soar-log
4. Alert Data Model
Alert documents in .alerts-security.alerts-default mix two styles. This broke the first design's pick() helper.

Flat dotted keys at the top of _source: kibana.alert.*, event.kind, and the threshold group-by fields (ClientHost.keyword, remote_ip.keyword, RouterName.keyword).

Nested objects copied from the source event: agent, data, rule, source, host, destination.

The lookup must try the flat key first, then walk the nested path (g() in normalize_shuffle.py).

The alias .alerts-security.alerts-default resolves to two backing indices (.internal.alerts-security.alerts-default-000001 and -000002). Use the alias for search and _update_by_query. A direct _update/<id> on the alias fails for documents living in the non-write index.

4.1 Field Map per Detection Type
Detection	Type	User	Group	IP Source
Privileged Group Add	query	data.win.eventdata.memberName (parse CN)	data.win.eventdata.targetUserName	none
Suricata Priority Alert	query	none	none	source.ip
Web Attack Pattern	query	none	none	ClientHost
Authelia Brute Force / TOTP Bypass	threshold	none	none	kibana.alert.threshold_result.terms[0].value (remote_ip.keyword)
Traefik Directory Fuzzing	threshold	none	none	terms[0].value (ClientHost.keyword)
Traefik 5xx Storm	threshold	none	none	terms[0].value is a router name (rejected by IP validation)
4.2 Normalize Output Contract
One object per alert with the following fields:

json
{
  "alert_id": "a80a18f9577951b645c072f6e9956abbdf21ecc8d7737391ad8523e0b7e14ff8",
  "index": ".internal.alerts-security.alerts-default-000002",
  "rule": "AEGIS - Suricata Priority Alert",
  "severity": "high",
  "risk": 73,
  "host": "ztagateway",
  "user": "",
  "group": "",
  "src_ip": "192.168.19.183",
  "event_code": "",
  "ts": "2026-09-30T12:11:57.268Z",
  "age_min": 55.4,
  "d_host": "ztagateway",
  "d_user": "-",
  "d_group": "-",
  "d_ip": "192.168.19.183",
  "enrich": true,
  "action": "NOTIFY",
  "notify": true,
  "webhook_url": "https://discord.com/api/webhooks/.../...",
  "text": "🚨 [high] AEGIS - Suricata Priority Alert | host: ztagateway | user: - | ip: 192.168.19.183 | action: NOTIFY"
}
Display-safe copies (d_*) use "-" when empty — Discord rejects empty embed values.

5. Node Specifications
5.1 Schedule Trigger
Every 60 seconds. Keep it stopped while nodes are being rewired; a half-wired workflow with no acknowledge step re-sends the same alerts every minute.

5.2 HTTP 1 — Pull Open Alerts
Endpoint: POST https://10.16.64.155:9200/.alerts-security.alerts-default/_search

Body: {"size":20,"sort":[{"@timestamp":"asc"}],"query":{"term":{"kibana.alert.workflow_status":"open"}}}

Headers: Content-Type=application/json

Auth: Basic (elastic), Verify: False

Response: {"status": 200, "success": true, "body": {...}}

Note: Shuffle's HTTP app takes headers as key=value. Content-Type: application/json (colon) is silently dropped and ES answers 406. size: 20 bounds a burst so the workflow cannot stall; oldest alerts first.

5.3 Normalize (Execute Python)
Source: soar/normalize_shuffle.py. Reads the HTTP node result, returns a JSON list on stdout ($normalize.message).

Input: $http_1.body (as a raw Python string).

Built-in Guard Rails
Rule	Condition	Fallback
REVOKE	rule == AEGIS - Privileged Group Add AND group ∈ {GRP_IT_Admin, GRP_Web_Ops} AND user parsed AND age ≤ 15 min	downgrade to NOTIFY
notify	severity ∈ {medium, high, critical} OR action != NOTIFY	skip sending to Discord
enrich	valid, non-loopback, non-multicast IP	skip MISP
Private addresses are deliberately allowed in this lab: the seeded MISP IOC is the Kali box (192.168.19.183, RFC1918). In production, restrict to public IPs.

Variable Resolution Notes
$http_1.body resolved under Test Action and manual Run. In an earlier scheduled run it arrived empty (input not resolved). Re-check after the workflow is fully wired.

Fallback 1: Use raw = r'''$http_1''' (the script accepts the whole node result).

Fallback 2: soar/normalize_standalone.py performs the ES query itself and removes the substitution dependency (drops Http 1).

Insert variables with the + picker so node names are exact.

5.4 Conditional MISP Enrichment
Branch on: $normalize.message.#.enrich == true

Body: {"value":"$normalize.message.#.src_ip","type":"ip-src","returnFormat":"json"}

Skipped for alerts without a usable IP (group changes, router names, username-only alerts).

5.5 Rule → Playbook Mapping (Static, Not Scored)
Kibana Rule	Response	Rationale
AEGIS - Privileged Group Add	REVOKE (guarded, see 5.3)	Privilege escalation in progress
AEGIS - Authelia Brute Force	NOTIFY	Awareness
AEGIS - Authelia TOTP Bypass Attempt	NOTIFY	Could be user error or attack
AEGIS - Web Attack Pattern (SQLi/XSS/Traversal)	NOTIFY	WAF already blocked
AEGIS - Suricata Priority Alert	NOTIFY	Network layer; no response ready
AEGIS - Traefik Directory Fuzzing	NOTIFY	Usually scanner noise
AEGIS - Traefik 5xx Storm	NOTIFY	Availability, not security
AEGIS - Group ACL Denial (+ probe)	log only (low)	Expected behaviour — user confusion
(default)	NOTIFY	Unrecognised rule
Adding a detection with a different response is one line in the PLAYBOOK dict. No new node.

Note: The earlier confidence-scoring model (weights, thresholds) was removed: uncalibrated, used inputs that do not exist (scan list, calendar feed), double-counted rule level and event code, and let an attacker trigger revocations against other users.

Rule coverage gap: AEGIS - Privileged Group Add currently queries data.win.system.eventID: "4728" only. Extend to (4728 or 4732 or 4756) (global / local / universal groups).

5.6 Wazuh Active Response (Level 1 / Level 4)
Auth: POST https://10.16.64.156:55000/security/user/authenticate?raw=true (basic auth → plain-text JWT, ~15 min)

Action: PUT https://10.16.64.156:55000/active-response

Body: {"command":"aegis-revoke-session","arguments":["<user>"],"agents_list":["004"]}

Header: Authorization: Bearer <token>

Note: Rebuild the auth node from scratch; the legacy GetWazuhToken node had a malformed body and was deleted. AR scripts receive JSON on stdin; API-supplied arguments arrive in parameters.extra_args, not $1, and there is no parameters.alert for API-triggered runs. Zone 4 → Zone 3 traffic stays inside the authenticated Wazuh control plane; no new firewall rules.

5.7 Discord Notification (discord_python)
Why a Python node instead of HTTP: Shuffle's HTTP app cannot resolve dynamic URL variables inside loops (.#). It evaluates the URL once before the loop, which caused every alert to route to the original default webhook (#general). To achieve per-alert severity routing, the Discord POST is performed inside an Execute Python node using the requests library.

Node name: discord_python

Type: Execute Python

Input: $normalize.message (list of alert objects)

Output: $discord_python.message (list of {alert_id, status, success} objects)

Script behavior:

Iterates over each alert from the Normalize node.

Skips alerts where notify == false.

POSTs {"content": <alert.text>} to alert.webhook_url.

Records the HTTP status (204 = success) and returns it.

Webhook routing (from normalize_shuffle.py):

Severity	Discord Channel	Webhook Variable
critical	#alerts-critical	DISCORD_WEBHOOKS["critical"]
high	#alerts-high	DISCORD_WEBHOOKS["high"]
medium	#alerts-medium	DISCORD_WEBHOOKS["medium"]
low	#alerts-low	DISCORD_WEBHOOKS["low"]
Verified behavior (2026-09-30): 5 alerts → 5 Discord messages routed to #alerts-high (verified per-alert HTTP 204).

Security: Webhook URLs are secrets. In production, load them from environment variables or Shuffle Secrets rather than hardcoding in the Python script. Rotate immediately if exposed.

Deferred: Discord rich embeds and interactive buttons (needs a Discord bot application; out of scope). MISP match count is added once the MISP branch is wired.

5.8 Acknowledge
Runs after discord_python succeeds.

Endpoint: POST https://10.16.64.155:9200/.alerts-security.alerts-default/_update_by_query?conflicts=proceed

Body: {"script":{"source":"ctx._source['kibana.alert.workflow_status']='acknowledged'"},"query":{"ids":{"values":["$discord_python.message.#.alert_id"]}}}

Response: {"status": 200, "success": true} per alert.

Works through the alias regardless of the backing index.

Alternative (untested): Kibana POST /kibana/api/detection_engine/signals/status with kbn-xsrf: true, auth, {"signal_ids":[…],"status":"acknowledged"} — note the /kibana base path.

Known Limitation: Shuffle does not allow edge conditions on loop nodes (.#). The Ack node currently runs unconditionally after discord_python. To strictly gate this on Discord success, a "Filter List" node must be inserted between discord_python and Ack to filter for success == true. Documented as a follow-up task.

5.9 Audit Trail — aegis-soar-log
One document per processed alert via POST https://10.16.64.155:9200/aegis-soar-log/_doc:

json
{
  "@timestamp": "$normalize.message.#.ts",
  "alert_id": "$discord_python.message.#.alert_id",
  "rule_name": "$normalize.message.#.rule",
  "severity": "$normalize.message.#.severity",
  "host": "$normalize.message.#.d_host",
  "user": "$normalize.message.#.d_user",
  "source_ip": "$normalize.message.#.d_ip",
  "action": "$normalize.message.#.action",
  "action_status": "success",
  "discord_status": "$discord_python.message.#.status",
  "misp_matches": 0,
  "verified": "true"
}
Auth: Basic Auth (elastic / password), Verify SSL: False.

Response: {"status": 201, "result": "created"} per alert.

Note: If Basic Auth is omitted, the node fails silently or throws a 404. The index is created automatically upon the first successful write.

Durable record of everything the SOAR did; feeds the Response Actions Log dashboard (dashboards.md §10.4).

6. Response Ladder
Level	Action	When	Implementation
1 — Revoke	Destroy Authelia/Keycloak sessions of the user	Privileged group add (guarded)	Wazuh AR on gateway agent (004)
4 — Disable	Disable AD account	Confirmed compromise (multiple signals)	Wazuh AR on CORP-DC01 agent (006)
Level 2 (step-up/WebAuthn) — dropped: Authelia has no per-session elevation API.
Level 3 (quarantine group) — dropped: extra AD group and cleanup job for little gain.

Both remain documented as future work.

6.1 Revoke — The PFE Headline Scenario
Admin (or attacker) adds salima to GRP_IT_Admin on CORP-DC01 (event 4728).

Kibana rule AEGIS - Privileged Group Add fires; alert lands in the queue index.

Shuffle picks it up; Normalize → user salima, group GRP_IT_Admin, action REVOKE.

Wazuh AR call → aegis-revoke-session salima on the gateway agent.

Discord: session revoked. Alert acknowledged. aegis-soar-log records the action.

Verification: The session cookie no longer works; reloading https://traefik.zerotrust.lan returns the login page.

6.2 Known Caveat — Authelia Session Encryption
Authelia may encrypt session values in Redis. If redis-cli GET <key> returns ciphertext, the script cannot find the user's sessions.

Check whether the key name contains a username hash (test empirically).

Otherwise maintain a username → session_id map from Authelia logs in a separate Redis hash and have the AR script read that.

Action: Test this before building the AR script.

7. End-to-End Timing
Kibana rules run on a schedule (currently 5 min). The earlier "≈2 minutes" estimate assumed 60 s rules and was wrong.

Step	Default rules (5 m)	Tuned (1 m rule)
Event 4728 shipped to ES	~5 s	~5 s
Kibana rule fires	≤ 5 min	≤ 1 min
Shuffle poll	≤ 60 s	≤ 60 s
AR + Discord + ack	~5–10 s	~5–10 s
Total	≤ ~6.5 min	≤ ~2.5 min
For the demo, set the Privileged Group Add rule to a 1-minute interval (keep the now-10m lookback; Kibana does not re-alert on the same source event).

8. Phased Rollout
Phase 1 — Alerts-Index Pull End-to-End ✅ COMPLETE (2026-09-30)
☑ Logstash stopped, restart disabled
☑ Backlog cleared: 799 stale open alerts acknowledged
☑ Shuffle → ES reachable; Content-Type=application/json header format fixed (406 → 200)
☑ Normalize verified on live alerts (correct objects, enrich, action, webhook_url per alert)
☑ Discord severity routing implemented via discord_python node (HTTP 204 per alert, correct channel per severity)
☑ Acknowledge node (_update_by_query by id, HTTP 200 per alert)
☑ aegis-soar-log write (verified 201 Created per alert)
□ Re-enable Schedule; confirm scheduled runs resolve input (else use fallbacks in 5.3)
□ Ack gated on Discord success (blocked by Shuffle loop condition — see 5.8)
□ Conditional MISP branch
□ Export the workflow JSON to the repo
Done when: An alert from Kibana reaches the correct Discord channel with populated fields, is acknowledged, and appears in aegis-soar-log — without manual clicks.

Phase 2 — Wazuh Active Response Infrastructure (2 h)
□ Verify the Wazuh API on 55000 is reachable from minisoc3 (it was refused from the gateway earlier).
□ Test Authelia Redis session format (§6.2).
□ Enable the command/<active-response> blocks in ossec.conf on minisoc2.
□ Write aegis-revoke-session on the gateway agent (read stdin JSON, parameters.extra_args).
□ Manual AR call with a bearer token; confirm in /var/ossec/logs/active-responses.log.
Done when: A manual AR call revokes a test session.

Phase 3 — Wire Revoke into Shuffle (2 h)
□ Auth node → AR node behind action == REVOKE; test with a real DC01 group change; verify the session is dead.
Phase 4 — Level 4 Disable (1 h)
□ aegis-disable-account on the DC01 agent; extend the mapping; test on a throwaway AD user.
Phase 5 — Feedback Dashboard (1 h)
□ aegis-soar-log data view, Response Actions Log dashboard, and a "response ineffective" rule (response followed by successful auth of the same user within 5 min).
Order: Phase 1 → 2 → 3, demonstrate end-to-end, then Phases 4–5.

9. Shuffle / Integration Gotchas (Learned the Hard Way)
Symptom	Cause	Fix
ES returns 406 Content-Type header [] is not supported	Headers entered as Content-Type: application/json	Use Content-Type=application/json
Normalize: Syntax Error … (<unknown>, line 0) / input not resolved	Variable substituted as an empty string	Use the + picker; try $http_1; fall back to standalone script
Field extraction returns ? or empty	kibana.alert.* are flat keys, not nested	Flat-then-nested lookup (g())
docker exec shuffle-backend curl fails	No curl in the image	Test from a Shuffle HTTP node instead
Same alert sent every minute	No acknowledge step	Keep Schedule stopped until ack is wired
Discord 400	Empty embed field value	Use d_* display fields
Discord: malformed node or string … <ast.Name …>	Body contains JSON true/false (parsed as a Python literal)	Use {"content":"…"} with the text field, no booleans
Alerts acknowledged although Discord failed	Ack node not gated on Discord	Edge condition $discord.#.success == true (currently blocked by loop limitation)
aegis-soar-log returns 404 / index not found	Missing Basic Auth or Verify SSL setting on the HTTP node	Enable Basic Auth (elastic), set Verify SSL: False
Shuffle HTTP node ignores dynamic URL inside loops (.#)	Shuffle evaluates URL once before loop starts	Move the POST into an Execute Python node using requests
Discord message routed to #general despite dynamic URL	Hardcoded URL in HTTP node overrides variable	Delete HTTP node; use discord_python Python node
Edge condition on loop (.#) rejected	Shuffle does not support edge conditions on loop nodes	Use a Filter List node between the loop and the downstream node
10. Open Questions
Does the Wazuh API on 55000 accept AR calls from minisoc3?

Is Authelia's Redis session data readable (§6.2)?

Do scheduled executions resolve $http_1.body, or is the standalone variant needed?

Can a Filter List node be used to enforce success == true gating between discord_python and Ack?

11. Pre-Publication Checklist
Before the repository is made public or shared:

□ Rotate the Elasticsearch elastic password and issue a scoped API key for Shuffle (read .alerts-security.alerts-default, update workflow status, write aegis-soar-log)
□ Rotate the MISP API key and Discord webhook URLs; store them as Shuffle secrets
□ Remove plaintext credentials from SOAR.md, docs/, and normalize_shuffle.py
□ Rotate Wazuh API credentials (wazuh / wazuh-wui)
□ Remove soar-v2.md links or add the file; fix soar.md / SOAR.md casing
□ Add workflows/aegis_alerts_v2.json (sanitized) to the repo
12. Change Log
Date	Change
2026-09-29	Initial design — assumed Kibana webhook → Shuffle (blocked by license)
2026-09-30	Rewrite: alerts-index pull; removed confidence scoring; ladder reduced to Revoke + Disable; removed Discord buttons
2026-09-30	Phase 1 core loop verified end-to-end (Discord 204 ×4, ack 200 ×4); Discord body switched to content/text; Discord-failure gotchas added
2026-09-30	Phase 1 findings: real alert field map (flat + nested keys); REVOKE guard rails (privileged-group check, 15-min age); acknowledge via _update_by_query; enrichment allows private IPs in the lab; corrected latency (rules run every 5 min); Shuffle header format; Logstash stopped; 799-alert backlog cleared; Normalize verified live
2026-09-30	Audit log (aegis-soar-log) wired and verified; documented aegis-soar-log Basic Auth requirement
2026-09-30	Discord severity routing implemented via discord_python node (bypasses Shuffle HTTP loop-URL limitation); webhooks mapped per severity; Ack and Log nodes rewired to $discord_python.message; verified 5-alert test run routed to #alerts-high, acknowledged, and logged
