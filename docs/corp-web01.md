# CORP-WEB01 — Web Target Host

**Zone:** 2 (Enterprise) · **Role:** Juice Shop target behind AEGIS WAF

This host runs the deliberately vulnerable web application used to validate
the AEGIS WAF and SOC detection pipeline. It sits on the enterprise subnet
alongside CORP-DC01 and CORP-PC01.

---

## 1. Identity

| Attribute | Value |
|---|---|
| Hostname | `CORP-WEB01` |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | 6.8.0-136-generic |
| Architecture | x86_64 |
| Naming family | `CORP-*` (enterprise naming convention) |
| Primary user | `ezio` (sudo-enabled) |

---

## 2. Network

### 2.1 Interface configuration

Managed by netplan at `/etc/netplan/99-static.yaml`:

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: false
      addresses:
        - 192.168.50.20/24
      routes:
        - to: default
          via: 192.168.50.1
      nameservers:
        addresses:
          - 192.168.50.10     # DC01 — authoritative for aegis.corp
          - 8.8.8.8           # Public fallback
```

| Field | Value |
|---|---|
| Interface | `ens33` |
| IP | `192.168.50.20/24` (static) |
| Gateway | `192.168.50.1` (ztagateway) |
| DNS primary | `192.168.50.10` (CORP-DC01) |
| DNS fallback | `8.8.8.8` |

### 2.2 Network placement

```
192.168.50.0/24
├── 192.168.50.1    ztagateway    (Zone 3 — gateway, WAF, identity)
├── 192.168.50.10   CORP-DC01     (Zone 2 — AD DS)
├── 192.168.50.13   CORP-PC01     (Zone 2 — Windows client, joined)
├── 192.168.50.20   CORP-WEB01    (Zone 2 — this host)
```

All hosts on this subnet are L2-adjacent. No routing needed between them.

### 2.3 Why DNS points at DC01

CORP-WEB01 does not need to resolve `*.zerotrust.lan` — that's the domain the
**client browsers** use, not the web server. The web server only needs to
resolve enterprise names (`aegis.corp`) and public names (via the `8.8.8.8`
fallback).

---

## 3. Role in AEGIS

### 3.1 Traffic path (inbound to the app)

```
Kali (Zone 1)                     attacker
     │
     │ HTTPS 443 → juiceshop.zerotrust.lan
     ▼
Traefik (Zone 3, 192.168.50.1)    TLS termination, route by Host
     │
     ▼
Coraza WAF (Zone 3)                OWASP CRS v4.29 inspection
     │
     │ pass / block
     ▼
CORP-WEB01 (Zone 2, 192.168.50.20:3000)
     │
     ▼
Juice Shop container               the deliberately vulnerable app
```

The attacker never reaches the app directly. Coraza is the only component
that talks to `192.168.50.20:3000`. If Coraza blocks, the app sees nothing.

### 3.2 Egress path

Outbound traffic from the container is via the host's default route
(`192.168.50.1`) — normal path, no special firewall rules observed.

---

## 4. Services

### 4.1 Listening ports

| Port | Process | Purpose |
|---|---|---|
| `22/tcp` | sshd | Remote admin (user `ezio`) |
| `3000/tcp` | Docker port-forward | Juice Shop web UI |

No other services observed. This is a single-purpose host.

### 4.2 Not listening

Notably absent:
- No local web server (`nginx`, `apache`, `caddy`) — all traffic is proxied
  to the Docker container
- No Wazuh agent listening
- No `auditd` (unconfirmed — see §7)
- No database, no cache, no app-server

---

## 5. The Juice Shop container

### 5.1 Compose file

Location: `~/target-range/juiceshop/docker-compose.yml`

```yaml
services:
  juice-shop:
    image: bkimminich/juice-shop:latest
    container_name: juice-shop-target
    ports:
      - "3000:3000"
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5.2 Container facts

| Attribute | Value |
|---|---|
| Container name | `juice-shop-target` |
| Image | `bkimminich/juice-shop:latest` |
| Published port | `3000:3000` |
| Restart policy | `unless-stopped` |
| Log driver | `json-file` |
| Log rotation | 10 MB × 3 files |
| Persistent volumes | None — the app is stateless |

### 5.3 What this means

- **No persistent storage** — Juice Shop resets to baseline on container
  recreate. Fine for testing; means any attack that modifies server state
  is not durable.
- **Log rotation** — 30 MB maximum log retention. For a full pentest, logs
  should be captured externally (Wazuh or file-shipping) before they roll.
- **`:latest` tag** — image will update on `docker pull`. For reproducible
  test runs, pin to a specific version (e.g. `bkimminich/juice-shop:v17.1.1`).

---

## 6. Filesystem layout

Relevant paths (from a standard login as `ezio`):

| Path | Purpose |
|---|---|
| `/home/ezio/` | Home directory |
| `/home/ezio/target-range/juiceshop/` | Docker Compose for the app |
| `/home/ezio/1633/` | Empty — no purpose identified |
| `/home/ezio/.ssh/` | SSH keys |
| `/home/ezio/.bash_history` | Shell history (5.7 KB — check for interesting commands) |

No configuration files for the web app exist on the host filesystem — the
image runs self-contained.

---

## 7. Observability — current state

### 7.1 What exists today

| Source | Location | Reachable from SOC? |
|---|---|---|
| Juice Shop container logs | Docker json-file driver | ❌ No |
| SSH auth log | `/var/log/auth.log` | ❌ No |
| Kernel/system log | `/var/log/syslog` | ❌ No |
| Application access | Inside the container | ❌ No |

### 7.2 What does NOT exist

