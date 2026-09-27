# Gateway File Structure

**Host:** `ztagateway` (Ubuntu Server) · **Zone:** 3 — Enforcement Layer · **Stack:** Docker Compose v2

This document describes the physical layout of the AEGIS gateway stack: how files
are organized on disk, how Docker volumes map to them, and how the containers
attach to the network topology. It is the reference companion to
[`configuration.md`](./configuration.md).

> **Secrets policy:** No credentials, session keys, JWT secrets, or private keys
> appear in this document. Values live in `.env` and `*/secrets/` on the host
> only. See `configuration.md` § *Secret Management* for handling rules.

---

## 1. Top-Level Layout

```
~/zerotrust-network/
├── docker-compose.yml                 # Full stack definition — services + networks + volumes
├── .env                               # Root secrets (gitignored) — DB, session, OIDC, LDAP
├── docker-compose.yml.bak.<ts>        # Timestamped backups (kept for rollback)
├── .env.bak.<ts>
│
├── authelia/                          # Forward-auth middleware
├── coraza/                            # Web application firewall (OWASP CRS)
├── keycloak/                          # OIDC / SSO provider
├── mailpit/                           # SMTP sinkhole (dev only)
├── oidc-proxy/                        # Host-header shim for OIDC callbacks
├── postgres/                          # Database server init scripts
├── redis/                             # Session cache
├── traefik/                           # Reverse proxy / ingress
│
├── coraza_logs/                       # WAF access log (bind-mounted out)
├── keycloak_logs/                     # Keycloak JSON logs (bind-mounted out)
├── traefik_logs/                      # Traefik JSON access log (bind-mounted out)
└── (authelia/authelia.log)            # Authelia log written inside authelia/
```

Each top-level service directory follows the same convention:

```
<service>/
├── <config files>                     # Consumed read-only via bind mount
├── <data files>                       # If any
├── .env                               # Per-service env (only for keycloak/)
├── secrets/                           # Files injected via *_FILE env vars
└── <service>.log                      # Runtime log (bind-mounted out)
```

---

## 2. Full Repository Tree

```
zerotrust-network/
│
├── docker-compose.yml
├── .env
├── .env.bak.20260927-1408
├── docker-compose.yml.bak.20260927-1408
│
├── authelia/
│   ├── configuration.yml                  # Main config — authn backend, access_control, OIDC
│   ├── configuration.yml.bak.20260927-1408
│   ├── oidc.key                           # RSA private key for OIDC JWKS
│   ├── users_database.yml.disabled        # Legacy file-based users (kept for reference)
│   ├── authelia.log                       # Runtime log (JSON)
│   └── secrets/
│       └── ldap_password                  # AD service-account password (chmod 600)
│
├── keycloak/
│   └── .env                               # KC_* env vars — DB, hostname, log level
│
├── keycloak_logs/
│   ├── keycloak.log                       # Active log (JSON)
│   └── keycloak.log.1 … .5                # Rotated
│
├── traefik/
│   ├── traefik.yml                        # Static config — entrypoints, providers, metrics
│   ├── traefik-dynamic.yml                # Dynamic config — routers, middlewares, services
│   ├── certs/
│   │   ├── zerotrust.crt                  # Public certificate
│   │   ├── zerotrust.key                  # Private key (chmod 600)
│   │   ├── zerotrust.pem                  # PEM bundle (truststore for Keycloak)
│   │   └── truststore.p12                 # PKCS#12 truststore
│   └── (traefik_logs mounted separately)
│
├── traefik_logs/
│   └── access.log                         # JSON access log (~100 MB, rotated externally)
│
├── coraza/
│   ├── Caddyfile                          # Caddy + Coraza WAF config
│   ├── Dockerfile                         # xcaddy build with coraza-caddy v2
│   └── rules/                             # OWASP CRS v4.29.0
│       ├── crs-setup.conf
│       ├── REQUEST-901-INITIALIZATION.conf
│       ├── REQUEST-9xx-*.conf             # Inbound rule files
│       ├── RESPONSE-9xx-*.conf            # Outbound rule files
│       └── *.data                         # Match lists (SQL errors, shells, etc.)
│
├── coraza_logs/
│   ├── access.log                         # WAF audit log (JSON)
│   └── access-<ts>.log.gz                 # Rotated
│
├── postgres/
│   └── init-scripts/
│       └── init.sql                       # Creates keycloak + authelia DBs and roles
│
├── oidc-proxy/
│   └── Caddyfile                          # Reverse-proxy shim for OIDC host headers
│
├── mailpit/                               # Empty — configured via environment only
└── redis/                                 # Empty — data in named volume
```

---

## 3. Directory Reference

