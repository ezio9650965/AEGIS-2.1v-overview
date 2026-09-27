# Gateway Build Plan — Zero to AD Federation

Complete ordered plan: blank Ubuntu Server → 10 healthy containers → Authelia
and Keycloak federated to Active Directory.

This file is the **authoritative reference**. It supersedes any external build
plan. Where a step is marked ⚠️ it corresponds to a real failure encountered
during the original deployment and must not be skipped.

> **Companion docs**
> - [`gateway-structure.md`](./gateway-structure.md) — file layout, networks, volumes
> - [`configuration.md`](./configuration.md) — service-by-service reference
> - [`soc-integration.md`](./soc-integration.md) — Zone 4 (planned)

---

## Phase 0 — Target

When this plan completes:

- 10 containers running healthy: `postgres`, `redis`, `openldap`, `keycloak`,
  `authelia`, `oidc-proxy`, `mailpit`, `portainer`, `coraza`, `traefik`
- A user created in AD can log in at `https://authelia.zerotrust.lan`
- That user's AD groups reach Authelia via LDAP on every authentication
- Keycloak delivers the same groups via the OIDC `groups` claim
- Traefik enforces per-group access on every protected route

**Design principle:** AD is the single source of truth. Authelia and Keycloak
are read-only consumers. No user is created in either gateway service.

---

## Phase 1 — Host

**OS:** Ubuntu Server 24.04 LTS · **Hostname:** `ztagateway` · **Min:** 4 vCPU / 8 GB / 100 GB

### 1.1 Interfaces

| Interface | Role |
|---|---|
| `ens33` | DHCP on the client LAN (internet uplink) |
| `ens34` | Static `192.168.50.1/24` — direct L2 adjacency to AD |

`/etc/netplan/01-ztagateway.yaml`:

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: true
    ens34:
      addresses: [192.168.50.1/24]
      dhcp4: false
```

Apply and verify:

```bash
sudo netplan apply
ip -br a                          # ens33 UP w/ DHCP, ens34 UP w/ 192.168.50.1
ip route | grep 192.168.50        # direct connected route
```

### 1.2 Packages

```bash
sudo hostnamectl set-hostname ztagateway

sudo apt update
sudo apt install -y \
  docker.io docker-compose-v2 \
  ca-certificates curl gnupg openssl uuid-runtime \
  ldap-utils jq tree netcat-openbsd tcpdump

sudo usermod -aG docker $USER
newgrp docker
```

> If the Ubuntu-shipped Docker is too old, install from Docker's official
> repository. Docker 24+ and Compose v2.20+ required.

### 1.3 Kernel tuning

```bash
sudo tee /etc/sysctl.d/99-ztagateway.conf >/dev/null <<'EOF'
net.ipv4.ip_forward=1
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.all.rp_filter=1
net.core.somaxconn=1024
net.ipv4.tcp_fin_timeout=15
EOF
sudo sysctl --system

timedatectl set-ntp true
timedatectl status            # "System clock synchronized: yes"
```

`ip_forward=1` is mandatory — Docker bridges rely on it to route through the
host to `ens34`.

### 1.4 Reachability test ⚠️

```bash
nc -zv 192.168.50.10 389      # must succeed before continuing
```

If this fails, the problem is upstream (Windows Firewall, hypervisor switch,
or wrong AD IP). **Do not proceed until it succeeds.**

**Verify:** `nc -zv 192.168.50.10 389` → `succeeded`

---

## Phase 2 — Directory scaffold

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

touch .env && chmod 600 .env
```

`.gitignore` — create **before** any `git add`:

```
.env
.env.*
*.key
*.pem
*.p12
*_logs/
*.log
*.log.*
*.bak.*
*/secrets/
```

**Verify:** `tree -L 2` matches the structure in [`gateway-structure.md`](./gateway-structure.md) § 2.

---

## Phase 3 — Networks and volumes

Add to `docker-compose.yml` bottom:

```yaml
networks:
  proxy_net:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br_proxy

  auth_net:
    driver: bridge
    internal: true
    driver_opts:
      com.docker.network.bridge.name: br_auth

  ext_net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  portainer_data:
  traefik_data:
  ldap_data:
  ldap_config:
```

### Network purpose

| Network | internal | Members | Why |
|---|---|---|---|
| `proxy_net` | no | `traefik`, `coraza` | DMZ — external-facing |
| `auth_net` | **yes** | everything else | Isolated enclave — no egress |
| `ext_net` | no | `authelia`, `keycloak` only | Route to AD on `192.168.50.10` |

