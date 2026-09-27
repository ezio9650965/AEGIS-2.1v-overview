# Gateway Build Plan — Zero to AD Federation

Complete ordered plan. Follow top to bottom. Each phase ends with a verify step.

**Scope:** blank Ubuntu Server → 10 healthy containers → AD-federated Authelia + Keycloak.

---

## Phase 0 — Outcome

When this plan completes:

- 10 containers running: postgres, redis, openldap, keycloak, authelia, oidc-proxy, mailpit, portainer, coraza, traefik
- A user created in AD can log in at `https://authelia.zerotrust.lan`
- That user's AD groups reach Authelia via LDAP and Keycloak via OIDC `groups` claim
- Traefik enforces per-group access on every protected route

---

## Phase 1 — Host

**OS:** Ubuntu Server 24.04 LTS · **Hostname:** `ztagateway` · **Min:** 4 vCPU / 8 GB / 100 GB

### Interfaces

| Interface | Role |
|---|---|
| `ens33` | DHCP on client LAN (internet) |
| `ens34` | Static `192.168.50.1/24` — direct L2 to AD |

`/etc/netplan/50-cloud-init.yaml`:

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: true
    ens34:
      addresses: [192.168.50.1/24]
```

### Commands

```bash
sudo hostnamectl set-hostname ztagateway
sudo netplan apply

sudo apt update
sudo apt install -y docker.io docker-compose-v2 ca-certificates curl \
  gnupg ldap-utils jq tree netcat-openbsd tcpdump

sudo usermod -aG docker $USER
newgrp docker

# Kernel tuning — required for Docker bridge → ens34 forwarding
sudo tee /etc/sysctl.d/99-aegis.conf >/dev/null <<'EOF'
net.ipv4.ip_forward = 1
net.core.somaxconn = 1024
net.ipv4.tcp_fin_timeout = 15
EOF
sudo sysctl --system
timedatectl set-ntp true
```

**Verify:** `nc -zv 192.168.50.10 389` returns success.

---

## Phase 2 — Scaffold

```bash
mkdir -p ~/zerotrust-network
cd ~/zerotrust-network

mkdir -p authelia/secrets coraza/rules keycloak keycloak_logs coraza_logs \
  mailpit oidc-proxy postgres/init-scripts redis traefik/certs traefik_logs

touch .env && chmod 600 .env
```

`.gitignore` — before any `git add`:

```
.env
.env.*
*.key
*.pem
*.p12
*_logs/
*.log
*.bak.*
*/secrets/
```

---

## Phase 3 — Networks and Volumes

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
  postgres_data: {driver: local}
  redis_data: {driver: local}
  portainer_data: {driver: local}
  traefik_data: {driver: local}
  ldap_data: {driver: local}
  ldap_config: {driver: local}
```

**Why `ext_net`:** `auth_net` is `internal: true` — no NAT, no route off the bridge. Authelia and Keycloak need to reach AD at `192.168.50.10:389`, so each is attached to `ext_net` as a **second** network. Only these two get egress.

**Ordering rule:** When a service has multiple networks, list `ext_net` **first** — Docker assigns the default route based on that order.

**Verify:** `docker network ls` shows all three.

---

## Phase 4 — Secrets

`.env` (chmod 600):

```
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<openssl rand -base64 24>
REDIS_PASSWORD=<openssl rand -base64 24>
AUTHELIA_SESSION_SECRET=<openssl rand -hex 32>
AUTHELIA_STORAGE_PASSWORD=<openssl rand -base64 24>
KEYCLOAK_OIDC_SECRET=<openssl rand -hex 32>
LDAP_ADMIN_PASSWORD=<openssl rand -base64 24>
LDAP_CONFIG_PASSWORD=<openssl rand -base64 24>
```

AD bind password — **never in `.env`**:

```bash
printf '%s' '<svc-keycloak-AD-password>' > authelia/secrets/ldap_password
chmod 600 authelia/secrets/ldap_password
wc -c authelia/secrets/ldap_password   # must equal password length
```

