# Gateway Configuration Guide

**Host:** `ztagateway` (Ubuntu Server) · **Zone:** 3 — Enforcement Layer · **Target:** blank host → fully functional Zero Trust gateway

This guide is the operational companion to
[`gateway-structure.md`](./gateway-structure.md). Where the structure doc
describes *what exists*, this one describes *how to build it* — one layer at a
time, in the correct dependency order.

> **Companion documents**
> - [`gateway-structure.md`](./gateway-structure.md) — file layout, networks, volumes
> - `.env.example` *(planned)* — the credential shape with placeholder values
> - `ad-federation.md` *(planned)* — AD integration details for Authelia and Keycloak

> **Secrets policy:** Every credential referenced in this guide lives in
> `.env` or a `*/secrets/` file on the host. None are committed to git.
> See § 5.

---

## 0. How to Use This Guide

Build in order. Each section assumes the previous one is complete and verified.

| Step | Verify before moving on |
|---|---|
| 1 — Host prerequisites | `ip a` shows both `ens33` and `ens34` up |
| 2 — Directory scaffold | `tree ~/zerotrust-network` matches the structure doc |
| 3 — Networks | `docker network ls` shows all three |
| 4 — Volumes | `docker volume ls` shows all six |
| 5 — Secrets | `docker compose config -q` is silent |
| 6 — Services | Each service reaches `healthy` before the next starts |
| 7 — Ingress | `https://authelia.zerotrust.lan` loads |
| 8 — Access control | Authelia enforces `two_factor` on protected routes |
| 9 — Federation | AD users can log in and their groups resolve |
| 10 — Verification | All smoke tests pass |
| 11 — Troubleshooting | Referenced only when something fails |
| 12 — SOC | Logs land in Elasticsearch with correct indices |

**Rollback rule:** Before editing any file under version control, copy it to
`<file>.bak.$(date +%Y%m%d-%H%M)`. Every section assumes a fresh backup.

---

## 1. Host Prerequisites

### 1.1 Operating System

- **Ubuntu Server 22.04 LTS or 24.04 LTS** (the AEGIS build uses 24.04)
- 4+ vCPU, 8+ GB RAM, 100+ GB disk (Juice Shop + Wazuh + Elastic back-pressure)
- Hostname: `ztagateway`

```bash
sudo hostnamectl set-hostname ztagateway
```

### 1.2 Network interfaces

The gateway is dual-homed. Two physical (or vNIC) interfaces:

| Interface | Address | Purpose |
|---|---|---|
| `ens33` | DHCP (LAN, e.g. `192.168.19.173/24`) | Uplink to client network + internet |
| `ens34` | Static `192.168.50.1/24` | Direct L2 adjacency to Zone 2 (AD server at `192.168.50.10`) |

Netplan config (`/etc/netplan/50-cloud-init.yaml`):

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: true
    ens34:
      addresses:
        - 192.168.50.1/24
```

Apply:

```bash
sudo netplan apply
ip -br a
# Expect: ens33 UP with DHCP address, ens34 UP with 192.168.50.1/24
```

**Critical:** The AD server's IP on `ens34`'s subnet must be reachable from the host:

```bash
nc -zv 192.168.50.10 389    # must succeed
```

If this fails, the problem is upstream (VLAN, hypervisor switch, or Windows Firewall on the AD server) — do not proceed until it succeeds.

### 1.3 Required packages

```bash
sudo apt update
sudo apt install -y \
  docker.io \
  docker-compose-v2 \
  ca-certificates curl gnupg \
  ldap-utils \
  jq \
  tree \
  netcat-openbsd \
  tcpdump
```

Verify Docker:

```bash
docker --version            # Docker 24.x or newer
docker compose version      # Docker Compose v2.x
```

Add your user to `docker` group (log out and back in):

```bash
sudo usermod -aG docker $USER
```

### 1.4 Kernel tuning

For many simultaneous TCP connections (Traefik + Wazuh forwarding + ES shipping):

```bash
sudo tee /etc/sysctl.d/99-aegis.conf <<'EOF'
net.core.somaxconn = 1024
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

`ip_forward=1` is required so Docker bridge networks can route through the host's interface toward `ens34` (Zone 2).

### 1.5 Time sync

Kerberos (used implicitly by AD) is time-sensitive — clock skew > 5 min breaks authentication.

