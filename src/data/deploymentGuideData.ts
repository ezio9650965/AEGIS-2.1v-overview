export interface DeploymentSection {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  badge: 'Required' | 'Optional' | 'Verification step';
  goal: string;
  prerequisites: string[];
}

export interface VerificationItem {
  component: string;
  command: string;
  expectedOutput: string;
  category: 'Network' | 'LDAP' | 'Authelia' | 'Keycloak' | 'WAF';
}

export interface TroubleshootingItem {
  symptom: string;
  likelyCause: string;
  fix: string;
  severity: 'Critical' | 'High' | 'Medium';
}

export interface SecretRotationItem {
  secretName: string;
  location: string;
  impact: string;
  generationCommand: string;
}

export const DEPLOYMENT_SECTIONS: DeploymentSection[] = [
  {
    id: 'sec-dep-1',
    number: '§ 1',
    title: 'Architecture Overview & Network Topology',
    shortTitle: 'Architecture Overview',
    badge: 'Required',
    goal: 'Understand the dual-bridge perimeter model, traffic flows, and container boundary isolation before deploying any container.',
    prerequisites: ['Basic Docker bridge networking knowledge', 'Understanding of reverse proxy forwarding'],
  },
  {
    id: 'sec-dep-2',
    number: '§ 2',
    title: 'Host & Perimeter Prerequisites',
    shortTitle: 'Host Prerequisites',
    badge: 'Required',
    goal: 'Provision the baseline Ubuntu 24.04 host, firewall isolation, DNS resolution for zerotrust.lan, and wildcard TLS certificates.',
    prerequisites: ['Root / sudo access on Ubuntu 24.04 LTS host', 'Installed Docker Engine 26+ and Compose v2'],
  },
  {
    id: 'sec-dep-3',
    number: '§ 3',
    title: 'Base Stack Deploy & Environment Orchestration',
    shortTitle: 'Base Stack Deploy',
    badge: 'Required',
    goal: 'Launch the core 9-container compose skeleton with strictly separated proxy_net (DMZ) and auth_net (internal: true) networks.',
    prerequisites: ['Wildcard TLS certificate in place', 'Host ports 80 and 443 available'],
  },
  {
    id: 'sec-dep-4',
    number: '§ 4',
    title: 'OpenLDAP Centralized Directory Deployment',
    shortTitle: 'OpenLDAP Deployment',
    badge: 'Required',
    goal: 'Deploy osixia/openldap:1.5.0 on auth_net, build directory trees (ou=People, ou=Security_Groups), bind account, and apply the crucial olcAccess ACL grant.',
    prerequisites: ['OpenLDAP container running on auth_net', 'ldap-utils package installed on host or run via docker exec'],
  },
  {
    id: 'sec-dep-5',
    number: '§ 5',
    title: 'Authelia LDAP Backend Migration & MFA Flow',
    shortTitle: 'Authelia LDAP Backend',
    badge: 'Required',
    goal: 'Migrate Authelia v4.39 from flat file authentication to OpenLDAP, enforce AUTHELIA_* variable allow-lists, and register TOTP 2FA.',
    prerequisites: ['OpenLDAP directory populated with user accounts', 'PostgreSQL storage online on auth_net'],
  },
  {
    id: 'sec-dep-6',
    number: '§ 6',
    title: 'Group-Based Access Control & Explicit Deny Hardening',
    shortTitle: 'Group Access Control',
    badge: 'Required',
    goal: 'Enforce RBAC rules using LDAP groups (group:admins, group:it_ops) and implement explicit deny companion rules to prevent subject fallthrough.',
    prerequisites: ['Authelia successfully authenticating LDAP users', 'Security_Groups populated with member DNs'],
  },
  {
    id: 'sec-dep-7',
    number: '§ 7',
    title: 'Keycloak OIDC Federation & The 4-Layer Handshake Chain',
    shortTitle: 'Keycloak OIDC Federation',
    badge: 'Required',
    goal: 'Federate Keycloak 26.x as an OIDC Relying Party to Authelia via the oidc-proxy Caddy sidecar, resolving all four PKIX/HTTP handshake bugs.',
    prerequisites: ['Authelia OIDC provider enabled', 'oidc-proxy Caddy sidecar configured on auth_net'],
  },
  {
    id: 'sec-dep-8',
    number: '§ 8',
    title: 'Inline Coraza WAF & Web Application Protection',
    shortTitle: 'Inline Coraza WAF',
    badge: 'Required',
    goal: 'Insert Coraza WAF (Caddy with OWASP CRS) directly into the Traefik traffic path to inspect and block web attack payloads targeting Juice Shop.',
    prerequisites: ['Juice Shop container online', 'Coraza container running on proxy_net'],
  },
  {
    id: 'sec-dep-9',
    number: '§ 9',
    title: 'End-to-End Verification Matrix',
    shortTitle: 'Verification Matrix',
    badge: 'Verification step',
    goal: 'Validate each subsystem across the entire architecture with copy-pasteable verification commands and authoritative expected responses.',
    prerequisites: ['All 9 stack containers up and configured'],
  },
  {
    id: 'sec-dep-10',
    number: '§ 10',
    title: 'Troubleshooting Quick Reference',
    shortTitle: 'Troubleshooting Guide',
    badge: 'Verification step',
    goal: 'Diagnose and remediate common production errors spanning LDAP Result Codes, Authelia variable expansion, JVM truststores, and Docker Compose.',
    prerequisites: ['Access to container logs via docker compose logs'],
  },
  {
    id: 'sec-dep-11',
    number: '§ 11',
    title: 'Pre-Defense Secrets Rotation & Security Hygiene',
    shortTitle: 'Secrets Management',
    badge: 'Required',
    goal: 'Purge all development credentials, generate fresh high-entropy secrets, and secure keyrings prior to evaluation or defense.',
    prerequisites: ['OpenSSL utility installed on management machine'],
  },
];

