# SOC Integration — Zone 4

**Status:** Live — full agent coverage deployed and verified end-to-end.

**Scope:** This document is the operational reference for the AEGIS SOC
integration. It reflects what was actually deployed, not what was planned.
Every claim has been verified against the running cluster.

**Related:**
- [`gateway-structure.md`](./gateway-structure.md) — Zone 3 file layout
- [`configuration.md`](./configuration.md) — gateway service configs
- [`corp-web01.md`](./corp-web01.md) — the web target
- [`zone1-planning.md`](./zone1-planning.md) — attacker-side scenarios

---

## 1. Overview

Zone 4 is the AEGIS Security Operations Center. It observes every other zone,
correlates events across sources, and drives automated response.

**Design principle:** the SOC has no enforcement authority. It sees everything,
controls nothing. Compromising Zone 4 exposes visibility — not access.

### Four-zone model

```
Zone 1 — Public          Kali, external clients, Juice Shop public surface
Zone 2 — Enterprise      AD DS, Windows client, Linux web host (domain-joined)
Zone 3 — Enforcement     Traefik, Authelia, Keycloak, Coraza (this gateway)
Zone 4 — SOC             Wazuh, Elasticsearch, Kibana, Shuffle, MISP
```

Every event that matters flows from Zones 1–3 into Zone 4 via Wazuh.

---

## 2. Zone 4 Topology

The SOC runs on **four VMs** on the `10.16.64.0/25` subnet (note: `/25`, not
`/24` — usable range `10.16.64.1` – `10.16.64.126`).

| Host | IP | Role | Purpose |
|---|---|---|---|
| **minisoc1** | `10.16.64.155` | The Vault | Elasticsearch 8.19 |
| **minisoc2** | `10.16.64.156` | The Brain | Wazuh manager, Kibana |
| **minisoc3** | `10.16.64.157` | The Executor | Shuffle SOAR, MISP, Logstash |
| **minisoc4** | `10.16.64.158` | (reserved) | — |

### 2.1 Services per host

| Host | Service | Port | Protocol |
|---|---|---|---|
| minisoc1 | Elasticsearch | 9200 | HTTPS + basic auth |
| minisoc1 | Elasticsearch transport | 9300 | Internal cluster |
| minisoc2 | Wazuh agent receiver | 1514 | TCP |
| minisoc2 | Wazuh enrollment | 1515 | TCP |
| minisoc2 | Wazuh API | 55000 | HTTPS (JWT auth) |
| minisoc2 | Kibana | 5601 (`/kibana`) | HTTPS |
| minisoc3 | Shuffle web UI | 3001 | HTTP |
| minisoc3 | Shuffle backend | 5001 | Internal |
| minisoc3 | MISP | 8080 / 8443 | HTTP/HTTPS |
| minisoc3 | Logstash | 5044 | TCP (Beats) |
| minisoc3 | Shuffle OpenSearch | 9200 (container) | Internal |

### 2.2 Stack versions

| Component | Version |
|---|---|
| Wazuh manager | **4.14.4** |
| Wazuh agents | 4.14.4 (WEB01 is 4.14.6) |
| Elasticsearch | 8.19 |
| Kibana | 8.19.13 |
| Logstash | 8.19.13 |
| Shuffle | latest (docker) |
| MISP | latest (docker) |

**Agent version rule:** agent version must be **≤** manager version. Agent
4.14.7 against manager 4.14.4 fails with `SSL error (1) — Connection refused`.
Patch-level differences within 4.14.x are tolerated.

---

## 3. Network Path (agent → manager)

Agents do **not** connect directly to Zone 4. They go through the gateway's
Traefik TCP forwarders.

