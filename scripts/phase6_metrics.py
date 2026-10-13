"""Phase 6 — merge runtime results into the master CSV and fill the evaluator matrix.

Reads red-teaming/attacks_<sample>.json (+ zap_<sample>.json if present) and the sample's
static_cwe_set from master_results.csv, then computes the proposal's runtime metrics:
  ASR, Confirmation Rate (§3.6.6), runtime-only count, Attack Diversity Index H (Eq. 3.5),
  secure / SecurePass (§3.6.2). Updates the master row in place and sets runtime_confirmed=1
  for confirmed CWEs in evaluator_matrix.csv.
"""
from __future__ import annotations
import csv, json, math, os, sys
from pathlib import Path
from poc_config import RESULTS

MASTER = os.path.join(RESULTS, "master_results.csv")
MATRIX = os.path.join(RESULTS, "evaluator_matrix.csv")


def _entropy(cwes) -> float:
    if not cwes:
        return 0.0
    p = 1 / len(cwes)                      # uniform over distinct confirmed CWE types
    return round(-sum(p * math.log2(p) for _ in cwes), 3)


def _update_csv(path, key_fields, updates_by_key, extra_cols=()):
    rows, cols = [], []
    if os.path.exists(path):
        with open(path, newline="") as f:
            rd = csv.DictReader(f); cols = list(rd.fieldnames or []); rows = list(rd)
    for c in extra_cols:
        if c not in cols:
            cols.append(c)
    for r in rows:
        k = tuple(r.get(x, "") for x in key_fields)
        if k in updates_by_key:
            r.update(updates_by_key[k])
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})


def merge_sample(sample_id) -> dict:
    atk_p = Path("red-teaming", f"attacks_{sample_id}.json")
    if not atk_p.exists():
        return {"ok": False, "error": "no attacks_<sample>.json (run attacks.py first)"}
    atk = json.loads(atk_p.read_text())
    confirmed = set(atk.get("confirmed_cwes", []))
    asr = atk.get("asr_pct", 0.0)

    # static set from master row
    static = set()
    functional_pass = ""
    if os.path.exists(MASTER):
        with open(MASTER, newline="") as f:
            for r in csv.DictReader(f):
                if r["sample_id"] == sample_id:
                    static = {c for c in r.get("static_cwe_set", "").split(";") if c}
                    functional_pass = r.get("functional_pass", "")
                    break
    conf = static & confirmed
    runtime_only = confirmed - static
    conf_rate = round(len(conf) / len(static) * 100, 1) if static else 0.0

    zap_p = Path("red-teaming", f"zap_{sample_id}.json")
    zap = json.loads(zap_p.read_text()) if zap_p.exists() else {}

    secure = 1 if asr == 0 else 0
    securepass = ""
    if functional_pass not in ("", None):
        securepass = 1 if (str(functional_pass) in ("1", "True", "true") and secure) else 0

    row_update = {
        "asr_pct": asr, "attack_iterations": atk.get("attack_iterations", 5),
        "confirmed_cwes": ";".join(sorted(confirmed)),
        "confirmation_rate": f"{conf_rate}%", "runtime_only_count": len(runtime_only),
        "attack_diversity_H": _entropy(confirmed),
        "zap_alert_count": zap.get("zap_alert_count", ""),
        "zap_risk_breakdown": json.dumps(zap.get("zap_risk_breakdown", {})) if zap else "",
        "adaptive_improvement": atk.get("adaptive_changes", 0),
        "secure": secure, "securepass": securepass,
    }
    _update_csv(MASTER, ["sample_id"], {(sample_id,): row_update})

    # evaluator matrix: set runtime_confirmed=1 for confirmed CWEs (add rows for runtime-only)
    existing = []
    if os.path.exists(MATRIX):
        with open(MATRIX, newline="") as f:
            existing = list(csv.DictReader(f))
    seen = {(r["sample_id"], r["cwe"]) for r in existing}
    for cwe in confirmed:
        if (sample_id, cwe) in seen:
            for r in existing:
                if r["sample_id"] == sample_id and r["cwe"] == cwe:
                    r["runtime_confirmed"] = "1"
        else:
            existing.append({"sample_id": sample_id, "cwe": cwe, "semgrep": "0",
                             "codeql": "0", "llm_judge": "0", "runtime_confirmed": "1"})
    if existing:
        with open(MATRIX, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["sample_id", "cwe", "semgrep", "codeql",
                                              "llm_judge", "runtime_confirmed"])
            w.writeheader(); w.writerows(existing)

    return {"ok": True, "asr_pct": asr, "confirmation_rate": conf_rate,
            "confirmed": sorted(confirmed), "runtime_only": sorted(runtime_only)}


if __name__ == "__main__":
    sid = sys.argv[1]
    r = merge_sample(sid)
    print(f"[phase6] {sid}: ASR={r.get('asr_pct')}% confirmation_rate={r.get('confirmation_rate')}% "
          f"confirmed={r.get('confirmed')} {r.get('error','')}")