```bash
timedatectl set-ntp true
timedatectl status
# Confirm: System clock synchronized: yes
```

---

## 2. Directory Scaffold

Create the layout from `gateway-structure.md` § 2:

```bash
mkdir -p ~/zerotrust-network
cd ~/zerotrust-network

mkdir -p \
  authelia/secrets \
  coraza/rules \
  keycloak \
  keycloak_logs \
  coraza_logs \
  mailpit \
  oidc-proxy \
  postgres/init-scripts \
  redis \
  traefik/certs \
  traefik_logs

touch .env
chmod 600 .env
```

Verify with:

```bash
tree -L 2 ~/zerotrust-network
```

Expected output matches the structure doc. If any directory is missing, the
matching service will fail to start with a `bind mount` error.

### 2.1 `.gitignore` (before any `git add`)

```bash
cat > .gitignore <<'EOF'
# Secrets
.env
.env.*
!/.env.example

# Keys and certs
*.key
*.pem
*.p12
!*/certs/*.pem.example

# Runtime logs
*_logs/
*.log
*.log.*

# Backups
*.bak.*
*.bak

# Secret directories
*/secrets/
EOF
```

Verify: `git status --short` should not list `.env` or any `*/secrets/` file.

---

## 3. Docker Networks

Three bridge networks, each with a specific security purpose. Define them in
`docker-compose.yml` under the `networks:` key.

### 3.1 `proxy_net` — external-facing DMZ

- Driver: `bridge`
- Explicit bridge name: `br_proxy`
- Members: **Traefik, Coraza only**

```yaml
networks:
  proxy_net:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br_proxy
```

**Why:** Only the reverse proxy and WAF touch the external world. Everything
behind them is unreachable unless Traefik routes to it.

### 3.2 `auth_net` — isolated enclave

- Driver: `bridge`
- **`internal: true`** — no NAT, no gateway, no route off the bridge
- Explicit bridge name: `br_auth`
- Members: every backend service

```yaml
  auth_net:
    driver: bridge
    internal: true
    driver_opts:
      com.docker.network.bridge.name: br_auth
```

**Why:** A container on this network cannot reach the internet, cannot reach
the LAN, and cannot reach `192.168.50.0/24` — even though the host can. This is
the Zero Trust enclave: identity services, databases, and caches are only
reachable via Traefik (which is dual-homed).

> **Consequence:** Any service that needs outbound connectivity (to AD, to a
> message broker, to an external API) must be given a **second** network. See
> `ext_net`.

### 3.3 `ext_net` — dedicated AD egress

- Driver: `bridge`
- No custom name (Compose generates `zerotrust-network_ext_net`)
- Members: **Authelia, Keycloak** — only

```yaml
  ext_net:
    driver: bridge
```

**Why:** Authelia and Keycloak both need to reach `192.168.50.10:389` to query
Active Directory. `auth_net` is `internal: true` — no route out. Rather than
remove `internal: true` (which would open the whole enclave), attach only these
two services to a second, routed network.

### 3.4 Network ordering — critical

When a container is on multiple networks, Docker assigns the default route
based on the order networks appear in the service definition. The first listed
network wins the default route.

```yaml
services:
  keycloak:
    networks:
      - ext_net        # ← default route goes here (toward AD)
      - auth_net
  authelia:
    networks:
      - ext_net        # ← default route goes here (toward AD)
      - auth_net
```

**If you swap the order, AD lookups fail with `no route to host`** — even
though the container has a valid IP on `ext_net`. Symptom: `docker inspect`
shows both networks attached, `nc` from inside the container to the AD IP
returns "unreachable".

### 3.5 Verification

```bash
# After the first `docker compose up -d`:
docker network ls | grep -E "proxy_net|auth_net|ext_net"
# Expect three entries: zerotrust-network_proxy_net, _auth_net, _ext_net

# Confirm internal isolation
docker exec authelia ip route | grep default
# Expect: default via 172.20.0.1 dev eth0    (ext_net gateway)
# NOT:    default via 172.19.0.1             (that would mean auth_net won)

# Confirm AD reachability from inside
docker exec authelia sh -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
# Expect: OK
```

---

## 4. Docker Volumes

Six named volumes persist state across container recreation. Declare them at
the bottom of `docker-compose.yml`.

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  portainer_data:
    driver: local
  traefik_data:
    driver: local
  ldap_data:
    driver: local
  ldap_config:
    driver: local
