# AD Federation — Authelia & Keycloak

How Active Directory becomes the single source of truth for the AEGIS gateway.

Companion to [`configuration.md`](./configuration.md) § 13–20.

---

## The model

```
                  ┌────────────────────────────────┐
                  │  Active Directory (aegis.corp) │
                  │  SINGLE SOURCE OF TRUTH        │
                  │  Users · Groups · GPOs         │
                  └──────────────┬─────────────────┘
                                 │
                     LDAP read-only (svc-keycloak)
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
    ┌───────────────────┐                 ┌───────────────────┐
    │     Authelia      │                 │     Keycloak      │
    │  Forward-auth     │                 │  OIDC provider    │
    │                   │                 │                   │
    │  Live lookup on   │                 │  Cached sync +    │
    │  every auth       │                 │  `groups` claim   │
    └───────────────────┘                 └───────────────────┘
```

| Property | Authelia | Keycloak |
|---|---|---|
| Sync model | Live — every authentication queries AD | Cached — periodic sync every 5 min (changed) / 24 h (full) |
| Group delivery | Internal ACL engine, evaluated per request | OIDC `groups` claim in tokens |
| Revocation latency | Instant (next request) | Up to 5 min for group changes |
| Use case | Gateway ingress enforcement | Application-level SSO |

---

## Authelia LDAP configuration

See [`configuration.md`](./configuration.md) § 15 for the full block plus
rationale for each field. The three non-obvious settings:

1. **Disabled-account filter** — `(!(userAccountControl:...:=2))` — excludes
   disabled AD accounts at the filter level. Revocation propagates instantly.
2. **`_FILE` env var for bind password** — never inline in YAML.
3. **Quoted OU values** — `additional_users_dn: 'OU=Departments'`.

**Verified behavior** (reference deployment):

| Test | Result |
|---|---|
| Bind as `svc-keycloak` | ✅ |
| LDAP Discovery shows `Vendor Name: Microsoft Corporation` | ✅ |
| Login as `salima`, `anis.taibi`, `mezi.islam` | ✅ |
| Group membership resolved per user | ✅ |
| Revocation on AD disable | ✅ (filter-level) |

---

## Keycloak User Federation

See [`configuration.md`](./configuration.md) § 16 for the full console
walkthrough.

**Summary:**

| Setting | Value |
|---|---|
| Vendor | Active Directory |
| Connection URL | `ldap://192.168.50.10:389` |
| Bind DN | `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp` |
| Edit mode | READ_ONLY |
| Users DN | `OU=Departments,DC=aegis,DC=corp` |
| Username attribute | `sAMAccountName` |
| UUID attribute | `objectGUID` |
| Group mapper | `group-ldap-mapper` on `OU=Security_Groups` |
| Sync (changed users) | Every 300 s |
| Sync (full) | Every 86400 s |

**Verified behavior:**

| Test | Result |
|---|---|
| Test connection | ✅ Success |
| Test authentication | ✅ Success |
| Users synced | ✅ |
| Groups synced | ✅ |
| Group membership matches AD | ✅ |

---

## OIDC `groups` claim

Keycloak's built-in `groups` client scope exists only in the `master` realm.
For any custom realm, create one and attach it to clients.

**Why the groups-claim approach (vs realm roles):**

| Approach | Mechanism | Trade-off |
|---|---|---|
| **Realm role mapping** | LDAP role mapper auto-assigns roles from group membership | Roles are stable abstractions, but Keycloak v22+ UI doesn't reliably render the mapping tab |
| **`groups` claim** ✅ chosen | AD group DNs delivered directly in the token | Applications check group membership directly; rename requires app-side awareness |

The groups-claim pattern is used by default in GitHub, Google, and Azure AD
enterprise federation. Downstream code:

```python
if "/GRP_IT_Admin" in token["groups"]:
    allow()
```

**Setup steps** — [`configuration.md`](./configuration.md) § 17.

**Verified token output:**

```json
{
  "groups": ["/GRP_Finance"],
  "preferred_username": "salima"
}
```

| User | Expected `groups` |
|---|---|
| `salima` | `["/GRP_Finance"]` |
| `anis.taibi` | `["/GRP_IT_Admin"]` |
| `mezi.islam` | `["/GRP_Web_Ops"]` |

---

## Verified end-to-end — new AD user

Reference deployment test, executed on 2026-09-27:

| Step | Action | Duration |
|---|---|---|
| 1 | Create user in `OU=IT_Dept` via ADUC | 30 s |
| 2 | Add to `GRP_IT_Admin` via **Add to a group...** | 10 s |
| 3 | Keycloak **Action → Sync all users** | 5 s |
| 4 | Request OIDC token → `groups: ["/GRP_IT_Admin"]` | instant |
| 5 | Authelia login → elevation email → TOTP enroll | 1 min |

**Result:** A user created in AD was authenticating to the gateway with the
correct admin group in under 3 minutes — with **no edits** to Authelia,
Traefik, or Keycloak configuration.

This is the Zero Trust property being demonstrated.

---

## Troubleshooting

See [`configuration.md`](./configuration.md) § 20 for the federation-specific
troubleshooting table.

---

*End of AD federation reference.*
