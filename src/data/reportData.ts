import { Section, ChecklistItem, SecurityDebtItem, DemoAct } from '../types';

export const SECTIONS: Section[] = [
  { id: 'sec-1', number: 1, title: 'Executive Summary', shortTitle: 'Exec Summary', icon: 'Shield', badge: 'v2.1 Identity' },
  { id: 'sec-2', number: 2, title: 'Full Architecture Topology', shortTitle: 'Master Topology', icon: 'Network', badge: '4 Zones' },
  { id: 'sec-3', number: 3, title: 'Sub-Topologies', shortTitle: 'Sub-Topologies', icon: 'Layers', badge: 'Deep Dive' },
  { id: 'sec-11', number: 11, title: 'Identity & Governance Policy', shortTitle: 'Governance & RBAC', icon: 'ShieldCheck', badge: 'Policy Matrix' },
  { id: 'sec-4', number: 4, title: 'Current State Checklist', shortTitle: 'What Is Done', icon: 'CheckCircle2', badge: 'Completed' },
  { id: 'sec-5', number: 5, title: 'Remaining Work Checklist', shortTitle: 'What Is Left', icon: 'ListTodo', badge: 'Action Items' },
  { id: 'sec-6', number: 6, title: 'Roadmap & Execution Plan', shortTitle: '4-Week Roadmap', icon: 'Calendar', badge: 'Timeline' },
  { id: 'sec-7', number: 7, title: 'Security Debt Register', shortTitle: 'Security Debt', icon: 'Bug', badge: 'Hardening' },
  { id: 'sec-9', number: 9, title: 'Jury Demo Script', shortTitle: 'Jury Demo', icon: 'Play', badge: '15 Min Script' },
  { id: 'sec-10', number: 10, title: 'File Structure Blueprint', shortTitle: 'File Structure', icon: 'FolderTree', badge: 'Directory Tree' },
];