export const VERIFICATION_MATRIX: VerificationItem[] = [
  {
    component: 'Network Isolation',
    category: 'Network',
    command: 'docker inspect aegis-openldap --format \'{{json .NetworkSettings.Networks}}\' | jq',
    expectedOutput: 'Contains ONLY "auth_net" with "IPAddress" on 172.28.0.x. No "proxy_net" or host ports.',
  },
  {
    component: 'OpenLDAP Base DIT',
    category: 'LDAP',
    command: 'docker exec -it aegis-openldap ldapsearch -x -H ldap://localhost -b "dc=zerotrust,dc=lan" -s base "(objectclass=*)"',
    expectedOutput: 'result: 0 Success with dn: dc=zerotrust,dc=lan',
  },
  {
    component: 'OpenLDAP ACL Grant',
    category: 'LDAP',
    command: 'docker exec -it aegis-openldap ldapwhoami -x -D "cn=authelia-bind,dc=zerotrust,dc=lan" -w "${LDAP_BIND_PASSWORD}"',
    expectedOutput: 'dn:cn=authelia-bind,dc=zerotrust,dc=lan (Exit code 0)',
  },
  {
    component: 'Authelia Service Health',
    category: 'Authelia',
    command: 'curl -skI https://authelia.zerotrust.lan/api/health',
    expectedOutput: 'HTTP/2 200 OK with server: traefik and content-type: application/json',
  },
  {
    component: 'Forward-Auth RBAC Non-Admin',
    category: 'Authelia',
    command: 'curl -sk -u "testuser:TestUserPass123!" -I https://keycloak.zerotrust.lan/',
    expectedOutput: 'HTTP/2 403 Forbidden (Denied by explicit deny rule after group:admins check)',
  },
  {
    component: 'Forward-Auth RBAC Admin',
    category: 'Authelia',
    command: 'curl -sk -u "ezio:EzioAdminPass123!" -I https://keycloak.zerotrust.lan/',
    expectedOutput: 'HTTP/2 302 Found or 200 OK (Redirect to MFA or admin console)',
  },
  {
    component: 'OIDC Proxy Relay',
    category: 'Keycloak',
    command: 'docker exec -it aegis-keycloak curl -sI http://oidc-proxy:8080/.well-known/openid-configuration',
    expectedOutput: 'HTTP/1.1 200 OK with "issuer":"https://authelia.zerotrust.lan"',
  },
  {
    component: 'Keycloak OIDC Discovery',
    category: 'Keycloak',
    command: 'curl -skI https://keycloak.zerotrust.lan/realms/aegis/broker/authelia/endpoint',
    expectedOutput: 'HTTP/2 302 Found (Redirects to Authelia authorization endpoint without PKIX error)',
  },
  {
    component: 'Coraza WAF Inline SQLi Block',
    category: 'WAF',
    command: 'curl -skG "https://juiceshop.zerotrust.lan/rest/products/search" --data-urlencode "q=\' OR 1=1--"',
    expectedOutput: 'HTTP/2 403 Forbidden (Blocked inline by OWASP CRS rule 942100)',
  },
  {
    component: 'Coraza WAF Long-Polling Pass',
    category: 'WAF',
    command: 'curl -skI "https://juiceshop.zerotrust.lan/socket.io/?EIO=4&transport=polling"',
    expectedOutput: 'HTTP/2 200 OK (Allowed via SecRule exclusion id:1001)',
  },
];