**Verify:** `docker compose config -q` is silent.

---

## Phase 5 — Core Services

Add these three services to `docker-compose.yml`.

**Postgres** — creates both DBs on first boot:

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
```

**`postgres/init-scripts/init.sql`** — replace `<password>` with the values from `.env`:

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

**Redis** — Authelia session store:

```yaml
  redis:
    image: redis:7-alpine
    container_name: redis
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
```

**OpenLDAP** — legacy, break-glass only:

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

**Verify:**

```bash
docker compose up -d postgres redis openldap
docker compose ps
docker exec postgres psql -U postgres -l | grep -E "keycloak|authelia"
docker exec redis redis-cli -a "$REDIS_PASSWORD" PING   # → PONG
```

---

## Phase 6 — Keycloak

### Compose service

```yaml
  keycloak:
    image: keycloak/keycloak:latest
    container_name: keycloak
    hostname: keycloak
    networks:
      - ext_net                        # listed FIRST — becomes default route
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
    command: start --log=console,file --log-file=/opt/keycloak/data/log/keycloak.log \
      --log-file-output=json --http-access-log-enabled=true
    healthcheck:
      test: ["CMD-SHELL", "timeout 3 bash -c '</dev/tcp/127.0.0.1/8080' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 60s
    restart: unless-stopped
    environment:
      KC_LOG_CONSOLE_OUTPUT: json
      KC_LOG_LEVEL: INFO                            # MUST be here, not under logging:
      KC_HTTP_MAX_HEADER_SIZE: "65536"              # prevents 431 on OIDC flows
      KC_SPI_TRUSTSTORE_FILE_HOSTNAME_VERIFICATION_POLICY: ANY
```

### `keycloak/.env`

```
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<generated>

KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<matches init.sql>

KC_HOSTNAME=keycloak.zerotrust.lan
KC_PROXY_HEADERS=xforwarded
KC_HTTP_ENABLED=true
KC_HTTPS_ENABLED=false
KC_HTTP_RELATIVE_PATH=/
KC_FEATURES=token-exchange
```

### Console configuration (after boot)

Realm `aegis` → **User Federation** → **Add LDAP provider**:

| Field | Value |
|---|---|
| Vendor | Active Directory |
| Connection URL | `ldap://192.168.50.10:389` |
| Bind DN | `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp` |
| Bind credentials | `<AD password>` |
| Edit mode | READ_ONLY |
| Users DN | `OU=Departments,DC=aegis,DC=corp` |
| Username attr | `sAMAccountName` |
| RDN attr | `cn` |
| UUID attr | `objectGUID` |
| User object classes | `person, organizationalPerson, user` |
| Search scope | Subtree |

Test connection → Test authentication → Save → **Action → Sync all users**.

Add **group-ldap-mapper**:

| Field | Value |
|---|---|
| LDAP Groups DN | `OU=Security_Groups,DC=aegis,DC=corp` |
| Group Name attr | `cn` |
| Group object class | `group` |
| Membership attr | `member` |
| Mode | READ_ONLY |
| Retrieve strategy | `LOAD_GROUPS_BY_MEMBER_ATTRIBUTE` |
| Groups Path | `/` |

Sync again.

### `groups` client scope

Realm `aegis` → **Client scopes** → **Create**:

| Field | Value |
|---|---|
| Name | `groups` |
| Type | Default |
| Protocol | openid-connect |
| Include in token scope | On |

Add mapper: **Group Membership** — Token Claim `groups`, Full group path **On**, Add to ID + access + userinfo **On**.

Attach per client: **Clients → [client] → Client scopes → Add client scope → groups → Default**.

**Verify:**

```bash
docker compose ps keycloak                                       # Up (healthy)
docker exec keycloak bash -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'
```

---

## Phase 7 — Authelia

### Compose service

```yaml
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    hostname: authelia
    networks:
      - ext_net                        # listed FIRST — becomes default route
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
      - ./authelia/configuration.yml:/config/configuration.yml
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
```

### `authelia/configuration.yml` — critical blocks

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

No `password:` key — supplied by the `_FILE` env var.

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
        - "^/resources/.*"
        - "^/health/.*"
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

**Explicit-deny rule:** every subject-scoped rule needs a following `deny` for the same domain — otherwise non-matching users fall through to the wildcard.

**Verify:**

```bash
docker compose up -d authelia
docker compose ps authelia
sudo tail -20 authelia/authelia.log | jq -r .msg | grep -iE "vendor|startup"
# Must show: "Vendor Name: Microsoft Corporation"  +  "Startup complete"
```

---

## Phase 8 — Front

Add the remaining services: **traefik, coraza, oidc-proxy, mailpit, portainer**.

**Traefik** is the only container on both `proxy_net` and `auth_net`. Ports 80/443 exposed. Ports 1514/1515 reserved for future Wazuh forwarding.

**Coraza** builds a Caddy image with the OWASP CRS module — sits on `proxy_net`, fronts Juice Shop.

**oidc-proxy** is a Caddy shim that rewrites `Host` and `X-Forwarded-*` so Authelia's OIDC callbacks resolve to the public hostname.

**Mailpit** = SMTP sinkhole for Authelia elevation emails.

**Portainer** = container management UI behind Authelia.

Full service blocks are in `configuration.md` § 6.7–6.10.

**Verify:**

```bash
docker compose up -d
docker compose ps
# All 10 services Up (healthy)

curl -sk -o /dev/null -w "%{http_code}\n" https://traefik.zerotrust.lan/ping
# → 200
```

---

## Phase 9 — Verify

Ordered smoke test.

| # | Command | Expected |
|---|---|---|
| 1 | `docker compose ps` | 10 services Up (healthy) |
| 2 | `docker network ls` | proxy_net, auth_net, ext_net |
| 3 | `docker exec authelia ip route \| grep default` | default via `172.20.0.1` (ext_net), NOT 172.19.0.1 |
| 4 | `docker exec authelia sh -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'` | OK |
| 5 | `docker exec keycloak bash -c 'timeout 3 bash -c "cat </dev/null >/dev/tcp/192.168.50.10/389" && echo OK'` | OK |
| 6 | `sudo tail -20 authelia/authelia.log \| jq -r .msg \| grep "Vendor Name: Microsoft"` | match |
| 7 | Login at `https://authelia.zerotrust.lan` as `salima` (AD password) | succeeds, TOTP enrolls |
| 8 | `sudo tail -5 authelia/authelia.log \| jq -r .msg \| grep "Check authorization"` | shows `groups=GRP_*` |
| 9 | Create test client in Keycloak, curl token for `salima` | token has `groups: ["/GRP_Finance"]` |
| 10 | Login as `salima` at `https://traefik.zerotrust.lan` | **denied** (not in GRP_IT_Admin) |
| 11 | Login as `anis.taibi` at `https://traefik.zerotrust.lan` | **allowed** (in GRP_IT_Admin) |

Tests 10 and 11 prove the federation is enforcing correctly.

---

## Appendix — The 8 failures to avoid

| # | Failure | Fix |
|---|---|---|
| 1 | `no route to host` from Authelia to AD | Add `ext_net` first in networks list |
| 2 | `LDAP Result Code 49` after fix 1 | Use `_FILE` env var, not `_PASSWORD`; correct bind DN |
| 3 | `LDAP Result Code 32` "No Such Object" | `additional_users_dn` must match real OUs — no fictitious `AegisTrading Corp` |
| 4 | TOTP fails: `mail address "<@>"` | Set `mail` attribute on AD user, then restart Authelia |
| 5 | `431 Request Header Fields Too Large` | `KC_HTTP_MAX_HEADER_SIZE: "65536"` |
| 6 | Compose validation error | `KC_LOG_LEVEL` under `environment:`, not `logging:` |
| 7 | Everyone gets wildcard access | Add explicit `policy: deny` after every `subject:` rule |
| 8 | Token has no `groups` claim | Create `groups` client scope in realm, attach as Default |

---

*End of build plan.*
