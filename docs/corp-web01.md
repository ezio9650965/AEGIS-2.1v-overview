# CORP-WEB01 — Web Target Host

**Zone:** 2 (Enterprise) · **Role:** Juice Shop target behind AEGIS WAF

This host runs the deliberately vulnerable web application used to validate
the AEGIS WAF and SOC detection pipeline. It sits on the enterprise subnet
alongside CORP-DC01 and CORP-PC01, and is domain-joined to `aegis.corp`.

---

## 1. Identity

| Attribute | Value |
|---|---|
| Hostname | `CORP-WEB01` |
| FQDN | `corp-web01.aegis.corp` (domain-joined) |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | 6.8.0-136-generic (reboot pending → 6.8.0-142) |
| Architecture | x86_64 |
| Naming family | `CORP-*` (enterprise naming convention) |
| Primary local user | `ezio` (sudo-enabled) |
| Domain login | `<username>@aegis.corp` (short-name resolution enabled) |

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
          - 192.168.50.10
          - 8.8.8.8
```

| Field | Value |
|---|---|
| Interface | `ens33` |
| IP | `192.168.50.20/24` (static) |
| Gateway | `192.168.50.1` (ztagateway) |
| DNS | `192.168.50.10` (DC01), `8.8.8.8` (public fallback) |

### 2.2 Split-DNS via systemd-resolved

**Critical config:** the resolver is split so `aegis.corp` queries go only to
DC01, and public queries fall back to 8.8.8.8. Without this, systemd-resolved
would send the first query to whichever server answered, and public resolvers
return NXDOMAIN for internal names — breaking AD discovery.

`/etc/systemd/resolved.conf`:

```ini
[Resolve]
DNS=192.168.50.10
FallbackDNS=8.8.8.8
Domains=~aegis.corp
```

`~aegis.corp` is a **routing domain** — queries for that suffix go only to
the listed DNS servers, never to the fallback.

Verify:

```bash
resolvectl status | grep -A2 "Global"
dig _ldap._tcp.aegis.corp SRV
# Expect: 0 100 389 corp-dc01.aegis.corp.
```

### 2.3 Network placement

```
192.168.50.0/24
├── 192.168.50.1    ztagateway    (Zone 3 — gateway, WAF, identity)
├── 192.168.50.10   CORP-DC01     (Zone 2 — AD DS)
├── 192.168.50.13   CORP-PC01     (Zone 2 — Windows client, joined)
├── 192.168.50.20   CORP-WEB01    (Zone 2 — this host)
```

All hosts on this subnet are L2-adjacent.

### 2.4 ⚠️ Known issue — VMware phantom gateway

The VMware host adapter on WEB01's vnet also claims `192.168.50.1` with MAC
`00:50:56:c0:00:03`. This competes with the real gateway's `ens34` MAC
(`00:0c:29:c0:53:3c`).

**Symptom:** outbound traffic from WEB01 goes to the phantom adapter — which
provides NAT but no route to the gateway's Docker networks. Result: internet
works for the phantom's NAT, but AD authentication and Authelia-forwarded
requests fail.

**Temporary fix (applied):** static ARP entry pins `.1` to the real gateway
MAC:

```bash
sudo ip neigh replace 192.168.50.1 lladdr 00:0c:29:c0:53:3c dev ens33
```

This is lost on reboot. Persist via systemd oneshot (see `static-arp.service`).

**Permanent fix (pending):** on the VMware host, either
- Remove the host adapter's IP on WEB01's vnet, or
- Move WEB01's NIC to the same vnet as the gateway's ens34, or
- Renumber the host adapter to `192.168.50.254`

Until this is fixed, static ARP is required.

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

Outbound traffic goes via `192.168.50.1` (gateway), NAT'd via the gateway's
`ens33` to the internet. **Requires the static ARP entry** (§ 2.4) until the
VMware fix lands.

---

## 4. Services

### 4.1 Listening ports

| Port | Process | Purpose |
|---|---|---|
| `22/tcp` | sshd | Remote admin (local `ezio`, AD users via SSSD) |
| `3000/tcp` | Docker port-forward | Juice Shop web UI |

### 4.2 Not listening

No local web server, no Wazuh agent (yet), no database, no cache. Single-
purpose host.

---

## 5. The Juice Shop container

### 5.1 Compose file

Location: `~/target-range/juiceshop/docker-compose.yml`

```yaml
services:
  juice-shop:
    image: bkimminich/juice-shop:v17.1.1
    container_name: juice-shop-target
    ports:
      - "3000:3000"
    restart: unless-stopped
    logging:
      driver: "syslog"
      options:
        tag: "juiceshop"