export const INITIAL_CHECKLIST_DONE: ChecklistItem[] = [
  { id: 'd1', title: 'Dual-Network Docker ZTA Isolation', description: 'Kernel-level bridge separation with proxy_net (DMZ) and auth_net (internal: true).', category: 'critical', completed: true },
  { id: 'd2', title: 'Core Gateway Containers Healthy', description: 'traefik, authelia, keycloak, postgres, redis, portainer, coraza-waf, suricata running.', category: 'critical', completed: true },
  { id: 'd3', title: 'Authelia Forward-Auth & MFA', description: 'Two-factor authentication policies enforced across all zero-trust subdomains.', category: 'critical', completed: true },
  { id: 'd4', title: 'Keycloak OIDC Integration', description: 'Federated Identity Provider configured for OAuth2/OIDC SSO delegation.', category: 'high', completed: true },
  { id: 'd5', title: 'TLS Termination at Traefik', description: 'Edge HTTPS entrypoints with wildcard certificates (*.zerotrust.lan).', category: 'high', completed: true },
  { id: 'd6', title: 'PostgreSQL & Redis Network Isolation', description: 'Zero host port bindings; bound exclusively to auth_net secure enclave.', category: 'critical', completed: true },
  { id: 'd7', title: 'Traefik Dashboard Secured', description: 'api.insecure: false set, port 8090 removed; accessible via HTTPS + MFA only.', category: 'high', completed: true },
  { id: 'd8', title: 'Forward-Auth API Path Updated', description: 'Corrected to /api/authz/forward-auth for Authelia v4.38+ compliance.', category: 'critical', completed: true },
  { id: 'd9', title: 'Wazuh Agent & Sysmon v15 Deployed', description: 'Endpoint telemetry agent installed on Patient Zero workstation.', category: 'high', completed: true },
  { id: 'd10', title: 'JSON Access Logging', description: 'Traefik access log formatted as JSON for direct Filebeat ingestion.', category: 'medium', completed: true },
  { id: 'd11', title: 'TLS Cert Regenerated (*.zerotrust.lan)', description: 'Multi-SAN certificate created replacing old .local TLD certs.', category: 'high', completed: true },
  { id: 'd12', title: 'Embedded RSA Key Purged', description: 'Private key removed from authelia/configuration.yml; oidc.key file referenced.', category: 'critical', completed: true },
  { id: 'd13', title: 'Argon2id Memory Hardened', description: 'Re-confirmed and re-applied after live audit found the gateway had regressed to iterations:1, memory:64 (64KB). Verified via configuration.yml direct read.', category: 'high', completed: true },
  { id: 'd14', title: 'Session Expiration Reduced to 72h', description: 'Re-confirmed and re-applied after live audit found remember_me had regressed to 1y. Verified via grep on the live config file.', category: 'medium', completed: true },
  { id: 'd15', title: 'Safe SQL Password Rotation', description: 'PostgreSQL passwords updated via SQL file script avoiding bash ! bugs.', category: 'high', completed: true },
  { id: 'd16', title: 'Orphan .env Files Deleted', description: 'Re-confirmed and re-applied — postgres/.env and redis/.env had reappeared on the live host with stale 2024-dated passwords inconsistent with root .env. Deleted again.', category: 'medium', completed: true },
  { id: 'd17', title: 'Keycloak Production Mode', description: 'Re-confirmed and re-applied — command had regressed to start-dev on the live host. Switched command from start-dev to start (plain production mode — --optimized was attempted but requires a pre-built image via kc.sh build, which this deployment does not use).', category: 'high', completed: true },
  { id: 'd18', title: 'Coraza WAF (Caddy + OWASP CRS)', description: 'Custom xcaddy build with OWASP CRS vendored to /srv, in front of Juice Shop on proxy_net.', category: 'critical', completed: true, who: 'eagle' },
  { id: 'd19', title: 'Suricata IDS Container', description: 'Attached to proxy_net with Emerging Threats Open ruleset, 52,256 rules loaded.', category: 'critical', completed: true, who: 'eagle' },
  { id: 'd20', title: 'Zeek NTA 5-Node Cluster', description: '5-node manager/proxy/worker cluster monitoring br_proxy, ens34 & ens33.', category: 'critical', completed: true, who: 'eagle' },
  { id: 'd21', title: 'Deploy Zone 4 minisoc3 automation stack (Shuffle + Logstash + MISP)', description: '9-container stack verified healthy, Elasticsearch connectivity confirmed via direct query against minisoc1, MISP/Shuffle web UIs reachable.', category: 'critical', completed: true, who: 'ezio' },
  { id: 'd22', title: 'Set Unique Password Hash for Eagle User', description: 'Generated via `authelia crypto hash generate argon2`, applied to users_database.yml. Verified admin, eagle, and ezio now have three distinct hashes (previously admin and eagle shared an identical hash).', category: 'critical', completed: true, who: 'eagle' },
];

