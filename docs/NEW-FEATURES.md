# New Features — Coming Soon

Ideas, enhancements, and post-project work identified during the AEGIS
deployment. Each item includes rationale, dependencies, and a rough effort
estimate.

Status legend: 🔴 Blocked · 🟡 Designed · 🟢 Ready to build

---

## 1. Identity-Aware Active Response 🔴

**Blocked on:** Zone 4 access

Instead of blocking source IPs (perimeter thinking), respond to threats by
re-verifying identity.

### The four-level ladder

| Level | Action | When |
|---|---|---|
| **Revoke** | Destroy Authelia + Keycloak sessions | Any session integrity suspicion |
| **Step-up** | Force re-auth with stronger factor (WebAuthn) | Identity continuity doubt |
| **Narrow** | Add to `GRP_QUARANTINE` for 15 min | Behavioral anomaly |
| **Disable** | Disable AD account | Confirmed compromise |

### Why this matters

> AEGIS is an identity-aware proxy. Blocking an IP is what a firewall does.
> When the SOC is uncertain about a session, the answer is not "block the
> source" — it's "re-verify the identity." The legitimate user proves
> themselves with their second factor; the attacker can't.

### Implementation pieces

- SOC service account in AD (`svc-soc-response`) with delegated rights on `OU=Departments`
- Authelia session revocation endpoint (Redis direct or API)
- Keycloak admin API session revocation
- Shuffle playbook for each level
- Feedback loop: write response actions to `aegis-responses-*` index

### Effort: 3–4 days (when unblocked)

---

## 2. Cross-Source Correlation Rules 🔴

**Blocked on:** ECS normalization + Zone 4 access

EQL `sequence by` rules that correlate events across indices.

### Candidate rules

| # | Sequence | Detection |
|---|---|---|
| 1 | AD `4732` → Keycloak admin login (60s) | Privilege escalation |
| 2 | Authelia MFA success → AD `4720` new user (5 min) | Backdoor account creation |
| 3 | Authelia brute force → Suricata scan (same IP) | Coordinated credential attack |
| 4 | Coraza WAF block → Authelia failure → Keycloak token request | Exploitation + pivot |
| 5 | AD account disabled → continued Authelia auth attempts | Session hijack |
| 6 | Multiple Kerberos failures across hosts | Kerberoasting / pass-the-ticket |
| 7 | Authelia login from two geos <30 min | Impossible travel |
| 8 | Authelia session cookie used from different IP than issued to | Session theft |
| 9 | Bulk AD group modification (>5 in 5 min) | Mass privilege escalation |
| 10 | WAF block + successful auth from same session (5 min) | Exploitation followed by access |

### Prerequisite: ECS normalization

Every source must use identical field names for correlation to work:

| Current field | ECS target |
|---|---|
| `data.win.eventdata.ipAddress` | `source.ip` |
| `data.win.eventdata.targetUserName` | `user.name` |
| `data.win.system.eventID` | `event.code` |
| `rule.level` | `event.severity` |

Apply via Elasticsearch ingest pipeline or Filebeat processor chain.

### Effort: 2 days (rules) + 1 day (ECS) — after Zone 4 access

---

## 3. Kibana Dashboards 🟡

**Blocked on:** Zone 4 access

Seven dashboards, grouped by audience.

### For SOC analysts (real-time)

| # | Dashboard | Panels |
|---|---|---|
| 1 | **Identity Activity Timeline** | Per-user: logins, MFA, group changes, sessions |
| 2 | **Privilege Escalation Monitor** | AD `4732`/`4733` enriched with subsequent activity |
| 3 | **Session Lifecycle** | Active sessions, source IPs, MFA factor, age |
| 4 | **Response Actions Log** | Every automated action: time, trigger, target, outcome |

### For engineers (tuning)

| # | Dashboard | Panels |
|---|---|---|
| 5 | **Detection Rule Performance** | Fire rate, FP rate, MTTF, MTTRespond |
| 6 | **Federation Health** | LDAP latency, sync status, token rate |

### For management

| # | Dashboard | Panels |
|---|---|---|
| 7 | **Zero Trust Posture** | Auth failure trends, MFA adoption, revocation frequency |

