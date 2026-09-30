# AEGIS SOC — Discord Server Structure

**Status:** Design approved (2026-09-30). Ready for implementation.

**Related Documents:**
- `soar-design.md` — SOAR pipeline architecture (severity routing uses these channels).
- `NEW-FEATURES.md` — Future enhancements (cross-source correlation, etc.).

This document defines the Discord server layout for the AEGIS SOC team, including channel purposes, severity routing, and webhook configuration for the Shuffle SOAR pipeline.

## 1. Design Principles

- **Severity-Based Routing**: Each alert severity has a dedicated channel to prevent critical alerts from being buried in noise.
- **Signal, Not Noise**: Low-severity alerts are logged separately and do not trigger mentions.
- **Operational Clarity**: Dedicated channels for incident command, threat intel, and automation logs keep coordination separate from alerting.
- **Read-Only Information**: Guidelines and announcements are in read-only channels for easy reference.

## 2. Channel Structure

```text
AEGIS | SOC
├── 📢 INFORMATION
│   ├── #announcements          (Read-only, important updates)
│   ├── #soc-guidelines         (Read-only, response protocols)
│   └── #useful-resources       (Read-only, links to dashboards, docs)
│
├── 🚨 CRITICAL ALERTS
│   └── #alerts-critical        (Critical severity only. @here or @role mention)
│
├── ⚠️ HIGH ALERTS
│   └── #alerts-high            (High severity)
│
├── 🟡 MEDIUM ALERTS
│   └── #alerts-medium          (Medium severity)
│
├── 🔵 LOW / INFORMATIONAL
│   └── #alerts-low             (Low severity, informational)
│
├── 🛠️ SOC OPERATIONS
│   ├── #incident-command       (Active incident coordination)
│   ├── #threat-intel           (IOC sharing, MISP updates)
│   └── #automation-logs        (Shuffle/SOAR execution logs)
│
└── 💬 GENERAL
    ├── #general-chat           (Team discussions)
    └── #voice-ops              (Voice channel for coordination)
3. Channel Purposes
Channel	Purpose	Who Can Post
#announcements	Important SOC updates, policy changes.	Admins only
#soc-guidelines	Response protocols, escalation paths.	Admins only
#useful-resources	Links to Kibana, MISP, Shuffle, dashboards.	Admins only
#alerts-critical	Critical severity alerts. Notify @SOC-OnCall.	Shuffle webhook, Analysts
#alerts-high	High severity alerts.	Shuffle webhook, Analysts
#alerts-medium	Medium severity alerts.	Shuffle webhook, Analysts
#alerts-low	Low severity / informational. No mentions.	Shuffle webhook, Analysts
#incident-command	Coordination during active incidents.	All SOC members
#threat-intel	IOC sharing, MISP updates, external intel.	All SOC members
#automation-logs	Shuffle execution logs, audit trail summaries.	Shuffle webhook, Admins
#general-chat	Non-urgent team discussions.	All members
#voice-ops	Voice channel for real-time coordination.	All members
4. Severity Routing (SOAR → Discord)
The Shuffle "Discord" node must select the correct webhook URL based on the severity field produced by Normalize.

SOAR severity	Discord Channel	Webhook Variable
critical	#alerts-critical	DISCORD_WEBHOOK_CRITICAL
high	#alerts-high	DISCORD_WEBHOOK_HIGH
medium	#alerts-medium	DISCORD_WEBHOOK_MEDIUM
low	#alerts-low	DISCORD_WEBHOOK_LOW
Implementation Note: In Shuffle, you can use a single HTTP node with a conditional payload, or multiple HTTP nodes with edge conditions. For simplicity, start with a single node that uses a severity → URL mapping in the body. Example:

json
{
  "content": "$normalize.message.#.text",
  "username": "AEGIS SOAR"
}
And set the URL dynamically using a Shuffle expression like:
$get_webhook_url($normalize.message.#.severity)
(Shuffle supports custom functions via the "Execute Python" node if needed.)

5. Webhook Configuration
Base Webhook URL (for #alerts-high as an example):

text
https://discord.com/api/webhooks/1552700616932073485/yJfY1hp15qXHjlU2AujAuCZw0rgCI-3pZCBn_p4ohWdhj7wVUeCIihbEZZlbWIfDgSg-
Security Warning:

This webhook URL is a secret. Anyone with it can post to your Discord channel.

Do not commit this file to a public repository without redacting the URL.

In production, store the webhook URL as a Shuffle secret ($DISCORD_WEBHOOK_HIGH) and reference it in the node.

If this URL is ever exposed, rotate it immediately in Discord (Channel Settings → Integrations → Webhooks).

Recommended practice: Create one webhook per channel, each with a descriptive name (e.g., AEGIS-SOAR-Critical). Store all webhooks in a .env file that is gitignored, or in Shuffle's secret manager.

6. Permissions & Roles
Role	Permissions
SOC-Admin	Manage channels, roles, webhooks.
SOC-OnCall	Mentioned for critical alerts, can post in all alert channels.
SOC-Analyst	Read/write in alert channels, incident command, threat intel.
SOC-Viewer	Read-only access to all channels.
SOAR-Bot	Custom bot for webhook posts (optional).
Critical Mention: In #alerts-critical, use @SOC-OnCall (not @everyone) to notify the on-call engineer without disturbing the whole team.

7. Implementation Steps
Create Categories & Channels in Discord as per the structure above.

Create Webhooks for each alert channel (#alerts-critical, #alerts-high, #alerts-medium, #alerts-low). Copy the webhook URLs.

Store Webhooks Securely:

For Shuffle: Add them as secrets in the Shuffle UI (Settings → Secrets).

For local testing: Create a .env file (gitignored) with variables like DISCORD_WEBHOOK_HIGH=....

Update Shuffle Workflow:

Modify the Discord node to route based on severity.

Use a Python node or Shuffle's built-in conditionals to select the correct webhook URL.

Test with a sample alert for each severity.

Verify:

Send a test alert to each channel and confirm it appears in the correct channel.

Check that #alerts-critical triggers the @SOC-OnCall mention (if configured via webhook payload).

8. Security Notes
Rotate Webhooks: If a webhook URL is accidentally exposed, rotate it immediately in Discord and update the secret in Shuffle.

Least Privilege: Webhooks only need Send Messages permission. Do not grant Manage Webhooks to the bot.

Audit Logs: Enable Discord's audit log to track webhook changes and message deletions.

No PII: Alert messages may contain usernames or IPs. Ensure the Discord server is private and access is restricted to SOC personnel.

9. Change Log
Date	Change
2026-09-30	Initial design: channel structure, severity routing, webhook configuration.
