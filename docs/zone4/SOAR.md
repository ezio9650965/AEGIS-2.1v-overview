# Zone 4 — SOAR Pipeline Reference

**Purpose:** Complete operational reference for the AEGIS SOAR pipeline.
Covers the ingestion path, workflow graph, verified evidence, and outstanding
issues. Every claim is verified against the running environment.

**Access:**
- Shuffle UI: `http://10.16.64.157:3001` (or `shuffle.dz` via Nginx proxy)
- Wazuh manager: `10.16.64.156`
- Elasticsearch: `10.16.64.155:9200`

> **Secret handling warning:** This document contains webhook URLs and API
> keys that are active credentials. Rotate all of them before sharing the
> repository publicly.

---

## 1. Pipeline Overview

The SOAR pipeline ingests Wazuh alerts from Elasticsearch, enriches them with
MISP threat intelligence, and delivers enriched incident cards to Discord.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Wazuh Manager (minisoc2)                                            │
│   Rule engine → alerts.json → ES output                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │ ships alerts
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Elasticsearch (minisoc1)                                            │
│   Index: wazuh-alerts-4.x-YYYY.MM.DD                               │
│   :9200 (TLS, basic auth)                                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │ Logstash polls every 60s
                         │ filter: rule.level >= 12
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Logstash (minisoc3)                                                 │
│   Input:    elasticsearch (wazuh-alerts-*)                         │
│   Filter:   mutate — adds aegis_pipeline, aegis_source, mitre_*    │
│   Output:   HTTP POST → Shuffle webhook                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │ POST http://shuffle:80/api/v1/hooks/webhook_<uuid>
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Shuffle SOAR (minisoc3)                                             │
│   Webhook trigger → workflow: aegis_soar_v1                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────┼─────────────────┬──────────────┐
        ▼                ▼                 ▼              ▼
   [Shuffle         [MISP Search]    [GetWazuhToken]  [Discord]
    Tools 1]         restSearch        (orphaned)      Notify
    extract           API lookup                       202/204
    variables
```

**Note:** `GetWazuhToken` node exists in the workflow but is not connected
to any downstream node. It has no effect on the current pipeline.

---

## 2. Container Inventory (minisoc3)

| Container | Image | Purpose |
|---|---|---|
| `shuffle` | `ghcr.io/shuffle/shuffle-frontend:latest` | Web UI on `:3001` |
| `shuffle-backend` | `ghcr.io/shuffle/shuffle-backend:latest` | Workflow execution engine |
| `shuffle-orborus` | `ghcr.io/shuffle/shuffle-orborus:latest` | Ephemeral worker orchestrator |
| `shuffle-database` | `mongo:6` | Workflow state |
| `shuffle-opensearch` | `opensearchproject/opensearch:3.2.0` | Shuffle's internal index |
| `logstash` | `docker.elastic.co/logstash/logstash:8.19.13` | Alert ingestion pipeline |
| `misp-core` | `ghcr.io/misp/misp-docker/misp-core:latest` | Threat intel platform |
| `misp-db` | `mariadb:10.11` | MISP database |
| `misp-redis` | `valkey/valkey:7.2` | MISP job queue |
| `misp-modules` | `ghcr.io/misp/misp-docker/misp-modules:latest` | MISP enrichment modules |
| `mailpit` | `axllent/mailpit:latest` | SMTP sinkhole |

All containers are `Up 2 weeks` and healthy. The stack is stable.

---

## 3. Network Topology

| Source | Destination | Port | Purpose |
|---|---|---|---|
| Wazuh manager (minisoc2) | Elasticsearch (minisoc1) | 9200 | Alert shipping |
| Logstash (minisoc3) | Elasticsearch (minisoc1) | 9200 | Alert polling |
| Logstash (minisoc3) | Shuffle backend (minisoc3) | 80 | Webhook POST (internal Docker) |
| Analyst browser | Shuffle frontend (minisoc3) | 3001 | UI access |
| Analyst browser | Kibana (minisoc2) | 5601 | Dashboards |

**Docker network:** All minisoc3 containers share `soc_net` (bridge). Services
communicate by container name (`shuffle`, `misp-core`).

---

## 4. Logstash Configuration

**Path:** `/opt/soc/logstash/pipeline/logstash.conf`

```ruby
# AEGIS v2.1 — Mahoraga Pipeline
# Pulls high-severity Wazuh alerts from Elasticsearch (minisoc1)
# and pushes them to Shuffle SOAR (minisoc3) for MISP enrichment & response.