```

### 5.2 Container facts

| Attribute | Value |
|---|---|
| Container name | `juice-shop-target` |
| Image | `bkimminich/juice-shop:v17.1.1` (pinned) |
| Published port | `3000:3000` |
| Restart policy | `unless-stopped` |
| Log driver | **`syslog`** (routes to journald with tag `juiceshop`) |
| Persistent volumes | None — the app is stateless |

### 5.3 Log routing

Container stdout → Docker syslog driver → **journald** (tag `juiceshop`).

Verify:

```bash
sudo journalctl -t juiceshop --since "5 minutes ago" | head -10
```

This makes Juice Shop's log stream **readable by Wazuh** once the agent is
installed — Wazuh's journald localfile collector picks up the tag
automatically.

---

## 6. Filesystem layout

| Path | Purpose |
|---|---|
| `/home/ezio/` | Local admin home directory |
| `/home/ezio/target-range/juiceshop/` | Docker Compose for the app |
| `/home/ezio/1633/` | Empty — no purpose identified |
| `/home/ezio/.ssh/` | SSH keys |
| `/home/<user>@aegis.corp/` | AD user home dirs (auto-created on first login) |

No configuration files for the web app exist on the host filesystem — the
image runs self-contained.

---

## 7. Domain membership

CORP-WEB01 is **domain-joined to `aegis.corp`** via `realmd` + `sssd`.

### 7.1 Configuration

| Attribute | Value |
|---|---|
| Realm | `AEGIS.CORP` |
| Domain | `aegis.corp` |
| Join method | `realm join --user=Administrator aegis.corp` |
| KDC | `corp-dc01.aegis.corp` |
| SSSD backend | `ad` |
| Short names | **Enabled** (`use_fully_qualified_names = False`) |
| Home dirs | Auto-created on first login (`pam_mkhomedir`) |
| Login policy | Restricted to `GRP_IT_Admin` and `GRP_Web_Ops` |
| Sudo policy | `GRP_IT_Admin` = full; `GRP_Web_Ops` = restricted |

### 7.2 `/etc/sssd/sssd.conf` (key settings)

```ini
[sssd]
domains = aegis.corp
config_file_version = 2
services = nss, pam

