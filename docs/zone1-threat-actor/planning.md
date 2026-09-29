# Zone 1 — Threat Actor Planning

**Status:** Infrastructure ready, execution pending
**Last update:** 2026-09-29
**Next session goal:** validate both attack tracks end-to-end

This document is the operational roadmap for Zone 1 — the adversary side of
the AEGIS architecture. It defines what the attacker has, what they will do,
what the defender should see, and how the evidence is captured.

---

## 1. Purpose

Zone 1 is the untrusted network. It contains:

- Client browsers (any network, any device)
- Juice Shop (the deliberately vulnerable target)
- **The threat actor** — Kali Linux with Atomic Red Team

Two independent attack tracks feed the same SOC detection pipeline:

| Track | Attacker origin | Target | Detection layer |
|---|---|---|---|
| **Web** | Kali → gateway `ens33` | Juice Shop via Traefik + Coraza | WAF + access logs |
| **Endpoint** | Local execution on Windows/Linux hosts | PC01, WEB01, DC01 | Sysmon + auditd → Wazuh |

The two-track design mirrors reality: external attackers hit the perimeter,
post-exploitation TTPs run inside the network. Both must be detected.

---

## 2. Attacker infrastructure

### 2.1 Kali Linux VM

| Attribute | Value |
|---|---|
| Hostname | `kali` |
| IP | `192.168.19.183/24` |
| Gateway | `192.168.19.2` |
| Route to lab | `192.168.50.0/24 via 192.168.19.173` (persisted) |
| User | `ezio` (sudo-enabled) |

### 2.2 Installed tooling

| Tool | Purpose | Status |
|---|---|---|
| PowerShell 7.4.6 | Atomic framework runtime | ✅ installed |
| Invoke-AtomicRedTeam 2.3.0 | Test orchestration | ✅ installed |
| atomic-red-team atomics | TTP definitions | ✅ cloned at `/opt/atomic-red-team` |
| Symlink `~/AtomicRedTeam` | Module path resolution | ✅ |
| nmap | Port scanning | ✅ (Kali default) |
| sqlmap 1.10.8 | SQLi automation | ✅ |
| nikto | Web scanner | ✅ |
| hydra | Credential attacks | ✅ |
| testssl.sh | TLS enumeration | ✅ |
| Burp Suite | Manual web attacks | ✅ |

### 2.3 Network capabilities

| Direction | Status | Notes |
|---|---|---|
| Kali → `192.168.19.173:443` (gateway public) | ✅ | Web attacks hit here |
| Kali → `192.168.50.0/24` (lab subnet) | ✅ | Route added + gateway FORWARD rule |
| Kali → PC01 `:22`, `:5985` | ✅ | Once firewall rules set |
| Kali → external internet | ✅ | For tool downloads |

---

## 3. Attacker tracks

### 3.1 Web track — external attacker hitting the perimeter

**Path:** Kali → Traefik (`192.168.19.173:443`) → Coraza WAF → CORP-WEB01:3000

**Target:** `https://juiceshop.zerotrust.lan`

**Kali setup:**
- `/etc/hosts` entries point `*.zerotrust.lan` at `192.168.19.173`
- Wildcard cert trusted via `update-ca-certificates`
- Cert verified: `subject=CN=zerotrust.lan`

**Already validated:**
| Test | Result |
|---|---|
| Normal GET | 200 |
| SQLi `' OR 1=1--` | **403** (CRS 942xxx) |
| sqlmap User-Agent | **403** (CRS 913xxx scanner detection) |
| socket.io POST from app | 400 (passes WAF, app rejects) |

**Pending scenarios:**
- XSS (`<script>alert(1)</script>`) → expect 403
- Path traversal (`../../../etc/passwd`) → expect 403
- Command injection (`;cat /etc/passwd`) → expect 403
- Nikto scan → expect signature-based blocks
- testssl.sh → expect TLS-only-1.2+ finding
- Burp Suite manual flows → expect targeted blocks or detection

### 3.2 Endpoint track — post-exploitation TTPs run locally

**Principle:** run atomics on the target machine (not remotely). This mimics
malware already executing on a compromised host — the realistic post-
exploitation scenario.

