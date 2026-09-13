import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  KeyRound,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Terminal,
} from 'lucide-react';

export const Zone3ConfigFilesViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'docker-compose' | 'traefik' | 'traefik-dynamic' | 'authelia' | 'keycloak' | 'postgres'
  >('docker-compose');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(label);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  // 1. docker-compose.yml
  const dockerComposeContent = `services:

  # PostgreSQL Database Server
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    hostname: postgres
    networks:
      - auth_net                          # Secure Enclave only — zero host access
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-postgres}
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c shared_preload_libraries=pgcrypto"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init-scripts:/docker-entrypoint-initdb.d:ro
    expose:
      - "5432"                            # Internal only — no host port binding
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Redis In-Memory Cache
  redis:
    image: redis:7-alpine
    container_name: redis
    hostname: redis
    networks:
      - auth_net                          # Secure Enclave only
    command: redis-server --appendonly yes --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    expose:
      - "6379"                            # Internal only — no host port binding
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "PING"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Mailpit Email Testing (SMTP Sinkhole)
  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit
    hostname: mailpit
    networks:
      - auth_net                          # Secure Enclave — access only via Traefik
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "1"
      MP_SMTP_AUTH_ALLOW_INSECURE: "1"
    expose:
      - "1025"
      - "8025"                            # No host port — access via mailpit.zerotrust.lan only
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8025/"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Keycloak Identity Provider
  keycloak:
    image: keycloak/keycloak:latest
    container_name: keycloak
    hostname: keycloak
    networks:
      - auth_net                          # Secure Enclave — access only via Traefik
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - keycloak/.env
    expose:
      - "8080"
    command: start
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

  # Authelia Authentication Middleware
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    hostname: authelia
    networks:
      - auth_net                          # Secure Enclave — Traefik reaches it here
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      AUTHELIA_SESSION_SECRET: \${AUTHELIA_SESSION_SECRET}
      AUTHELIA_STORAGE_POSTGRES_PASSWORD: \${AUTHELIA_STORAGE_PASSWORD}
      AUTHELIA_SESSION_REDIS_PASSWORD: \${REDIS_PASSWORD}
      AUTHELIA_LOG_LEVEL: info
      TZ: UTC
    volumes:
      - ./authelia/configuration.yml:/config/configuration.yml
      - ./authelia/users_database.yml:/config/users_database.yml
      - ./authelia/oidc.key:/config/oidc.key
      - ./authelia/authelia.log:/config/authelia.log
    expose:
      - "9091"                            # Internal only — NO host port binding
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

  # Traefik Reverse Proxy — THE ONLY CONTAINER ON BOTH NETWORKS
  traefik:
    image: traefik:v3.6.1
    container_name: traefik
    hostname: traefik
    networks:
      - proxy_net                         # DMZ — faces the outside world
      - auth_net                          # Enclave — forwards to backend services
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
      - "80:80"                           # HTTP (redirects to HTTPS)
      - "443:443"                         # HTTPS — only real ingress point
      - "1514:1514"                       # Wazuh agent TCP
      - "1515:1515"                       # Wazuh auth TCP
      # Port 8090 REMOVED — dashboard accessible via traefik.zerotrust.lan only
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    hostname: portainer
    networks:
      - auth_net                          # Enclave — access only via portainer.zerotrust.lan
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

  coraza:
    build: ./coraza
    container_name: coraza
    networks:
      - proxy_net
    volumes:
      - ./coraza/Caddyfile:/etc/caddy/Caddyfile
      - ./coraza/rules:/etc/coraza/rules
      - ./coraza/rules:/srv
    restart: unless-stopped

# ============================================================
# NETWORK TOPOLOGY — This is the real ZTA enforcement layer
# ============================================================
networks:
  proxy_net:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br_proxy
    # External-facing DMZ — only Traefik lives here

  auth_net:
    driver: bridge
    internal: true                        # Docker blocks all external routing to this network
    driver_opts:
      com.docker.network.bridge.name: br_auth
    # Secure Enclave — no host or external access possible
    # Only Traefik can bridge here (it's on both networks)

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  portainer_data:
    driver: local
  traefik_data:
    driver: local`;

  // 2. traefik/traefik.yml
  const traefikContent = `---
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

  websecure:
    address: ":443"
    http:
      tls: {}

  wazuh-agent:
    address: ":1514"

  wazuh-auth:
    address: ":1515"

  traefik:
    address: ":8080"                      # Internal only — for ping healthcheck

# API — insecure: false means dashboard ONLY via configured router
api:
  insecure: false                         # CHANGED: was true, removed 8090 host port
  dashboard: true
  debug: false                            # CHANGED: no debug in production

ping:
  entryPoint: traefik

log:
  level: INFO                             # CHANGED: was DEBUG
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
    addServicesLabels: true`;

  // 3. traefik/traefik-dynamic.yml (with genericized template IPs)
  const traefikDynamicContent = `---
tcp:
  routers:
    wazuh-forwarder:
      entryPoints: [wazuh-agent]
      rule: "HostSNI(\`*\`)"
      service: wazuh-manager
    wazuh-auth-forwarder:
      entryPoints: [wazuh-auth]
      rule: "HostSNI(\`*\`)"
      service: wazuh-auth-service

  services:
    wazuh-manager:
      loadBalancer:
        servers:
          - address: "<wazuh-manager-ip>:1514"     # Lab origin: 10.16.64.156:1514
    wazuh-auth-service:
      loadBalancer:
        servers:
          - address: "<wazuh-manager-ip>:1515"     # Lab origin: 10.16.64.156:1515

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

    security-headers:
      headers:
        browserXssFilter: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        frameDeny: true
        customResponseHeaders:
          X-Frame-Options: "DENY"

    security-headers-keycloak:
      headers:
        browserXssFilter: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        frameDeny: false
        customResponseHeaders:
          X-Frame-Options: "SAMEORIGIN"

  routers:
    keycloak-http:
      entryPoints: [web]
      rule: Host(\`keycloak.zerotrust.lan\`)
      service: keycloak
      middlewares: [security-headers-keycloak]

    keycloak-https:
      entryPoints: [websecure]
      rule: Host(\`keycloak.zerotrust.lan\`)
      service: keycloak
      middlewares: [authelia, security-headers-keycloak]
      tls: {}

    authelia-http:
      entryPoints: [web]
      rule: Host(\`authelia.zerotrust.lan\`)
      service: authelia
      middlewares: [security-headers]

    authelia-https:
      entryPoints: [websecure]
      rule: Host(\`authelia.zerotrust.lan\`)
      service: authelia
      middlewares: [security-headers]
      tls: {}

    traefik-dashboard-http:
      entryPoints: [web]
      rule: Host(\`traefik.zerotrust.lan\`)
      service: api@internal
      middlewares: [security-headers]

    traefik-dashboard-https:
      entryPoints: [websecure]
      rule: Host(\`traefik.zerotrust.lan\`)
      service: api@internal
      middlewares: [authelia, security-headers]
      tls: {}

    mailpit-http:
      entryPoints: [web]
      rule: Host(\`mailpit.zerotrust.lan\`)
      service: mailpit
      middlewares: [security-headers]

    mailpit-https:
      entryPoints: [websecure]
      rule: Host(\`mailpit.zerotrust.lan\`)
      service: mailpit
      middlewares: [authelia, security-headers]
      tls: {}

    portainer-http:
      entryPoints: [web]
      rule: Host(\`portainer.zerotrust.lan\`)
      service: portainer
      middlewares: [security-headers]

    portainer-https:
      entryPoints: [websecure]
      rule: Host(\`portainer.zerotrust.lan\`)
      service: portainer
      middlewares: [authelia, security-headers]
      tls: {}

    juiceshop-https:
      entryPoints: [websecure]
      rule: Host(\`juiceshop.zerotrust.lan\`)
      service: juiceshop
      middlewares: [authelia, security-headers]
      tls: {}

  services:
    keycloak:
      loadBalancer:
        servers:
          - url: http://keycloak:8080

    authelia:
      loadBalancer:
        servers:
          - url: http://authelia:9091

    mailpit:
      loadBalancer:
        servers:
          - url: http://mailpit:8025

    portainer:
      loadBalancer:
        servers:
          - url: http://portainer:9000

    juiceshop:
      loadBalancer:
        servers:
          - url: http://<juiceshop-host-ip>:3000   # Lab origin: 192.168.19.175:3000`;

  // 4. authelia/configuration.yml (Secrets redacted to \${VAR_NAME} format)
  const autheliaContent = `---
server:
  address: tcp://0.0.0.0:9091/

totp:
  issuer: zerotrust.lan
  period: 30
  skew: 1

authentication_backend:
  password_reset:
    disable: false
  refresh_interval: 5m
  file:
    path: /config/users_database.yml
    watch: false
    password:
      algorithm: argon2id
      iterations: 3
      key_length: 32
      salt_length: 16
      parallelism: 4
      memory: 65536

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
    password: \${REDIS_PASSWORD}

regulation:
  max_retries: 3
  find_time: 120
  ban_time: 300

storage:
  encryption_key: "\${AUTHELIA_STORAGE_ENCRYPTION_KEY}"
  postgres:
    address: tcp://postgres:5432
    database: authelia
    username: authelia
    password: \${AUTHELIA_STORAGE_PASSWORD}
    schema: public

notifier:
  smtp:
    address: smtp://mailpit:1025
    sender: authelia@zerotrust.lan
    disable_require_tls: true

access_control:
  default_policy: deny
  rules:
    # Rule 1: Authelia portal — always bypass (it IS the auth layer)
    - domain: authelia.zerotrust.lan
      policy: bypass

    # Rule 2: Keycloak OIDC protocol endpoints — bypass required for OAuth2 flow
    # These are the callback/token endpoints Authelia itself uses
    - domain: keycloak.zerotrust.lan
      resources:
        - "^/realms/.*/protocol/openid-connect/.*"
        - "^/realms/.*/login-actions/.*"
        - "^/health/.*"
        - "^/js/.*"
        - "^/resources/.*"
        - "^/realms/.*/account/.*"
      policy: bypass

    # Rule 3: Keycloak admin console — two_factor (CHANGED from bypass)
    - domain: keycloak.zerotrust.lan
      policy: two_factor

    # Rule 4: Traefik dashboard — two_factor (CHANGED from one_factor)
    - domain: traefik.zerotrust.lan
      policy: two_factor

    # Rule 5: Everything else — two_factor
    - domain: "*.zerotrust.lan"
      policy: two_factor

identity_validation:
  reset_password:
    jwt_secret: "\${AUTHELIA_JWT_SECRET}"

identity_providers:
  oidc:
    jwks:
      - key_id: main
        algorithm: RS256
        use: sig
        # generate your own — see 04-request-flow.md, do not commit this file
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
        client_secret: "\${OIDC_CLIENT_SECRET_TRAEFIK}"
        redirect_uris:
          - https://traefik.zerotrust.lan/auth/openid/callback
        scopes:
          - openid
          - profile
          - email
        response_types:
          - code
        response_modes:
          - form_post

log:
  level: info
  format: json
  file_path: /config/authelia.log

telemetry:
  metrics:
    enabled: false`;

  // 5. keycloak/.env
  const keycloakEnvContent = `# Keycloak admin credentials
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=\${KEYCLOAK_ADMIN_PASSWORD}

# Database configuration
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=\${KC_DB_PASSWORD}
# Hostname and proxy settings
KC_HOSTNAME=keycloak.zerotrust.lan
KC_PROXY_HEADERS=xforwarded
# HTTP/HTTPS settings
KC_HTTP_ENABLED=true
KC_HTTPS_ENABLED=false
# Logging
KC_LOG_LEVEL=INFO
KC_LOG_FORMAT=json
KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_LEGACY_LOGOUT_REDIRECT_URI=true
KC_HTTP_RELATIVE_PATH=/
KC_FEATURES=token-exchange`;

  // 6. postgres/init-scripts/init.sql
  const postgresInitSqlContent = `-- NOTE: This file requires envsubst or manual variable substitution before first run
-- since raw PostgreSQL SQL scripts do not expand shell environment variables at runtime.
-- Example: envsubst < postgres/init-scripts/init.sql.template > postgres/init-scripts/init.sql

-- Create databases
CREATE DATABASE keycloak;
CREATE DATABASE authelia;

-- Create Keycloak user and grant permissions
CREATE USER keycloak WITH ENCRYPTED PASSWORD '\${KC_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

-- Create Authelia user and grant permissions
CREATE USER authelia WITH ENCRYPTED PASSWORD '\${AUTHELIA_STORAGE_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE authelia TO authelia;

-- Connect to keycloak database and grant schema permissions
\\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO keycloak;

-- Connect to authelia database and grant schema permissions
\\c authelia
GRANT ALL ON SCHEMA public TO authelia;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authelia;

-- Enable UUID extension for both databases
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\\c keycloak
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

  // Master .env.example with all variables referenced
  const envExampleContent = `# =================================================================