[domain/aegis.corp]
default_shell = /bin/bash
krb5_store_password_if_offline = True
cache_credentials = True
krb5_realm = AEGIS.CORP
realmd_tags = manages-system joined-with-adcli
id_provider = ad
fallback_homedir = /home/%u@%d
ad_domain = aegis.corp
use_fully_qualified_names = False
ldap_id_mapping = True
access_provider = simple
simple_allow_groups = GRP_IT_Admin@aegis.corp, GRP_Web_Ops@aegis.corp
```

### 7.3 Sudo policy

`/etc/sudoers.d/aegis-admins`:

```
%GRP_IT_Admin@aegis.corp ALL=(ALL) ALL
%GRP_Web_Ops@aegis.corp ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart juice-shop-target, /usr/bin/docker compose *
```

Validated: `sudo visudo -c` → all files `parsed OK`.

### 7.4 Verification

| Test | Result |
|---|---|
| `realm list` shows `configured: kerberos-member` | ✅ |
| `id salima@aegis.corp` resolves | ✅ uid/gid from AD |
| `id anis.taibi` resolves (short name) | ✅ |
| `getent passwd anis.taibi` returns AD user | ✅ |
| SSH as AD user from gateway | ✅ (`ssh anis.taibi@192.168.50.20`) |
| SSH as AD user from localhost | ✅ |
| Group membership visible (`grp_it_admin`, `grp_finance`) | ✅ |
| Sudo via `GRP_IT_Admin` works | ✅ |

### 7.5 SSH policy

SSH (`22/tcp`) is reachable from the entire `192.168.50.0/24` subnet.

**Lab rationale:** administrative convenience.

**Production hardening (documented, not applied):**
- Restrict SSH to a management subnet
- Disable password authentication in favor of SSH keys + Kerberos
- Set `PermitRootLogin no`
- Enable fail2ban

---

## 8. Observability

### 8.1 auditd (Linux endpoint telemetry)

Installed and configured with a 20+ rule AEGIS ruleset at
`/etc/audit/rules.d/aegis.rules`.

| Rule key | Watches |
|---|---|
| `aegis_exec` | Every process execution (`execve`) with full args |
| `aegis_cred_read` | Reads of `/etc/passwd`, `/etc/shadow`, `/etc/sudoers` |
| `aegis_ssh_config` | Read/write to sshd_config |
| `aegis_priv_esc` | `setuid`/`setgid`/`setreuid`/`setregid` |
| `aegis_net_socket` | AF_INET SOCK_STREAM socket creation |
| `aegis_net_connect` | All `connect()` syscalls |
| `aegis_shell` | `bash`, `sh`, `python3`, `perl` invocations |
| `aegis_home_tamper` | Writes to `/home` |
| `aegis_root_ssh` | Access to `/root/.ssh` |
| `aegis_persist_cron` | `/etc/cron.d`, `/etc/crontab`, `/var/spool/cron` |
| `aegis_persist_systemd` | `/etc/systemd/system`, `/lib/systemd/system` |
| `aegis_sudoers_change` | Sudoers modifications |
| `aegis_log_tamper` | `/var/log/audit` writes |

Retention: 50 MB × 10 rotations = 500 MB total.

**Why these rules:** they cover the Atomic Red Team TTPs planned for
endpoint attack simulation — command execution, persistence, credential
access, privilege escalation, and anti-forensic attempts.

### 8.2 chrony (time sync)

`chrony` is installed and synced. The DC isn't serving NTP yet, so the host
syncs to public pool servers (Canonical, Cloudflare). System clock is
synchronized — Kerberos works, but the DC should eventually be configured
to serve NTP for consistent Kerberos behavior.

### 8.3 Juice Shop logs

Container stdout → Docker syslog driver → journald tag `juiceshop`. Local
verification works; not yet shipped to SOC (awaiting Wazuh agent).

### 8.4 What does NOT exist yet

| Missing piece | Impact |
|---|---|
| **Wazuh agent** | auditd, syslog, auth.log, journald `juiceshop` — all local-only |
| **Filebeat** | Same |
| **AD login events in SOC** | DC01 events not yet shipped — depends on DC01 agent |

**Consequence:** an attack that bypasses Coraza is logged locally
(`audit.log`, `syslog`, `auth.log`, `journalctl juiceshop`) but is **not
visible to the SOC** until the Wazuh agent is installed.

### 8.5 WAF block evidence (verified)

Direct evidence from `coraza_logs/access.log` on the gateway:

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

A real SQL injection payload (`' OR 1=1--`) reached Coraza, was inspected,
was blocked, and returned `403`. Juice Shop never saw the request.

This is the primary PFE evidence that the WAF works on OWASP A03.

---

## 9. Attack surface

### 9.1 From Zone 1 (external attacker)

| Path | Reachable? | Notes |
|---|---|---|
| `https://juiceshop.zerotrust.lan/` | ✅ Via Traefik → Coraza | Only web route |
| Direct to `192.168.50.20:3000` | ❌ | Zone 1 has no route to the subnet |
| SSH `22/tcp` | ❌ | Zone 1 cannot reach the subnet |

### 9.2 From Zone 2 (adjacent hosts)