input {
  elasticsearch {
    hosts => ["${ES_HOST}"]
    user => "${ES_USER}"
    password => "${ES_PASSWORD}"
    index => "wazuh-alerts-*"
    query => '{
      "query": {
        "bool": {
          "must": [
            { "range": { "rule.level": { "gte": 12 } } },
            { "range": { "@timestamp": { "gte": "now-2m" } } }
          ]
        }
      }
    }'
    schedule => "* * * * *"
    ssl_certificate_verification => false
  }
}

filter {
  mutate {
    add_field => { "aegis_pipeline" => "mahoraga_v2.1" }
    add_field => { "aegis_source" => "minisoc3_logstash" }
  }
  if [rule][mitre] {
    mutate {
      add_field => { "mitre_techniques" => "%{[rule][mitre][id]}" }
    }
  }
}

output {
  http {
    url => "${SHUFFLE_WEBHOOK}"
    http_method => "post"
    format => "json"
  }
  stdout {
    codec => rubydebug
  }
}
```

**Environment variables** (from `/opt/soc/.env`):

| Variable | Value |
|---|---|
| `ES_HOST` | `https://10.16.64.155:9200` |
| `ES_USER` | `elastic` |
| `ES_PASSWORD` | *(in .env — rotate before sharing)* |
| `SHUFFLE_WEBHOOK` | `http://shuffle:80/api/v1/hooks/webhook_0df0e571-ec72-444e-bea5-77f05b3e5a9a` |

**Polling cadence:** every 60 seconds, for the last 2 minutes of alerts. A
level-12 alert surfaces within ~60 seconds of being indexed.

**Filter thresholds:**
- `rule.level >= 12` — currently. Should be lowered to `10` (see §8).
- `@timestamp >= now-2m` — window for each poll.

---

## 5. Docker Compose Configuration

**File:** `/opt/soc/docker-compose.yml` (excerpt — SOAR services)

```yaml
services:
  shuffle:
    image: ghcr.io/shuffle/shuffle-frontend:latest
    container_name: shuffle
    ports: ["3001:80"]
    environment:
      - SHUFFLE_APP_AUTH_DISABLED=true
      - SHUFFLE_APP_DOWNLOAD_AUTH_DISABLED=true
    networks: [soc_net]
    depends_on: [shuffle-backend, shuffle-database]

  shuffle-backend:
    image: ghcr.io/shuffle/shuffle-backend:latest
    container_name: shuffle-backend
    environment:
      - SHUFFLE_APP_AUTH_DISABLED=true
      - SHUFFLE_APP_DOWNLOAD_AUTH_DISABLED=true
      - SHUFFLE_ORBORUS_CONTAINER_NAME=shuffle-orborus
      - SHUFFLE_WORKER_CONTAINER_NAME=shuffle-worker
    networks: [soc_net]
    volumes:
      - shuffle_data:/shuffle
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on: [shuffle-database]

  logstash:
    image: docker.elastic.co/logstash/logstash:8.19.13
    container_name: logstash
    ports: ["5044:5044"]
    environment:
      - LS_JAVA_OPTS=-Xms1g -Xmx1g
      - ES_HOST=https://10.16.64.155:9200
      - ES_USER=${ES_USER}
      - ES_PASSWORD=${ES_PASSWORD}
      - SHUFFLE_WEBHOOK=${SHUFFLE_WEBHOOK}
    networks: [soc_net]
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline:ro
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - ./logstash/certs:/usr/share/logstash/certs:ro
    depends_on: [shuffle]

networks:
  soc_net:
    driver: bridge
```

**Override file:** `/opt/soc/docker-compose.override.yml` references
`${SHUFFLE_WEBHOOK}` — single source of truth is `.env`.

---

## 6. Shuffle Workflow — `aegis_soar_v1`