export const TROUBLESHOOTING_MATRIX: TroubleshootingItem[] = [
  {
    symptom: 'LDAP Result Code 32 ("No Such Object") despite entry existing',
    likelyCause: 'OpenLDAP olcAccess ACL does not grant read access to the authelia-bind user. OpenLDAP intentionally returns Result Code 32 instead of permission denied to obscure subtree existence.',
    fix: 'Apply LDIF granting "to * by dn.exact=\'cn=authelia-bind,dc=zerotrust,dc=lan\' read by * break" to olcDatabase={1}mdb,cn=config.',
    severity: 'Critical',
  },
  {
    symptom: 'LDAP Result Code 49 ("Invalid Credentials")',
    likelyCause: 'Password mismatch between root .env (LDAP_BIND_PASSWORD) and the directory value set during container bootstrap, or unescaped exclamation marks.',
    fix: 'Reset the password inside OpenLDAP using `ldappasswd -x -D "cn=admin,dc=zerotrust,dc=lan" -w "${LDAP_ADMIN_PASSWORD}" -S "cn=authelia-bind,dc=zerotrust,dc=lan"`.',
    severity: 'Critical',
  },
  {
    symptom: 'Authelia crash loop with no stdout error in docker logs',
    likelyCause: 'Authelia suppresses verbose error traces from Docker stdout when configured with a file log or on fatal YAML parse errors.',
    fix: 'Check the file log at `./authelia_logs/authelia.log` or run `docker compose exec authelia authelia validate-config /config/configuration.yml`.',
    severity: 'High',
  },
  {
    symptom: 'docker compose up -d does not pick up changes to .env',
    likelyCause: 'Docker Compose inspects service declarations in compose.yml; if image tags and volume mounts have not changed, it reports "Container is up to date" and retains stale env vars.',
    fix: 'Force recreation using `docker compose up -d --force-recreate <service-name>`.',
    severity: 'Medium',
  },
  {
    symptom: '${VAR} in Authelia configuration.yml not substituted',
    likelyCause: 'Authelia parser strictly allow-lists env substitution to AUTHELIA_* and X_AUTHELIA_* prefixes. Generic variable names like ${LDAP_PASSWORD} fail silently.',
    fix: 'Declare environment variable overrides in docker-compose.yml: `AUTHELIA_AUTHENTICATION_BACKEND_LDAP_PASSWORD: ${LDAP_BIND_PASSWORD}`.',
    severity: 'Critical',
  },
  {
    symptom: 'SSLHandshakeException: PKIX path building failed in Keycloak',
    likelyCause: 'Keycloak 26.x SimpleHttpRequest for outbound OIDC discovery ignores JVM truststores and KC_TRUSTSTORE_PATHS for backchannel calls.',
    fix: 'Deploy oidc-proxy Caddy sidecar on auth_net and point Keycloak Token/UserInfo URLs to http://oidc-proxy:8080 while keeping Issuer as https://authelia.zerotrust.lan.',
    severity: 'Critical',
  },
  {
    symptom: 'Authelia rejects Keycloak with "invalid X-Forwarded-Proto: http"',
    likelyCause: 'Keycloak queried Authelia directly over plain HTTP; Authelia OpenID Connect provider mandates HTTPS scheme declaration.',
    fix: 'Ensure oidc-proxy reverse proxy block includes `header_up X-Forwarded-Proto https`.',
    severity: 'High',
  },
  {
    symptom: 'Keycloak logs: "YAML did not find expected \'-\' indicator"',
    likelyCause: 'Mixed YAML list and dictionary syntax in docker-compose.yml `environment:` block (mixing `- KEY=VAL` with `KEY: VAL`).',
    fix: 'Standardize the entire environment block to dictionary map format (`KEY: ${VAL}`) across all services.',
    severity: 'Medium',
  },
  {
    symptom: 'Juice Shop WebSocket long-polling fails with HTTP 403',
    likelyCause: 'OWASP Core Rule Set detects /socket.io/?transport=polling query arguments as protocol anomalies.',
    fix: 'Add exclusion rule in Coraza Caddyfile: `SecRule REQUEST_URI "@beginsWith /socket.io/" "id:1001,phase:1,pass,nolog,ctl:ruleEngine=DetectionOnly"`.',
    severity: 'Medium',
  },
];