### ⚠️ Ordering rule

When a service is on multiple networks, Docker assigns the default route
based on the order they're listed. **`ext_net` must be listed first** for
Authelia and Keycloak:

```yaml
networks:
  - ext_net        # ← default route to AD
  - auth_net       # ← isolated enclave
```

Swap the order and AD lookups fail with `no route to host` even though both
interfaces are attached.

**Verify:**

```bash
docker compose config -q                      # silent
docker network ls | grep -E "proxy_net|auth_net|ext_net"
```

---

## Phase 4 — Secrets

### 4.1 `.env` (non-sensitive config + generated secrets)

```bash
cd ~/zerotrust-network
cat > .env <<EOF
# --- Non-sensitive config ---
DOMAIN=zerotrust.lan
TZ=UTC
POSTGRES_DB=postgres
POSTGRES_USER=postgres
KC_DB=keycloak
AUTHELIA_DB=authelia

# --- Generated secrets ---
POSTGRES_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)
AUTHELIA_SESSION_SECRET=$(openssl rand -hex 32)
AUTHELIA_STORAGE_PASSWORD=$(openssl rand -base64 24)
KEYCLOAK_OIDC_SECRET=$(openssl rand -hex 32)
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 24)
LDAP_ADMIN_PASSWORD=$(openssl rand -base64 24)
LDAP_CONFIG_PASSWORD=$(openssl rand -base64 24)
EOF
chmod 600 .env
```

### 4.2 AD bind password — file only, not `.env` ⚠️

```bash
printf '%s' '<REAL-svc-keycloak-AD-password>' > authelia/secrets/ldap_password
chmod 600 authelia/secrets/ldap_password
wc -c authelia/secrets/ldap_password   # must equal password length
```

The bind password is **never** placed in `.env` or `configuration.yml`. It is
consumed only via Authelia's `_FILE` env var convention.

### 4.3 AD user must-have attributes

On DC01 (PowerShell as Domain Admin):

```powershell
# Every user that will authenticate through Authelia needs:
# 1. sAMAccountName set (what they type at login)
# 2. "User must change password at next logon" UNCHECKED
# 3. mail attribute set (Authelia elevation emails)

Get-ADUser -Filter * -SearchBase "OU=Departments,DC=aegis,DC=corp" -Properties mail |
  Select Name, sAMAccountName, mail | Format-Table -AutoSize
```

If `mail` is empty for any user:

```powershell
Set-ADUser -Identity <username> -EmailAddress "<username>@aegis.corp"
```

**Verify:** `docker compose config -q` is silent.

---

## Phase 5 — Core services

Add these three services to `docker-compose.yml`.

### 5.1 PostgreSQL

```yaml
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    hostname: postgres
    networks: [auth_net]
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pgcrypto"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init-scripts:/docker-entrypoint-initdb.d:ro
    expose: ["5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }
```

**`postgres/init-scripts/init.sql`** — runs only on first boot. Replace the
two `<placeholder>` values with the same passwords you set in `.env`:

```sql
CREATE DATABASE keycloak;
CREATE DATABASE authelia;

CREATE USER keycloak WITH ENCRYPTED PASSWORD '<KC_DB_PASSWORD>';
CREATE USER authelia WITH ENCRYPTED PASSWORD '<AUTHELIA_STORAGE_PASSWORD>';

GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
GRANT ALL PRIVILEGES ON DATABASE authelia TO authelia;

\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO keycloak;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c authelia
GRANT ALL ON SCHEMA public TO authelia;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authelia;
```

> The init script runs **only** when the `postgres_data` volume is empty.
> Editing it after first boot has no effect.

### 5.2 Redis

```yaml
  redis:
    image: redis:7-alpine
    container_name: redis
    hostname: redis
    networks: [auth_net]
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    expose: ["6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "PING"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }
```

### 5.3 OpenLDAP (legacy — break-glass only)

Included for continuity with the existing deployment. New builds can omit it
if Authelia/Keycloak are the only identity consumers.

```yaml
  openldap:
    image: osixia/openldap:1.5.0
    container_name: openldap
    hostname: openldap
    networks: [auth_net]
    environment:
      LDAP_ORGANISATION: AEGIS
      LDAP_DOMAIN: zerotrust.lan
      LDAP_ADMIN_PASSWORD: ${LDAP_ADMIN_PASSWORD}
      LDAP_CONFIG_PASSWORD: ${LDAP_CONFIG_PASSWORD}
      LDAP_TLS: "false"
    volumes:
      - ldap_data:/var/lib/ldap
      - ldap_config:/etc/ldap/slapd.d
    expose: ["389"]
    restart: unless-stopped
```

