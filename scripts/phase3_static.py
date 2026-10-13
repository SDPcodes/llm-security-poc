"""Phase 3 aggregator — run the three static layers over one sample and log results.

Runs Semgrep + CodeQL + LLM judge (each resilient/optional), merges their CWE sets, and
upserts one row into results/master_results.csv plus one row per (sample,CWE) into
results/evaluator_matrix.csv (EXECUTION_GUIDE §7.1/§7.2 schema). The evaluator matrix is
what Experiment 2 (Cohen's/Fleiss' kappa, §3.6.4) and the MI analysis (§3.6.5) read later.

CWE merge policy: static_cwe_set = semgrep ∪ codeql ∪ judge_reviewed (judge FPs excluded).
"""
from __future__ import annotations
import csv, glob, json, os
from pathlib import Path

from poc_config import RESULTS, GENERATED
from run_semgrep import run_semgrep
from run_codeql import run_codeql
from llm_judge import judge as run_judge

MASTER = os.path.join(RESULTS, "master_results.csv")
MATRIX = os.path.join(RESULTS, "evaluator_matrix.csv")

MASTER_COLS = ["sample_id", "task", "model", "strategy", "rep", "loc",
               "compiled", "runs", "functional_pass", "secure", "securepass",
               "semgrep_cwes", "codeql_cwes", "judge_cwes", "static_cwe_set",
               "static_count", "vuln_density_kloc", "cvss_list",
               "asr_pct", "attack_iterations", "confirmed_cwes", "confirmation_rate",
               "runtime_only_count", "attack_diversity_H", "zap_alert_count",
               "zap_risk_breakdown", "adaptive_improvement", "judge_fp_notes", "harness_caveats"]
MATRIX_COLS = ["sample_id", "cwe", "semgrep", "codeql", "llm_judge", "runtime_confirmed"]


def _loc(files_dir) -> int:
    n = 0
    for f in glob.glob(str(Path(files_dir) / "**" / "*"), recursive=True):
        if os.path.isfile(f) and "node_modules" not in f \
                and Path(f).suffix.lower() in (".js", ".jsx", ".ts", ".tsx"):
            try:
                n += sum(1 for _ in open(f, encoding="utf-8", errors="ignore"))
            except Exception:
                pass
    return n


def _upsert(path, cols, key_fields, rows):
    existing = {}
    if os.path.exists(path):
        with open(path, newline="") as f:
            for r in csv.DictReader(f):
                existing[tuple(r.get(k, "") for k in key_fields)] = r
    for r in rows:
        existing[tuple(str(r.get(k, "")) for k in key_fields)] = r
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in sorted(existing.values(), key=lambda x: tuple(str(x.get(k, "")) for k in key_fields)):
            w.writerow({c: r.get(c, "") for c in cols})


def static_for_sample(sample, files_dir, run_judge_layer=True, judge_model="gpt4o") -> dict:
    sid = sample["sample_id"]
    sem = run_semgrep(files_dir, sid)
    cq = run_codeql(files_dir, sid)
    jd = run_judge(files_dir, sid, judge_model) if run_judge_layer else {"ok": False, "skipped": True}

    sem_cwes = set(sem.get("cwes", []))
    cq_cwes = set(cq.get("cwes", []))
    jd_rev = set(jd.get("cwes_reviewed", []))
    static_set = sorted(sem_cwes | cq_cwes | jd_rev)
    loc = _loc(files_dir)
    density = round(len(static_set) / (loc / 1000), 2) if loc else 0

    fp_notes = ""
    jf = Path(os.path.join(RESULTS, "..", "static-analysis", f"judge_{sid}.json"))
    if jd.get("ok"):
        fp_notes = f"judge {jd.get('n',0)} raw / {jd.get('n_reviewed',0)} reviewed"

    row = {"sample_id": sid, "task": sample["task"], "model": sample["model_key"],
           "strategy": sample["strategy"], "rep": sample["rep"], "loc": loc,
           "semgrep_cwes": ";".join(sorted(sem_cwes)),
           "codeql_cwes": ";".join(sorted(cq_cwes)) if cq.get("ok") else ("SKIP" if cq.get("skipped") else "ERR"),
           "judge_cwes": ";".join(sorted(jd.get("cwes", []))) if jd.get("ok") else ("SKIP" if jd.get("skipped") else "ERR"),
           "static_cwe_set": ";".join(static_set), "static_count": len(static_set),
           "vuln_density_kloc": density, "judge_fp_notes": fp_notes}

    # evaluator matrix rows (one per CWE in the union of all three tools, FPs included for judge
    # so kappa is computed on raw tool outputs; reviewed set drives static_cwe_set above)
    jd_all = set(jd.get("cwes", []))
    matrix = [{"sample_id": sid, "cwe": c,
               "semgrep": int(c in sem_cwes), "codeql": int(c in cq_cwes),
               "llm_judge": int(c in jd_all), "runtime_confirmed": ""}
              for c in sorted(sem_cwes | cq_cwes | jd_all)]

    _upsert(MASTER, MASTER_COLS, ["sample_id"], [row])
    _upsert(MATRIX, MATRIX_COLS, ["sample_id", "cwe"], matrix)
    return {"semgrep": sem, "codeql": cq, "judge": jd, "row": row}


if __name__ == "__main__":
    import sys
    from poc_config import all_samples
    fd = sys.argv[1]
    sid = sys.argv[2] if len(sys.argv) > 2 else Path(fd).name.replace("_files", "")
    sample = next((s for s in all_samples() if s["sample_id"] == sid),
                  {"sample_id": sid, "task": "?", "model_key": "?", "strategy": "?", "rep": "?"})
    rj = os.environ.get("RUN_JUDGE", "1") == "1"
    res = static_for_sample(sample, fd, run_judge_layer=rj)
    print(f"[phase3] {sid}: static={res['row']['static_cwe_set']} "
          f"density={res['row']['vuln_density_kloc']}/kloc")
