"""Phase 1 (batch) — scaffold every <sample>_files/ to runnable state and draft contract.json.
Only ADDS missing boilerplate (logged in scaffold_report.json); never edits model files.

Run from repo root:  python3 scripts/scaffold_all.py
"""
from pathlib import Path
from lib_scaffold import doctor
from poc_config import GENERATED, TASKS

titles = {t["id"]: t["title"] for t in TASKS}
for d in sorted(Path(GENERATED).glob("*_files")):
    sid = d.name[:-6]
    r = doctor(d, title=titles.get(sid.split("_")[0], sid), task=sid.split("_")[0])
    md = sum(len(v) for v in r["missing_dependencies"].values())
    print(f"{sid:45} injected={len(r['injected'])} flags={len(r['flags'])} missing_deps={md}")