```
┌────────────────────────────────────────────────────────────────────┐
│ Zone 2 or 3 host with Wazuh agent                                  │
│                                                                    │
│   ossec-agent  ──► TCP 1514 ──► 192.168.50.1 (gateway ens34)      │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ ztagateway — Traefik TCP forwarders                                │
│                                                                    │
│   :1514 ──► relay to 10.16.64.156:1514                            │
│   :1515 ──► relay to 10.16.64.156:1515                            │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ minisoc2 — Wazuh manager                                           │
│                                                                    │
│   :1514 (wazuh-remoted)  accepts agent event streams              │
│   :1515 (wazuh-authd)    enrollment                                │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ minisoc1 — Elasticsearch                                           │
│                                                                    │
│   Index: wazuh-alerts-4.x-YYYY.MM.DD                              │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ minisoc2 — Kibana (:5601/kibana)                                   │
│                                                                    │
│   Query, dashboards, detection rules                              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 3.1 Why the relay pattern

Zone 2 and Zone 3 hosts cannot route to `10.16.64.0/25` directly —
the ministry network has a firewall boundary. The gateway's public interface
(`ens33`, `192.168.19.173`) can reach Zone 4 on ports 1514/1515.

Rather than open a new path, we reuse the same Traefik forwarder that already
exists for the gateway's own agent. This means:

- Agents only need to reach `192.168.50.1:1514/1515` (L2-adjacent)
- No routing rules between the lab and Zone 4
- All agent traffic is TLS-encrypted inside the Wazuh protocol

### 3.2 Verified connectivity

From the gateway:
```bash
nc -zv 10.16.64.156 1514   # succeeded
nc -zv 10.16.64.156 1515   # succeeded
nc -zv 10.16.64.156 5601   # succeeded (Kibana)
nc -zv 10.16.64.155 9200   # succeeded (from any lab host)
nc -zv 10.16.64.156 55000  # refused — blocked by network policy
```

**Note:** port 55000 (Wazuh API) is not reachable from the lab. All API-based
verification must happen via SSH on minisoc2, or via Elasticsearch queries
from the gateway.

---

## 4. Credentials and Access

### 4.1 Where credentials live

| Credential | Location | Notes |
|---|---|---|
| Elasticsearch admin | `/opt/soc/.env` on minisoc3 | `ES_USER`, `ES_PASSWORD` |
| MISP admin | `/opt/soc/.env` on minisoc3 | Multiple passwords |
| Shuffle webhook | `/opt/soc/.env` on minisoc3 | `SHUFFLE_WEBHOOK` |
| Wazuh API | `wazuh:wazuh` (default) | Reachable only from minisoc2 |

### 4.2 Security debt

- **All credentials are in plaintext** in `/opt/soc/.env` on minisoc3.
- The file is mode `600` but readable by root only.
- **The elastic password has been shared in documentation** during the
  development session — rotate before production.
- **No secret manager is in use.** Production should use HashiCorp Vault
  or equivalent.

### 4.3 SSH access

Each minisoc host has a user account. The AEGIS lab session uses
`taibi@minisocN` with sudo.

---

## 5. Wazuh Manager Configuration (minisoc2)

### 5.1 Core services

Listening ports confirmed:

```
0.0.0.0:55000    python3         wazuh-apid
0.0.0.0:1515     wazuh-authd     enrollment
0.0.0.0:1514     wazuh-remoted   agent event stream
```

Configuration file: `/var/ossec/etc/ossec.conf`

Key blocks:
```xml
<remote>
  <connection>secure</connection>
  <port>1514</port>
  <protocol>tcp</protocol>
</remote>

<auth>
  <disabled>no</disabled>
  <port>1515</port>
  <use_source_ip>no</use_source_ip>
</auth>

<cluster>
  <name>wazuh</name>
  <node_name>node01</node_name>
  <node_type>master</node_type>
</cluster>
```

### 5.2 Enrollment

`authd.pass` is **not** set — enrollment is open on port 1515. Agents can
register any time they can reach the port. For a closed lab this is
acceptable; production should set `authd.pass`.

### 5.3 Webhook integration (planned)

To forward alerts to Shuffle:
```xml
<integration>
  <name>shuffle</name>
  <hook_url>http://10.16.64.157:3001/api/v1/hooks/<workflow-id></hook_url>
  <level>7</level>
  <alert_format>json</alert_format>
