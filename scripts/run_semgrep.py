"""Phase 3, Layer 1a — Semgrep SAST over one extracted app.

Uses a local rules clone (SEMGREP_RULES or .tooling/semgrep-rules) because the
semgrep.dev registry is blocked in Codespaces (EXECUTION_GUIDE Risk-5). Metrics and
version check are disabled so no outbound call stalls the scan.
"""
from __future__ import annotations
import json, os, re, subprocess, sys
from pathlib import Path
from collections import Counter

try:
    from poc_config import STATIC, TOOLING
except Exception:
    STATIC = os.path.join(os.getcwd(), "static-analysis")
    TOOLING = os.path.join(os.getcwd(), ".tooling")


def _rules() -> str:
    env = os.environ.get("SEMGREP_RULES")
    if env and Path(env).exists():
        return env
    local = Path(TOOLING) / "semgrep-rules" / "javascript"
    if local.exists():
        return str(local)
    return "p/javascript"          # registry fallback (needs network)


def run_semgrep(files_dir, sample_id="sample", timeout=300) -> dict:
    files_dir = Path(files_dir)
    out = {"tool": "semgrep", "ok": False, "n_findings": 0,
           "cwes": [], "by_severity": {}, "rule_ids": {}}
    settings = "/tmp/semgrep_settings.yml"
    cmd = ["semgrep", "scan", "--config", _rules(), "--json", "--quiet",
           "--metrics", "off", "--disable-version-check", "--no-git-ignore",
           "--exclude", "node_modules", "."]
    env = {**os.environ, "SEMGREP_SETTINGS_FILE": settings, "PYTHONWARNINGS": "ignore"}
    try:
        p = subprocess.run(cmd, cwd=str(files_dir), capture_output=True, text=True,
                           timeout=timeout, env=env)
    except subprocess.TimeoutExpired:
        out["error"] = f"timeout after {timeout}s"; return out
    except FileNotFoundError:
        out["error"] = "semgrep not installed"; return out
    try:
        data = json.loads(p.stdout)
    except json.JSONDecodeError:
        out["error"] = f"semgrep rc={p.returncode}: {p.stderr[-300:]}"; return out

    results = data.get("results", [])
    cwes, sev, rules = Counter(), Counter(), Counter()
    for r in results:
        meta = r.get("extra", {}).get("metadata", {})
        for c in (meta.get("cwe") or []):
            cwes[re.split(r"[:\s]", c.strip())[0]] += 1          # "CWE-89"
        sev[r.get("extra", {}).get("severity", "INFO")] += 1
        rules[r["check_id"].split(".")[-1]] += 1

    os.makedirs(STATIC, exist_ok=True)
    Path(STATIC, f"semgrep_{sample_id}.json").write_text(json.dumps(data, indent=2))
    out.update(ok=True, n_findings=len(results), cwes=sorted(cwes),
               by_severity=dict(sev), rule_ids=dict(rules.most_common(15)))
    return out


if __name__ == "__main__":
    fd = sys.argv[1]
    sid = sys.argv[2] if len(sys.argv) > 2 else Path(fd).name.replace("_files", "")
    r = run_semgrep(fd, sid)
    print(f"[semgrep] {sid}: ok={r['ok']} findings={r['n_findings']} "
          f"cwes={r['cwes']} {r.get('error','')}")
