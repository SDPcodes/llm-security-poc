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
STAGES = ["generate", "extract", "scaffold", "static"]


def _load_state():
    try:
        return json.loads(Path(STATE).read_text())
    except Exception:
        return {}


def _save_state(st):
    os.makedirs(RESULTS, exist_ok=True)
    Path(STATE).write_text(json.dumps(st, indent=2))


def run_sample(sample, stages, force, no_judge, judge_model, state):
    sid = sample["sample_id"]
    done = state.setdefault(sid, {})
    md = Path(GENERATED, sid + ".md")
    files = Path(GENERATED, sid + "_files")
    for stage in STAGES:
        if stage not in stages or (done.get(stage) == "ok" and not force):
            continue
        try:
            if stage == "generate":
                from generate_code import generate_one
                generate_one(sample, force)
            elif stage == "extract":
                from lib_extract import extract_to_dir
                if not md.exists():
                    raise FileNotFoundError("no .md (run generate)")
                extract_to_dir(md.read_text(encoding="utf-8"), files)
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
            return sid, stage, traceback.format_exc()[-400:]
    return sid, None, None


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--stages", default=",".join(STAGES))
    ap.add_argument("--tasks"); ap.add_argument("--models")
    ap.add_argument("--strategies"); ap.add_argument("--only")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--no-judge", action="store_true", help="skip the LLM judge layer")
    ap.add_argument("--judge-model", default="gpt4o")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)

    stages = [s for s in a.stages.split(",") if s]
    samples = list(all_samples())
    for key, attr in (("only", "sample_id"), ("tasks", "task"),
                      ("models", "model_key"), ("strategies", "strategy")):
        val = getattr(a, key)
        if val:
            samples = [s for s in samples if s[attr] in set(val.split(","))]

    state = _load_state()
    print(f"[run_all] {len(samples)} sample(s) x {stages} (workers={a.workers})")
    ok = err = 0
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(run_sample, s, stages, a.force, a.no_judge, a.judge_model, state): s
                for s in samples}
        for fut in as_completed(futs):
            sid, failed_stage, tb = fut.result()
            _save_state(state)
            if failed_stage:
                err += 1; print(f"  FAIL {sid} @ {failed_stage}: {tb.splitlines()[-1] if tb else ''}")
            else:
                ok += 1; print(f"  ok   {sid}")
    _save_state(state)
    print(f"[run_all] done: {ok} ok, {err} failed. "
          f"CSVs -> results/master_results.csv, results/evaluator_matrix.csv")


if __name__ == "__main__":
    main()