**Targets:**
| Host | OS | Agent | Status |
|---|---|---|---|
| CORP-PC01 | Windows 10/11 | Sysmon | ✅ installed & running |
| CORP-WEB01 | Ubuntu 24.04 | auditd + AEGIS rules | ✅ ready |
| CORP-DC01 | Windows Server 2022 | (Sysmon pending) | ⏳ |

**PC01 setup status:**
| Item | Status |
|---|---|
| Sysmon64 service | ✅ running |
| PowerShell 7 | ❌ not installed (Windows PS 5.1 works) |
| Invoke-AtomicRedTeam module | ✅ installed |
| Execution policy | ✅ `RemoteSigned` (CurrentUser) |
| atomic-red-team atomics | ❌ download interrupted — resume tomorrow |
| First test execution | ⏳ pending |

**Resume from:**
```powershell
# Redo the download (didn't complete)
$zip = "$env:USERPROFILE\atomic.zip"
Invoke-WebRequest -Uri "https://github.com/redcanaryco/atomic-red-team/archive/refs/heads/master.zip" `
  -OutFile $zip

Expand-Archive -Path $zip -DestinationPath "$env:USERPROFILE" -Force
Rename-Item "$env:USERPROFILE\atomic-red-team-master" "$env:USERPROFILE\AtomicRedTeam"
```

---

## 4. Attack scenario catalog

Mapped to MITRE ATT&CK. Each scenario has a defined attacker action, target,
expected defender signal, and success criterion.

### 4.1 Web attacks (Kali → Gateway → Juice Shop)

| # | Scenario | MITRE | Command | Expected signal |
|---|---|---|---|---|
| W1 | SQLi detection | T1190 | `sqlmap -u ".../search?q=1" --batch --level=3` | Coraza 942xxx, 403 |
| W2 | Reflected XSS | T1059.007 | `<script>alert(1)</script>` in query | Coraza 941xxx, 403 |
| W3 | Path traversal | T1083 | `../../../etc/passwd` payloads | Coraza 930xxx, 403 |
| W4 | Command injection | T1059 | `;cat /etc/passwd` payloads | Coraza 932xxx, 403 |
| W5 | Nikto scan | T1595.002 | `nikto -h https://juiceshop.zerotrust.lan` | Coraza 913xxx |
| W6 | TLS probe | T1600 | `testssl.sh juiceshop.zerotrust.lan:443` | (informational) |
| W7 | Credential brute force | T1110.001 | `hydra` against Authelia `/api/firstfactor` | Authelia ban event |
| W8 | Password spray | T1110.003 | One password against multiple AD users | Authelia log (no ban — detection gap to document) |

### 4.2 Endpoint attacks (local on Windows hosts)

| # | Scenario | MITRE | Atomic test | Detection |
|---|---|---|---|---|
| E1 | PowerShell execution | T1059.001 | `Invoke-AtomicTest T1059.001 -TestNumbers 1` | Sysmon Event 1 |
| E2 | Encoded PowerShell | T1059.001 | `Invoke-AtomicTest T1059.001 -TestNumbers 5` | Sysmon Event 1 with `-enc` |
| E3 | Scheduled task persistence | T1053.005 | `Invoke-AtomicTest T1053.005 -TestNumbers 1` | Sysmon Event 1 + Security 4698 |
| E4 | Registry Run key | T1547.001 | `Invoke-AtomicTest T1547.001 -TestNumbers 1` | Sysmon Event 13 |
| E5 | AD user enumeration | T1087.002 | `Invoke-AtomicTest T1087.002 -TestNumbers 1` | Sysmon Event 1 (net.exe) |
| E6 | Credential dump via LSASS | T1003.001 | `Invoke-AtomicTest T1003.001 -TestNumbers 1` | Sysmon Event 10 (process access) |
| E7 | WMI execution | T1047 | `Invoke-AtomicTest T1047 -TestNumbers 1` | Sysmon Event 1 (wmic.exe) |

### 4.3 Endpoint attacks (local on Linux hosts — WEB01)

