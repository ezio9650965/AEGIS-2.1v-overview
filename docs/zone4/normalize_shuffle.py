import json, re, ipaddress, ast
from datetime import datetime, timezone

PRIV_GROUPS = {"GRP_IT_Admin", "GRP_Web_Ops"}
PLAYBOOK = {"AEGIS - Privileged Group Add": "REVOKE"}   # everything else -> NOTIFY
MAX_AGE_MIN = 15

def g(a, *keys):
    for k in keys:
        v = a.get(k)                                   # flat dotted key
        if v in (None, "", []):
            v = a
            for p in k.split("."):                     # nested path
                v = v.get(p) if isinstance(v, dict) else None
        if v not in (None, "", []):
            return v[0] if isinstance(v, list) else v
    return ""

def valid_ip(x):
    try:
        ip = ipaddress.ip_address(str(x))
        return "" if (ip.is_loopback or ip.is_unspecified or ip.is_multicast) else str(ip)
    except ValueError:
        return ""

def normalize(raw):
    if isinstance(raw, str):
        try: raw = json.loads(raw)
        except ValueError: raw = ast.literal_eval(raw)   # Shuffle may inject a Python repr
    if "hits" not in raw and isinstance(raw.get("body"), (dict, str)):
        raw = raw["body"]                                # whole node result passed in
        if isinstance(raw, str):
            try: raw = json.loads(raw)
            except ValueError: raw = ast.literal_eval(raw)
    hits = raw["hits"]["hits"]
    out, now = [], datetime.now(timezone.utc)
    for h in hits:
        a = h["_source"]
        rule = g(a, "kibana.alert.rule.name")
        terms = (a.get("kibana.alert.threshold_result") or {}).get("terms") or []
        ip = valid_ip(g(a, "source.ip", "data.srcip", "data.win.eventdata.ipAddress",
                        "ClientHost.keyword", "remote_ip.keyword")
                      or (terms[0]["value"] if terms else ""))
        member = g(a, "data.win.eventdata.memberName")
        m = re.match(r"CN=([^,]+)", member or "")
        user = m.group(1) if m else g(a, "user.name", "data.srcuser")
        group = g(a, "data.win.eventdata.targetUserName") if member else ""
        ts = g(a, "@timestamp")
        try:
            age = (now - datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds() / 60
        except Exception:
            age = 9999
        sev = g(a, "kibana.alert.severity")
        action = PLAYBOOK.get(rule, "NOTIFY")
        if action == "REVOKE" and (group not in PRIV_GROUPS or not user or age > MAX_AGE_MIN):
            action = "NOTIFY"                           # guard rails
        out.append({
            "alert_id": h["_id"], "index": h["_index"], "rule": rule, "severity": sev,
            "risk": g(a, "kibana.alert.risk_score"),
            "host": g(a, "host.name", "agent.name"), "user": user, "group": group,
            "src_ip": ip, "event_code": g(a, "data.win.system.eventID"),
            "ts": ts, "age_min": round(age, 1),
            "d_host": g(a, "host.name", "agent.name") or "-", "d_user": user or "-",
            "d_group": group or "-", "d_ip": ip or "-",
            "enrich": bool(ip), "action": action,
            "notify": sev in ("medium", "high", "critical") or action != "NOTIFY",
        })
    for o in out:                                       # one JSON-safe line for Discord
        t = "\U0001F6A8 [%s] %s | host: %s | user: %s | ip: %s | action: %s" % (
            o["severity"] or "-", o["rule"], o["d_host"], o["d_user"], o["d_ip"], o["action"])
        o["text"] = re.sub(r'["\\\x00-\x1f]', " ", t)[:300]
    return out

raw = r'''$http_1.body'''
try:
    if not raw.strip() or raw.strip().startswith("$"):
        print(json.dumps({"error": "input not resolved", "raw": raw[:200]}))
    else:
        print(json.dumps(normalize(raw)))
except Exception as e:
    print(json.dumps({"error": str(e), "raw": raw[:200]}))
