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

## 6. Services — Dependency Order

Start services in this order. Each depends on the previous being healthy.
Starting out of order is the single most common cause of failed first-boot.

| Order | Service | Depends on | Purpose |
|---|---|---|---|
| 1 | `postgres` | — | Storage for Keycloak + Authelia |
| 2 | `redis` | — | Session cache for Authelia |
| 3 | `openldap` | — | Legacy directory (break-glass only) |
| 4 | `keycloak` | `postgres` | OIDC / SSO provider |
| 5 | `authelia` | `postgres`, `redis` | Forward-auth middleware |
| 6 | `oidc-proxy` | `authelia` | Host-header shim for OIDC callbacks |
| 7 | `mailpit` | — | SMTP sinkhole (dev) |
| 8 | `portainer` | — | Container management UI |
| 9 | `coraza` | — | WAF in front of Juice Shop |
| 10 | `traefik` | `authelia`, `coraza` | Reverse proxy / ingress |

Start everything at once with `docker compose up -d` — the `depends_on` +
`healthcheck` chain serializes startup automatically. The table above is for
troubleshooting when a service fails: start it in isolation to see its error.

---

### 6.1 PostgreSQL

**Image:** `postgres:16-alpine`
**Network:** `auth_net`
**Volume:** `postgres_data`
**Purpose:** Stores Keycloak realm/session data and Authelia user/MFA state.

#### Service block

```yaml
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    hostname: postgres
    networks:
      - auth_net
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-postgres}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pgcrypto"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init-scripts:/docker-entrypoint-initdb.d:ro
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### `postgres/init-scripts/init.sql`

Runs **only on first boot** (when the `postgres_data` volume is empty).
Creates both databases and service accounts, then enables UUID support.

```sql
CREATE DATABASE keycloak;
CREATE DATABASE authelia;

CREATE USER keycloak WITH ENCRYPTED PASSWORD '<rotated-at-deploy>';
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

CREATE USER authelia WITH ENCRYPTED PASSWORD '<rotated-at-deploy>';
GRANT ALL PRIVILEGES ON DATABASE authelia TO authelia;

\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO keycloak;

\c authelia
GRANT ALL ON SCHEMA public TO authelia;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authelia;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c keycloak
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

> **Change the passwords** in this file before the first `docker compose up`.
> The values must match what Keycloak's `.env` and Authelia's env use.
> After first boot, editing this file has no effect — the volume already
> contains the databases.

#### Env vars consumed

| Var | Source | Notes |
|---|---|---|
| `POSTGRES_DB` | `.env` | Root database name |
| `POSTGRES_USER` | `.env` | Root superuser |
| `POSTGRES_PASSWORD` | `.env` | Root superuser password |

#### Verification

```bash
docker compose up -d postgres
docker compose ps postgres                            # Up (healthy)
docker exec postgres psql -U postgres -l              # lists keycloak, authelia
docker exec postgres psql -U keycloak -d keycloak -c '\dt'   # empty (no schema yet)
docker exec postgres psql -U authelia -d authelia -c '\dt'   # empty
```

---

### 6.2 Redis

**Image:** `redis:7-alpine`
**Network:** `auth_net`
**Volume:** `redis_data`
**Purpose:** Authelia session store. Sessions persist across Authelia restarts.

#### Service block