| # | Scenario | MITRE | Atomic test | Detection |
|---|---|---|---|---|
| L1 | Linux discovery | T1087.001 | `Invoke-AtomicTest T1087.001` | auditd `aegis_exec` |
| L2 | Reverse shell | T1059.004 | Custom or `Invoke-AtomicTest T1059.004` | auditd `aegis_net_socket` |
| L3 | Cron persistence | T1053.003 | `Invoke-AtomicTest T1053.003` | auditd `aegis_persist_cron` |
| L4 | Credential file access | T1003.008 | `cat /etc/shadow` (manual) | auditd `aegis_cred_read` |
| L5 | SSH key access | T1552.004 | `cat ~/.ssh/*` | auditd `aegis_home_tamper` |

---

## 5. Detection pipeline

### 5.1 Expected flow

```
Attacker action
    │
    ▼
Telemetry source:
   Web track     → Coraza logs (JSON)
   Windows       → Sysmon Event Log
   Linux         → auditd / syslog / journald
    │
    ▼
Wazuh agent (on the host)
    │
    ▼
Wazuh manager (Zone 4 — 10.16.64.156)
    │
    ├─► Rule engine matches → alert
    │
    └─► Integrator → Shuffle webhook
            │
            ├─► Enrich (MISP, AD lookup)
            ├─► Discord notification
            └─► Response action (revoke session, disable account)
```

### 5.2 What's deployed vs. blocked

| Component | Status | Notes |
|---|---|---|
| Coraza WAF log | ✅ | Local logs at `~/zerotrust-network/coraza_logs/` |
| Sysmon on PC01 | ✅ | Windows Event Log, local |
| auditd on WEB01 | ✅ | `/var/log/audit/audit.log` |
| Wazuh agent (all hosts) | ❌ | Pending Zone 4 reachability |
| Wazuh manager | ❌ | Not reachable from lab |
| Shuffle / Discord | ❌ | Dependent on Wazuh manager |

**Consequence:** all telemetry is currently local-only. The detection chain
fires (Coraza blocks, Sysmon logs, auditd logs) but doesn't reach the SOC
until network access to Zone 4 is restored.

### 5.3 Local verification (works without Zone 4)

**Web track:**
```bash
# On gateway
tail -f ~/zerotrust-network/coraza_logs/access.log | \
  jq -r 'select(.status == 403) | "\(.request.uri) [\(.request.headers."User-Agent"[0])] → \(.status)"'
```

**Endpoint track (Windows):**
```powershell
# On PC01
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 20 |
  Where-Object { $_.Id -eq 1 } | Select TimeCreated, Message -First 3
```

**Endpoint track (Linux):**
```bash
# On WEB01
sudo ausearch -k aegis_exec --start recent | tail -10
```

---

## 6. Execution playbook

### 6.1 Pre-flight checklist (run before each session)

**On Kali:**
- [ ] `ping -c 2 192.168.50.20` (WEB01)
- [ ] `ping -c 2 192.168.50.11` (PC01)
- [ ] `getent hosts juiceshop.zerotrust.lan` → `192.168.19.173`
- [ ] `curl -sI https://juiceshop.zerotrust.lan/ | head -1` → 200

**On gateway:**
- [ ] `docker compose ps` — all services healthy
- [ ] `nc -zv 192.168.50.20 3000` — Juice Shop reachable
- [ ] Coraza log tail open in one terminal

**On PC01:**
- [ ] `Get-Service Sysmon64` → Running
- [ ] Event Viewer → Sysmon/Operational has recent events

**On WEB01:**
- [ ] `systemctl is-active auditd`
- [ ] `sudo ausearch -k aegis_exec --start today | head`

### 6.2 Per-scenario execution template

For each scenario:

1. **Open log capture** on the detection side
2. **Run the attack command**
3. **Capture the log evidence**
4. **Record the outcome** in a per-scenario markdown file
5. **Cleanup** any artifacts created

### 6.3 Evidence directory structure

```
~/attacks/
├── web/
│   ├── W1-sqli/
│   │   ├── command.txt
│   │   ├── attack.log        (sqlmap output)
│   │   ├── coraza.log        (grep'd Coraza entries)
│   │   └── summary.md        (verdict)
│   ├── W2-xss/
│   └── ...
└── endpoint/
    ├── E1-powershell/
    │   ├── command.txt
    │   ├── sysmon.log        (Get-WinEvent output)
    │   └── summary.md
    └── ...
```