### Effort: 2 days

---

## 4. Discord Alert Tuning 🟡

**Current state:** Raw JSON to a single channel.

**Target state:** Structured embeds, severity routing, one-click actions.

### Channel architecture

```
#soc-critical   → @here mention, immediate page
#soc-high       → notify channel, no mention
#soc-info       → silent, digest
#soc-actions    → automated response log (audit trail)
#soc-health     → federation health, ops
```

### Rich embeds with action buttons

```json
{
  "embeds": [{
    "title": "🔴 Privilege Escalation Detected",
    "fields": [
      {"name": "User", "value": "`anis.taibi`", "inline": true},
      {"name": "Source", "value": "`192.168.50.15`", "inline": true},
      {"name": "Action", "value": "Added to `GRP_IT_Admin`"},
      {"name": "Followed by", "value": "Keycloak admin access 42s later"}
    ],
    "footer": {"text": "Rule 1 · incident-20260927-0014"}
  }],
  "components": [{
    "type": 1,
    "components": [
      {"type": 2, "style": 4, "label": "Revoke Sessions",
       "custom_id": "revoke_anis_taibi"},
      {"type": 2, "style": 3, "label": "Acknowledge",
       "custom_id": "ack_20260927-0014"}
    ]
  }]
}
```

Buttons POST back to Shuffle — analyst revokes with one click.

### Deduplication + suppression

- Same rule + user + target within 10 min → edit existing message, increment counter
- Change windows (deployments, AD maintenance) → rules silenced automatically via calendar feed

### Effort: 1 day

---

## 5. Cortex + Shuffle Enrichment Pipeline 🟡

**Blocked on:** Zone 4 access

Add Cortex as an enrichment layer behind Shuffle.

### Architecture

```
Shuffle playbook
  ├──► Cortex analyzer: VirusTotal (file hashes)
  ├──► Cortex analyzer: AbuseIPDB (source IPs)
  ├──► Cortex analyzer: MISP (IOC matching)
  └──► Results → back to Shuffle → TheHive case + Discord notify
```

### Why Cortex

- Pre-built analyzers for 100+ threat intelligence sources
- No need to write each integration manually
- Responders can execute response actions (firewall block, endpoint isolate)
- Integrates with TheHive for case management

### Effort: 2 days

---

## 6. Auto-Triage & SOAR Feedback Loop 🟡

**Blocked on:** Zone 4 access

Automated alert triage with confidence scoring.

### Scoring model

| Signal | Weight |
|---|---|
| IOC match (MISP) | +40 |
| Outside baseline behavior | +25 |
| Recent group change | +20 |
| New IP for user | +10 |
| Change window active | −30 |

### Decision thresholds

| Score | Action |
|---|---|
| ≥60 | Auto-respond (Level 1–2) |
| 30–59 | Notify + queue for analyst |
| <30 | Log, close with note |

### Feedback loop

Every response action writes to `aegis-responses-*`. Future detections can
correlate:

```
sequence
  [ response where target.user == "X" ]    ← already responded
  [ auth where user.name == "X" and outcome == "success" ]  ← still acting
```

"If response ineffective" → escalate to human.

### Effort: 2 days

---

## 7. Elastic Workflows Evaluation 🟢

**Not blocked — can be evaluated now**

Elastic has released **Elastic Workflows** — native SOAR built into Elastic
Security. If mature enough, this could replace the separate Shuffle instance.

### Comparison

| Factor | Shuffle | Elastic Workflows |
|---|---|---|
| Maturity | Production-ready | Technical preview |
| Integration breadth | 2,000+ apps | Growing |
| Visual editor | Drag-and-drop | YAML-defined |
| Cost | Free, self-hosted | Included with Elastic Security |
| Container count | +1 | 0 (built-in) |

### Decision

Evaluate when:
- Elastic Workflows reaches GA
- Cortex / MISP / TheHive connectors are available natively

Until then, keep Shuffle. It works.

### Effort: 1 day (evaluation)

---

## 8. LDAPS on AD Bind 🟢

**Not blocked — can be done now**

Currently using `ldap://192.168.50.10:389` (cleartext on the isolated
`ext_net` bridge). Production hardening: switch to `ldaps://:636`.