```yaml
  redis:
    image: redis:7-alpine
    container_name: redis
    hostname: redis
    networks:
      - auth_net
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    expose:
      - "6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "PING"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Env vars consumed

| Var | Source | Notes |
|---|---|---|
| `REDIS_PASSWORD` | `.env` | Required by both redis-cli healthcheck and Authelia config |

#### Verification

```bash
docker compose ps redis                                # Up (healthy)
docker exec redis redis-cli -a "${REDIS_PASSWORD}" PING
# Expect: PONG
docker exec redis redis-cli -a "${REDIS_PASSWORD}" INFO persistence | grep aof_enabled
# Expect: aof_enabled:1
```

---

### 6.3 OpenLDAP (legacy — break-glass only)

**Image:** `osixia/openldap:1.5.0`
**Network:** `auth_net`
**Volumes:** `ldap_data`, `ldap_config`
**Purpose:** Historical identity source. **Authelia no longer uses it.**
Kept running as documented break-glass access for recovery accounts.

> **Do not delete this container until the AD break-glass procedure is
> documented and tested.** See § 7 of the structure doc.

#### Service block

```yaml
  openldap:
    image: osixia/openldap:1.5.0
    container_name: openldap
    hostname: openldap
    networks:
      - auth_net
    environment:
      LDAP_ORGANISATION: "AEGIS"
      LDAP_DOMAIN: "zerotrust.lan"
      LDAP_ADMIN_PASSWORD: ${LDAP_ADMIN_PASSWORD}
      LDAP_CONFIG_PASSWORD: ${LDAP_CONFIG_PASSWORD}
      LDAP_TLS: "false"
    volumes:
      - ldap_data:/var/lib/ldap
      - ldap_config:/etc/ldap/slapd.d
    expose:
      - "389"
    healthcheck:
      test: ["CMD", "ldapsearch", "-x", "-H", "ldap://localhost", "-b", "dc=zerotrust,dc=lan"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Env vars consumed

| Var | Source | Purpose |
|---|---|---|
| `LDAP_ADMIN_PASSWORD` | `.env` | Admin bind password |
| `LDAP_CONFIG_PASSWORD` | `.env` | slapd-config bind password |

#### Verification

```bash
docker compose ps openldap
# Up (healthy) OR Up (unhealthy) — either is acceptable in the current state
docker exec openldap ldapsearch -x -H ldap://localhost -b dc=zerotrust,dc=lan -s base
# Expect: dn: dc=zerotrust,dc=lan
```

---

### 6.4 Keycloak

**Image:** `keycloak/keycloak:latest`
**Networks:** `ext_net` (default route), `auth_net`
**Volume:** `keycloak_logs`
**Purpose:** OIDC provider. Federates AD as a read-only user store. Issues
tokens for downstream applications.

#### Service block

```yaml
  keycloak:
    image: keycloak/keycloak:latest
    container_name: keycloak
    hostname: keycloak
    networks:
      - ext_net
      - auth_net
    depends_on:
      postgres:
        condition: service_healthy
    extra_hosts:
      - "authelia.zerotrust.lan:172.19.0.4"
      - "keycloak.zerotrust.lan:172.19.0.4"
    volumes:
      - ./keycloak_logs:/opt/keycloak/data/log
      - ./traefik/certs/zerotrust.pem:/opt/keycloak/conf/truststores/zerotrust.pem:ro
    env_file:
      - keycloak/.env
    expose:
      - "8080"
    command: start --log=console,file --log-file=/opt/keycloak/data/log/keycloak.log --log-file-output=json --http-access-log-enabled=true
    healthcheck:
      test: ["CMD-SHELL", "timeout 3 bash -c '</dev/tcp/127.0.0.1/8080' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 60s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    environment:
      KC_LOG_CONSOLE_OUTPUT: json
      KC_LOG_LEVEL: INFO
      KC_SPI_TRUSTSTORE_FILE_HOSTNAME_VERIFICATION_POLICY: ANY
      KC_HTTP_MAX_HEADER_SIZE: "65536"
```

#### `keycloak/.env`

```bash
# Admin bootstrap (delete after creating permanent admin — see § 12)
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<generated>

# Database
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<matches init.sql>

# Hostname and proxy
KC_HOSTNAME=keycloak.zerotrust.lan
KC_PROXY_HEADERS=xforwarded

# HTTP
KC_HTTP_ENABLED=true
KC_HTTPS_ENABLED=false

# Features
KC_FEATURES=token-exchange
KC_HTTP_RELATIVE_PATH=/

# Compatibility
KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_LEGACY_LOGOUT_REDIRECT_URI=true
```

#### Why `KC_HTTP_MAX_HEADER_SIZE: "65536"`

Default Quarkus header limit is 20 KB. With Authelia forward-auth headers plus
`.zerotrust.lan` cookies accumulating across Keycloak/Authelia/Traefik, the
combined request headers can exceed 20 KB. Symptom without this setting:
`431 Request Header Fields Too Large` on `/realms/.../protocol/openid-connect/auth`.

#### Why the `extra_hosts` entries

Keycloak's OIDC issuer must resolve to a hostname that both **inside the
container** and the browser agree on. Adding the hostnames to `/etc/hosts`
makes internal callbacks resolve without an external DNS round-trip.

#### Post-startup configuration (console-driven)

The Compose file only defines the container. **All realm, client, LDAP
provider, and mapper configuration is done in the admin console** and stored
in Postgres. See `ad-federation.md` for the exact steps.

#### Verification

```bash
docker compose ps keycloak           # Up (healthy)
docker exec keycloak bash -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
# Expect: OK
curl -sk https://keycloak.zerotrust.lan/realms/master/.well-known/openid-configuration | jq .issuer
# Expect: "https://keycloak.zerotrust.lan/realms/master"
tail -20 keycloak_logs/keycloak.log | jq -r '.message' | tail -5
# Expect: "Listening on: http://0.0.0.0:8080"
```

---

### 6.5 Authelia

**Image:** `authelia/authelia:latest`
**Networks:** `ext_net` (default route), `auth_net`
**Volumes:** config, oidc key, log, secrets
**Purpose:** Forward-auth middleware. Enforces login + MFA + group ACL on every
protected route. Backed by AD (post-migration).

#### Service block

```yaml
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    hostname: authelia
    networks:
      - ext_net
      - auth_net
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      AUTHELIA_SESSION_SECRET: ${AUTHELIA_SESSION_SECRET}
      AUTHELIA_STORAGE_POSTGRES_PASSWORD: ${AUTHELIA_STORAGE_PASSWORD}
      AUTHELIA_SESSION_REDIS_PASSWORD: ${REDIS_PASSWORD}
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_USER: CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE: /secrets/ldap_password
      KEYCLOAK_OIDC_SECRET: ${KEYCLOAK_OIDC_SECRET}
      AUTHELIA_LOG_LEVEL: debug
      AUTHELIA_LOG_FORMAT: json
      AUTHELIA_LOG_FILE_PATH: /config/authelia.log
      TZ: UTC
    volumes:
      - ./authelia/configuration.yml:/config/configuration.yml
      - ./authelia/oidc.key:/config/oidc.key
      - ./authelia/authelia.log:/config/authelia.log
      - ./authelia/secrets/ldap_password:/secrets/ldap_password:ro
    expose:
      - "9091"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9091/authelia/api/state"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### `authelia/configuration.yml` — reference blocks

The full file is large (OIDC JWKS + clients). Below are the blocks that
matter for a fresh build.

**Authentication backend (AD):**

```yaml
authentication_backend:
  refresh_interval: 5m
  ldap:
    implementation: activedirectory
    address: ldap://192.168.50.10:389
    timeout: 5s
    start_tls: false
    base_dn: DC=aegis,DC=corp
    additional_users_dn: 'OU=Departments'
    users_filter: "(&({username_attribute}={input})(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
    additional_groups_dn: 'OU=Security_Groups'
    groups_filter: "(&(member={dn})(objectClass=group))"
    user: CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp
    attributes:
      username: sAMAccountName
      display_name: displayName
      mail: mail
      group_name: cn
```

Key points:
- `userAccountControl:...:=2` excludes **disabled** AD accounts. A user
  disabled in AD loses gateway access on the next request — no caching.
- No `password:` key — the value comes from the `_FILE` env var.
- `additional_users_dn` and `additional_groups_dn` **must** be quoted —
  YAML treats bare strings with spaces specially.

**Access control rules:**

```yaml
access_control:
  default_policy: deny
  rules:
    - domain: authelia.zerotrust.lan
      policy: bypass

    - domain: keycloak.zerotrust.lan
      resources:
        - "^/realms/.*/protocol/openid-connect/.*"
        - "^/realms/.*/login-actions/.*"
        - "^/health/.*"
        - "^/js/.*"
        - "^/resources/.*"
        - "^/realms/.*/account/.*"
      policy: bypass

    - domain: keycloak.zerotrust.lan
      policy: two_factor
      subject: "group:GRP_IT_Admin"
    - domain: keycloak.zerotrust.lan
      policy: deny

    - domain: traefik.zerotrust.lan
      policy: two_factor
      subject: "group:GRP_IT_Admin"
    - domain: traefik.zerotrust.lan
      policy: deny

    - domain: mailpit.zerotrust.lan
      policy: bypass

    - domain: portainer.zerotrust.lan
      policy: two_factor
      subject:
        - "group:GRP_IT_Admin"
        - "group:GRP_Web_Ops"
    - domain: portainer.zerotrust.lan
      policy: deny

    - domain: "*.zerotrust.lan"
      policy: two_factor
```

**The explicit-deny pattern is mandatory.** Without a matching `deny` rule
after a `subject:`-scoped rule, requests from non-matching users fall through
to the wildcard `*.zerotrust.lan` rule and get unintended `two_factor` access
instead of denial.

#### Env vars consumed

| Var | Source | Purpose |
|---|---|---|
| `AUTHELIA_SESSION_SECRET` | `.env` | Cookie signing |
| `AUTHELIA_STORAGE_PASSWORD` | `.env` | Postgres storage password |
| `REDIS_PASSWORD` | `.env` | Redis session cache |
| `KEYCLOAK_OIDC_SECRET` | `.env` | OIDC client secret for Keycloak broker |
| `AUTHELIA_AUTHENTICATION_BACKEND_LDAP_USER` | compose | AD bind DN |
| `AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE` | compose | Path to bind password |

#### Verification

```bash
docker compose ps authelia                          # Up (healthy)
docker exec authelia sh -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
# Expect: OK
sudo tail -20 authelia/authelia.log | jq -r '.msg' | grep -iE "vendor|startup"
# Expect: "LDAP Discovery. ... Vendor Name: Microsoft Corporation"
#         "Startup complete"
```

Then a **live login test** — this is the only definitive proof:

1. Open `https://authelia.zerotrust.lan` in a private window
2. Log in with a real AD user (`sAMAccountName` + AD password)
3. Complete TOTP enrollment when prompted (see § 11.6 if email notifier fails)
4. Confirm the log line shows the user's real AD groups:

```bash
sudo tail -5 authelia/authelia.log | jq -r '.msg' | grep "Check authorization"
# Expect: "Check authorization of subject username=<user> groups=GRP_IT_Admin ..."
```

---

### 6.6 oidc-proxy

**Image:** `caddy:2-alpine`
**Network:** `auth_net`
**Purpose:** Injects the correct `Host` and `X-Forwarded-*` headers so Authelia
sees the public URL during OIDC callbacks. Without this, the OIDC callback
originates from an internal name (`authelia:9091`) and Authelia rejects the
redirect because it doesn't match the configured issuer.

#### Service block

```yaml
  oidc-proxy:
    image: caddy:2-alpine
    container_name: oidc-proxy
    hostname: oidc-proxy
    networks:
      - auth_net
    volumes:
      - ./oidc-proxy/Caddyfile:/etc/caddy/Caddyfile:ro
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### `oidc-proxy/Caddyfile`

```
:8080 {
    reverse_proxy authelia:9091 {
        header_up Host authelia.zerotrust.lan
        header_up X-Forwarded-Host authelia.zerotrust.lan
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-Port 443
    }
}
```

#### Verification

```bash
docker compose ps oidc-proxy
docker exec oidc-proxy caddy validate --config /etc/caddy/Caddyfile
# Expect: Valid configuration
```

---

### 6.7 Mailpit

**Image:** `axllent/mailpit:latest`
**Network:** `auth_net`
**Purpose:** SMTP sinkhole. Used as Authelia's notifier for identity-confirmation
emails during MFA enrollment.

#### Service block

```yaml
  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit
    hostname: mailpit
    networks:
      - auth_net
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "1"
      MP_SMTP_AUTH_ALLOW_INSECURE: "1"
    expose:
      - "1025"
      - "8025"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8025/"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
```

#### Verification

```bash
docker compose ps mailpit                          # Up (healthy)
curl -s http://localhost:8025/api/v1/webui 2>/dev/null || \
  docker exec mailpit wget -qO- http://localhost:8025/api/v1/messages | jq
# Expect: JSON with the messages array
```

UI at `https://mailpit.zerotrust.lan` (Authelia bypass — see § 6.5 access rules).

---

### 6.8 Portainer

**Image:** `portainer/portainer-ce:latest`
**Network:** `auth_net`
**Volume:** `portainer_data`
**Purpose:** Container management UI. Reads the Docker socket to display and
manage containers.

#### Service block

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    hostname: portainer
    networks:
      - auth_net
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    expose:
      - "9000"
    healthcheck:
      test: ["CMD", "/portainer", "--version"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s
    restart: unless-stopped
```

> **Security note:** Mounting `docker.sock` grants the container root on the
> host. This is why Portainer sits behind Authelia with `two_factor` and is
> scoped to `GRP_IT_Admin` and `GRP_Web_Ops`. In production, consider
> [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) to
> filter which API endpoints are exposed.

#### Verification

```bash
docker compose ps portainer                        # Up (healthy)
docker exec portainer /portainer --version
```

UI at `https://portainer.zerotrust.lan` — requires `GRP_IT_Admin` or `GRP_Web_Ops`.

---

### 6.9 Coraza

**Image:** local build (`./coraza`)
**Network:** `proxy_net`
**Purpose:** Web Application Firewall in front of Juice Shop. Uses OWASP CRS
v4.29 for request inspection.

#### Service block

```yaml
  coraza:
    build: ./coraza
    container_name: coraza
    networks:
      - proxy_net
    volumes:
      - ./coraza/Caddyfile:/etc/caddy/Caddyfile
      - ./coraza/rules:/etc/coraza/rules
      - ./coraza/rules:/srv
      - ./coraza_logs:/var/log/caddy
    restart: unless-stopped
```

#### `coraza/Dockerfile`

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build --with github.com/corazawaf/coraza-caddy/v2

FROM caddy:latest
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

#### `coraza/Caddyfile`

```
{
    order coraza_waf first
}

:8080 {
    log {
        output file /var/log/caddy/access.log
        format json
    }
    coraza_waf {
        load_owasp_crs
        directives `
            Include /srv/crs-setup.conf
            Include /srv/REQUEST-*.conf
            Include /srv/RESPONSE-*.conf
            SecRuleEngine On
        `
    }
    reverse_proxy 192.168.50.20:3000
}
```

Update the `reverse_proxy` target to match wherever Juice Shop runs.

#### CRS rule set

Copy the OWASP CRS v4.29 rule files into `coraza/rules/`. Each `.conf` file
must be `REQUEST-*` or `RESPONSE-*` and the setup file must be named
`crs-setup.conf`. They are loaded by the glob patterns above.

#### Verification

```bash
docker compose ps coraza
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/ || \
  docker exec coraza wget -qO- http://localhost:8080/ | head -1
```

Do **not** expose Coraza directly. It is reachable only through Traefik.

---

### 6.10 Traefik

**Image:** `traefik:v3.6.1`
**Networks:** `proxy_net`, `auth_net`
**Purpose:** Reverse proxy, TLS termination, forward-auth enforcement. The
only container attached to both the DMZ and the enclave.

#### Service block

```yaml
  traefik:
    image: traefik:v3.6.1
    container_name: traefik
    hostname: traefik
    networks:
      - proxy_net
      - auth_net
    depends_on:
      authelia:
        condition: service_healthy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/traefik-dynamic.yml:/etc/traefik/traefik-dynamic.yml:ro
      - ./traefik/certs:/etc/traefik/certs:ro
      - traefik_data:/traefik
      - ./traefik_logs:/var/log/traefik
    ports:
      - "80:80"
      - "443:443"
      - "1514:1514"
      - "1515:1515"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped
```

Ports `1514/1515` are TCP forwarders to the Wazuh manager in Zone 4 — see
`traefik-dynamic.yml` § *TCP routers*.

#### `traefik/traefik.yml` — static config

```yaml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
    forwardedHeaders:
      insecure: true

  websecure:
    address: ":443"
    http:
      tls: {}

  wazuh-agent:
    address: ":1514"

  wazuh-auth:
    address: ":1515"

  traefik:
    address: ":8080"

api:
  insecure: false
  dashboard: true
  debug: false

ping:
  entryPoint: traefik

log:
  level: INFO
  format: json

accessLog:
  filePath: "/var/log/traefik/access.log"
  format: json

providers:
  file:
    filename: /etc/traefik/traefik-dynamic.yml
    watch: true

metrics:
  prometheus:
    addEntryPointsLabels: true
    addServicesLabels: true
```

#### `traefik/traefik-dynamic.yml` — routers & middlewares

The dynamic config contains three main sections: middlewares (Authelia
forward-auth + security headers), HTTP routers (one per service hostname), and
TCP forwarders (for Wazuh).

Key middleware — **Authelia forward-auth**:

```yaml
http:
  middlewares:
    authelia:
      forwardAuth:
        address: http://authelia:9091/api/authz/forward-auth?rd=https://authelia.zerotrust.lan/
        trustForwardHeader: true
        authResponseHeaders:
          - Remote-User
          - Remote-Groups
          - Remote-Name
          - Remote-Email
```

Each protected router chains `authelia` + `security-headers`. See the structure
doc § 3 for the complete router list.

#### Verification

```bash
docker compose ps traefik
# Up (healthy)
curl -sk -o /dev/null -w "%{http_code}\n" https://traefik.zerotrust.lan/ping
# Expect: 200
```

---

## 7. Ingress Routing

Traefik routes by `Host` header. Each hostname is a router with one or more
middlewares. The complete routing table:

| Hostname | Middlewares | Backend | Auth required |
|---|---|---|---|
| `keycloak.zerotrust.lan` | `authelia`, `security-headers-keycloak` | `keycloak:8080` | `GRP_IT_Admin` on admin paths; OIDC endpoints bypass |
| `authelia.zerotrust.lan` | `security-headers` | `authelia:9091` | None (it *is* the auth portal) |
| `traefik.zerotrust.lan` | `authelia`, `security-headers` | Traefik internal API | `GRP_IT_Admin` |
| `mailpit.zerotrust.lan` | `authelia`, `security-headers` | `mailpit:8025` | Bypass (dev sinkhole) |
| `portainer.zerotrust.lan` | `authelia`, `security-headers` | `portainer:9000` | `GRP_IT_Admin`, `GRP_Web_Ops` |
| `juiceshop.zerotrust.lan` | `security-headers` | `coraza:8080` | None (WAF only) |

DNS: all `*.zerotrust.lan` must resolve to the gateway's `ens33` IP. Either a
local DNS server or `/etc/hosts` on the client machine.

---

## 8. Access Control Model

Authelia is the sole gateway policy decision point for HTTP routes. The model:

1. **AD group** is the only authorization unit — no per-user rules.
2. **Authelia rule** references the group by name (`group:GRP_IT_Admin`).
3. **Explicit-deny after each scoped rule** prevents wildcard fallthrough.
4. **`default_policy: deny`** — anything not explicitly permitted is denied.

Adding an admin: add user to `GRP_IT_Admin` in AD. No Authelia edit. No
Traefik restart. Next request from that user gets admin access.

Revoking an admin: remove from group or disable the account. Revocation
propagates on the next request (no caching in the flow — `refresh_interval: 5m`
is only for Authelia's own LDAP cache, not for the forward-auth decision).

---

## 9. Identity Federation — AD

Both Authelia and Keycloak consume AD read-only.

- **Authelia** queries AD live on each login via LDAP bind as `svc-keycloak`.
- **Keycloak** federates via User Federation + LDAP group mapper; sync is
  scheduled and can also be triggered manually.

### Group naming convention (must match AD exactly)

| Purpose | AD group | Consumers |
|---|---|---|
| Gateway admins | `GRP_IT_Admin` | Authelia (Traefik/Keycloak/Portainer access) |
| Web operators | `GRP_Web_Ops` | Authelia (Portainer access) |
| Finance users | `GRP_Finance` | No gateway surface (application-level only) |

The groups live at `OU=Security_Groups,DC=aegis,DC=corp`. Users live under
`OU=Departments,DC=aegis,DC=corp`.

### AD service account

- DN: `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp`
- Rights: read-only on the `OU=Departments` and `OU=Security_Groups` subtrees
- Password: stored in `authelia/secrets/ldap_password` (mode 600) and in
  Keycloak's LDAP provider config

---

## 10. Verification Checklist

Run in order after the first full `docker compose up -d`. All must pass.

- [ ] `docker compose ps` — all services `Up` (and `healthy` where defined)
- [ ] `docker network ls` — three networks present
- [ ] `docker volume ls` — six volumes present
- [ ] `docker compose config -q` — silent
- [ ] `docker exec authelia sh -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'` — `OK`
- [ ] `docker exec keycloak bash -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'` — `OK`
- [ ] `curl -sk https://keycloak.zerotrust.lan/realms/master/.well-known/openid-configuration | jq .issuer` — `https://keycloak.zerotrust.lan/realms/master`
- [ ] `curl -sk -o /dev/null -w "%{http_code}\n" https://traefik.zerotrust.lan/ping` — `200`
- [ ] `sudo tail -20 authelia/authelia.log | jq -r .msg | grep "Vendor Name: Microsoft"` — match
- [ ] Live login as an AD user at `https://authelia.zerotrust.lan` — succeeds, TOTP enrolls
- [ ] Log line after login shows `groups=<real AD group>` for the user
- [ ] Admin surface test: log in as `GRP_IT_Admin` member → visit `https://traefik.zerotrust.lan` — succeeds
- [ ] Non-admin test: log in as `GRP_Finance` member → visit `https://traefik.zerotrust.lan` — denied

---

## 11. Troubleshooting

The eight real errors encountered during this build, in the order they
typically appear.

### 11.1 `services.keycloak.logging additional properties 'KC_LOG_LEVEL' not allowed`

**Cause:** An env var was placed under a service's `logging:` block, which
Compose reserves for the driver and driver options only.

**Fix:** Move `KC_LOG_LEVEL` under `environment:` (or into `keycloak/.env`).
The `logging:` block should only contain `driver:` and `options:`.

```yaml
# Wrong
    logging:
      driver: "json-file"
      options: { max-size: "10m" }
      KC_LOG_LEVEL: INFO

# Right
    environment:
      KC_LOG_LEVEL: INFO
    logging:
      driver: "json-file"
      options: { max-size: "10m" }
```

### 11.2 `mapping key "ldap_egress" already defined`

**Cause:** Duplicate top-level network definition in `docker-compose.yml`.
Usually the result of running a `sed` insert that didn't check for existing
occurrences.

**Fix:** `grep -n "ldap_egress:" docker-compose.yml` — delete all but the first
block. Verify with `docker compose config -q`.

### 11.3 Authelia: `LDAP Result Code 200 "Network Error": dial tcp ... no route to host`

**Cause:** Authelia is on `auth_net` only. `auth_net` is `internal: true` and
has no gateway — traffic off the bridge is dropped.

**Fix:** Attach Authelia to `ext_net` as the **first** network:

```yaml
    networks:
      - ext_net
      - auth_net
```

Verify with:

```bash
docker inspect authelia --format '{{json .NetworkSettings.Networks}}' | jq 'keys'
# Expect both networks, ext_net first
```

### 11.4 Authelia: `LDAP Result Code 49 "Invalid Credentials"`

**Cause:** Two distinct problems produce this same error code:

1. Wrong bind password — usually because `AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD` is set (the **non-`_FILE`** variant) and points at the string `/secrets/ldap_password` literally.
2. Wrong bind DN — e.g. pointing at `keycloak-bind` when the password in the
   file belongs to `svc-keycloak`.

**Fix:**

```bash
# Confirm the env var has the _FILE suffix
docker inspect authelia --format '{{range .Config.Env}}{{println .}}{{end}}' | grep LDAP_PASSWORD
# Must be: AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE=/secrets/ldap_password

# Confirm the secret file length matches the password
wc -c authelia/secrets/ldap_password

# Confirm the bind DN matches the account whose password is in the file
sudo grep "user:" authelia/configuration.yml
```

### 11.5 Authelia: `LDAP Result Code 32 "No Such Object"`

**Cause:** The `additional_users_dn` or `additional_groups_dn` path doesn't
exist in AD. Common when the OU has been renamed or never existed.

**Fix:** Dump the real OU tree from AD:

```bash
ldapsearch -x -H ldap://192.168.50.10:389 \
  -D 'CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp' -W \
  -b 'DC=aegis,DC=corp' '(objectClass=organizationalUnit)' dn
```

Update `additional_users_dn` and `additional_groups_dn` to match the real
structure. **Quote the values** in YAML if they contain spaces or commas:

```yaml
    additional_users_dn: 'OU=Departments'
    additional_groups_dn: 'OU=Security_Groups'
```

### 11.6 Authelia: `notifier: smtp: failed to parse mail address "<@>"`

**Cause:** The user has no `mail` attribute set in AD. Authelia builds the
envelope as `<@>` (empty) and rejects it.

**Fix:** Set the mail attribute in AD:

```powershell
Set-ADUser -Identity <username> -EmailAddress "<username>@aegis.corp"
```

Then `docker compose restart authelia` to flush the LDAP cache, log out, log
back in, retry the MFA enrollment.

### 11.7 Keycloak: `431 Request Header Fields Too Large`

**Cause:** Combined cookie + header size exceeds Keycloak's default 20 KB limit.

**Fix:** Set `KC_HTTP_MAX_HEADER_SIZE: "65536"` in Keycloak's `environment:`
block, restart Keycloak, clear browser cookies for `.zerotrust.lan`.

### 11.8 Keycloak: OIDC callback loops or rejects with `invalid_redirect_uri`

**Cause:** The OIDC issuer URL inside the container differs from the URL the
browser reaches Keycloak on. Keycloak validates the `redirect_uri` against the
realm's configured base URL.

**Fix:** Ensure `KC_HOSTNAME=keycloak.zerotrust.lan` is set, the
`extra_hosts` entries map the hostname internally, and Traefik forwards the
`Host` header without modification. The Authelia OIDC client's `redirect_uris`
must exactly match what Keycloak will emit
(`https://keycloak.zerotrust.lan/realms/aegis/broker/authelia/endpoint`).

---

## 12. SOC Visibility Contract

All gateway services log to files or indices that Zone 4 (SOC) ingests. The
index naming is a **contract** — changing it breaks detection rules.

| Source | Index | Log destination | Content |
|---|---|---|---|
| Authelia | `authelia-*` | `authelia/authelia.log` (JSON) | Login, MFA, ACL decisions |
| Keycloak | `keycloak-*` | `keycloak_logs/keycloak.log` (JSON) | Token issuance, sessions, admin events |
| Traefik | `traefik-*` | `traefik_logs/access.log` (JSON) | Every HTTP request, forward-auth result |
| Coraza | `coraza-*` | `coraza_logs/access.log` (JSON) | WAF hits, anomaly scores, blocks |
| Zeek / Suricata | `filebeat-*` | Filebeat → ES | Network layer |
| Active Directory (DC01) | `wazuh-*` | Wazuh agent → manager → ES | User/group changes, Kerberos, lockouts |

**The last row is not yet ingested.** Adding the Wazuh agent on DC01 closes
the only remaining identity blind spot. See the SOC section of the main
project report.

---

## Appendix A — Environment Variable Reference

Every `${...}` reference in `docker-compose.yml` and where it comes from.

| Variable | Source | Used by |
|---|---|---|
| `POSTGRES_DB` | `.env` | postgres |
| `POSTGRES_USER` | `.env` | postgres |
| `POSTGRES_PASSWORD` | `.env` | postgres |
| `REDIS_PASSWORD` | `.env` | redis, authelia |
| `AUTHELIA_SESSION_SECRET` | `.env` | authelia |
| `AUTHELIA_STORAGE_PASSWORD` | `.env` | authelia |
| `KEYCLOAK_ADMIN_PASSWORD` | `keycloak/.env` | keycloak |
| `KEYCLOAK_OIDC_SECRET` | `.env` | authelia |
| `LDAP_ADMIN_PASSWORD` | `.env` | openldap |
| `LDAP_CONFIG_PASSWORD` | `.env` | openldap |

Variables **not** listed here as `_FILE` variants (Authelia LDAP bind
password) are supplied directly in the Compose service block, not through
`.env`.

---

## Appendix B — Common Commands

```bash
# Recreate a single service after config change
docker compose up -d --force-recreate <service>

# Restart without recreating (for bind-mounted config changes)
docker compose restart <service>

# Follow a service's log
docker compose logs -f <service>

# Enter a container
docker exec -it <container> sh

# Check network attachment
docker inspect <container> --format '{{json .NetworkSettings.Networks}}' | jq 'keys'

# Check env vars in a running container
docker inspect <container> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep <pattern>

# Validate compose file
docker compose config -q

# Dry-run a rebuild
docker compose build --no-cache <service>
```

---

## 13. Federation Overview

Two independent consumers read from the same AD directory, read-only:

```
                         ┌──────────────────────────────┐
                         │   Active Directory (DC01)    │
                         │   aegis.corp · 192.168.50.10 │
                         │                              │
                         │   Users:  OU=Departments     │
                         │   Groups: OU=Security_Groups │
                         └──────────────┬───────────────┘
                                        │
                             LDAP read-only (bind: svc-keycloak)
                                        │
              ┌─────────────────────────┴────────────────────────┐
              │                                                  │
              ▼                                                  ▼
    ┌──────────────────────┐                        ┌──────────────────────┐
    │     Authelia         │                        │      Keycloak        │
    │  (forward-auth)      │◄─── OIDC broker ──────►│  (token issuer)      │
    │                      │                        │                      │
    │  Groups → ACL rules  │                        │  Groups → realm      │
    │                      │                        │  roles via mapper    │
    └──────────────────────┘                        └──────────────────────┘
              │                                                  │
              └─────────────────────┬────────────────────────────┘
                                    ▼
                          Remote-User / Remote-Groups
                          headers + OIDC claims to backends
```

**Two distinct roles for each service:**

| Service | Role in the flow |
|---|---|
| **Authelia** | Front gate. Enforces who can reach *any* HTTP route. Its decision comes from AD group membership + MFA state. |
| **Keycloak** | Token factory. Issues OIDC tokens for downstream apps that want claims, refresh tokens, and SSO. |

They are **peers** — Authelia does not depend on Keycloak to enforce routes. The OIDC broker between them exists only so that a session at one can be extended to the other without a second login.

---

## 14. Authelia — Full LDAP Configuration

This section documents the complete `authentication_backend` block with rationale
for every non-obvious line.

### 14.1 Block reference

```yaml
authentication_backend:
  refresh_interval: 5m
  ldap:
    implementation: activedirectory
    address: ldap://192.168.50.10:389
    timeout: 5s
    start_tls: false
    base_dn: DC=aegis,DC=corp
    additional_users_dn: 'OU=Departments'
    users_filter: >-
      (&({username_attribute}={input})
       (objectClass=user)
       (!(userAccountControl:1.2.840.113556.1.4.803:=2)))
    additional_groups_dn: 'OU=Security_Groups'
    groups_filter: '(&(member={dn})(objectClass=group))'
    user: CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp
    attributes:
      username: sAMAccountName
      display_name: displayName
      mail: mail
      group_name: cn
      given_name: givenName
      family_name: sn
```

### 14.2 Field rationale

| Field | Value | Why |
|---|---|---|
| `implementation` | `activedirectory` | Tells Authelia to use AD-specific quirks: `sAMAccountName` normalization, `objectGUID` handling, `userAccountControl` bitmask interpretation. |
| `address` | `ldap://192.168.50.10:389` | Port 389 (cleartext). Traffic stays on `ext_net` bridge — never crosses a shared LAN. LDAPS is a production hardening item, not a functional requirement for the lab. |
| `base_dn` | `DC=aegis,DC=corp` | Domain root. All subsequent DN paths are relative to this. |
| `additional_users_dn` | `'OU=Departments'` | Concatenated with `base_dn` → `OU=Departments,DC=aegis,DC=corp`. **Must be quoted** — YAML treats unquoted strings with spaces specially. |
| `users_filter` | `(&(sAMAccountName={input})(objectClass=user)(!(userAccountControl:...:=2)))` | Three-way AND: username must match, object must be a user, and the **disabled bit must be clear**. `1.2.840.113556.1.4.803:=2` is the AD bitwise-match operator for `ACCOUNTDISABLE`. |
| `additional_groups_dn` | `'OU=Security_Groups'` | Full path → `OU=Security_Groups,DC=aegis,DC=corp`. Groups live in their own OU, not under `Departments`. |
| `groups_filter` | `(&(member={dn})(objectClass=group))` | Find any group whose `member` attribute contains the user's DN. `{dn}` is substituted by Authelia after resolving the user. |
| `user` | `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp` | Bind DN. Must match the account whose password is in the secret file. |
| `attributes.username` | `sAMAccountName` | What the login form field is checked against. **Case-insensitive in AD**, so `Anis.Taibi` and `anis.taibi` both work. |
| `attributes.display_name` | `displayName` | Human-readable name. Falls back to `cn` if unset. |
| `attributes.mail` | `mail` | Required for Authelia's session-elevation email. **If empty in AD, TOTP registration fails.** |

### 14.3 Why the disabled-account filter is critical

Without `(!(userAccountControl:...:=2))`, a user who is **disabled** in AD can
still authenticate through the gateway. The filter makes revocation instant:

1. Admin disables `salima` in AD
2. Salima's next request to any gateway service
3. Authelia binds to AD, runs `users_filter`, and — because the disabled bit
   is now set — the filter returns no match
4. Authelia treats the login attempt as **user not found**
5. Access denied

No sync delay. No cached credentials. This is the single most important
property of the federation.

### 14.4 Bind password — `_FILE` convention

The password is **never** written into `configuration.yml`. Authelia resolves
it via the `_FILE` env var pattern:

```yaml
    # NOT in configuration.yml — supplied by environment
    # password: <-- intentionally omitted
```

```yaml
# docker-compose.yml
    environment:
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE: /secrets/ldap_password
    volumes:
      - ./authelia/secrets/ldap_password:/secrets/ldap_password:ro
```

**Rule:** never set the non-`_FILE` variant alongside the `_FILE` variant. If
both are present, Authelia uses the literal value of the non-`_FILE` variable,
which means it will try to bind with the string `/secrets/ldap_password` as
the password and fail with `LDAP Result Code 49`.

### 14.5 Reload without restart

`refresh_interval: 5m` only governs how often Authelia refreshes its internal
AD user cache. **The bind itself happens fresh on every authentication** —
there is no persistent connection to AD that could go stale.

To force a cache flush after changing AD data:

```bash
docker compose restart authelia
```

### 14.6 Verification — live login

The `check-policy` subcommand **does not** query LDAP. It evaluates rules
against a username string with no group resolution. Ignore its output as a
functional test; use it only to validate rule syntax.

The only functional test is a live login:

```bash
# In another terminal, tail the log
sudo tail -f authelia/authelia.log

# Browser: log in as a real AD user, complete MFA
# Watch for the line:
#   "Check authorization of subject username=<user> groups=<GRP_...> ..."
```

If the `groups=` field is empty → the group filter matched nothing. See § 11.5.

---

## 15. Keycloak — AD User Federation

Keycloak consumes AD through the **User Federation** subsystem. Unlike
Authelia, Keycloak **caches** AD data and needs periodic sync to see changes.

### 15.1 Prerequisites

1. Keycloak running and healthy — see § 6.4
2. Network path from `keycloak` container to `192.168.50.10:389` — verified in § 6.4
3. A realm to hold the federation config. This guide assumes realm `aegis` exists.

### 15.2 Create the realm

Keycloak admin console → top-left dropdown → **Create realm**:

| Field | Value |
|---|---|
| Realm name | `aegis` |
| Enabled | `On` |

Save.

### 15.3 Add the LDAP user federation provider

Realm `aegis` → **User Federation** → **Add provider** → **LDAP**.

#### Connection & Authentication

| Field | Value |
|---|---|
| Console display name | `AegisAD` |
| Vendor | `Active Directory` |
| Connection URL | `ldap://192.168.50.10:389` |
| Enable StartTLS | `Off` |
| Use Truststore SPI | `Never` |
| Connection pooling | `On` |
| Bind type | `simple` |
| Bind DN | `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp` |
| Bind credentials | *(AD password — same one in `authelia/secrets/ldap_password`)* |

Click **Test connection** → expect `Success`.
Click **Test authentication** → expect `Success`.
**Stop if either fails** and check § 11.3 / § 11.4.

#### LDAP Searching and Updating

| Field | Value |
|---|---|
| Edit mode | `READ_ONLY` |
| Users DN | `OU=Departments,DC=aegis,DC=corp` |
| Username LDAP attribute | `sAMAccountName` |
| RDN LDAP attribute | `cn` |
| UUID LDAP attribute | `objectGUID` |
| User object classes | `person, organizationalPerson, user` |
| Search scope | `Subtree` |
| Read timeout | `10s` |
| Pagination | `On` |
| Batch size | `100` |

Click **Save**.

#### Synchronization Settings

Still on the LDAP provider page, scroll to **Synchronization settings**:

| Field | Value | Notes |
|---|---|---|
| Import users | `On` | New AD users appear in Keycloak |
| Sync registrations | `Off` | Keycloak does **not** write new users back to AD |
| Periodic full sync | `On` | Re-imports everything on schedule |
| Full sync period | `86400` | Once per day (seconds) |
| Periodic changed users sync | `On` | Imports only users who changed |
| Changed users sync period | `300` | Every 5 minutes |

**Why these values:** `300s` for changed users is the balance point between
freshness and directory load. A new AD user appears in Keycloak within ~5
minutes without any manual action. For demo purposes, use the **Sync all
users** button after any AD change to force an immediate refresh.

### 15.4 Add the LDAP group mapper

Without this, groups exist in AD but not in Keycloak. User group membership
does not propagate.

Realm `aegis` → **User Federation** → `AegisAD` → **Mappers** tab → **Add
mapper** → **By configuration** → **group-ldap-mapper**.

| Field | Value |
|---|---|
| Name | `group-ldap-mapper` |
| LDAP Groups DN | `OU=Security_Groups,DC=aegis,DC=corp` |
| Group Name LDAP Attribute | `cn` |
| Group Object Classes | `group` |
| Membership LDAP Attribute | `member` |
| Membership Attribute Type | `DN` |
| Mode | `READ_ONLY` |
| User Groups Retrieve Strategy | `LOAD_GROUPS_BY_MEMBER_ATTRIBUTE` |
| Groups Path | `/` |

Save.

### 15.5 Force first sync

Back on the LDAP provider top page → **Action** menu (top-right) → **Sync all
users**.

Expected result: the Keycloak **Users** and **Groups** menus now show AD data.

```text
Users  →  salima, anis.taibi, hani.abdelkader, mezi.islam, svc-keycloak, + admin
Groups →  GRP_IT_Admin, GRP_Web_Ops, GRP_Finance
```

If **Users** appears empty, the default search filter may be hiding federated
users. In the Users page, click the **Search user** dropdown → **View all**.

### 15.6 Verify group membership

Realm `aegis` → **Groups** → `GRP_IT_Admin` → **Members** tab.

Expected:

```
anis.taibi
hani.abdelkader
```

Repeat for `GRP_Web_Ops` (should list `mezi.islam`) and `GRP_Finance` (should
list `salima`).

If members are missing, the group mapper's `LDAP Groups DN` doesn't match the
real path. Re-verify with § 11.5.

---

## 16. Keycloak — Role Mapper (AD group → realm role)

This is **item 4** from the outstanding-work checklist. Without it, apps
consuming Keycloak tokens see group claims but no realm roles. The role mapper
translates an AD group into a Keycloak role, which applications can then
check with a simple `realm_access.roles` assertion.

### 16.1 Why use roles instead of groups

Groups in an OIDC token are AD group names. If your AD group naming changes
(e.g. `GRP_IT_Admin` → `IT_Admins`), every application must be updated. Realm
roles are **stable abstractions** — the AD group is bound to a role once, and
applications check the role name. Rename the AD group, re-map, no app change.

### 16.2 Create the realm roles

Realm `aegis` → **Realm roles** → **Create role** — repeat for each:

| Role name | Description |
|---|---|
| `it-admin` | Admin access to gateway infrastructure |
| `web-operator` | Web operations access |
| `finance-user` | Finance application access |

Leave **Composite roles** off for all three.

### 16.3 Add the role LDAP mapper

Realm `aegis` → **User Federation** → `AegisAD` → **Mappers** → **Add
mapper** → **By configuration** → **role-ldap-mapper**.

| Field | Value |
|---|---|
| Name | `role-ldap-mapper` |
| LDAP Roles DN | `OU=Security_Groups,DC=aegis,DC=corp` |
| Role Name LDAP Attribute | `cn` |
| Role Object Classes | `group` |
| Membership LDAP Attribute | `member` |
| Membership Attribute Type | `DN` |
| Mode | `READ_ONLY` |
| User Roles Retrieve Strategy | `LOAD_ROLES_BY_MEMBER_ATTRIBUTE` |
| Use Realm Roles Mapping | `On` |

Save.

### 16.4 Map AD groups → realm roles

Still in **Mappers**, open `role-ldap-mapper` → scroll to **Realm Roles
Mappings** → for each AD group, assign the corresponding role:

| AD group (left) | Realm role (right) |
|---|---|
| `GRP_IT_Admin` | `it-admin` |
| `GRP_Web_Ops` | `web-operator` |
| `GRP_Finance` | `finance-user` |

Save. The mapping is stored as a Keycloak component config, keyed by AD group
DN.

### 16.5 Re-sync

LDAP provider → **Action** → **Sync all users**.

### 16.6 Verify

Realm `aegis` → **Users** → click `anis.taibi` → **Role mapping** tab.

Expected: under **Assigned roles**, `it-admin` (origin: indirect, inherited
from LDAP group mapper).

Repeat for `mezi.islam` (`web-operator`) and `salima` (`finance-user`).

### 16.7 Verify in a token

Request a token for a user via the Direct Access Grant (dev-only; requires
the client to have it enabled):

```bash
curl -sk -X POST \
  'https://keycloak.zerotrust.lan/realms/aegis/protocol/openid-connect/token' \
  -d 'client_id=admin-cli' \
  -d 'username=anis.taibi' \
  -d 'password=<AD-password>' \
  -d 'grant_type=password' | jq -r .access_token | \
  cut -d. -f2 | base64 -d 2>/dev/null | jq '.realm_access'
```

Expected output:

```json
{
  "roles": [
    "it-admin",
    "offline_access",
    "uma_authorization"
  ]
}
```

The presence of `it-admin` confirms the mapper works end-to-end.

---

## 17. OIDC Broker — Authelia ↔ Keycloak

Authelia can act as an **OIDC identity provider** and Keycloak can act as an
**OIDC identity broker**. The broker makes a session at one valid at the other
without a second login prompt.

### 17.1 Why this exists

Without the broker, a user logs in twice:

1. Authelia (forward-auth) — to reach any gateway route
2. Keycloak — to get an OIDC token for a downstream app

With the broker, Authelia's OIDC provider issues an ID token on login, and
Keycloak's broker consumes it to establish a Keycloak session. One prompt,
two services authenticated.

### 17.2 Authelia OIDC provider config

In `authelia/configuration.yml` under `identity_providers`:

```yaml
identity_providers:
  oidc:
    jwks:
      - key_id: main
        algorithm: RS256
        use: sig
        key: |
          -----BEGIN PRIVATE KEY-----
          <contents of authelia/oidc.key>
          -----END PRIVATE KEY-----
    cors:
      endpoints:
        - authorization
        - token
        - revocation
        - introspection
      allowed_origins:
        - https://traefik.zerotrust.lan
        - https://keycloak.zerotrust.lan
    clients:
      - client_id: traefik
        client_secret: <hashed-secret>
        redirect_uris:
          - https://traefik.zerotrust.lan/auth/openid/callback
        scopes: [openid, profile, email]
        response_types: [code]
        response_modes: [form_post]
      - client_id: keycloak
        client_secret: <hashed-secret>
        redirect_uris:
          - https://keycloak.zerotrust.lan/realms/aegis/broker/authelia/endpoint
        scopes: [openid, profile, email, groups]
        response_types: [code]
        response_modes: [form_post]
```

**Client secrets must be hashed.** Authelia accepts plaintext but warns at
startup; the correct form is the argon2id hash:

```bash
docker exec authelia authelia crypto hash generate argon2 --password '<plaintext-secret>'
```

Paste the output (including the `$argon2id$...` prefix) into `client_secret`.

The `redirect_uris` must exactly match what the client sends — no trailing
slashes, no case differences.

### 17.3 Keycloak identity provider config

Realm `aegis` → **Identity providers** → **Add provider** → **OpenID
Connect v1.0**:

| Field | Value |
|---|---|
| Alias | `authelia` |
| Display name | `AEGIS SSO` |
| Enabled | `On` |
| Import from URL | `https://authelia.zerotrust.lan/.well-known/openid-configuration` |
| Client ID | `keycloak` |
| Client Secret | *(plaintext value — matches the hash in Authelia)* |
| Default scopes | `openid profile email groups` |

Save. Keycloak auto-populates the authorization/token/JWKS URLs from the
discovery document.

### 17.4 Enable brokering on a client

Realm `aegis` → **Clients** → (your app) → **Login settings** → scroll to
**Identity provider**:

- **First login flow**: `first broker login`
- **Post login flow**: *(leave empty)*

Then to make the brokered login the default, in the client's **Authentication
flow overrides** section, set **Browser flow** to a custom flow that starts
with an **Identity Provider Redirector** execution having the `authelia` alias
as the default.

### 17.5 Verification

1. Open `https://authelia.zerotrust.lan` in a private window
2. Log in as an AD user
3. Navigate to a Keycloak-protected application
4. The app should redirect to Keycloak, which sees the incoming Authelia
   session via the broker and **does not prompt again** — the user lands on
   the app authenticated

If Keycloak prompts again, the broker isn't completing. Check:

```bash
# Authelia side — is the token being issued?
sudo tail -20 authelia/authelia.log | grep -i oidc

# Keycloak side — was the callback processed?
tail -20 keycloak_logs/keycloak.log | jq -r 'select(.message | test("broker"; "i")) | .message'
```

Common causes: redirect_uri mismatch (§ 11.8), client_secret mismatch, or the
Authelia discovery document not being reachable from the Keycloak container.

---

## 18. Complete Identity Flow

End-to-end path for a single request from an authenticated AD user.

```
1.  User opens https://traefik.zerotrust.lan

2.  Browser → Traefik (proxy_net)
      Traefik has no session cookie for this user

3.  Traefik → Authelia forward-auth endpoint
      POST /api/authz/forward-auth  (no session)

4.  Authelia: no session → respond 302 redirect to
      https://authelia.zerotrust.lan/?rd=https://traefik.zerotrust.lan

5.  Browser follows → Authelia login portal

6.  User submits credentials:
      username = sAMAccountName (e.g. anis.taibi)
      password = AD password

7.  Authelia binds to AD as svc-keycloak
      LDAP bind on 192.168.50.10:389

8.  Authelia searches users_filter in OU=Departments
      → finds CN=anis.taibi,OU=IT_Dept,OU=Departments,...
      → confirms userAccountControl disabled bit is clear

9.  Authelia binds to AD as the user's own DN
      with the supplied password
      → AD returns success
      → Authelia now knows the user's identity is valid

10. Authelia searches groups_filter in OU=Security_Groups
      → finds GRP_IT_Admin (member: CN=anis.taibi,...)

11. Authelia prompts for TOTP (policy: two_factor)
      → user enters 6-digit code
      → verified against Postgres-stored secret

12. Authelia marks the session as authenticated
      → sets authelia_session cookie on .zerotrust.lan

13. Browser retries https://traefik.zerotrust.lan

14. Traefik → Authelia forward-auth (with session cookie)

15. Authelia responds 200 with headers:
      Remote-User: anis.taibi
      Remote-Groups: GRP_IT_Admin
      Remote-Name: anis.taibi
      Remote-Email: anis.taibi@aegis.corp

16. Traefik evaluates the router's policy:
      domain traefik.zerotrust.lan, subject group:GRP_IT_Admin
      → match → allow

17. Traefik forwards request to backend (Traefik dashboard)
      with Remote-User / Remote-Groups headers attached

18. Backend serves the response

19. Every step above logs:
      traefik_logs/access.log    → request + forward-auth result
      authelia/authelia.log      → credential check + ACL decision
      (Keycloak is not involved in this flow — only if the backend
       itself uses OIDC and requests a token)
```

Total wall-clock: 200 ms to 500 ms for steps 2–17 on a warm AD.

---

## 19. Federation Troubleshooting Quick Reference

Symptom-to-fix table. See § 11 for the full explanation of each fix.

| Symptom | Likely cause | Fix |
|---|---|---|
| Authelia crashes at startup, `no route to host` | Only on `auth_net` | § 11.3 — add `ext_net` first in networks list |
| Authelia crashes at startup, `LDAP Result Code 49` | Wrong `_FILE` env var or wrong bind DN | § 11.4 |
| Authelia starts but login returns "user not found" | Wrong `additional_users_dn` | § 11.5 |
| Login succeeds but no groups in log line | Wrong `additional_groups_dn` | § 11.5 |
| TOTP enrollment fails, `mail address "<@>"` | No `mail` in AD | § 11.6 |
| Keycloak `Test connection` fails with `no route to host` | Keycloak container on `auth_net` only | § 11.3 |
| Keycloak syncs users but not groups | Group mapper missing | § 15.4 |
| Keycloak shows groups but no roles | Role mapper missing | § 16 |
| OIDC broker loop or `invalid_redirect_uri` | Redirect URI mismatch | § 11.8 |
| Authelia warns about plaintext client_secret | Secret not hashed | § 17.2 |

---

*End of Part 3 (Sections 13–19). The configuration guide is complete.*

---

## What `configuration.md` now covers end-to-end

| Section | Topic |
|---|---|
| 0 | How to use the guide |
| 1–5 | Host prep, directory scaffold, networks, volumes, secrets |
| 6 | Every service with full Compose definition |
| 7 | Ingress routing table |
| 8 | Access control model |
| 9 | Federation summary |
| 10 | Ordered verification checklist |
| 11 | All 8 real errors, with fixes |
| 12 | SOC index naming contract |
| **13** | **Federation overview + diagram** |
| **14** | **Authelia LDAP full walkthrough + disabled-account rationale** |
| **15** | **Keycloak User Federation + group mapper + sync schedule** |
| **16** | **Keycloak role mapper (closes checklist item 4)** |
| **17** | **OIDC broker between Authelia and Keycloak** |
| **18** | **Complete 19-step identity flow** |
| **19** | **Federation troubleshooting table** |

---

## What's left

Checklist status after this commit:

| # | Item | Status |
|---|---|---|
| 1 | Keycloak ↔ AD federation | ✅ Documented |
| 2 | Authelia → AD backend | ✅ Documented |
| 3 | Authelia access_control rewrite | ✅ Documented |
| 4 | Keycloak role mapper | ✅ Documented — **but not yet applied to your live Keycloak** |
| 5 | Wazuh agent on DC01 | ❌ Not started |
| 6 | ECS normalization | ❌ Blocked on #5 |
| 7 | LDAPS on AD bind | ❌ Not configured |
| 8 | Secret rotation | ⏸ Deferred |
| 9 | Permanent Keycloak admin | ❌ Not done |
| 10 | Correlation rules | ❌ Blocked on #6 |