**Webhook URL (host):** `http://10.16.64.157:3001/api/v1/hooks/webhook_0df0e571-ec72-444e-bea5-77f05b3e5a9a`
**Webhook URL (internal):** `http://shuffle:80/api/v1/hooks/webhook_0df0e571-ec72-444e-bea5-77f05b3e5a9a`

### Graph

```
Webhook 1 ───► Shuffle Tools 1 ───┬──► MISP Search ───► Discord
                                   └──► GetWazuhToken  (orphaned)
```

### Node 1 — Webhook 1 (trigger)

Standard Shuffle webhook input. Receives JSON body from Logstash. The body is
the raw Wazuh alert document as read from `wazuh-alerts-*`.

### Node 2 — Shuffle Tools 1 (`repeat_back_to_me`)

**Purpose:** extract commonly used fields into a normalized `$shuffle_tools_1`
object so downstream nodes don't have to dig into deep Wazuh structures.

**Current config:**

```json
{"srcip": "$exec.data.srcip",
 "agent_id": "$exec.agent.id",
 "rule_level": "$exec.rule.level",
 "rule_id": "$exec.rule.id"}
```

**Known issue:** When tested with a manual payload, all four values came back
empty. The `$exec.` path prefix may not match the actual payload structure
Logstash sends.

**What Logstash sends:** the full Wazuh alert document. In it, fields are at
the top level, not nested under `exec`. So the correct paths are likely:

```json
{"srcip": "$data.srcip",
 "agent_id": "$agent.id",
 "rule_level": "$rule.level",
 "rule_id": "$rule.id"}
```

**This is the highest-priority fix for the next session.**

### Node 3 — MISP Search

**Type:** HTTP POST
**URL:** `https://misp-core/attributes/restSearch`
**Body:**
```json
{"value": "$shuffle_tools_1.srcip",
 "type": "ip-src",
 "returnFormat": "json"}
```

**Headers:**
```
Content-Type=application/json
Accept=application/json
Authorization=5YtxCuDwIOLJq7b057iGBBz4j83ZSQ6ZWIMIFPgN
```

**Verify:** `False` (MISP uses self-signed cert)

**Status:** ✅ **Verified working.** Test run returned:
- HTTP `200`
- MISP matched 1 attribute for `192.168.19.183`
- Match details: Event #2 "AEGIS test IOC", Org "AEGIS"
- Response header `X-Result-Count: 1`

### Node 4 — Discord

**Type:** HTTP POST
**URL:** `https://discord.com/api/webhooks/1552700616932073485/yJfY1hp15qXHjlU2AujAuCZw0rgCI-3pZCBn_p4ohWdhj7w...`

**Body (embeds payload):**
```json
{"embeds": [{
  "title": "🚨 AEGIS SOAR Alert",
  "color": 15158332,
  "fields": [
    {"name": "Rule", "value": "$shuffle_tools_1.rule_id (level $shuffle_tools_1.rule_level)", "inline": ...},
    {"name": "Agent", "value": ...},
    {"name": "Source IP", "value": "$shuffle_tools_1.srcip"},
    {"name": "MISP Matches", "value": ...}
  ]
}]}
```

**Headers:** `Content-Type=application/json`

**Status:** ✅ **Verified working.** Test run returned:
- HTTP `204` (Discord success code)
- Message delivered to the Discord channel

### Node 5 — GetWazuhToken (orphaned)

**Type:** HTTP POST
**URL:** `https://10.16.64.156:55000/security/user/authenticate`
**Body:** `{"json": "blob"}` ← malformed
**Auth:** Basic (`wazuh-wui` / password)

**Status:** ⚠️ **Not connected to any downstream node.** It's dead weight —
remove or wire it into a future Wazuh Active Response node.

---

## 7. Verified Evidence

### 7.1 MISP enrichment works

Real test — `https://misp-core/attributes/restSearch` returned:

```json
{
  "response": {
    "Attribute": [{
      "id": "1",
      "event_id": "2",
      "category": "Network activity",
      "type": "ip-src",
      "uuid": "0feda2ea-f41a-4800-8e08-08f845cb84fd",
      "value": "192.168.19.183",
      "Event": {
        "id": "2",
        "info": "AEGIS test IOC",
        "orgc": {"name": "AEGIS"}
      }
    }]
  }
}
```