</integration>
```

**Status:** not yet enabled. See §10.

---

## 6. Agent Deployment

### 6.1 Deployed agents

| Agent | Host | Zone | OS | Status | Enrolled |
|---|---|---|---|---|---|
| `ztagateway` | ztagateway | 3 | Ubuntu 24.04 | Active | 2026-09 |
| `CORP-PC01` | CORP-PC01 | 2 | Windows 10 Pro | Active | 2026-09-29 |
| `CORP-DC01` | CORP-DC01 | 2 | Windows Server 2022 | Active | 2026-09-29 |
| `CORP-WEB01` | CORP-WEB01 | 2 | Ubuntu 24.04 | Active | 2026-09-29 |

Verified on minisoc2:
```bash
sudo /var/ossec/bin/agent_control -l

# Output:
# ID: 000, Name: minisoc2 (server), IP: 127.0.0.1, Active/Local
# ID: 004, Name: ztagateway,  IP: any, Active
# ID: 005, Name: CORP-PC01,   IP: any, Active
# ID: 006, Name: CORP-DC01,   IP: any, Active
# ID: 007, Name: CORP-WEB01,  IP: any, Active
```

### 6.2 Windows agent — install

Applies to CORP-PC01 and CORP-DC01.

```powershell
# Elevated PowerShell
$msi = "$env:USERPROFILE\wazuh-agent-4.14.4.msi"
curl.exe -L -o $msi `
  "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.4-1.msi"

msiexec.exe /i $msi /q `
  WAZUH_MANAGER="192.168.50.1" `
  WAZUH_AGENT_NAME="CORP-PC01" `
  WAZUH_REGISTRATION_SERVER="192.168.50.1" `
  WAZUH_REGISTRATION_PORT="1515" `
  WAZUH_PROTOCOL="tcp"
```

Then enroll:
```powershell
& "C:\Program Files (x86)\ossec-agent\agent-auth.exe" -m 192.168.50.1 -p 1515
```

Start the service:
```powershell
Start-Service -Name WazuhSvc
```

### 6.3 Linux agent — install

Applies to CORP-WEB01.

```bash
# Download
curl -sO https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.14.4-1_amd64.deb

# Install with manager pointing at the gateway relay
sudo WAZUH_MANAGER='192.168.50.1' \
     WAZUH_AGENT_NAME='CORP-WEB01' \
     WAZUH_REGISTRATION_SERVER='192.168.50.1' \
     WAZUH_REGISTRATION_PORT='1515' \
     dpkg -i ./wazuh-agent_4.14.4-1_amd64.deb

sudo systemctl daemon-reload
sudo systemctl enable --now wazuh-agent
```

---

## 7. Log Collection Configuration

Each agent collects a specific set of log sources.

### 7.1 Windows client (CORP-PC01)

Add to `C:\Program Files (x86)\ossec-agent\ossec.conf` before the closing
`</ossec_config>`:

```xml
<localfile>
  <location>Microsoft-Windows-Sysmon/Operational</location>
  <log_format>eventchannel</log_format>
</localfile>
<localfile>
  <location>Microsoft-Windows-PowerShell/Operational</location>
  <log_format>eventchannel</log_format>
</localfile>
<localfile>
  <location>Security</location>
  <log_format>eventchannel</log_format>
</localfile>
```

**Prerequisite:** Sysmon must be installed with a baseline config
(SwiftOnSecurity or equivalent). Without Sysmon, Event IDs 1, 3, 8, 10,
11, 13 are not available.

### 7.2 Windows Domain Controller (CORP-DC01)

```xml
<localfile>
  <location>Security</location>
  <log_format>eventchannel</log_format>
  <only-future-events>yes</only-future-events>
</localfile>
<localfile>
  <location>System</location>
  <log_format>eventchannel</log_format>
</localfile>
<localfile>
  <location>Microsoft-Windows-PowerShell/Operational</location>
  <log_format>eventchannel</log_format>
</localfile>
```

### 7.3 Linux host (CORP-WEB01)

```xml
<localfile>
  <log_format>audit</log_format>
  <location>/var/log/audit/audit.log</location>
</localfile>
<localfile>
  <log_format>journald</log_format>
  <location>journald</location>
</localfile>
<localfile>
  <log_format>syslog</log_format>
  <location>/var/log/auth.log</location>
</localfile>
<localfile>
  <log_format>syslog</log_format>
  <location>/var/log/syslog</location>
