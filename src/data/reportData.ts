import { Section, ChecklistItem, SecurityDebtItem, TryHackMeTopic, DemoAct } from '../types';

export const SECTIONS: Section[] = [
  { id: 'sec-1', number: 1, title: 'Executive Summary', shortTitle: 'Exec Summary', icon: 'Shield', badge: 'v2.1 Identity' },
  { id: 'sec-2', number: 2, title: 'Full Architecture Topology', shortTitle: 'Master Topology', icon: 'Network', badge: '4 Zones' },
  { id: 'sec-3', number: 3, title: 'Sub-Topologies', shortTitle: 'Sub-Topologies', icon: 'Layers', badge: 'Deep Dive' },
  { id: 'sec-4', number: 4, title: 'Current State Checklist', shortTitle: 'What Is Done', icon: 'CheckCircle2', badge: 'Completed' },
  { id: 'sec-5', number: 5, title: 'Remaining Work Checklist', shortTitle: 'What Is Left', icon: 'ListTodo', badge: 'Action Items' },
  { id: 'sec-6', number: 6, title: 'Roadmap & Execution Plan', shortTitle: '4-Week Roadmap', icon: 'Calendar', badge: 'Timeline' },
  { id: 'sec-7', number: 7, title: 'Security Debt Register', shortTitle: 'Security Debt', icon: 'Bug', badge: 'Hardening' },
  { id: 'sec-8', number: 8, title: 'TryHackMe Integration Map', shortTitle: 'TryHackMe Map', icon: 'GraduationCap', badge: '19 Topics' },
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
  { id: 'd13', title: 'Argon2id Memory Hardened', description: 'Configured with memory: 65536 KB, iterations: 3, parallelism: 4.', category: 'high', completed: true },
  { id: 'd14', title: 'Session Expiration Reduced to 72h', description: 'remember_me persistent session reduced from 1 year to 72 hours.', category: 'medium', completed: true },
  { id: 'd15', title: 'Safe SQL Password Rotation', description: 'PostgreSQL passwords updated via SQL file script avoiding bash ! bugs.', category: 'high', completed: true },
  { id: 'd16', title: 'Orphan .env Files Deleted', description: 'Removed redis/.env and postgres/.env to enforce root .env source of truth.', category: 'medium', completed: true },
  { id: 'd17', title: 'Keycloak Production Mode', description: 'Switched command from start-dev to start --optimized.', category: 'high', completed: true },
  { id: 'd18', title: 'Coraza WAF (Caddy + OWASP CRS)', description: 'Custom xcaddy build with OWASP CRS vendored to /srv, in front of Juice Shop on proxy_net.', category: 'critical', completed: true, who: 'eagle' },
  { id: 'd19', title: 'Suricata IDS Container', description: 'Attached to proxy_net with Emerging Threats Open ruleset, 52,256 rules loaded.', category: 'critical', completed: true, who: 'eagle' },
  { id: 'd20', title: 'Zeek NTA 5-Node Cluster', description: '5-node manager/proxy/worker cluster monitoring br_proxy, ens34 & ens33.', category: 'critical', completed: true, who: 'eagle' },
  { id: 'd21', title: 'Deploy Zone 4 minisoc3 automation stack (Shuffle + Logstash + MISP)', description: '9-container stack verified healthy, Elasticsearch connectivity confirmed via direct query against minisoc1, MISP/Shuffle web UIs reachable.', category: 'critical', completed: true, who: 'ezio' },
];

export const INITIAL_CHECKLIST_LEFT: ChecklistItem[] = [
  { id: 'l1', title: 'Deploy Zone 2 Enterprise Grid (CORP-DC01, CORP-PC01, CORP-DB01)', description: 'Promote DC01 (Win Server 2022 AD DS aegis.corp), join PC01, deploy DB01 PostgreSQL customer PII, install 3 Wazuh agents.', category: 'critical', completed: false, who: 'both' },
  { id: 'l5', title: 'Update Keycloak Admin Password', description: 'Update keycloak/.env with KC_Admin_AEGIS_2026! and sync in UI.', category: 'critical', completed: false, who: 'eagle' },
  { id: 'l6', title: 'Generate Strong AUTHELIA_SESSION_SECRET', description: 'Execute openssl rand -hex 32 and update root .env file.', category: 'critical', completed: false, who: 'eagle' },
  { id: 'l7', title: 'Set Unique Password Hash for Eagle User', description: 'Generate distinct Argon2id hash for eagle account in users_database.yml.', category: 'critical', completed: false, who: 'eagle' },
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
  { flaw: 'Orphan .env files with 2024 passwords', severity: 'Medium', fix: 'Deleted redis/.env & postgres/.env files', evidence: 'File system tree clean check' },
  { flaw: 'Keycloak running in start-dev mode', severity: 'Medium', fix: 'Switched command to start --optimized', evidence: 'Keycloak server startup log' },
  { flaw: 'admin and eagle share identical hash', severity: 'Medium', fix: 'Generated unique Argon2id hash for eagle', evidence: 'users_database.yml diff' },
  { flaw: 'Custom ML black box unverified', severity: 'High', fix: 'Replaced with Shuffle SOAR + Logstash + MISP', evidence: 'Shuffle visual execution graph' },
  { flaw: 'Single flat Docker network (no ZTA)', severity: 'Critical', fix: 'Implemented dual bridge: proxy_net + auth_net (internal: true)', evidence: 'docker network inspect internal: true' },
  { flaw: 'All ports exposed to host interface', severity: 'Critical', fix: 'Unbound internal ports; exposed only 80/443/1514/1515', evidence: 'Host nmap scan showing closed 5432/6379' },
  { flaw: 'coolacid/misp-docker image deprecated/unavailable', severity: 'Medium', fix: 'Replaced with official ghcr.io/misp/misp-docker images (misp-core, misp-modules, misp-db, misp-redis split)', evidence: 'docker compose ps — all containers healthy' },
];