export const SECRETS_ROTATION_LIST: SecretRotationItem[] = [
  {
    secretName: 'LDAP_ADMIN_PASSWORD',
    location: '.env & OpenLDAP bootstrap',
    impact: 'Directory root administration password for cn=admin,dc=zerotrust,dc=lan',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'LDAP_CONFIG_PASSWORD',
    location: '.env & OpenLDAP olcDatabase',
    impact: 'Slapd configuration engine password for cn=admin,cn=config',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'LDAP_BIND_PASSWORD',
    location: '.env, OpenLDAP, & Authelia config',
    impact: 'Read-only directory lookup credentials for cn=authelia-bind',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'AUTHELIA_JWT_SECRET',
    location: '.env & Authelia configuration.yml',
    impact: 'Signs session state tokens and one-time registration cookies',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'AUTHELIA_SESSION_SECRET',
    location: '.env & Authelia configuration.yml',
    impact: 'Encrypts Redis session store cookies (authelia_session)',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'AUTHELIA_STORAGE_ENCRYPTION_KEY',
    location: '.env & Authelia storage engine',
    impact: 'Encrypts PostgreSQL user preferences and TOTP seed secrets',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'KEYCLOAK_OIDC_CLIENT_SECRET',
    location: '.env, Authelia OIDC clients, & Keycloak IdP',
    impact: 'Shared secret for Keycloak-to-Authelia OIDC code-for-token exchange',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'KEYCLOAK_ADMIN_PASSWORD',
    location: '.env & Keycloak master realm',
    impact: 'Master realm administration access (kcadm.sh)',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'POSTGRES_AUTHELIA_PASSWORD',
    location: '.env, Postgres init script, & Authelia',
    impact: 'Storage database credentials for authelia_storage database',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'REDIS_PASSWORD',
    location: '.env, redis.conf, & Authelia',
    impact: 'Session cache authentication token',
    generationCommand: 'openssl rand -hex 32',
  },
  {
    secretName: 'Wildcard TLS Key (*.zerotrust.lan)',
    location: 'traefik/certs/zerotrust.key',
    impact: 'Perimeter TLS 1.3 decryption private key',
    generationCommand: 'openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout traefik/certs/zerotrust.key -out traefik/certs/zerotrust.crt -subj "/CN=*.zerotrust.lan"',
  },
  {
    secretName: 'Authelia OIDC RSA Private Key',
    location: 'authelia/oidc.key',
    impact: 'Cryptographically signs OpenID Connect ID Tokens and UserInfo responses',
    generationCommand: 'openssl genrsa -out authelia/oidc.key 4096 && openssl rsa -in authelia/oidc.key -pubout -out authelia/oidc.pub',
  },
];