</localfile>
```

### 7.4 Buffer sizing

Under heavy initial load (syscheck + SCA scans at agent startup), the default
1024-message queue can fill. Bump it:

```xml
<client_buffer>
  <disabled>no</disabled>
  <queue_size>10000</queue_size>
  <events_per_second>1000</events_per_second>
</client_buffer>
```

Without this, audit events can be silently dropped during the initial
sync burst.

---

## 8. AD Audit Policy — via GPO, not `auditpol`

**This is the single most important learning from the deployment.**

On a domain controller, `auditpol /set` is reverted by Group Policy on the
next `gpupdate`. Attempting to configure audit via `auditpol` on DC01
results in the setting appearing to work until the next policy refresh,
after which events stop being logged.

**The correct approach: configure audit in the Default Domain Controllers
Policy GPO.**

### 8.1 GPO path

```
gpmc.msc
→ Forest → Domains → aegis.corp → Group Policy Objects
→ Default Domain Controllers Policy → Edit
→ Computer Configuration
→ Policies
→ Windows Settings
→ Security Settings
→ Advanced Audit Policy Configuration
→ Audit Policies
```

### 8.2 Required subcategories

| Category | Subcategory | Setting |
|---|---|---|
| Account Logon | Credential Validation | Success + Failure |
| Account Logon | Kerberos Authentication Service | Success + Failure |
| Account Logon | Kerberos Service Ticket Operations | Success + Failure |
| Account Management | User Account Management | Success + Failure |
| Account Management | Security Group Management | **Success + Failure** |
| Account Management | Computer Account Management | Success + Failure |
| Account Management | Other Account Management Events | Success + Failure |
| Logon/Logoff | Logon | Success + Failure |
| Logon/Logoff | Logoff | Success + Failure |
| Logon/Logoff | Account Lockout | Success |
| Logon/Logoff | Special Logon | Success |
| DS Access | Directory Service Changes | Success |

### 8.3 Apply and verify

```powershell
gpupdate /force

# Verify the setting is active
auditpol /get /subcategory:"Security Group Management"
# Expected: Success and Failure
```

### 8.4 Group-change event ID — the correct trio

**Group scope determines which event ID fires.** This is a common source of
confusion and must be handled correctly in correlation rules.

| Event ID | Group scope | AEGIS groups |
|---|---|---|
| **4728** | Security-enabled **global** group | `GRP_IT_Admin`, `GRP_Web_Ops`, `GRP_Finance` |
| 4732 | Security-enabled **local** group | (none — built-in only) |
| 4756 | Security-enabled **universal** group | (none — schema/enterprise groups) |

**Correlation rules must use `4728 OR 4732 OR 4756`**, not `4732` alone.
Most "4732 doesn't fire" problems are actually the wrong scope being tested.

---

## 9. Verified Evidence

Every layer was tested end-to-end on 2026-09-29. All queries were run from
the gateway against `https://10.16.64.155:9200` with basic auth.

### 9.1 Sysmon — process creation

Query:
```bash
curl -sk -u 'elastic:<password>' \
  'https://10.16.64.155:9200/wazuh-alerts-4.x-*/_search' \
  -H 'Content-Type: application/json' -d '{
    "query": {"bool": {"must": [
      {"term": {"agent.name": "CORP-PC01"}},
      {"term": {"data.win.system.eventID": "1"}}
    ]}},
    "sort": [{"@timestamp": "desc"}], "size": 5
  }' | jq '.hits.hits[]._source | {time: ."@timestamp", cmd: .data.win.eventdata.commandLine}'
```

Response:
```json
{ "cmd": "net user" }
{ "cmd": "C:\\Windows\\system32\\net1 user" }
{ "cmd": "\\\"cmd.exe\\\" /c powershell.exe -e  JgAgACgAZwBjAG0AIA..." }
```

### 9.2 Atomic Red Team — encoded PowerShell (T1059.001)

The `powershell.exe -e <base64>` command line was captured with the full
base64 payload visible in Elasticsearch. This is the classic
**command-and-control obfuscation pattern** used by attackers to evade
string-based detection.

**Significance for the PFE:** the SOC can see exactly what an attacker
executed, down to the base64 blob.