### Steps

1. Install AD CS on DC01 (or use existing internal CA)
2. Issue a certificate for the DC with `CN=corp-dc01.aegis.corp`
3. Enable LDAPS on DC01 (port 636, verify with `ldp.exe`)
4. Update Authelia: `address: ldaps://192.168.50.10:636`
5. Update Keycloak: connection URL `ldaps://192.168.50.10:636`
6. Distribute the CA cert to Authelia and Keycloak truststores

### Effort: 1 day

---

## 9. Secret Rotation 🔴

**Deferred — user's decision**

All development secrets are exposed in `.env` and `*/secrets/`. Post-project
rotation.

### Rotation checklist

- `svc-keycloak` AD password
- Authelia bind password
- Keycloak admin bootstrap password
- Keycloak DB password
- Authelia DB password
- Redis password
- Session secrets (Authelia, JWT)
- OIDC client secrets
- Wazuh enrollment keys (if applicable)

### Pre-requisites

- Secrets stored in a vault (HashiCorp Vault, CyberArk, or Keycloak's SPI)
- No secrets in `docker-compose.yml`
- No secrets in git history (scrub if needed)

### Effort: 2 days

---

## 10. Permanent Keycloak Admin 🟢

**Not blocked — can be done now**

The temporary bootstrap admin banner is still active. Replace it.

### Steps

1. Create a permanent admin user (from AD or local)
2. Assign `realm-admin` role
3. Log in as the new admin
4. Delete the bootstrap admin
5. Update `KEYCLOAK_ADMIN` env (or remove bootstrap env vars)

### Effort: 10 minutes

---

## 11. Passwordless / WebAuthn for Admins 🟡

**Blocked on:** MFA enrollment infrastructure

Force WebAuthn (hardware key or platform authenticator) for `GRP_IT_Admin`.

### Rationale

TOTP is phishable. WebAuthn is not. Admins are the highest-value target.

### Authelia config

WebAuthn is supported as a second factor. Set it as mandatory for admin
routes via a dedicated access rule.

### Effort: 1 day

---

## 12. Session Revocation API for SOC 🟡

**Blocked on:** Zone 4 access

Expose a controlled API that Shuffle can call to revoke a user's session
without full admin credentials.

### Design

- Authelia: expose a limited-scope API key for session revocation
- Keycloak: service account with `manage-users` limited to session revoke
- Shuffle: credentials for both, scoped to the specific action

### Effort: 1 day

---

## 13. Guardicore / Microsegmentation Integration 🟡

**Blocked on:** Network infrastructure

If the SOC network supports microsegmentation (Guardicore, Illumio),
integrate with the identity model:

- Network policy derives from AD group membership
- `GRP_IT_Admin` gets access to management segments
- Revocation propagates at both the identity and network layers

### Effort: 3 days

---

## Summary table

| # | Feature | Status | Effort | Blocker |
|---|---|---|---|---|
| 1 | Identity-Aware Active Response | 🔴 | 3–4 d | Zone 4 |
| 2 | Cross-Source Correlation Rules | 🔴 | 3 d | Zone 4 + ECS |
| 3 | Kibana Dashboards | 🟡 | 2 d | Zone 4 |
| 4 | Discord Alert Tuning | 🟡 | 1 d | Zone 4 |
| 5 | Cortex Enrichment Pipeline | 🟡 | 2 d | Zone 4 |
| 6 | Auto-Triage + Feedback Loop | 🟡 | 2 d | Zone 4 |
| 7 | Elastic Workflows Evaluation | 🟢 | 1 d | — |
| 8 | LDAPS on AD Bind | 🟢 | 1 d | — |
| 9 | Secret Rotation | 🔴 | 2 d | Post-project |
| 10 | Permanent Keycloak Admin | 🟢 | 10 min | — |
| 11 | WebAuthn for Admins | 🟡 | 1 d | MFA infra |
| 12 | Session Revocation API | 🟡 | 1 d | Zone 4 |
| 13 | Microsegmentation Integration | 🟡 | 3 d | Network infra |

**Total effort when unblocked:** ~22 days
**Immediately actionable (🟢):** items 7, 8, 10 — ~2 days

---

*End of new features.*