### 5.4 Verify

```bash
docker compose up -d postgres redis openldap
docker compose ps                              # all Up (healthy) or Up
docker exec postgres psql -U postgres -l | grep -E "keycloak|authelia"
docker exec redis redis-cli -a "$REDIS_PASSWORD" PING   # → PONG
```

---

## Phase 6 — Keycloak

### 6.1 Compose service

```yaml
  keycloak:
    image: keycloak/keycloak:latest
    container_name: keycloak
    hostname: keycloak
    networks:
      - ext_net                    # ⚠️ first = default route to AD
      - auth_net
    depends_on:
      postgres: {condition: service_healthy}
    extra_hosts:
      - "keycloak.zerotrust.lan:172.19.0.4"
      - "authelia.zerotrust.lan:172.19.0.4"
    volumes:
      - ./keycloak_logs:/opt/keycloak/data/log
    env_file: [keycloak/.env]
    expose: ["8080"]
    command: start --log=console,file \
      --log-file=/opt/keycloak/data/log/keycloak.log \
      --log-file-output=json \
      --http-access-log-enabled=true
    healthcheck:
      test: ["CMD-SHELL", "timeout 3 bash -c '</dev/tcp/127.0.0.1/8080' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 60s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }
    environment:
      KC_LOG_CONSOLE_OUTPUT: json
      KC_LOG_LEVEL: INFO                                    # ⚠️ here, not under logging:
      KC_HTTP_MAX_HEADER_SIZE: "65536"                      # ⚠️ prevents 431
      KC_SPI_TRUSTSTORE_FILE_HOSTNAME_VERIFICATION_POLICY: ANY
```

### 6.2 `keycloak/.env`

```bash
cd ~/zerotrust-network
cat > keycloak/.env <<EOF
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<KC_DB_PASSWORD>       # matches init.sql

KC_HOSTNAME=keycloak.zerotrust.lan
KC_PROXY_HEADERS=xforwarded
KC_HTTP_ENABLED=true
KC_HTTPS_ENABLED=false
KC_HTTP_RELATIVE_PATH=/
KC_FEATURES=token-exchange
EOF
chmod 600 keycloak/.env
```

Substitute the two placeholders with the values you set in `.env` and
`postgres/init-scripts/init.sql`.

### 6.3 ⚠️ Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `431 Request Header Fields Too Large` | Default 20 KB header limit hit by Authelia cookies + forward-auth headers | `KC_HTTP_MAX_HEADER_SIZE: "65536"` |
| Compose rejects with `logging additional properties 'KC_LOG_LEVEL'` | `KC_LOG_LEVEL` was placed under `logging:` | Move to `environment:` |
| `no route to host` when testing LDAP connection | `ext_net` missing or listed after `auth_net` | `ext_net` first in `networks:` |

### 6.4 Verify

```bash
docker compose up -d keycloak
docker compose ps keycloak                                       # Up (healthy)
docker exec keycloak bash -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
tail -20 keycloak_logs/keycloak.log | jq -r '.message' | tail -3
```

**Expected:** `Listening on: http://0.0.0.0:8080`

---

## Phase 7 — Authelia

### 7.1 Compose service

```yaml
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    hostname: authelia
    networks:
      - ext_net                    # ⚠️ first = default route to AD
      - auth_net
    depends_on:
      postgres: {condition: service_healthy}
      redis: {condition: service_healthy}
    environment:
      AUTHELIA_SESSION_SECRET: ${AUTHELIA_SESSION_SECRET}
      AUTHELIA_STORAGE_POSTGRES_PASSWORD: ${AUTHELIA_STORAGE_PASSWORD}
      AUTHELIA_SESSION_REDIS_PASSWORD: ${REDIS_PASSWORD}
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_USER: CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp
      AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD_FILE: /secrets/ldap_password
      AUTHELIA_LOG_LEVEL: info
      AUTHELIA_LOG_FORMAT: json
      AUTHELIA_LOG_FILE_PATH: /config/authelia.log
      TZ: UTC
    volumes:
      - ./authelia/configuration.yml:/config/configuration.yml:ro
      - ./authelia/secrets/ldap_password:/secrets/ldap_password:ro
      - ./authelia/authelia.log:/config/authelia.log
    expose: ["9091"]
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9091/authelia/api/state"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }
```