export const TRYHACKME_MAP: TryHackMeTopic[] = [
  { topic: 'Blue Team Intro', implementation: 'SOC tier documentation (L1/L2/L3) & threat modeling', zone: 'Docs', artifact: 'docs/architecture.md' },
  { topic: 'SOC L1 Triage', implementation: '3 physical playbooks (Brute Force, Malware, Exfiltration)', zone: 'Zone 4', artifact: 'soc/playbooks/*.md' },
  { topic: 'SOC Metrics', implementation: 'Kibana MTTD, MTTR, and alert volume dashboard', zone: 'Zone 4', artifact: 'soc/dashboards/metrics.ndjson' },
  { topic: 'EDR Concepts', implementation: 'Sysmon v15 + Wazuh agent on Windows domain endpoints', zone: 'Zone 2', artifact: 'grid/corp-pc01/sysmon.xml' },
  { topic: 'SIEM Operations', implementation: 'Wazuh Manager + Elasticsearch 8.19 + Kibana integration', zone: 'Zone 4', artifact: 'minisoc1/minisoc2 Native RPM & systemd' },
  { topic: 'SOAR Automation', implementation: 'Shuffle SOAR visual workflow engine ("Mahoraga v2.1")', zone: 'Zone 4', artifact: 'minisoc3 Docker Stack / Shuffle UI' },
  { topic: 'Pyramid of Pain', implementation: 'Kibana "Detection by IOC Type" visualization', zone: 'Zone 4', artifact: 'Kibana Saved Dashboard' },
  { topic: 'Cyber Kill Chain', implementation: 'Attack scenario documentation mapping Sliver to CKC', zone: 'Docs', artifact: 'docs/kill-chain.md' },
  { topic: 'MITRE ATT&CK', implementation: 'Wazuh detection rules tagged with explicit mitre.id fields', zone: 'Zone 4', artifact: 'soc/wazuh/rules/local_rules.xml' },
  { topic: 'Phishing Analysis', implementation: 'Mailpit SMTP sinkhole + header analysis playbook', zone: 'Zone 3', artifact: 'soc/playbooks/phishing.md' },
  { topic: 'Network Traffic', implementation: 'Zeek 5-node cluster (conn.log, dns.log, http.log) -> ES', zone: 'Zone 3', artifact: '/opt/zeek/logs/current/' },
  { topic: 'Wireshark Analysis', implementation: 'Analyst station on Kali VM with exported .pcap files', zone: 'Zone 1', artifact: 'Kali /home/kali/pcaps/' },
  { topic: 'Network Security', implementation: 'Suricata IDS container on proxy_net with ET rules', zone: 'Zone 3', artifact: 'gateway/suricata/' },
  { topic: 'Web Security', implementation: 'Coraza WAF container with OWASP CRS protecting Juice Shop', zone: 'Zone 3', artifact: 'gateway/coraza/Caddyfile' },
  { topic: 'Windows Threat Detection', implementation: 'Sysmon Event IDs 1, 3, 7, 10, 11, 12, 13, 22 -> Wazuh', zone: 'Zone 2', artifact: 'Windows Event Collector' },
  { topic: 'Linux Threat Detection', implementation: 'auditd execution & FIM rules on CORP-DB01', zone: 'Zone 2', artifact: 'grid/corp-db01/audit.rules' },
  { topic: 'Malware Analysis', implementation: 'REMnux VM in Zone 1 for static YARA/PE analysis', zone: 'Zone 1', artifact: 'REMnux Sandbox' },
  { topic: 'Threat Intelligence', implementation: 'MISP instance on minisoc3 with Abuse.ch feeds', zone: 'Zone 4', artifact: 'http://10.16.64.157:8080' },
  { topic: 'Log Analysis', implementation: 'Kibana Discover saved searches & structured queries', zone: 'Zone 4', artifact: 'Kibana Saved Searches' },
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

export const MASTER_TOPOLOGY_MERMAID = `graph TB
    subgraph Zone1["🔴 Zone 1: Threatscape (Internet & Red Team)"]
        KALI["Kali Linux APT (192.168.1.50)<br/>Sliver C2 / sqlmap / mimikatz"]
        REMNUX["REMnux Malware Sandbox<br/>YARA / Static / Dynamic Analysis"]
    end

    subgraph Zone2["🟡 Zone 2: The Small Enterprise (aegis.corp - 192.168.20.0/24)"]
        DC01["CORP-DC01 (192.168.20.10)<br/>Win Server 2022 AD DS / DNS / DHCP<br/>Wazuh Agent"]
        PC01["CORP-PC01 (192.168.20.100)<br/>Win10 Workstation 'Patient Zero'<br/>Sysmon v15 + Wazuh Agent"]
        DB01["CORP-DB01 (192.168.20.50)<br/>Ubuntu 22.04 PostgreSQL (Customer PII)<br/>Wazuh Agent + auditd"]
    end

    subgraph Zone3["🔵 Zone 3: ZTA Gateway (192.168.19.173 - Ubuntu 24.04 LTS)"]
        subgraph ProxyNet["proxy_net (DMZ Bridge)"]
            TRAEFIK["Traefik v3.6.1 Edge Router<br/>Ports 80 / 443 / 1514 / 1515"]
            CORAZA["Coraza WAF (Caddy + OWASP CRS)<br/>Inline Web Defense"]
            SURICATA["Suricata IDS<br/>Emerging Threats Rules"]
        end
        subgraph AuthNet["auth_net (internal: true Secure Enclave)"]
            AUTHELIA["Authelia v4.39.20<br/>Forward-Auth / MFA / OIDC"]
            KEYCLOAK["Keycloak v26.6.2<br/>OIDC Identity Provider"]
            POSTGRES["PostgreSQL 16<br/>Identity Vault"]
            REDIS["Redis 7<br/>Session Cache"]
            PORTAINER["Portainer CE v2.39.2<br/>Management UI"]
        end
        ZEEK["Zeek NTA (5-Node Cluster)<br/>Sniffing br_proxy, ens34 & ens33"]
        JUICESHOP["OWASP Juice Shop (192.168.19.175:3000)<br/>Vulnerable Target App"]
    end

    subgraph Zone4["🟣 Zone 4: MSSP SOC (10.16.64.0/24 - AlmaLinux 9.3 Cluster)"]
        SOC1["minisoc1 (10.16.64.155)<br/>Elasticsearch 8.19.13 'The Vault' (Native Package)<br/>Port 9200/TLS"]
        SOC2["minisoc2 (10.16.64.156)<br/>Wazuh Manager 4.7 + Kibana 'The Brain' (Native Package)<br/>Ports 1514 / 1515 / 5601"]
        subgraph MiniSOC3["minisoc3 (10.16.64.157) 'The Executor' (soc_net Bridge)"]
            SOC3_SHUFFLE["Shuffle SOAR (4 Containers)<br/>frontend (:3001), backend, orborus, mongo:6"]
            SOC3_MISP["MISP Official (4 Containers)<br/>core (:8080), modules, mariadb, valkey"]
            SOC3_LOGSTASH["Logstash 8.19.13 (:5044)<br/>Level 12+ ES Query -> Shuffle Hook"]
            SOC3_MAILPIT["Mailpit SMTP Sinkhole (:8025)<br/>Phishing Triage"]
        end
    end

    KALI -->|"1. HTTPS Attack / C2 / SQLi"| TRAEFIK
    TRAEFIK -->|"2. Forward Auth Request (:9091)"| AUTHELIA
    AUTHELIA -->|"3. Check Sessions / Auth"| REDIS
    AUTHELIA -->|"4. User Credential Query"| POSTGRES
    AUTHELIA -->|"5. OIDC Delegation"| KEYCLOAK
    TRAEFIK -->|"6. Proxy Clean Request"| CORAZA
    CORAZA -->|"7. Clean Web Traffic"| JUICESHOP

    PC01 -->|"8. Sysmon / Security Logs (TCP 1514 mTLS)"| TRAEFIK
    DC01 -->|"9. AD Event Logs (TCP 1514 mTLS)"| TRAEFIK
    DB01 -->|"10. auditd / DB Logs (TCP 1514 mTLS)"| TRAEFIK
    TRAEFIK -->|"11. Blind Proxy Pass-through"| SOC2

    TRAEFIK -->|"12. JSON Access Logs (Filebeat)"| SOC1
    ZEEK -->|"13. Network Traffic Logs (Filebeat)"| SOC1
    SURICATA -->|"14. EVE JSON Alerts"| SOC2

    SOC2 -->|"15. Index Alerts"| SOC1
    SOC1 -->|"16. Alert Feed (rule.level >= 12)"| SOC3_LOGSTASH
    SOC3_LOGSTASH -->|"17. Trigger Webhook"| SOC3_SHUFFLE
    SOC3_SHUFFLE -->|"18. Threat Intel Lookup"| SOC3_MISP
    SOC3_SHUFFLE -->|"19. Active Response / Session Revocation"| SOC2
    SOC2 -->|"20. Host Isolation Trigger"| PC01`;