| Path | Reachable? | Notes |
|---|---|---|
| SSH `22/tcp` | ✅ | Any host on `192.168.50.0/24`; AD auth required |
| Juice Shop `3000/tcp` directly | ✅ | **Bypasses Coraza entirely** |

**Critical architectural property:** any compromised Zone 2 host can reach
Juice Shop on `192.168.50.20:3000` directly, without passing through the WAF.
This is expected — the WAF is an external-perimeter control, not a
lateral-movement control.

**For the PFE:** documented as a deliberate design choice. Internal
protection against lateral movement is handled at the network segmentation
layer, not the WAF.

---

## 10. Verified evidence

| Test | Result | Source |
|---|---|---|
| Gateway → WEB01:3000 reachable | ✅ | `nc -zv` |
| Gateway → WEB01:22 reachable | ✅ | `nc -zv` |
| Full HTTPS chain: client → Traefik → Coraza → Juice Shop | ✅ HTTP 200 | `curl` |
| Coraza blocks SQLi (`' OR 1=1--`) | ✅ HTTP 403 | `coraza_logs/access.log` |
| Traefik routes `juiceshop.zerotrust.lan` | ✅ 200 | `traefik_logs/access.log` |
| Domain join | ✅ `configured: kerberos-member` | `realm list` |
| AD short-name resolution | ✅ `id anis.taibi` | SSSD |
| AD group resolution | ✅ `grp_it_admin`, `grp_finance` | SSSD |
| SSH as AD user from gateway | ✅ | `ssh anis.taibi@192.168.50.20` |
| Sudo via AD group | ✅ `visudo -c` OK | sudoers |
| auditd rules loaded | ✅ 20+ rules | `auditctl -l` |
| Juice Shop logs → journald | ✅ tag `juiceshop` | `journalctl -t juiceshop` |

---

## 11. Outstanding work

| Item | Status | Blocker |
|---|---|---|
| Wazuh agent install | ⏳ | Zone 4 unreachable |
| Filebeat install | ⏳ | Zone 4 unreachable |
| Kernel reboot (`6.8.0-142`) | ⏳ | Schedule when idle |
| Static ARP persistence | ⏳ | systemd oneshot pending, or fix VMware |
| VMware phantom gateway | ❌ | Permanent fix pending on hypervisor host |
| DC01 NTP server enable | ⏳ | Optional — Kerberos works via public sync |
| Pinned version confirmed in compose | ✅ | v17.1.1 |

---

## 12. Recommended next steps

### 12.1 Before Zone 4 access

1. **Reboot WEB01** — kernel upgrade pending. Verify auditd, sssd, chrony
   come back up after reboot.
2. **Persist the static ARP** — systemd oneshot, or fix the VMware host
   adapter (preferred).
3. **Enable NTP server on DC01** — for consistent time across the domain.

### 12.2 When Zone 4 is reachable

1. **Install Wazuh agent** on CORP-WEB01.
2. **Configure Wazuh to tail**:
   - `/var/log/audit/audit.log` (auditd rules)
   - `/var/log/auth.log` (SSH logins, sudo)
   - `/var/log/syslog` (system events)
   - journald `juiceshop` tag (Juice Shop app logs)
3. **Verify events reach Elasticsearch** — grep for `agent.name: CORP-WEB01`.
4. **Confirm DC01 also ships** — otherwise AD login events are missing.

### 12.3 Production hardening (not required for PFE)

- Restrict SSH to gateway subnet only
- Bind Juice Shop to `127.0.0.1` and require Coraza to tunnel
- File integrity monitoring on `~/target-range/`
- Fix the VMware phantom gateway properly

---

## 13. Related documents

| Document | Covers |
|---|---|
| [`gateway-structure.md`](./gateway-structure.md) | Zone 3 file layout, networks |
| [`configuration.md`](./configuration.md) | Coraza WAF config (§ 6.9) |
| [`zone1-threat-actor.md`](./zone1-threat-actor.md) | Attack scenarios targeting this host |
| [`soc-integration.md`](./soc-integration.md) | Wazuh agent deployment pattern |

---

*End of CORP-WEB01 documentation.*