| Path | Mounted into | Purpose | Writeable |
|---|---|---|---|
| `.env` | Compose interpolation | Root secrets | Host only |
| `docker-compose.yml` | — | Stack definition | Host only |
| `authelia/configuration.yml` | `authelia:/config/configuration.yml:ro` | Authelia runtime config | ❌ Read-only |
| `authelia/oidc.key` | `authelia:/config/oidc.key:ro` | OIDC signing key | ❌ Read-only |
| `authelia/secrets/ldap_password` | `authelia:/secrets/ldap_password:ro` | AD bind password | ❌ Read-only |
| `authelia/authelia.log` | `authelia:/config/authelia.log` | Runtime log | ✅ Bind-mounted |
| `keycloak/.env` | `keycloak` env_file | Keycloak env vars | Host only |
| `keycloak_logs/` | `keycloak:/opt/keycloak/data/log` | Keycloak JSON logs | ✅ Bind-mounted |
| `traefik/traefik.yml` | `traefik:/etc/traefik/traefik.yml:ro` | Static config | ❌ Read-only |
| `traefik/traefik-dynamic.yml` | `traefik:/etc/traefik/traefik-dynamic.yml:ro` | Routers/middlewares | ❌ Read-only |
| `traefik/certs/` | `traefik:/etc/traefik/certs:ro` | TLS materials | ❌ Read-only |
| `traefik_logs/` | `traefik:/var/log/traefik` | Access log | ✅ Bind-mounted |
| `coraza/Caddyfile` | `coraza:/etc/caddy/Caddyfile` | WAF config | ✅ |
| `coraza/rules/` | `coraza:/etc/coraza/rules` + `/srv` | CRS rule set | ✅ |
| `coraza_logs/` | `coraza:/var/log/caddy` | Audit log | ✅ |
| `postgres/init-scripts/` | `postgres:/docker-entrypoint-initdb.d:ro` | DB bootstrap | ❌ Read-only |
| `oidc-proxy/Caddyfile` | `oidc-proxy:/etc/caddy/Caddyfile:ro` | Proxy config | ❌ Read-only |

---

## 4. Docker Network Topology

```
                              ┌─────────────────────────────────────────┐
                              │        HOST: ztagateway                 │
                              │  ens33  192.168.19.173/24  (LAN)        │
                              │  ens34  192.168.50.1/24    (to Zone 2)  │
                              └─────────────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌───────────────────┐                 ┌───────────────────┐                 ┌───────────────────┐
│   proxy_net       │                 │   auth_net        │                 │   ext_net         │
│   172.18.0.0/16   │                 │   172.19.0.0/16   │                 │   172.20.0.0/16   │
│   br_proxy        │                 │   br_auth         │                 │   br-<id>         │
│                   │                 │   internal: true  │                 │   routed (bridge) │
├───────────────────┤                 ├───────────────────┤                 ├───────────────────┤
│                   │                 │                   │                 │                   │
│  traefik          │◄───────────────►│  traefik          │                 │  keycloak         │
│  coraza           │                 │  authelia         │                 │  (also auth_net)  │
│                   │                 │  keycloak ◄───────┼─────────────────┼──┘                │
│                   │                 │  postgres         │                 │                   │
│                   │                 │  redis            │                 │                   │
│                   │                 │  oidc-proxy       │                 │                   │
│                   │                 │  portainer        │                 │                   │
│                   │                 │  mailpit          │                 │                   │
│                   │                 │  openldap         │                 │                   │
└───────────────────┘                 └───────────────────┘                 └───────────────────┘
        │                                     │                                     │
        │ External-facing                     │ Isolated enclave                    │ AD egress
        │ Traefik + Coraza only               │ No outbound route                   │ Only for identity
        ▼                                     ▼                                     ▼
   Client browsers                     Backend services                      192.168.50.10
                                                                              (CORP-DC01 / AD)
```

### Network properties

| Network | Driver | Internal | Purpose | Members |
|---|---|---|---|---|
| `proxy_net` | bridge (br_proxy) | No | DMZ — external-facing | `traefik`, `coraza` |
| `auth_net` | bridge (br_auth) | **Yes** | Isolated enclave — no egress | `authelia`, `keycloak`, `postgres`, `redis`, `mailpit`, `portainer`, `openldap`, `oidc-proxy`, `traefik` |
| `ext_net` | bridge | No | Dedicated egress for identity services → AD | `keycloak`, `authelia` |

> **Why `ext_net` exists:** `auth_net` is deliberately `internal: true` — no NAT, no
> gateway, no route off the enclave. That is a Zero Trust design choice. But
> `authelia` and `keycloak` both need to reach Active Directory on
> `192.168.50.10:389`, so each is attached to a second, routed bridge network
> (`ext_net`). Only these two services get egress; everything else in the enclave
> stays isolated.