### 6.4 Per-scenario summary template

```markdown
### W1 — SQL Injection

**MITRE:** T1190 · **Track:** Web · **Date:** YYYY-MM-DD HH:MM

**Attack**
- Command: sqlmap -u "..." --batch --level=3 --risk=2
- Duration: 
- Payloads sent: 

**Defender response**
- Coraza rule hit: 942xxx
- Status code: 403
- Number of blocks: 

**Evidence**
- coraza.log lines X-Y
- Screenshot: (attach)

**Verdict:** DEFENDED | DETECTED-NOT-DEFENDED | BYPASSED

**Notes:**
```

---

## 7. Known issues & workarounds

| Issue | Status | Workaround |
|---|---|---|
| VMware phantom gateway (`192.168.50.1` split) | ⚠️ | Static ARP on Kali: `ip neigh replace 192.168.50.1 lladdr 00:0c:29:c0:53:3c` — persistent via systemd |
| Kali has no route to lab subnet | ✅ fixed | Static route persisted |
| Gateway FORWARD blocks Kali → lab | ✅ fixed | iptables rule + systemd persistence |
| Coraza blocks Juice Shop's socket.io | ✅ fixed | `EXCLUSION-AEGIS.conf` with rule IDs 9001001/9001002 |
| Duplicate rule ID error in Coraza | ✅ fixed | Renamed to 9,000,000+ range |
| atomic-red-team zip download | ⏳ | Resume from PC01 — Ctrl+C'd mid-download |
| PC01 network profile not set | ⚠️ | Not blocking local atomics |
| No Zone 4 access | ❌ | All SOC integration deferred |

---

## 8. What "done" looks like

The Zone 1 track is complete when:

**Web track:**
- [ ] 5+ web attacks executed and documented (SQLi, XSS, LFI, RCE, scanner)
- [ ] WAF block evidence captured for each (rule ID + payload + source IP)
- [ ] At least one detection gap identified and documented

**Endpoint track:**
- [ ] 5+ atomic tests executed on PC01 (Windows)
- [ ] 3+ atomic tests executed on WEB01 (Linux)
- [ ] Sysmon events captured for each Windows test
- [ ] auditd events captured for each Linux test
- [ ] All events verified to reach the local log destination

**Integration (when Zone 4 available):**
- [ ] All telemetry sources ship to Wazuh manager
- [ ] Detection rules fire on the expected events
- [ ] Shuffle playbooks execute for critical alerts
- [ ] Discord receives notifications

**Report deliverables:**
- [ ] Per-scenario markdown with evidence
- [ ] Attack coverage matrix (MITRE tactics covered)
- [ ] Defense effectiveness summary (DEFENDED / DETECTED / BYPASSED)
- [ ] Detection gap register

---

## 9. Next session priorities

**Immediate (30 min):**
1. Resume atomic-red-team download on PC01
2. Run T1059.001 test 1
3. Capture Sysmon Event 1
4. Save as `~/attacks/endpoint/E1-powershell/`

**Short session (2 h):**
5. Run E2 through E7 on PC01
6. Run L1 through L5 on WEB01
7. Run W1 through W4 from Kali
8. Document each

**Longer session (4 h):**
9. Write detection rules for each scenario
10. Build per-scenario summary documents
11. Prepare the aggregated report section

---

## 10. Reference — MITRE tactics covered

| Tactic | Techniques | Track |
|---|---|---|
| Reconnaissance (TA0043) | T1595.002 | Web |
| Initial Access (TA0001) | T1190 | Web |
| Execution (TA0002) | T1059, T1059.001, T1059.004, T1047 | Both |
| Persistence (TA0003) | T1053.005, T1547.001, T1053.003 | Endpoint |
| Privilege Escalation (TA0004) | T1547.001 | Endpoint |
| Defense Evasion (TA0005) | T1059.001 (encoded) | Endpoint |
| Credential Access (TA0006) | T1003.001, T1003.008, T1110.001, T1110.003 | Both |
| Discovery (TA0007) | T1087.001, T1087.002, T1046 | Both |
| Collection (TA0009) | T1552.004 | Endpoint |

---

*End of Zone 1 threat actor planning.*