```

| Volume | Consumer | Contents |
|---|---|---|
| `postgres_data` | `postgres:/var/lib/postgresql/data` | Keycloak + Authelia databases |
| `redis_data` | `redis:/data` | Authelia session cache (AOF persistence) |
| `portainer_data` | `portainer:/data` | Portainer state |
| `traefik_data` | `traefik:/traefik` | ACME state, plugin cache |
| `ldap_data` | `openldap:/var/lib/ldap` | OpenLDAP backend database |
| `ldap_config` | `openldap:/etc/ldap/slapd.d` | OpenLDAP configuration |

### 4.1 Backup

Volumes are not bind-mounted to host paths. To back up:

```bash
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_data-$(date +%Y%m%d).tgz /data
```

Repeat for each volume. Store backups off-host.

### 4.2 Restore

```bash
docker compose down
docker volume rm postgres_data
docker volume create postgres_data
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c 'cd / && tar xzf /backup/postgres_data-20260927.tgz'
docker compose up -d
```

### 4.3 Verification

```bash
docker volume ls | grep -E "postgres_data|redis_data|portainer_data|traefik_data|ldap_data|ldap_config"
# Expect six entries prefixed with zerotrust-network_
```

---

## 5. Secrets Management

All credentials follow one of two patterns. Nothing is inline in
`docker-compose.yml`. Nothing is committed to git.

### 5.1 Pattern A — `.env` interpolation

For values Compose injects as environment variables to a service:

```bash
# .env  (chmod 600, gitignored)
POSTGRES_PASSWORD=<generated>
AUTHELIA_SESSION_SECRET=<generated-64-hex>
REDIS_PASSWORD=<generated>
KEYCLOAK_ADMIN_PASSWORD=<generated>
```

Referenced in Compose as:

```yaml
environment:
  AUTHELIA_SESSION_SECRET: ${AUTHELIA_SESSION_SECRET}
```

Generate values:

```bash
openssl rand -hex 32    # 64 hex chars, use for session secrets / keys
openssl rand -base64 24 # mixed entropy, use for passwords
```

### 5.2 Pattern B — `*_FILE` secret files

For secrets that should never appear as env values (bind passwords, API keys
consumed by services that support the convention):

```bash
mkdir -p authelia/secrets
printf '%s' '<bind-password>' | sudo tee authelia/secrets/ldap_password > /dev/null
sudo chmod 600 authelia/secrets/ldap_password

# Verify no trailing newline
wc -c authelia/secrets/ldap_password
# Should exactly match the password length
```

Mount read-only and reference via env var **without** the value:

```yaml
services:
  authelia:
    environment:
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE: /secrets/ldap_password
    volumes:
      - ./authelia/secrets/ldap_password:/secrets/ldap_password:ro
```

Authelia auto-detects the `_FILE` suffix and reads the file's contents at
startup. **Do not** also set `AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD`
(the non-`_FILE` variant) — Authelia will try to bind with the **literal
string** `/secrets/ldap_password` as the password and fail with
`LDAP Result Code 49 "Invalid Credentials"`.

### 5.3 File permission checklist

| File | Mode | Owner |
|---|---|---|
| `.env` | `600` | your user |
| `authelia/secrets/ldap_password` | `600` | your user |
| `traefik/certs/zerotrust.key` | `600` | root or your user |
| `authelia/oidc.key` | `600` | root or your user |

Verify:

```bash
stat -c '%a %U:%G %n' .env authelia/secrets/ldap_password traefik/certs/zerotrust.key authelia/oidc.key
```

### 5.4 Pre-flight validation

Before starting any container:

```bash
docker compose config -q
# Must print nothing. Any output = schema error, fix before continuing.
```

If the error mentions a top-level key like `KC_LOG_LEVEL` under `logging:`, it
means an env var was placed in the wrong block. See § 11.1.

### 5.5 Never inline secrets

Anti-patterns to avoid in `docker-compose.yml`:

```yaml
# ❌ WRONG — value visible in `docker inspect`
environment:
  AUTHELIA_SESSION_SECRET: "6d0d59b4..."

# ❌ WRONG — plaintext in a mounted config file
# configuration.yml:
#   storage:
#     encryption_key: "somekey"
```

Always go through `.env` or a `*_FILE` secret.

---

*End of Part 1 (Sections 1–5). Part 2 (Services) follows in the next commit.*
