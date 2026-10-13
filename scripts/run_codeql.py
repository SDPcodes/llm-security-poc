"""Phase 3, Layer 1b — CodeQL SAST over one extracted app (generalised).

Uses the codeql-action BUNDLE (matched CLI + queries) to avoid the "Unknown kind"
error (EXECUTION_GUIDE Risk-4). Looks for codeql at $CODEQL, .tooling/codeql/codeql,
or on PATH; skips gracefully (ok=False, skipped=True) if absent so the batch never dies.

Builds a JS database, runs the security suite, parses CWEs from the SARIF rule tags
(external/cwe/cwe-089 -> CWE-89).
"""
from __future__ import annotations
import json, os, re, shutil, subprocess, sys
from pathlib import Path
from collections import Counter

try:
    from poc_config import STATIC, TOOLING
except Exception:
    STATIC = os.path.join(os.getcwd(), "static-analysis")
    TOOLING = os.path.join(os.getcwd(), ".tooling")


def _codeql_bin() -> str | None:
    for c in (os.environ.get("CODEQL"),
              str(Path(TOOLING) / "codeql" / "codeql"),
              shutil.which("codeql")):
        if c and Path(c).exists():
            return c
    return shutil.which("codeql")


def cwes_from_sarif(sarif: dict) -> Counter:
    cwes = Counter()
    for run in sarif.get("runs", []):
        rule_tags = {}
        for rule in run.get("tool", {}).get("driver", {}).get("rules", []):
            tags = rule.get("properties", {}).get("tags", []) or []
            rule_tags[rule.get("id")] = [t for t in tags if "cwe" in t.lower()]
        for res in run.get("results", []):
            rid = res.get("ruleId")
            for t in rule_tags.get(rid, []):
                m = re.search(r"cwe[-/](\d+)", t, re.I)
                if m:
                    cwes[f"CWE-{int(m.group(1))}"] += 1
    return cwes


def run_codeql(files_dir, sample_id="sample", timeout=900) -> dict:
    out = {"tool": "codeql", "ok": False, "cwes": [], "n_findings": 0}
    binp = _codeql_bin()
    if not binp:
        out["skipped"] = True; out["error"] = "codeql not found (run scripts/setup.sh)"; return out
    files_dir = Path(files_dir).resolve()
    db = Path(STATIC) / f"codeql-db-{sample_id}"
    sarif = Path(STATIC) / f"codeql_{sample_id}.sarif"
    os.makedirs(STATIC, exist_ok=True)

    def sh(cmd):
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)

    try:
        c = sh([binp, "database", "create", str(db), "--language=javascript",
                f"--source-root={files_dir}", "--overwrite", "--quiet"])
        if c.returncode != 0:
            out["error"] = f"db create failed: {c.stderr[-300:]}"; return out
        a = sh([binp, "database", "analyze", str(db), "codeql/javascript-queries",
                "--format=sarifv2.1.0", f"--output={sarif}", "--quiet", "--threads=0"])
        if not sarif.exists():
            out["error"] = f"analyze failed: {a.stderr[-300:]}"; return out
    except subprocess.TimeoutExpired:
        out["error"] = f"timeout after {timeout}s"; return out

    cwes = cwes_from_sarif(json.loads(sarif.read_text()))
    out.update(ok=True, cwes=sorted(cwes), n_findings=sum(cwes.values()))
    return out


if __name__ == "__main__":
    fd = sys.argv[1]
    sid = sys.argv[2] if len(sys.argv) > 2 else Path(fd).name.replace("_files", "")
    r = run_codeql(fd, sid)
    print(f"[codeql] {sid}: ok={r['ok']} cwes={r['cwes']} {r.get('error','')}")
