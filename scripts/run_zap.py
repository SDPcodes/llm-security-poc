"""Phase 5 — OWASP ZAP DAST, sample-parameterised (generalised from the rep3 script).

Seeds the JSON API endpoints from contract.json (the app has no crawlable pages, Risk-8),
spiders, runs the active scan, and saves red-teaming/zap_<sample>.json. Use --baseline to
poll only passive alerts (fast) for the bulk, reserving active scans for a subset (§8.2).
"""
from __future__ import annotations
import argparse, json, os, time
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None


def run_zap(files_dir, sample_id, zap="http://localhost:8080", target=None,
            baseline=False, poll_timeout=1800) -> dict:
    if requests is None:
        return {"ok": False, "error": "requests not installed"}
    c = json.loads(Path(files_dir, "contract.json").read_text())
    target = target or f"http://localhost:{c.get('port', 5000)}"
    api = c.get("api_base", "")
    os.makedirs("red-teaming", exist_ok=True)

    for ep in ("register", "login", "profile"):
        try:
            requests.get(f"{zap}/JSON/core/action/accessUrl/",
                         params={"url": f"{target}{api}{c[ep]['path']}"}, timeout=30)
        except Exception:
            pass

    def scan(kind, start_params):
        r = requests.get(f"{zap}/JSON/{kind}/action/scan/", params=start_params, timeout=30).json()
        if "scan" not in r:
            return r
        sid = r["scan"]; t0 = time.time()
        while time.time() - t0 < poll_timeout:
            st = requests.get(f"{zap}/JSON/{kind}/view/status/", params={"scanId": sid}, timeout=30).json()
            if int(st.get("status", 0)) >= 100:
                break
            time.sleep(5)
        return {"ok": True}

    try:
        scan("spider", {"url": target})
        if not baseline:
            scan("ascan", {"url": target, "recurse": True})
        alerts = requests.get(f"{zap}/JSON/core/view/alerts/",
                              params={"baseurl": target}, timeout=60).json().get("alerts", [])
    except Exception as e:
        return {"ok": False, "error": f"zap error: {e}"}

    risk = {}
    for a in alerts:
        risk[a.get("risk", "?")] = risk.get(a.get("risk", "?"), 0) + 1
    out = {"ok": True, "sample_id": sample_id, "zap_alert_count": len(alerts),
           "zap_risk_breakdown": risk, "alerts": alerts}
    Path("red-teaming", f"zap_{sample_id}.json").write_text(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("files_dir"); ap.add_argument("--sample-id", default=None)
    ap.add_argument("--zap", default="http://localhost:8080"); ap.add_argument("--target", default=None)
    ap.add_argument("--baseline", action="store_true")
    a = ap.parse_args()
    sid = a.sample_id or Path(a.files_dir).name.replace("_files", "")
    r = run_zap(a.files_dir, sid, a.zap, a.target, a.baseline)
    print(f"[zap] {sid}: ok={r.get('ok')} alerts={r.get('zap_alert_count')} {r.get('error','')}")
