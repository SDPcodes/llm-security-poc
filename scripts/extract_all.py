"""Phase 1 (batch) — extract every generated-code/*.md into <sample>_files/ using the
robust JSON-first + markdown-fallback engine (lib_extract). Upgrades the old heuristic
extractor; with the new output contract, JSON manifests make this deterministic.

Run from repo root:  python3 scripts/extract_all.py
"""
from pathlib import Path
from lib_extract import extract_to_dir
from poc_config import GENERATED

for md in sorted(Path(GENERATED).glob("*.md")):
    out = Path(GENERATED, md.stem + "_files")
    rep = extract_to_dir(md.read_text(encoding="utf-8", errors="replace"), out)
    print(f"{md.stem:45} {rep['method']:17} {rep['n_files']} files")