### 9.3 AD user creation — Event 4720

```json
{
  "time": "2026-09-29T11:09:48.464Z",
  "rule": "User account enabled or created",
  "user": "soc-test-temp"
}
```

### 9.4 AD group member add — Event 4728

**The privilege escalation trigger.**

```json
{
  "time": "2026-09-29T11:22:55.420Z",
  "rule": "Security Enabled Global Group Member Added S-1-5-21-...",
  "event": "4728",
  "member": "CN=salima,OU=Finance_Sales,OU=Departments,DC=aegis,DC=corp",
  "group": "GRP_IT_Admin"
}
```

This event is the first half of every privilege-escalation correlation rule.

### 9.5 Linux auditd events (CORP-WEB01)

```json
{
  "time": "2026-09-29T11:54:39.756Z",
  "rule": "Auditd: SELinux permission check.",
  "command": "\"apparmor_parser\""
}
```

Audit events from the `aegis_*` rule set are reaching Elasticsearch.
Rule IDs to look for: `aegis_exec`, `aegis_cred_read`, `aegis_net_socket`,
`aegis_priv_esc`, `aegis_shell`, `aegis_persist_cron`, `aegis_sudoers_change`.

### 9.6 Web track — Coraza WAF block

From `coraza_logs/access.log` on the gateway:

```json
{
  "request": {
    "method": "GET",
    "uri": "/rest/products/search?q=%27+OR+1%3d1--",
    "headers": {"User-Agent": ["sqlmap/1.10.8#stable (https://sqlmap.org)"]}
  },
  "status": 403
}
```

SQLi payload and sqlmap User-Agent both blocked by CRS rules.

---

## 10. Outstanding Work

| Item | Priority | Status | Notes |
|---|---|---|---|
| **Discord integration** | High | Pending | See §10.1 |
| **Shuffle workflow for Wazuh alerts** | High | Pending | See §10.1 |
| ECS field normalization | Medium | Pending | See §10.2 |
| Correlation rules (EQL) | Medium | Blocked on ECS | See §10.3 |
| Kibana dashboards | Low | Pending | See §10.4 |
| Active Response playbooks | Low | Blocked on Discord | — |
| Rotate ES credentials | High | Pending | Currently plaintext |
| Enable TLS cert pinning on agents | Low | Optional | Currently trust-on-first-use |
| Close enrollment port (set authd.pass) | Medium | Optional | Currently open |

### 10.1 Discord integration

**Goal:** every Wazuh alert with `level ≥ 7` reaches a Discord channel.

**Steps:**

1. **Create Discord webhook.**
   - Channel Settings → Integrations → Webhooks → New Webhook
   - Copy the URL (e.g. `https://discord.com/api/webhooks/...`)

2. **Create Shuffle workflow.**
   - Open Shuffle at `http://10.16.64.157:3001`
   - New workflow: `wazuh-alert-router`
   - Add trigger: **Webhook** node — copy its URL
   - Add action: **Discord** node — paste the Discord webhook URL
   - Map fields: `rule.description`, `agent.name`, `data.win.eventdata.commandLine`
   - Save + Activate

3. **Configure Wazuh integrator.**
   On minisoc2, add to `/var/ossec/etc/ossec.conf`:
   ```xml
   <integration>
     <name>shuffle</name>
     <hook_url>http://10.16.64.157:3001/api/v1/hooks/<shuffle-webhook-id></hook_url>
     <level>7</level>
     <alert_format>json</alert_format>
   </integration>
   ```
   Restart: `sudo systemctl restart wazuh-manager`

4. **Test.**
   - On PC01, run `Invoke-AtomicTest T1059.001 -TestNumbers 17 -PathToAtomicsFolder $folder`
   - Watch Discord for the alert within ~10 seconds

### 10.2 ECS normalization

Wazuh's default fields don't map to Elastic Common Schema. For cross-index
EQL correlation to work, these fields must be normalized:

| Wazuh field | ECS target |
|---|---|
| `data.win.eventdata.ipAddress` | `source.ip` |
| `data.win.eventdata.targetUserName` | `user.name` |
| `data.win.eventdata.subjectUserName` | `user.target.name` |
| `data.win.system.eventID` | `event.code` |
| `rule.level` | `event.severity` |
| `rule.description` | `event.action` |