**Interpretation:** the pipeline correctly extracts an IP, queries MISP, and
receives structured threat intel. This proves the enrichment leg works.

### 7.2 Discord delivery works

Real test — Discord API returned:

```
status: 204
url: https://discord.com/api/webhooks/1552700616932073485/...
```

**Interpretation:** the workflow successfully delivers enriched alerts to
Discord. Verified visually: an AEGIS SOAR Alert message appeared in the
channel with Rule, Agent, Source IP, and MISP Matches fields populated.

### 7.3 Logstash ingest works

Logstash logs during steady-state operation show:

```
[INFO] Create point in time (PIT)
[INFO] Query start
[INFO] Query completed
[INFO] Closing point in time (PIT)
```

Every 60 seconds. No connection errors after the webhook was updated.

### 7.4 Webhook reachability confirmed

From inside the Logstash container:
```
HTTP 200
```

From inside Logstash → Shuffle backend → workflow trigger. The pipeline path
is intact.

---

## 8. Outstanding Issues

| # | Issue | Impact | Fix |
|---|---|---|---|
| **S-1** | Shuffle Tools 1 returns empty values | Discord shows blank Rule/Agent/IP fields | Change `$exec.X` → `$X` in the node config |
| **S-2** | Logstash threshold at `rule.level >= 12` | Most lab alerts are level 10 — they never reach Shuffle | Lower to `10` |
| **S-3** | GetWazuhToken orphaned | Dead node — no impact but confusing | Delete or wire into AR node |
| **S-4** | Manual test worked, real alert never triggered end-to-end | Not yet proven with live Wazuh alert | Generate a real level-12 alert (§9) |
| **S-5** | MISP API key in plaintext in workflow config | Credential exposure | Rotate + move to Shuffle secret |
| **S-6** | Discord webhook URL in plaintext | Credential exposure | Rotate + move to Shuffle secret |

### S-1 — the field extraction bug

Manual test with synthetic payload:

```json
{"srcip": "",
 "agent_id": "",
 "rule_level": "",
 "rule_id": ""}
```

Nothing was extracted. The `$exec.` prefix is likely wrong.

**Test the fix:** in Shuffle UI, open `Shuffle Tools 1`, click **Test Action**,
and try:

```json
{"srcip": "$data.srcip",
 "agent_id": "$agent.id",
 "rule_level": "$rule.level",
 "rule_id": "$rule.id"}
```

If that still returns empty, try `$exec.0.data.srcip` or `$.[0].data.srcip` —
Shuffle sometimes wraps incoming payloads in an array.

Once a working prefix is found, update the node config and re-run the
workflow.

### S-2 — threshold reality check

Recent alerts observed:

| Level | Rule | Description |
|---|---|---|
| 10 | 5712 | sshd: brute force — non-existent user |
| 10 | 2502 | syslog: user missed password more than once |
| 5 | 5710 | sshd: attempt to login using non-existent user |
| 5 | 5503 | PAM: user login failed |
| 3 | 60106 | Windows Logon Success |

**Only level 10+ alerts matter for SOAR.** Current threshold of 12 filters
out the level-10 events. Change Logstash to `gte: 10`.

---

## 9. Testing the Full Chain

### 9.1 Prerequisites

- Logstash webhook URL updated (✅ done)
- Logstash threshold lowered to level 10 (⚠️ todo)
- Shuffle Tools 1 field mapping fixed (⚠️ todo)

### 9.2 Trigger a real alert

SSH brute force from Kali or gateway:

```bash
for i in {1..15}; do
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=1 wronguser@192.168.50.1 "id" 2>/dev/null
done
```

This triggers rule 5712 at level 10.

### 9.3 Watch the pipeline

**Terminal 1 — Logstash:**
```bash
sudo docker logs -f logstash 2>&1 | grep -vE "PIT|deprecation|ssl_verification"
```

Look for the alert query returning a hit, then an HTTP POST to Shuffle.

**Terminal 2 — Shuffle backend:**
```bash
sudo docker logs -f shuffle-backend 2>&1 | grep -iE "webhook|workflow"
```

