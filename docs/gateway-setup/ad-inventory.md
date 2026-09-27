# Active Directory Inventory

Reference snapshot of the AD side of the AEGIS deployment. Every value here
is consumed by Authelia, Keycloak, or both.

**Domain:** `aegis.corp`
**NetBIOS:** `AEGIS`
**DC:** `CORP-DC01` · `192.168.50.10`
**Functional level:** Windows Server 2016 (forest + domain)

---

## Organizational Units

```
DC=aegis,DC=corp
├── OU=Departments
│   ├── OU=Finance_Sales
│   ├── OU=IT_Dept
│   ├── OU=Web_Ops
│   └── OU=Workstations
├── OU=Security_Groups
└── OU=Domain Controllers
```

- **Users** live under `OU=Departments` (in the three sub-OUs)
- **Security groups** live flat under `OU=Security_Groups`
- Authelia and Keycloak both search `OU=Departments` recursively (Subtree
  scope) — no need to configure sub-OUs individually

---

## Security groups

| Group | DN | Purpose |
|---|---|---|
| `GRP_IT_Admin` | `CN=GRP_IT_Admin,OU=Security_Groups,DC=aegis,DC=corp` | Gateway admins |
| `GRP_Web_Ops` | `CN=GRP_Web_Ops,OU=Security_Groups,DC=aegis,DC=corp` | Web operators |
| `GRP_Finance` | `CN=GRP_Finance,OU=Security_Groups,DC=aegis,DC=corp` | Finance users |

> **Naming conventions matter.** These names are referenced in Authelia's
> `access_control` rules and appear verbatim in the OIDC `groups` claim.
> Renaming a group requires updating the corresponding Authelia rule.

### Membership

| Group | Members |
|---|---|
| `GRP_IT_Admin` | `anis.taibi`, `hani.abdelkader` |
| `GRP_Web_Ops` | `mezi.islam` |
| `GRP_Finance` | `salima` |

---

## Users

| Name | sAMAccountName | OU | Enabled | Groups |
|---|---|---|---|---|
| Anis Taibi | `anis.taibi` | `IT_Dept` | Yes | `GRP_IT_Admin` |
| Hani Abdelkader | `hani.abdelkader` | `IT_Dept` | Yes | `GRP_IT_Admin` |
| Mezi Islam | `mezi.islam` | `Web_Ops` | Yes | `GRP_Web_Ops` |
| Salima | `salima` | `Finance_Sales` | Yes | `GRP_Finance` |

### Required attributes for every user

| Attribute | Purpose |
|---|---|
| `sAMAccountName` | Login form value (what the user types) |
| `mail` | Authelia elevation emails during MFA enrollment |
| `displayName` | Human-readable name in Authelia's session |
| `userPrincipalName` | Set to `<username>@aegis.corp` for standards compliance |

### Required account state

- **"User must change password at next logon"**: **unchecked**
  - If checked, LDAP bind fails and Authelia reports `LDAP Result Code 49`
- **Account enabled**: checked
- **Password never expires** (for lab accounts only — production should enforce expiry)

---

## Service account

| Field | Value |
|---|---|
| sAMAccountName | `svc-keycloak` |
| DN | `CN=svc-keycloak,OU=Departments,DC=aegis,DC=corp` |
| Type | Regular user account |
| Rights | Read-only on `OU=Departments` and `OU=Security_Groups` subtrees |
| Password storage | `authelia/secrets/ldap_password` (mode 600) and in Keycloak's LDAP provider config |

The same account serves both Authelia and Keycloak for this lab. Production
should use separate accounts (`svc-authelia`, `svc-keycloak`) for independent
rotation and audit.

---

## Group Policy Objects

| GPO | Linked to | Purpose |
|---|---|---|
| Default Domain Policy | Domain root | Baseline domain policy |
| Default Domain Controllers Policy | `OU=Domain Controllers` | DC hardening |
| `AEGIS-Restricted-Workstations` | `OU=Departments` | Workstation restrictions |

GPOs are informational for the identity federation — Authelia and Keycloak do
not consume GPO settings. They are documented because they define the
endpoint-side policy that complements the gateway's access decisions.

---

## Verification commands

Run on DC01 (PowerShell as Domain Admin):

```powershell
# Full OU tree
Get-ADOrganizationalUnit -Filter * | Select Name, DistinguishedName

# Security groups and their members
Get-ADGroup -Filter 'Name -like "GRP_*"' -Properties Members |
  ForEach-Object {
    Write-Host "`n>> $($_.Name)"
    $_.Members | ForEach-Object { (Get-ADObject $_).Name }
  }

# Users with their group membership
Get-ADUser -Filter * -SearchBase "OU=Departments,DC=aegis,DC=corp" `
  -Properties mail, MemberOf |
  Select Name, sAMAccountName, mail,
    @{N='Groups';E={($_.MemberOf | ForEach-Object { (Get-ADGroup $_).Name }) -join ','}} |
  Format-Table -AutoSize

# Verify service account
Get-ADUser -Identity svc-keycloak -Properties DistinguishedName |
  Select Name, DistinguishedName
```

---

*End of AD inventory.*