| Missing piece | Impact |
|---|---|
| **No Wazuh agent** | No endpoint telemetry reaches the SOC |
| **No auditd** | No command execution, syscall, or file integrity logging |
| **No Filebeat** | Logs stay on the host |
| **No forwarded application logs** | Juice Shop logs die in Docker's json-file buffer |

**Consequence:** an attack that bypasses Coraza is **invisible to the SOC**.
The web app has no way to signal that it's being attacked. This is the
single biggest observability gap in the AEGIS stack.

### 7.3 Verification proof that Coraza blocks

Despite the observability gap, the WAF layer is demonstrably working.
Direct evidence from `coraza_logs/access.log`:

```json
{
  "request": {
    "method": "GET",
    "host": "juiceshop.zerotrust.lan",
    "uri": "/rest/products/search?q=%27+OR+1%3d1--",
    "headers": {"User-Agent": ["curl/8.5.0"], ...}
  },
  "status": 403
}
```

**Interpretation:** a real SQL injection payload (`' OR 1=1--`) reached
Coraza, was inspected, was blocked, and returned `403`. The Juice Shop app
never saw the request.

This single log line is the most important piece of evidence for the PFE:
**the WAF works on the first OWASP A03 test case.**

---

## 8. Attack surface

### 8.1 From Zone 1 (external attacker)

| Path | Reachable? | Notes |
|---|---|---|
| `https://juiceshop.zerotrust.lan/` | ✅ Via Traefik → Coraza | The only web route |
| `http://192.168.50.20:3000/` direct | ❌ | Zone 1 has no route to `192.168.50.0/24` |
| SSH to 22 | ❌ | Zone 1 cannot reach the subnet |

### 8.2 From Zone 2 (adjacent hosts)

| Path | Reachable? | Notes |
|---|---|---|
| SSH `22/tcp` | ✅ | Any host on `192.168.50.0/24` |
| Juice Shop `3000/tcp` directly | ✅ | Bypasses Coraza entirely |

**Critical observation:** a compromised Zone 2 host (e.g. an attacker with
a foothold on CORP-PC01) can reach Juice Shop on `192.168.50.20:3000`
directly, without ever passing through the WAF. This is expected in the
current design — the WAF protects against *external* attackers, not
internal lateral movement.

For internal protection, an approach would be:
- Bind Juice Shop to `127.0.0.1:3000` and require Coraza to connect via
  an SSH tunnel or reverse proxy — but that breaks the current pattern
- Or place CORP-WEB01 and Coraza on a shared isolated network segment
- Or accept the risk and document it (typical for a lab)

**For the PFE:** document the internal bypass as a known architectural
property — WAF is a perimeter control, not a lateral-movement control.

---

## 9. Open questions

| Question | Why it matters |
|---|---|
| Is CORP-WEB01 domain-joined to `aegis.corp`? | Affects Group B/C attack scenarios and telemetry |
| Is `auditd` installed? | Needed for endpoint attack simulation evidence |
| Is there a specific Juice Shop version pinned anywhere? | Reproducibility across test runs |
| Should the SSH port be firewalled to the gateway only? | Currently any host on the subnet can reach it |
| Does the Juice Shop container mount any host directories? | Determines whether app state persists |

None of these block the current work, but they'll each come up during attack
scenarios.

---

## 10. Recommended next steps

### 10.1 Immediate (documentation)

1. **Pin the Juice Shop image** to a specific tag — replace `:latest` with
   a dated version. Prevents surprise changes mid-testing.
2. **Document the internal bypass** as a known limitation in the report.
   The WAF is an external-perimeter control.

### 10.2 When Zone 4 is reachable

1. **Install Wazuh agent** on CORP-WEB01 — critical for any endpoint attack
   scenarios. See `soc-integration.md` § 4.2 for the deployment pattern.
2. **Install auditd** — required for Linux endpoint telemetry (process
   execution, file access).
3. **Configure Wazuh to tail**:
   - `/var/log/auth.log` (SSH logins, sudo)
   - `/var/log/syslog` (system events)
   - Docker container logs (via the docker-listener wodle, already in the
     agent's default config)
4. **Verify Juice Shop logs** reach the SOC once the agent is live.

### 10.3 Production hardening (not required for PFE)

- Restrict SSH to the gateway subnet only
- Bind Juice Shop to `127.0.0.1` and require the WAF to tunnel
- Add file integrity monitoring on `~/target-range/`

---

## 11. Verified evidence

| Test | Result | Source |
|---|---|---|
| Gateway → WEB01:3000 reachable | ✅ succeeded | `nc -zv` |
| Gateway → WEB01:22 reachable | ✅ succeeded | `nc -zv` |
| Full HTTPS chain: client → Traefik → Coraza → Juice Shop | ✅ HTTP 200 | `curl` from gateway |
| Coraza blocks SQLi | ✅ HTTP 403 | `coraza_logs/access.log` |
| Traefik routes `juiceshop.zerotrust.lan` | ✅ 200 | `traefik_logs/access.log` |

---

## 12. Related documents

| Document | Covers |
|---|---|
| [`gateway-structure.md`](./gateway-structure.md) | Zone 3 file layout and networks |
| [`configuration.md`](./configuration.md) | Coraza WAF configuration (§ 6.9) |
| [`zone1-threat-actor.md`](./zone1-threat-actor.md) | Attack scenarios targeting this host |
| [`web-pentest.md`](./web-pentest.md) | OWASP Top 10 methodology |
| [`soc-integration.md`](./soc-integration.md) | Wazuh agent deployment pattern |

---

*End of CORP-WEB01 documentation.*