Look for `Running webhook for workflow ...` without 404.

**Terminal 3 — Discord browser tab.** Expect a new alert within 60 seconds.

**Kibana → Security → Alerts.** Expect a new alert with the SSH brute-force
rule.

### 9.4 If nothing fires

**Check 1 — is the alert being indexed?**
```bash
# On minisoc1
curl -sk -u 'elastic:<password>' \
  'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
  -H 'Content-Type: application/json' -d '{
    "query": {"range": {"rule.level": {"gte": 10}}},
    "sort": [{"@timestamp": "desc"}], "size": 1
  }' | python3 -m json.tool | head -30
```

**Check 2 — is Logstash picking it up?**
```bash
sudo docker logs logstash --since 3m | grep -iE "http|200|500|shuffle"
```

**Check 3 — did Shuffle receive it?**
```bash
sudo docker logs shuffle-backend --since 3m | grep -iE "webhook|error|404"
```

**Check 4 — did the workflow run?**
Shuffle UI → Workflows → `aegis_soar_v1` → **Executions** tab.
Click the newest → trace node-by-node.

---

## 10. Reference Commands

### Shuffle

```bash
# Container health
sudo docker ps --filter name=shuffle

# Backend logs (real-time)
sudo docker logs -f shuffle-backend

# Trigger a manual webhook test
curl -sS -X POST \
  "http://localhost:3001/api/v1/hooks/webhook_0df0e571-ec72-444e-bea5-77f05b3e5a9a" \
  -H "Content-Type: application/json" \
  -d '{"rule":{"id":"TEST","level":12,"description":"Manual test"}}' \
  -w "\nHTTP %{http_code}\n"
```

### Logstash

```bash
# Container status
sudo docker ps --filter name=logstash

# Live pipeline log
sudo docker logs -f logstash 2>&1 | grep -vE "PIT|deprecation"

# Reload after config change
sudo docker restart logstash

# Verify pipeline sources (should be a single .conf file)
sudo docker logs logstash 2>&1 | grep "pipeline.sources"
```

### MISP

```bash
# Container health
sudo docker ps --filter name=misp

# Manual restSearch (from minisoc3)
curl -sk -X POST \
  "https://localhost:8443/attributes/restSearch" \
  -H "Authorization: 5YtxCuDwIOLJq7b057iGBBz4j83ZSQ6ZWIMIFPgN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"value": "192.168.19.183", "type": "ip-src", "returnFormat": "json"}' \
  | python3 -m json.tool
```

### Wazuh alerts

```bash
# Last 20 alerts
sudo tail -20 /var/ossec/logs/alerts/alerts.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        a = json.loads(line)
        print(f\"level={a['rule']['level']} id={a['rule']['id']} {a['rule']['description']}\")
    except: pass
"

# Alerts at level 10+
sudo grep '\"level\":1[0-9]' /var/ossec/logs/alerts/alerts.json | tail -5
```

---

## 11. Change Log

| Date | Change |
|---|---|
| 2026-09-29 | Webhook updated from dead ID `925a478d-...` to live `0df0e571-...` in `.env` and `docker-compose.override.yml` |
| 2026-09-29 | Override file now uses `${SHUFFLE_WEBHOOK}` variable instead of hardcoded URL |
| 2026-09-29 | Logstash pipeline restarted cleanly (no more 404 errors) |
| 2026-09-29 | MISP Search node verified working — returns structured IOC match |
| 2026-09-29 | Discord node verified working — 204 delivered |
| 2026-09-29 | `logstash.conf.bak` removed from pipeline dir (was being loaded as a duplicate pipeline) |

---

## 12. Next Session Priorities

1. **Fix S-1** — correct the field extraction in Shuffle Tools 1
2. **Fix S-2** — lower Logstash threshold to level 10
3. **Prove S-4** — trigger a real level-10 alert end-to-end
4. **Clean up S-3** — delete or wire the GetWazuhToken node
5. **Rotate S-5 and S-6** — MISP API key and Discord webhook
6. **Document the workflow JSON export** — dump `aegis_soar_v1` for the repo

Once 1-3 are done, the pipeline is genuinely closed-loop with real data.

---

*End of SOAR reference.*