### 7.2 `authelia/configuration.yml` — critical blocks

```yaml
server:
  address: tcp://0.0.0.0:9091/

totp:
  issuer: zerotrust.lan
  period: 30
  skew: 1

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
      (&({username_attribute}={input})(objectClass=user)
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

session:
  name: authelia_session
  same_site: lax
  expiration: 3600
  remember_me: 72h
  cookies:
    - domain: zerotrust.lan
      authelia_url: https://authelia.zerotrust.lan
      default_redirection_url: https://traefik.zerotrust.lan
  redis:
    host: redis
    port: 6379
    password: ${REDIS_PASSWORD}

regulation:
  max_retries: 3
  find_time: 120
  ban_time: 300

storage:
  encryption_key: "change-me-32-chars-min-generated-at-deploy"
  postgres:
    address: tcp://postgres:5432
    database: authelia
    username: authelia
    password: ${AUTHELIA_STORAGE_PASSWORD}
    schema: public

notifier:
  smtp:
    address: smtp://mailpit:1025
    sender: authelia@zerotrust.lan
    disable_require_tls: true

access_control:
  default_policy: deny
  rules:
    - domain: authelia.zerotrust.lan
      policy: bypass

    # Keycloak OIDC endpoints — bypass for the OAuth2 flow
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
      policy: deny                                # ⚠️ explicit deny required

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

### 7.3 ⚠️ Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Crash loop, `LDAP Result Code 200 "Network Error": no route to host` | Only on `auth_net` (internal) | Attach `ext_net` first |
| Crash loop, `LDAP Result Code 49 "Invalid Credentials"` with `data 52e` | `password:` line still in YAML, or wrong bind DN, or non-`_FILE` env var present | Remove `password:` key; use `_FILE` env var only |
| Startup succeeds but login says "user not found" | Wrong `additional_users_dn` | Verify against real OU structure |
| Login succeeds but `groups=` is empty in logs | Wrong `additional_groups_dn` | Verify |
| TOTP enrollment fails: `mail address "<@>"` | User has no `mail` attribute in AD | Set via `Set-ADUser -EmailAddress` |
| Non-admins get wildcard access | Missing `policy: deny` after subject-scoped rule | Add explicit deny |

### 7.4 Verify

```bash
docker compose up -d authelia
docker compose ps authelia                                       # Up (healthy)
docker exec authelia sh -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
sudo tail -30 authelia/authelia.log | jq -r .msg | grep -iE "vendor|startup"
```

**Expected:**
- `LDAP Discovery. ... Vendor Name: Microsoft Corporation`
- `Startup complete`

Then test a live login as a real AD user at `https://authelia.zerotrust.lan`.
Check the log for:

```bash
sudo tail -5 authelia/authelia.log | jq -r .msg | grep "Check authorization"
# Expect: "Check authorization of subject username=<user> groups=GRP_... "
```

---

## Phase 8 — Front services

### 8.1 Traefik

```yaml
  traefik:
    image: traefik:v3.6.1
    container_name: traefik
    hostname: traefik
    networks:
      - proxy_net
      - auth_net
    depends_on:
      authelia: {condition: service_healthy}
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
      - "1514:1514"        # reserved for Wazuh forwarding
      - "1515:1515"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }
```

`traefik/traefik.yml` and `traefik/traefik-dynamic.yml` — full contents in
[`configuration.md`](./configuration.md) § 6.10.

### 8.2 oidc-proxy

```yaml
  oidc-proxy:
    image: caddy:2-alpine
    container_name: oidc-proxy
    hostname: oidc-proxy
    networks: [auth_net]
    volumes:
      - ./oidc-proxy/Caddyfile:/etc/caddy/Caddyfile:ro
    restart: unless-stopped
```

`oidc-proxy/Caddyfile`:

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

### 8.3 Mailpit

```yaml
  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit
    hostname: mailpit
    networks: [auth_net]
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "1"
      MP_SMTP_AUTH_ALLOW_INSECURE: "1"
    expose: ["1025", "8025"]
    restart: unless-stopped
```

### 8.4 Portainer

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    hostname: portainer
    networks: [auth_net]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    expose: ["9000"]
    restart: unless-stopped
```

### 8.5 Coraza

```yaml
  coraza:
    build: ./coraza
    container_name: coraza
    networks: [proxy_net]
    volumes:
      - ./coraza/Caddyfile:/etc/caddy/Caddyfile
      - ./coraza/rules:/etc/coraza/rules
      - ./coraza/rules:/srv
      - ./coraza_logs:/var/log/caddy
    restart: unless-stopped
