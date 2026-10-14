"""End-to-end batch driver for the cheap, parallel phases (1-3) across the matrix.

  python3 scripts/run_all.py --stages generate,extract,scaffold,static     # all 90
  python3 scripts/run_all.py --stages extract,scaffold,static --no-judge    # offline (no API)
  python3 scripts/run_all.py --tasks a07 --models gpt4o --only ...          # a slice

Resumable: per-sample stage state in results/_pipeline_state.json; completed stages are
skipped unless --force. Phases 4-6 (deploy + ZAP + attacks) are slow/serial and run per
sample via run_sample.sh using each app's contract.json.
"""
from __future__ import annotations
import argparse, json, os, traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from poc_config import GENERATED, RESULTS, all_samples

STATE = os.path.join(RESULTS, "_pipeline_state.json")
MASTER = os.path.join(RESULTS, "master_results.csv")
STAGES = ["generate", "extract", "scaffold", "static"]


def _load_state():
    try:
        return json.loads(Path(STATE).read_text())
    except Exception:
        return {}


def _save_state(st):
    os.makedirs(RESULTS, exist_ok=True)
    tmp = STATE + ".tmp"
    Path(tmp).write_text(json.dumps(st, indent=2))
    os.replace(tmp, STATE)                     # atomic: a killed run never truncates the state


def _master_ids():
    """sample_ids already written to master_results.csv (durable proof 'static' ran)."""
    ids = set()
    try:
        import csv
        with open(MASTER, newline="") as f:
            for row in csv.DictReader(f):
                ids.add(row["sample_id"])
    except Exception:
        pass
    return ids


def _artifact_done(stage, sample, master_ids) -> bool:
    """Resume from what's actually on disk, so a lost _pipeline_state.json never forces
    a from-scratch redo of the expensive work."""
    sid = sample["sample_id"]
    md = Path(GENERATED, sid + ".md")
    files = Path(GENERATED, sid + "_files")
    if stage == "generate":
        return md.exists() and md.stat().st_size > 0
    if stage == "extract":
        return files.is_dir() and any(p.is_file() for p in files.rglob("*"))
    if stage == "scaffold":
        return (files / "contract.json").exists() and (files / "scaffold_report.json").exists()
    if stage == "static":
        return sid in master_ids
    return False


def run_sample(sample, stages, force, no_judge, judge_model, state, master_ids):
    sid = sample["sample_id"]
    done = state.setdefault(sid, {})
    md = Path(GENERATED, sid + ".md")
    files = Path(GENERATED, sid + "_files")
    ran = 0
    for stage in STAGES:
        if stage not in stages:
            continue
        if not force and (done.get(stage) == "ok" or _artifact_done(stage, sample, master_ids)):
            done[stage] = "ok"                 # reconcile state with disk after a lost state file
            continue
        ran += 1
        try:
            if stage == "generate":
                from generate_code import generate_one
                generate_one(sample, force)
            elif stage == "extract":
                from lib_extract import extract_to_dir
                if not md.exists():
                    raise FileNotFoundError("no .md (run generate)")
                rep = extract_to_dir(md.read_text(encoding="utf-8"), files)
                if rep["n_files"] == 0:
                    raise RuntimeError(
                        f"0 files parsed from {sid}.md (model output was not a valid "
                        f"manifest/code). Inspect generated-code/{sid}.md; re-generate with "
                        f"--only {sid} --force if it looks empty/refused.")
            elif stage == "scaffold":
                from lib_scaffold import doctor
                doctor(files, title=sample.get("title", sid), task=sample["task"])
            elif stage == "static":
                from phase3_static import static_for_sample
                static_for_sample(sample, files, run_judge_layer=not no_judge,
                                  judge_model=judge_model)
            done[stage] = "ok"
        except Exception as e:
            done[stage] = f"ERR: {e}"
            return sid, stage, traceback.format_exc()[-400:], ran
    return sid, None, None, ran


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--stages", default=",".join(STAGES))
    ap.add_argument("--tasks"); ap.add_argument("--models")
    ap.add_argument("--strategies"); ap.add_argument("--only")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--no-judge", action="store_true", help="skip the LLM judge layer")
    ap.add_argument("--judge-model", default="gpt4o")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--status", action="store_true",
                    help="show how many samples are complete per stage, then exit")
    a = ap.parse_args(argv)

    stages = [s for s in a.stages.split(",") if s]
    samples = list(all_samples())
    for key, attr in (("only", "sample_id"), ("tasks", "task"),
                      ("models", "model_key"), ("strategies", "strategy")):
        val = getattr(a, key)
        if val:
            samples = [s for s in samples if s[attr] in set(val.split(","))]

    master_ids = _master_ids()
    if a.status:                               # progress report (great after a timeout)
        print(f"[status] {len(samples)} sample(s) in scope:")
        for st in STAGES:
            n = sum(1 for s in samples if _artifact_done(st, s, master_ids))
            print(f"    {st:9} {n}/{len(samples)} done")
        pending = [s["sample_id"] for s in samples
                   if not _artifact_done(stages[-1], s, master_ids)]
        print(f"    remaining for '{stages[-1]}': {len(pending)}")
        for sid in pending[:8]:
            print("      -", sid)
        return

    state = _load_state()
    print(f"[run_all] {len(samples)} sample(s) x {stages} (workers={a.workers}) "
          f"| resuming: {sum(1 for s in samples if _artifact_done(stages[-1], s, master_ids))}"
          f"/{len(samples)} already complete")
    done_c = skip_c = err = 0
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(run_sample, s, stages, a.force, a.no_judge, a.judge_model,
                          state, master_ids): s for s in samples}
        for fut in as_completed(futs):
            sid, failed_stage, tb, ran = fut.result()
            _save_state(state)
            if failed_stage:
                err += 1; print(f"  FAIL {sid} @ {failed_stage}: {tb.splitlines()[-1] if tb else ''}")
            elif ran == 0:
                skip_c += 1; print(f"  skip {sid} (already done)")
            else:
                done_c += 1; print(f"  DONE {sid} ({ran} stage(s) ran)")
    _save_state(state)
    print(f"[run_all] finished: {done_c} ran, {skip_c} skipped, {err} failed. "
          f"CSVs -> results/master_results.csv, results/evaluator_matrix.csv")


if __name__ == "__main__":
    main()