**Two implementation paths:**
- Elasticsearch ingest pipeline on the Wazuh index template (preferred)
- Filebeat processor chain between Wazuh and Elasticsearch (more components)

### 10.3 Correlation rules (EQL)

Once ECS is in place, EQL sequences become possible. All group-change rules
use the correct event ID trio.

| Rule | EQL logic |
|---|---|
| Privilege escalation chain | `sequence by user.name [ ad 4728/4732/4756 for GRP_IT_Admin ] [ keycloak login same user ] within 5m` |
| Authelia brute + scan | `sequence by source.ip [ authelia failure > 5 ] [ suricata scan ]` |
| WAF block + pivot | `sequence by source.ip [ coraza block ] [ authelia failure ] [ keycloak token ]` |
| Stale session | `sequence by user.name [ ad 4725 ] [ authelia success ]` |
| Kerberoasting | `sequence by user.name [ ad kerberos failure across hosts ]` |

### 10.4 Kibana dashboards

Planned dashboards:
- Identity Activity Timeline (per-user view)
- Privilege Escalation Monitor (4728/4732/4756 focus)
- Session Lifecycle (Authelia + Keycloak sessions)
- Response Actions Log (from Shuffle feedback)
- Detection Rule Performance (FP rate, MTTF)
- Federation Health (LDAP latency, sync)
- Zero Trust Posture (trends for reporting)

---

## 11. Reference — Verification Commands

### 11.1 From the gateway (jq available)

**Count events from an agent:**
```bash
curl -sk -u 'elastic:<password>' \
  'https://10.16.64.155:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"term":{"agent.name":"CORP-PC01"}}}'
```

**Latest events from an agent:**
```bash
curl -sk -u 'elastic:<password>' \
  'https://10.16.64.155:9200/wazuh-alerts-4.x-*/_search' \
  -H 'Content-Type: application/json' -d '{
    "query": {"term": {"agent.name": "CORP-DC01"}},
    "sort": [{"@timestamp": "desc"}], "size": 5
  }' | jq '.hits.hits[]._source | {time: ."@timestamp", rule: .rule.description}'
```

**Group change events (correct IDs):**
```bash
curl -sk -u 'elastic:<password>' \
  'https://10.16.64.155:9200/wazuh-alerts-4.x-*/_search' \
  -H 'Content-Type: application/json' -d '{
    "query": {"bool": {"must": [
      {"term": {"agent.name": "CORP-DC01"}},
      {"terms": {"data.win.system.eventID": ["4728","4732","4756"]}}
    ]}},
    "sort": [{"@timestamp": "desc"}], "size": 3
  }' | jq '.hits.hits[]._source | {
    time: ."@timestamp",
    rule: .rule.description,
    member: .data.win.eventdata.memberName,
    group: .data.win.eventdata.targetUserName
  }'
```

**List indices matching a pattern:**
```bash
curl -sk -u 'elastic:<password>' \
  'https://10.16.64.155:9200/_cat/indices/wazuh-*?v' | head -20
```

### 11.2 From minisoc2 (SSH)

```bash
# All agents
sudo /var/ossec/bin/agent_control -l

# Specific agent details
sudo /var/ossec/bin/agent_control -i 007

# Manager log
sudo tail -30 /var/ossec/logs/ossec.log

# API token (if reachable from localhost)
TOKEN=$(curl -sk -X POST "https://localhost:55000/security/user/authenticate" \
  -u wazuh:wazuh | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -sk -H "Authorization: Bearer $TOKEN" \
  "https://localhost:55000/agents?pretty=true" | python3 -m json.tool
```

### 11.3 From DC01 (Windows PowerShell)

```powershell
# Confirm events are being logged locally
Get-WinEvent -LogName Security -MaxEvents 100 |
  Where-Object { $_.Id -in @(4720,4728,4732,4756,4740,4625) } |
  Select TimeCreated, Id -First 10

# Confirm audit policy
auditpol /get /category:*

# Confirm agent is running
Get-Service -Name WazuhSvc

# Tail agent log
Get-Content "C:\Program Files (x86)\ossec-agent\ossec.log" -Tail 20
```