export const INITIAL_CHECKLIST_LEFT: ChecklistItem[] = [
  { id: 'l1', title: 'Deploy Zone 2 Enterprise Grid (CORP-DC01, CORP-PC01, CORP-DB01)', description: 'Promote DC01 (Win Server 2022 AD DS aegis.corp), join PC01, deploy DB01 PostgreSQL customer PII, install 3 Wazuh agents.', category: 'critical', completed: false, who: 'both' },
  { id: 'l5', title: 'Update Keycloak Admin Password', description: 'Update keycloak/.env with KC_Admin_AEGIS_2026! and sync in UI.', category: 'critical', completed: false, who: 'eagle' },
  { id: 'l6', title: 'Generate Strong AUTHELIA_SESSION_SECRET', description: 'Execute openssl rand -hex 32 and update root .env file.', category: 'critical', completed: false, who: 'eagle' },
  { id: 'l9', title: 'Configure Gateway Filebeat Ingestion', description: 'Ship Traefik JSON logs, Authelia audit, Zeek conn.log, Suricata alerts to minisoc1:9200.', category: 'high', completed: false, who: 'ezio' },
  { id: 'l10', title: 'Build the Shuffle SOAR workflow itself (webhook receiver -> MISP lookup -> Keycloak session revocation / Wazuh Active Response)', description: 'Containers are running on minisoc3 but the workflow graph is not yet built in Shuffle UI.', category: 'high', completed: false, who: 'ezio' },
  { id: 'l10b', title: 'End-to-end live-alert test (trigger a real attack, confirm it flows Wazuh -> Elasticsearch -> Logstash -> Shuffle webhook)', description: 'Trigger real attack and verify full pipeline flow from endpoint detection to SOAR webhook execution.', category: 'high', completed: false, who: 'ezio' },
  { id: 'l11', title: 'Write 3 L1 SOC Playbooks in Markdown', description: 'Create brute-force.md, malware.md, and exfiltration.md in /opt/soc/playbooks/.', category: 'high', completed: false, who: 'both' },
  { id: 'l12', title: 'Map Custom Wazuh Rules to MITRE ATT&CK', description: 'Tag all local Wazuh rules with explicit mitre.id fields in local_rules.xml.', category: 'high', completed: false, who: 'ezio' },
  { id: 'l13', title: 'Build Kibana Dashboards', description: 'Import and build SOC Morning, Network Traffic, Phishing Analysis, and MITRE Matrix views.', category: 'high', completed: false, who: 'ezio' },
  { id: 'l14', title: 'Configure Zeek Log Ingestion to ES', description: 'Map conn.log, dns.log, and http.log via Filebeat into Elasticsearch.', category: 'medium', completed: false, who: 'ezio' },
  { id: 'l15', title: 'Configure Suricata Alert Forwarding', description: 'Forward eve.json alert events to Wazuh Manager / Filebeat.', category: 'medium', completed: false, who: 'eagle' },
  { id: 'l16', title: 'Deploy REMnux VM in Zone 1', description: 'Set up static malware inspection sandbox on Kali / REMnux host.', category: 'medium', completed: false, who: 'both' },
  { id: 'l17', title: 'Script 3 Reproducible Attack Scenarios', description: 'Prepare automated scripts for SQLi, LSASS mimikatz dump, and Sliver C2 beaconing.', category: 'jury', completed: false, who: 'both' },
  { id: 'l18', title: 'Rehearse 15-Minute Jury Demo Script', description: 'Execute 5 dry-run rehearsals covering all 5 demo acts under 15 minutes.', category: 'jury', completed: false, who: 'both' },
];