> **Default route ordering matters:** when a service is on multiple networks,
> Docker assigns the default route based on the order networks are listed in
> Compose. `ext_net` must be listed **first** for Authelia/Keycloak so their
> default route exits toward AD. `auth_net` follows.

---

## 5. Container ↔ File Map

| Container | Config source | Secrets source | Log destination |
|---|---|---|---|
| `traefik` | `traefik/*.yml`, `traefik/certs/` | — | `traefik_logs/access.log` (bind) |
| `authelia` | `authelia/configuration.yml` | `.env` + `authelia/secrets/ldap_password` (mounted) | `authelia/authelia.log` (bind) |
| `keycloak` | `keycloak/.env` + admin console | `keycloak/.env` | `keycloak_logs/keycloak.log` (bind) |
| `postgres` | `postgres/init-scripts/init.sql` (first boot only) | `.env` | Docker json-file driver |
| `redis` | command-line args from Compose | `.env` | Docker json-file driver |
| `coraza` | `coraza/Caddyfile` + `coraza/rules/` | — | `coraza_logs/access.log` (bind) |
| `oidc-proxy` | `oidc-proxy/Caddyfile` | — | Docker json-file driver |
| `mailpit` | env vars from Compose | — | Docker json-file driver |
| `portainer` | named volume `portainer_data` | — | Docker json-file driver |
| `openldap` | env vars from Compose | `.env` | Docker json-file driver |

---

## 6. Named Docker Volumes

Volumes persist across container recreation. They are **not** bind-mounted to
host paths — `docker volume inspect <name>` to locate.

| Volume | Mounted into | Contents |
|---|---|---|
| `postgres_data` | `postgres:/var/lib/postgresql/data` | Keycloak + Authelia databases |
| `redis_data` | `redis:/data` | Authelia session cache (AOF) |
| `portainer_data` | `portainer:/data` | Portainer state, users, endpoints |
| `traefik_data` | `traefik:/traefik` | ACME state, plugin cache |
| `ldap_data` | `openldap:/var/lib/ldap` | OpenLDAP directory backend |
| `ldap_config` | `openldap:/etc/ldap/slapd.d` | OpenLDAP configuration |

Backup: `docker run --rm -v <vol>:/data -v $(pwd):/backup alpine tar czf /backup/<vol>.tgz /data`

---

## 7. Log Flow

```
                        ┌──────────────────┐
                        │   Client          │
                        └────────┬──────────┘
                                 │ HTTPS 443
                                 ▼
                        ┌──────────────────┐
                        │   traefik         │
                        │   access.log      │ ──► traefik_logs/access.log
                        └────────┬──────────┘      (JSON, every request)
                                 │
                        forward-auth
                                 ▼
                        ┌──────────────────┐
                        │   authelia        │
                        │   authelia.log    │ ──► authelia/authelia.log
                        └────────┬──────────┘      (JSON: login, MFA, ACL)
                                 │
                        ┌──────────────────┐
                        │   keycloak        │
                        │   keycloak.log    │ ──► keycloak_logs/keycloak.log*
                        └────────┬──────────┘      (JSON: tokens, sessions)
                                 │
                        ┌──────────────────┐
                        │   coraza          │
                        │   access.log      │ ──► coraza_logs/access.log
                        └──────────────────┘      (JSON: WAF hits, blocks)
```

All four log streams are ready to ship to Zone 4 (`minisoc2` / Elasticsearch) via
Filebeat or a Wazuh agent. The index naming convention is documented in
`configuration.md` § *SOC Visibility*.

---

## 8. Files Intentionally Absent from the Repo

| Item | Why |
|---|---|
| `.env` | Contains live secrets — gitignored |
| `authelia/secrets/*` | Contains bind passwords — gitignored |
| `traefik/certs/*.key` | Private keys — gitignored |
| `authelia/oidc.key` | OIDC signing key — gitignored |
| `*_logs/` | Runtime logs — gitignored |
| `*.bak.*` | Timestamped backups — gitignored |

A `.gitignore` at the repo root should cover:

```
.env
.env.*
*.key
*.pem
*_logs/
*.log
*.bak.*
*/secrets/
```

---

## 9. Related Documents

| Document | Covers |
|---|---|
| [`configuration.md`](./configuration.md) | Step-by-step build: from blank host to fully functional gateway |
| `../ad-federation.md` *(planned)* | Keycloak ↔ AD federation details |
| `../authelia-ad-migration.md` *(planned)* | Authelia → AD migration record |

---

*End of gateway file structure reference.*