### 11.4 From CORP-WEB01 (Linux)

```bash
# Confirm auditd rules are loaded
sudo auditctl -l | grep aegis

# Confirm audit log is filling
sudo ausearch -k aegis_exec --start recent | tail -5

# Confirm agent is running
systemctl status wazuh-agent

# Tail agent log
sudo tail -20 /var/ossec/logs/ossec.log
```

---

## 12. Troubleshooting

### Agent won't connect

**Symptom:** `ERROR: (1216): Unable to connect to '[127.0.0.1]:1514/tcp'`

**Cause:** wrong manager address, or the gateway relay is down.

**Fix:**
```bash
# On the agent host
Test-NetConnection -ComputerName 192.168.50.1 -Port 1514   # Windows
nc -zv 192.168.50.1 1514                                   # Linux

# On the gateway
docker ps | grep traefik
docker logs traefik --tail 20 | grep 1514
```

### Enrollment duplicate

**Symptom:** `ERROR: Duplicate agent name: <name>. Unable to add agent`

**Cause:** agent name already registered on the manager.

**Fix:** on minisoc2:
```bash
sudo /var/ossec/bin/agent_control -l   # find the ID
sudo /var/ossec/bin/manage_agents -r <ID>
```

Then re-run `agent-auth` on the agent.

### Audit events not appearing in ES

**Symptom:** `ausearch -k aegis_exec` shows events locally, but ES query for `location: /var/log/audit/audit.log` returns nothing.

**Cause 1:** agent's `ossec.conf` missing the auditd localfile block.
**Cause 2:** message queue overflow during initial scan burst.

**Fix:**
```bash
# Verify localfile block
sudo grep -A2 audit /var/ossec/etc/ossec.conf

# Bump queue size
# (see §7.4)
sudo systemctl restart wazuh-agent
```

### Group change event missing

**Symptom:** `auditpol /get /subcategory:"Security Group Management"` shows `No Auditing`, even after `auditpol /set`.

**Cause:** GPO overrides local audit policy on domain controllers.

**Fix:** see §8. Configure the audit policy in the Default Domain Controllers
Policy GPO, then `gpupdate /force`.

### Wrong event ID for group change

**Symptom:** querying for `4732` returns nothing, but the change clearly happened.

**Cause:** `GRP_*` are **global** security groups, so event ID is **4728**,
not 4732.

**Fix:** query for all three:
```json
"terms": {"data.win.system.eventID": ["4728","4732","4756"]}
```

### Wazuh API unreachable

**Symptom:** `curl https://10.16.64.156:55000` times out.

**Cause:** port 55000 is blocked by the ministry network firewall.

**Workaround:** verify agents via SSH on minisoc2, or via Elasticsearch
queries from the gateway.

---

## 13. What This Enables

The SOC integration is what turns the AEGIS architecture from a set of
individual security tools into a coherent detection system.

**Without SOC:**
- Authelia blocks a login — but no one knows
- Keycloak issues a token — but no correlation with what happened before
- AD user added to an admin group — invisible unless someone checks DC01
- WAF blocks SQLi — logged in a file no one reads

**With SOC:**
- Every login decision is searchable
- Every token issuance is correlated with the preceding authentication
- Every privileged group change is captured and can trigger rules
- Every WAF block is visible in a dashboard

**The Zero Trust claim becomes verifiable:**
> "Every identity decision — login, MFA, group denial, token issuance,
> AD group change — flows to the SOC and is correlated across sources."

That statement is now backed by evidence. Every layer of the identity plane
ships to the same SOC, in the same index pattern, queryable from one Kibana
instance.

---

## 14. Change Log

| Date | Change |
|---|---|
| 2026-09-29 | Initial deployment: Wazuh agents on ztagateway, PC01, DC01, WEB01. Verified Sysmon, AD events, atomic test detection. |
| — | (Future) Discord integration enabled |
| — | (Future) ECS normalization implemented |
| — | (Future) First EQL correlation rule |

---

*End of SOC integration reference.*