export const SECURITY_DEBT: SecurityDebtItem[] = [
  { flaw: 'Hardcoded RSA key in Authelia config', severity: 'Critical', fix: 'Removed key block, use key_file: /config/oidc.key', evidence: 'Config audit & startup log' },
  { flaw: '1-year session persistence (remember_me)', severity: 'High', fix: 'Reduced duration to remember_me: 72h', evidence: 'Set-Cookie header inspection' },
  { flaw: 'Weak Argon2id memory setting (64 KB)', severity: 'High', fix: 'Updated memory to 65536 KB, 3 iterations', evidence: 'Authelia CLI hash generation' },
  { flaw: 'TLS Cert for .local serving .lan domain', severity: 'High', fix: 'Regenerated multi-SAN cert for *.zerotrust.lan', evidence: 'OpenSSL s_client SAN validation' },
  { flaw: 'Orphan .env files with 2024 passwords', severity: 'Medium', fix: 'Deleted redis/.env & postgres/.env files (re-confirmed and purged after live audit regression)', evidence: 'File system tree clean check' },
  { flaw: 'Keycloak running in start-dev mode', severity: 'Medium', fix: 'Switched command from start-dev to start (plain production mode — --optimized was attempted but requires a pre-built image via kc.sh build, which this deployment does not use)', evidence: 'Keycloak server startup log' },
  { flaw: 'admin and eagle share identical hash', severity: 'Medium', fix: 'Generated unique Argon2id hash for eagle via authelia crypto hash generate argon2, applied to users_database.yml (3 distinct hashes verified)', evidence: 'users_database.yml diff' },
  { flaw: 'Custom ML black box unverified', severity: 'High', fix: 'Replaced with Shuffle SOAR + Logstash + MISP', evidence: 'Shuffle visual execution graph' },
  { flaw: 'Single flat Docker network (no ZTA)', severity: 'Critical', fix: 'Implemented dual bridge: proxy_net + auth_net (internal: true)', evidence: 'docker network inspect internal: true' },
  { flaw: 'All ports exposed to host interface', severity: 'Critical', fix: 'Unbound internal ports; exposed only 80/443/1514/1515', evidence: 'Host nmap scan showing closed 5432/6379' },
  { flaw: 'coolacid/misp-docker image deprecated/unavailable', severity: 'Medium', fix: 'Replaced with official ghcr.io/misp/misp-docker images (misp-core, misp-modules, misp-db, misp-redis split)', evidence: 'docker compose ps — all containers healthy' },
  { flaw: "Mailpit used as the system's only mail path", severity: 'High', fix: "Mailpit sinks ALL outbound mail including account-activation and password-reset links; if an attacker reaches Mailpit's UI via any session compromise, every such link in the system is exposed. In production, replace with a hardened SMTP relay (SPF/DKIM/DMARC, TLS), keep Mailpit dev/test-only, and make activation/reset links single-use with a 24-48h expiry.", evidence: 'Confirm Mailpit is not reachable from any production domain; confirm relay has SPF/DKIM configured' },
  { flaw: 'OIDC RSA private key embedded in configuration.yml, plus an identical standalone oidc.key file — both exposed via file sharing', severity: 'Critical', fix: 'Regenerated entire 4096-bit RSA keypair from scratch; old key fully retired, not rotated-in-place', evidence: "New key generation timestamp vs. old key's original creation date" },
  { flaw: 'Traefik TLS private key (zerotrust.key) similarly exposed via file sharing, plus stray unused key files (privkey.pem, zerotrust.pem) sitting in the same directory', severity: 'High', fix: 'Regenerated fresh self-signed keypair via openssl; deleted the two stray leftover key files', evidence: "ls -la traefik/certs/ shows only zerotrust.crt and zerotrust.key, both freshly dated" },
  { flaw: 'Healthcheck commands (curl-based) silently failing on Mailpit, Portainer, and Keycloak containers because those images don\'t ship curl — containers were fully healthy in reality but reported "unhealthy" in docker compose ps', severity: 'Low', fix: 'Mailpit switched to wget (present in image); Portainer switched to its own --version CLI check; Keycloak switched to a bash /dev/tcp port-open check (no external binary dependency)', evidence: 'All 8 containers now report healthy accurately in docker compose ps' },
];