```

`coraza/Dockerfile`:

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build --with github.com/corazawaf/coraza-caddy/v2

FROM caddy:latest
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

`coraza/Caddyfile` — see [`configuration.md`](./configuration.md) § 6.9.
OWASP CRS v4.29 rule files go into `coraza/rules/`.

---

## Phase 9 — Keycloak federation (console)

After Keycloak is healthy, configure the realm via the admin console at
`https://keycloak.zerotrust.lan/admin/`.

### 9.1 Create realm `aegis`

Dropdown top-left → **Create realm** → Name: `aegis` → Enabled: On → Create.

### 9.2 Add LDAP User Federation

Realm `aegis` → **User Federation** → **Add provider → LDAP**.

| Field | Value |
|---|---|
| Console display name | `AegisAD` |
| Vendor | Active Directory |
| Connection URL | `ldap://192.168.50.10:389` |
| Enable StartTLS | Off |
| Use Truststore SPI | Never |
| Connection pooling | On |
| Bind type | simple |
| Bind DN | `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp` |
| Bind credentials | *(the real svc-keycloak AD password)* |

Click **Test connection** → Success. Click **Test authentication** → Success.

### 9.3 LDAP Searching and Updating

| Field | Value |
|---|---|
| Edit mode | READ_ONLY |
| Users DN | `OU=Departments,DC=aegis,DC=corp` |
| Username LDAP attribute | sAMAccountName |
| RDN LDAP attribute | cn |
| UUID LDAP attribute | objectGUID |
| User object classes | `person, organizationalPerson, user` |
| Search scope | Subtree |
| Read timeout | 10s |
| Pagination | On |
| Batch size | 100 |

Click **Save**.

### 9.4 Synchronization settings

| Field | Value |
|---|---|
| Import users | On |
| Sync registrations | Off |
| Periodic full sync | On |
| Full sync period | 86400 |
| Periodic changed users sync | On |
| Changed users sync period | 300 |

Click **Save**.

### 9.5 Add group mapper

**Mappers** tab → **Add mapper → By configuration → group-ldap-mapper**.

| Field | Value |
|---|---|
| Name | `group-ldap-mapper` |
| LDAP Groups DN | `OU=Security_Groups,DC=aegis,DC=corp` |
| Group Name LDAP Attribute | cn |
| Group Object Classes | group |
| Membership LDAP Attribute | member |
| Membership Attribute Type | DN |
| Mode | READ_ONLY |
| User Groups Retrieve Strategy | LOAD_GROUPS_BY_MEMBER_ATTRIBUTE |
| Groups Path | `/` |

Save.

### 9.6 Force first sync

Provider top page → **Action** menu → **Sync all users**.

### 9.7 Create `groups` client scope ⚠️

Keycloak's built-in `groups` scope exists only in the `master` realm. Create
one in `aegis`.

Realm `aegis` → **Client scopes** → **Create client scope**:

| Field | Value |
|---|---|
| Name | `groups` |
| Type | Default |
| Protocol | openid-connect |
| Display on consent screen | On |
| Include in token scope | On |

Save.

**Add mapper** inside the scope → **By configuration → Group Membership**:

| Field | Value |
|---|---|
| Name | `groups` |
| Token Claim Name | `groups` |
| Full group path | **On** (preserves `/GRP_IT_Admin`) |
| Add to ID token | On |
| Add to access token | On |
| Add to userinfo | On |

Save.

**Attach per client:** Clients → [client] → **Client scopes** tab → under
**Default** → **Add client scope** → tick `groups` → Add → Default.

### 9.8 Verify — token decode

Create a temporary test client (public, direct grants):

**Clients → Create client** → ID `token-test` → Client authentication `Off` →
Direct access grants `On` → Standard flow `Off` → Save.

```bash
TOKEN=$(curl -sk -X POST \
  'https://keycloak.zerotrust.lan/realms/aegis/protocol/openid-connect/token' \
  -d 'client_id=token-test' \
  -d 'username=salima' \
  -d 'password=<AD-password>' \
  -d 'grant_type=password' | jq -r .access_token)

echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq '{groups, preferred_username}'
```

Expected:

```json
{
  "groups": ["/GRP_Finance"],
  "preferred_username": "salima"
}
```

Repeat for each AD user. **Delete the `token-test` client** after verification.

---

## Phase 10 — Verification checklist

Run in order. All must pass.

