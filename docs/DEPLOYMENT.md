# Deploying AEGIS Zone 3 in Your Enterprise

## The Scenario

You're a network engineer at a mid-size company. Leadership signed off on
zero-trust access after a phishing incident last quarter. You have:
- An existing internal network with real services (an ERP, an internal
  wiki, a couple of admin panels people SSH/RDP into)
- A directory of employees somewhere (AD, or nothing formal yet)
- A relationship with an external MSSP who will run detection and response
  for you — you are not building your own SOC, you're plugging into
  someone else's

Your job: make every one of those internal services require identity
verification before access, regardless of whether the request comes from
inside the building or from someone's home VPN — and get visibility of
what happens at this gateway to the MSSP's SOC in near-real-time.

## Step 1 — Placement, before any config

Before touching Docker, decide *where* this gateway physically/logically
sits. The mistake engineers make here: bolting it onto an existing box that
also does other things. Don't. This machine terminates TLS for your whole
org and holds the only copy of session state that matters — give it a
dedicated host, even if it's a modest VM.

Two network legs, minimum:
- One leg reachable by whoever needs to get to these services (could be
  your LAN, could be a public IP behind your firewall — depends on whether
  this replaces a VPN or sits behind one)
- One leg reaching the actual backend services it's protecting

If you're retrofitting this onto services that already have DNS records
pointing directly at them, budget time for the DNS cutover — that's often
the part that actually causes an outage, not the gateway itself.

## Step 2 — Get the identity layer right before anything else

This is the part people rush and regret. Before deploying Traefik, decide:

- **Where does truth about "who works here" live?** If you already have
  AD or an LDAP directory, Keycloak should federate to it, not duplicate
  it — a second copy of your user list is a second thing to keep in sync
  and a second place credentials can go stale.
- **What's your MFA story for people who lose their phone?** Decide this
  now. "Call IT" is a valid answer, but decide it before your first locked-
  out user, not during.
- **Who's in the break-glass account list?** One or two accounts, real
  passwords stored somewhere offline (not in the same Keycloak realm they
  protect), for the day Keycloak itself won't start.

Only once these are actual decisions — not defaults — do you write the
`docker-compose.yml`. Copying a working compose file with placeholder
identity assumptions baked in is how you end up doing a second migration
in six months.

## Step 3 — Stand up the stack

Follow `docs/SETUP.md` in this repo for the concrete steps (env file,
key generation, DNS, first login). The one enterprise-specific addition:
**use a real CA-signed certificate, not the self-signed one from that
guide.** Employees hitting a "your connection is not private" warning
every day either train themselves to click through security warnings
(bad for every other warning they'll ever see) or stop using the gateway
entirely and route around it. Neither is acceptable. Get a cert from your
existing CA or Let's Encrypt before this goes anywhere near real users.

## Step 4 — Migrate services one at a time, not all at once

Pick your lowest-stakes internal tool first — not your ERP, not anything
finance touches. Put it behind the gateway, and *leave the old direct
path reachable in parallel* for a week. Watch:
- Does forward-auth add noticeable latency? (It shouldn't — a few ms —
  but verify, don't assume.)
- Do any of your users have a workflow that breaks under session
  expiration (`expiration: 3600` by default) — API integrations, service
  accounts, anything non-interactive that can't complete an MFA challenge?

Only after this one service works cleanly for real users do you migrate
the next one. The temptation to do a big-bang cutover on a Friday night is
strong; resist it. A zero-trust gateway that breaks everyone's access at
once teaches the whole company that "zero trust" means "can't do my job,"
which is a reputational hole you don't recover from quickly.

## Step 5 — Connect to the remote SOC

This is the step most guides skip, and where "identity gateway" and
"security operations" actually meet.

Your MSSP needs **telemetry from this gateway**, not just a network path
to it. In this architecture, that's Traefik's access log
(`traefik_logs/access.log`, JSON format) plus Authelia's own log — both
already configured to log to disk in this repo's compose file. The
question is how that log data gets to their SIEM:

- **Simplest**: a log-shipper (Filebeat, or the SOC's preferred agent)
  reads the mounted log volume and forwards it out. Low integration
  effort, but it's shipping raw access logs — the SOC gets "who hit what,
  when," not deep host telemetry.
- **Richer, but more work**: the SOC wants actual host-level visibility
  into this machine — process activity, file integrity, not just what
  Traefik logged. That requires an agent running *on the gateway host
  itself*, reporting to their manager, same as any other monitored
  endpoint in your fleet.

**Whichever you choose, get this agreed with the SOC in writing before
deployment, not after: what exactly do they expect to receive, at what
volume, over what path (VPN tunnel? Direct reachability like the
`1514`/`1515` TCP passthrough already wired into this repo's Traefik
config for exactly this purpose?), and what do they do with it.** A gateway
sending logs nobody's watching is security theater, not security.

## The Gap in This Journey — Deliberately Flagged, Not Fixed Here

**This walkthrough has not covered installing a Wazuh agent on the
gateway host itself.** That's a real, separate task: the gateway is a
Docker host running security-critical services, and right now nothing is
watching *it* — only the traffic passing through Traefik gets logged. If
the host itself were compromised (a container escape, a vulnerable Docker
daemon, a compromised base image), there's currently no host-level
detection catching that, only the OWASP CRS Coraza layer inspecting
inbound HTTP.

Closing that gap means: install the Wazuh agent on the Ubuntu host
(outside any container, directly on the OS), enroll it against your SOC's
Wazuh manager using the same `1514`/`1515` TCP passthrough already
configured in `traefik-dynamic.yml` for exactly this kind of cross-zone
agent traffic, and add detection rules specific to what a compromised
gateway host would look like (unexpected outbound connections from the
Docker host itself, unauthorized changes to the compose file or configs,
unexpected new containers).

This is called out explicitly, not fixed in this guide, because bolting
it on as an afterthought risks the same "backfilled it and it doesn't
actually work" pattern this project has already caught and corrected once
(the reportData.ts status drift documented earlier in this repo's
history). It deserves its own deployment step, tested and verified the
same way everything else in Zone 3 was — not assumed complete because a
paragraph describes it.