export const DEMO_ACTS: DemoAct[] = [
  {
    act: 'Act I',
    title: 'The Enterprise',
    duration: '2 Minutes',
    objective: 'Establish baseline corporate domain infrastructure and verify zero-trust posture.',
    commands: [
      { cmd: 'Get-ADDomain -Identity aegis.corp', note: 'Run on CORP-DC01 to verify AD DS status' },
      { cmd: 'Get-ADComputer -Filter * | Select-Object Name, IPv4Address', note: 'Verify domain-joined workstations' },
      { cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', note: 'Run on Gateway host to display 9 healthy containers' },
    ],
    narrative: 'This represents a typical SME environment with Active Directory, Windows workstations, and an isolated customer database. We will now attempt to breach it.'
  },
  {
    act: 'Act II',
    title: 'The Perimeter',
    duration: '3 Minutes',
    objective: 'Prove Zero-Trust network isolation and port blocking from an external attacker perspective.',
    commands: [
      { cmd: 'nmap -sS -p- 192.168.19.173', output: 'PORT 80/tcp OPEN\nPORT 443/tcp OPEN\nPORT 1514/tcp OPEN\nPORT 1515/tcp OPEN', note: 'Run from Kali Linux APT station' },
      { cmd: 'nc -zv 192.168.19.173 5432', output: 'nc: connect to 192.168.19.173 port 5432 (tcp) failed: Connection refused', note: 'PostgreSQL port completely hidden from host' },
      { cmd: 'nc -zv 192.168.19.173 9091', output: 'nc: connect to 192.168.19.173 port 9091 (tcp) failed: Connection refused', note: 'Authelia forward-auth hidden from host' },
      { cmd: 'curl -k -I https://portainer.zerotrust.lan', output: 'HTTP/2 302\nlocation: https://authelia.zerotrust.lan/?rd=...', note: 'All web applications force Authelia 2FA' },
    ],
    narrative: 'Under Zero Trust, internal microservices do not exist on the host network interface. They sit inside an internal: true Docker bridge, accessible exclusively through Traefik after passing MFA.'
  },
  {
    act: 'Act III',
    title: 'The Attack & Detection',
    duration: '5 Minutes',
    objective: 'Execute web exploit and phishing scenarios; observe edge WAF and IDS detection.',
    commands: [
      { cmd: 'sqlmap -u "https://juiceshop.zerotrust.lan/rest/user/login" --data="email=test&password=test" --batch', output: 'HTTP/1.1 403 Forbidden (Coraza WAF Rule 942100 Triggered)', note: 'Web attack blocked inline by WAF' },
      { cmd: 'tail -f /var/log/suricata/fast.log', output: '[1:2210045:2] ET WEB_SERVER SQL Injection Attempt in HTTP POST Data', note: 'Suricata IDS logs event on proxy_net' },
      { cmd: 'curl -k https://mailpit.zerotrust.lan/api/v1/messages', note: 'Inspect captured MFA and phishing test emails in sinkhole' },
    ],
    narrative: 'Edge defenses block web exploits inline while streaming JSON alert telemetry directly into our SOC pipeline on minisoc1.'
  },
  {
    act: 'Act IV',
    title: 'The Endpoint Compromise',
    duration: '3 Minutes',
    objective: 'Simulate credential harvesting on Patient Zero workstation and verify EDR telemetry.',
    commands: [
      { cmd: 'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit', note: 'Run on CORP-PC01 to dump LSASS process memory' },
      { cmd: 'Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" | Where-Object {$_.Id -eq 10} | Select-Object -First 1', output: 'Event ID 10: ProcessAccess Source: mimikatz.exe Target: lsass.exe GrantedAccess: 0x1410', note: 'Sysmon captures memory dump attempt' },
    ],
    narrative: 'Even if an adversary accesses an endpoint, Sysmon detects the LSASS memory access handle and forwards the alert to Wazuh, automatically tagged with MITRE T1003.001 in Kibana.'
  },
  {
    act: 'Act V',
    title: 'The Response',
    duration: '2 Minutes',
    objective: 'Demonstrate autonomous SOAR containment via Shuffle and Wazuh Active Response enriched by MISP Abuse.ch threat intelligence.',
    commands: [
      { cmd: 'curl -s -k -X POST "http://10.16.64.157:8080/events/add" -H "Authorization: $MISP_KEY" -H "Content-Type: application/json" -d \'{"Event":{"info":"Manual C2 Ingestion","threat_level_id":"2","Attribute":[{"type":"ip-dst","value":"185.220.101.5"}]}}\'', note: 'Manually ingest Abuse.ch IOC into MISP on minisoc3' },
      { cmd: 'curl -X POST http://10.16.64.157:3001/api/v1/hooks/webhook_misp_enrichment -H "Content-Type: application/json" -d \'{"ioc_value":"185.220.101.5"}\'', note: 'Trigger Shuffle SOAR enrichment pipeline' },
      { cmd: 'docker exec wazuh-manager /var/ossec/bin/agent_control -b 192.168.20.100 -f host-drop -u 0', output: 'Active response host-drop executed on Agent 002 (CORP-PC01)', note: 'Wazuh Active Response disables endpoint NIC' },
    ],
    narrative: 'From initial LSASS credential dump to full network isolation: 47 seconds. Shuffle SOAR enriched the alert via MISP Abuse.ch feeds and commanded Wazuh to sever the host network connection.'
  }
];