```bash
# 1. All containers healthy
docker compose ps

# 2. Networks exist
docker network ls | grep -E "proxy_net|auth_net|ext_net"

# 3. Authelia's default route exits toward AD (ext_net), not auth_net
docker exec authelia ip route | grep default
# Expected: default via 172.20.0.1

# 4. AD reachable from Authelia and Keycloak
docker exec authelia sh -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
docker exec keycloak bash -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'

# 5. Authelia bound to real AD (Microsoft vendor, not OpenLDAP)
sudo tail -30 authelia/authelia.log | jq -r .msg | grep "Vendor Name"
# Expected: Vendor Name: Microsoft Corporation

# 6. Keycloak OIDC discovery
curl -sk https://keycloak.zerotrust.lan/realms/master/.well-known/openid-configuration | jq .issuer

# 7. Traefik ping
curl -sk -o /dev/null -w "%{http_code}\n" https://traefik.zerotrust.lan/ping
# Expected: 200

# 8. Live login as AD user at https://authelia.zerotrust.lan → succeeds, TOTP enrolls
# 9. Log line shows AD groups:
sudo tail -5 authelia/authelia.log | jq -r .msg | grep "Check authorization"

# 10. Group-based authorization:
#     Login as salima (GRP_Finance) → https://traefik.zerotrust.lan → DENIED
#     Login as anis.taibi (GRP_IT_Admin) → https://traefik.zerotrust.lan → ALLOWED
```

---

## Phase 11 — Verified end-to-end (evidence)

The following sequence was executed on the reference deployment to prove the
federation is functional without manual intervention:

| Step | Action | Duration |
|---|---|---|
| 1 | Create user `user` in `OU=IT_Dept` via ADUC (GUI) | 30 s |
| 2 | Add to `GRP_IT_Admin` via **Add to a group...** | 10 s |
| 3 | Keycloak **Action → Sync all users** | 5 s |
| 4 | Request OIDC token → `groups: ["/GRP_IT_Admin"]` present | instant |
| 5 | Authelia login as `user` → elevation email → TOTP enroll | 1 min |

**Result:** A user created in AD was authenticating to the gateway with the
correct admin group in under 3 minutes — with **no edits** to Authelia,
Traefik, or Keycloak configuration.

This is the Zero Trust property being demonstrated: AD is the sole source of
truth; the gateway is a read-only consumer.

---

## Appendix A — Known failure modes (all constraints)

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Compose validation: `services.X.logging additional properties 'KC_LOG_LEVEL'` | Env var in wrong block | `KC_LOG_LEVEL` → `environment:` |
| 2 | Compose validation: duplicate network key | sed/insert added a second definition | Delete the duplicate |
| 3 | Authelia crash: `no route to host` | Only on `auth_net` | Add `ext_net` **first** in networks |
| 4 | Authelia crash: `LDAP Result Code 49` `data 52e` | Non-`_FILE` env var present, or wrong bind DN | Use `_FILE` env var only; verify bind DN |
| 5 | Authelia: `LDAP Result Code 32 "No Such Object"` | Wrong `additional_users_dn` or `_groups_dn` | Match against real AD OU tree |
| 6 | Authelia: `notifier smtp: failed to parse mail address "<@>"` | No `mail` attribute in AD | `Set-ADUser -EmailAddress` |
| 7 | Keycloak: `431 Request Header Fields Too Large` | Default 20 KB header limit | `KC_HTTP_MAX_HEADER_SIZE: "65536"` |
| 8 | Token has no `groups` claim | Client scope not created / not attached | Create `groups` scope in realm, add mapper, attach as Default |
| 9 | Non-admin gets wildcard access | No explicit deny after subject rule | Add `policy: deny` |
| 10 | Redis auth fails | Password mismatch between Authelia config and Redis `--requirepass` | Both read `${REDIS_PASSWORD}` |

---

## Appendix B — Optional services

`openldap` and `oidc-proxy` are included for parity with the reference
deployment but are **not required** in a minimal AD-only build:

- **`openldap`** — legacy break-glass identity store. Not used by Authelia or
  Keycloak after migration. Can be removed if the deployment has no
  requirement to retain a fallback directory.
- **`oidc-proxy`** — Caddy shim that injects the public `Host` header during
  OIDC callbacks. Required only if Authelia's OIDC endpoints are consumed by
  Keycloak (broker flow, currently planned but not enabled).

Drop either or both to reduce the container count without affecting the
federation.

---

*End of build plan.*