# AEGIS ZTA GATEWAY: MASTER ENVIRONMENT TEMPLATE (.env.example)
# Location: ~/zerotrust-network/.env
# =================================================================

# PostgreSQL Core Credentials
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

# Redis Session Cache
REDIS_PASSWORD=

# Authelia Authentication & Storage
AUTHELIA_SESSION_SECRET=
AUTHELIA_STORAGE_PASSWORD=
AUTHELIA_STORAGE_ENCRYPTION_KEY=
AUTHELIA_JWT_SECRET=

# OpenID Connect / OIDC
OIDC_CLIENT_SECRET_TRAEFIK=

# Keycloak Administration & DB Linkage
KEYCLOAK_ADMIN_PASSWORD=
KC_DB_PASSWORD=

# Template Network / Upstream Routing (if customized)
WAZUH_MANAGER_IP=
JUICESHOP_HOST_IP=`;

  const tabsConfig = [
    {
      id: 'docker-compose' as const,
      label: 'docker-compose.yml',
      badge: 'Orchestration',
      path: '~/zerotrust-network/docker-compose.yml',
      content: dockerComposeContent,
    },
    {
      id: 'traefik' as const,
      label: 'traefik.yml',
      badge: 'Edge Proxy',
      path: '~/zerotrust-network/traefik/traefik.yml',
      content: traefikContent,
    },
    {
      id: 'traefik-dynamic' as const,
      label: 'traefik-dynamic.yml',
      badge: 'Routing & Chains',
      path: '~/zerotrust-network/traefik/traefik-dynamic.yml',
      content: traefikDynamicContent,
    },
    {
      id: 'authelia' as const,
      label: 'authelia-configuration.yml',
      badge: 'Access Control',
      path: '~/zerotrust-network/authelia/configuration.yml',
      content: autheliaContent,
    },
    {
      id: 'keycloak' as const,
      label: 'keycloak.env',
      badge: 'Identity IdP',
      path: '~/zerotrust-network/keycloak/.env',
      content: keycloakEnvContent,
    },
    {
      id: 'postgres' as const,
      label: 'postgres-init.sql',
      badge: 'Database Init',
      path: '~/zerotrust-network/postgres/init-scripts/init.sql',
      content: postgresInitSqlContent,
    },
  ];

  const currentTabConfig = tabsConfig.find((t) => t.id === activeTab) || tabsConfig[0];

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envExampleContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="bg-[#0F172A] border border-[#38BDF8]/30 rounded-lg p-5 font-mono space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-2">
              <span>Configuration Files & Service Manifests</span>
              <span className="text-[10px] bg-sky-500/20 text-[#38BDF8] px-2 py-0.5 rounded border border-sky-500/30">
                Redacted Ground Truth
              </span>
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              Sanitized production manifests running on <code className="text-[#38BDF8]">ztagateway</code> with parameterized secret tokens
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-[#1E293B] p-1 rounded-lg border border-[#334155]">
          {tabsConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Code Block Container */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#94A3B8] px-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Path: <code className="text-[#38BDF8] font-mono">{currentTabConfig.path}</code></span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              {currentTabConfig.badge}
            </span>
          </div>

          <button
            onClick={() => handleCopy(currentTabConfig.content, currentTabConfig.id)}
            className="text-[#38BDF8] hover:underline flex items-center gap-1.5 cursor-pointer text-xs self-start sm:self-auto bg-[#1E293B] px-2.5 py-1 rounded border border-[#334155] hover:border-[#38BDF8]/50 transition-colors"
          >
            {copiedTab === currentTabConfig.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span className="text-[#4ADE80] font-bold">Copied File!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File Contents</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#090D16] p-4 rounded-lg border border-[#334155] text-xs font-mono text-[#38BDF8] overflow-x-auto max-h-[480px] shadow-inner leading-relaxed select-text">
          <pre>{currentTabConfig.content}</pre>
        </div>
      </div>

      {/* Gitignored Local Secrets Notice Box */}
      <div className="bg-[#1E293B]/70 border border-amber-500/40 rounded-lg p-4 font-mono space-y-2.5">
        <div className="flex items-start gap-2.5">
          <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <span>Gitignored Local Secrets Notice</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                LOCAL GENERATION REQUIRED
              </span>
            </div>
            <p className="text-xs text-amber-100/90 font-sans leading-relaxed">
              The files <code className="text-amber-300 font-mono">authelia/oidc.key</code>, <code className="text-amber-300 font-mono">traefik/certs/zerotrust.key</code>, and <code className="text-amber-300 font-mono">authelia/users_database.yml</code> are strictly gitignored and not committed. They contain raw private keys and active user password hashes, and must be generated locally before launching the stack.
            </p>
          </div>
        </div>

        {/* Generation Command Snippets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px] pt-1 font-mono">
          <div className="bg-[#0F172A] p-3 rounded border border-[#334155] space-y-1.5">
            <div className="text-white font-bold flex items-center justify-between">
              <span>1. Wildcard TLS SAN Certificate & Key</span>
              <span className="text-[10px] text-[#38BDF8]">openssl req</span>
            </div>
            <p className="text-[10px] text-[#94A3B8]">Generates `zerotrust.crt` and `zerotrust.key` for *.zerotrust.lan:</p>
            <pre className="text-[#4ADE80] bg-black/50 p-2 rounded text-[10px] overflow-x-auto">
{`openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
  -keyout traefik/certs/zerotrust.key \\
  -out traefik/certs/zerotrust.crt \\
  -subj "/CN=*.zerotrust.lan" \\
  -addext "subjectAltName=DNS:*.zerotrust.lan,DNS:zerotrust.lan"`}
            </pre>
          </div>

          <div className="bg-[#0F172A] p-3 rounded border border-[#334155] space-y-1.5">
            <div className="text-white font-bold flex items-center justify-between">
              <span>2. Authelia OIDC Signing Private Key</span>
              <span className="text-[10px] text-[#38BDF8]">openssl genrsa</span>
            </div>
            <p className="text-[10px] text-[#94A3B8]">Generates RSA private key for Authelia OpenID Connect tokens:</p>
            <pre className="text-[#4ADE80] bg-black/50 p-2 rounded text-[10px] overflow-x-auto">
{`openssl genrsa -out authelia/oidc.key 4096 && \\
chmod 600 authelia/oidc.key`}
            </pre>
          </div>
        </div>
      </div>

      {/* Callout linking to .env.example */}
      <div className="bg-[#1E293B] border border-[#38BDF8]/40 rounded-lg p-4 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-2">
              <span>Project Environment Template: .env.example</span>
              <span className="text-[10px] bg-sky-500/20 text-[#38BDF8] px-1.5 py-0.2 rounded border border-sky-500/30">
                11 Variables
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
              Contains declarations for all <code className="text-white font-mono">{'\${VAR_NAME}'}</code> references used across Docker Compose, Keycloak, PostgreSQL, and Authelia.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyEnv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          {copiedEnv ? (
            <>
              <Check className="w-4 h-4 text-[#4ADE80]" />
              <span className="text-[#4ADE80]">Copied .env.example!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy .env.example</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
