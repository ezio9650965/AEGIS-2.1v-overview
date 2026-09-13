# Zone 3 Gateway — Setup Guide

This walks through standing up the ZTA Gateway (Traefik + Authelia +
Keycloak + PostgreSQL + Redis, on isolated Docker bridge networks) from
scratch. It assumes a fresh Ubuntu Server 24.04 host with Docker and
Docker Compose installed.

## 1. Clone and prepare the environment file

```bash
git clone <this-repo-or-your-fork>
cd zerotrust-network
cp .env.example .env
```

Open `.env` and fill in every variable — **do not leave any blank**, the
stack will fail health checks or start with broken auth if you do.
Generate strong random values rather than typing your own:

```bash
# Use this for every *_PASSWORD and *_SECRET value in .env
openssl rand -base64 32
```

Run it once per variable and paste the result in. Do not reuse the same
value across variables.

## 2. Generate the two files that must never be committed

These are gitignored on purpose — they contain a real private key and a
real password-hash database. Nothing in `.env` covers these; they're
separate files the stack expects on disk.

```bash
# TLS certificate + key for *.zerotrust.lan (self-signed — fine for a lab)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout traefik/certs/zerotrust.key \
  -out traefik/certs/zerotrust.crt \
  -subj "/CN=zerotrust.lan" \
  -addext "subjectAltName=DNS:zerotrust.lan,DNS:*.zerotrust.lan"

# Authelia's OIDC signing key
openssl genrsa -out authelia/oidc.key 4096
chmod 600 authelia/oidc.key traefik/certs/zerotrust.key
```

Create `authelia/users_database.yml` from scratch (there is no template —
this file holds real user accounts):

```bash
docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password 'your-password-here'
```
Copy the resulting hash into a file shaped like this:
```yaml
users:
  admin:
    displayname: Administrator
    password: "<hash from the command above>"
    email: admin@zerotrust.lan
    groups:
      - admins
```

## 3. Fix the one variable Postgres can't expand itself

`postgres/init-scripts/init.sql` runs once, on the container's first boot,
and raw SQL cannot read `${VAR}` — it needs substitution before Postgres
ever sees it:

```bash
export $(grep -v '^#' .env | xargs)
envsubst < postgres/init-scripts/init.sql.template > postgres/init-scripts/init.sql
```
(If your repo doesn't yet have `init.sql.template`, copy your existing
`init.sql` to that name first, and confirm the two `PASSWORD '...'` lines
use `${KC_DB_PASSWORD}` / `${AUTHELIA_STORAGE_PASSWORD}` placeholders
before running the command above.)

## 4. Point local DNS at the gateway

Add these to `/etc/hosts` on any machine that needs to reach the gateway
(replace with the gateway's real LAN IP):

```text
<gateway-ip> traefik.zerotrust.lan authelia.zerotrust.lan keycloak.zerotrust.lan portainer.zerotrust.lan mailpit.zerotrust.lan
```

## 5. Bring the stack up

```bash
docker compose up -d
docker compose ps    # everything should reach "healthy" within ~60s
```

If `keycloak` or `authelia` don't reach healthy, check logs in that order —
Keycloak depends on Postgres being ready first, Authelia depends on both
Postgres and Redis:

```bash
docker compose logs keycloak --tail 30
docker compose logs authelia --tail 30
```

## 6. First login

1. Visit `https://keycloak.zerotrust.lan` — accept the self-signed cert
   warning (expected in a lab environment; use a real CA-signed cert for
   anything internet-facing).
2. Log in with `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` from your `.env`.
3. Visit `https://traefik.zerotrust.lan` — this route is protected by
   Authelia's forward-auth. You'll be redirected to
   `https://authelia.zerotrust.lan` first; log in with the user you
   created in step 2 of the users database setup, then complete TOTP
   enrollment (scan the QR code with an authenticator app — shown once,
   never emailed).

## Known gap — read before treating this as production-ready

The gateway is dual-homed (`ens33` external, `ens34` intended for
isolating internal targets), but as of this writing **`ens34` is not
actually used for routing** — see the README's "Known Gap" section under
Zone 3. This setup guide stands up the identity/auth stack correctly; it
does not by itself give you the network segmentation the architecture
describes. Treat that as a separate, unfinished task.

## Troubleshooting

- **502 from Traefik on any `*.zerotrust.lan` route**: usually means the
  backend container isn't healthy yet — check `docker compose ps` before
  assuming the proxy config is wrong.
- **Authelia redirect loop**: almost always a session cookie domain
  mismatch — confirm `session.cookies[0].domain` in
  `authelia/configuration.yml` matches the domain you're actually browsing
  to.
- **Keycloak stuck waiting on the database**: if you've restarted the
  stack after changing `.env`, remember Postgres's `init.sql` only runs on
  a *fresh* volume — changing `KC_DB_PASSWORD` after the fact requires
  updating the password inside Postgres directly (`ALTER USER ... PASSWORD
  ...`), not just editing `.env`.
