# PoC Pipeline — automated 90-sample run (Phases 1–6)

Config-driven, resumable pipeline that scales the A07 PoC to the full
**5 tasks × 2 models × 3 strategies × 3 reps = 90** matrix (proposal §3.6.8), implementing
the `EXECUTION_GUIDE.md` v3 design. Everything is parameterised by `scripts/poc_config.py`;
widen `TASKS`/`MODELS` there to reach the full study — no other code changes.

## What this fixes
- **Missing files (index.html, package.json):** `generate_code.py` appends a strict output
  contract (`prompts/_contract.txt`) so models emit a JSON manifest; `lib_scaffold.py` then
  injects any still-missing boilerplate and **logs every injection** (`scaffold_report.json`).
- **Broken extraction:** `lib_extract.py` parses the JSON manifest first, falling back to a
  tree-aware markdown parser for legacy samples. (Verified on all 9 existing A07 samples.)
- **Per-sample attack editing:** `lib_scaffold.py` auto-drafts `contract.json` (EXECUTION_GUIDE §5)
  by introspecting the backend; `attacks.py` reads it so one attack script fits all 90 apps.

## Install (Codespace / Linux)
```bash
bash scripts/setup.sh            # semgrep, CodeQL bundle, local semgrep-rules, ZAP image
export SEMGREP_RULES="$PWD/.tooling/semgrep-rules/javascript"
# secrets: OPENAI_API_KEY, DEEPSEEK_API_KEY  (os.environ)
```

## Run
```bash
# Phases 1-3 (cheap, parallel) across all 90 — generate, extract, scaffold, static
python3 scripts/run_all.py --stages generate,extract,scaffold,static

# offline re-run without API (extraction/scaffold/semgrep+codeql only)
python3 scripts/run_all.py --stages extract,scaffold,static --no-judge

# Phases 4-6 (slow, serial) per sample — deploy, ZAP + attacks, metrics
bash scripts/run_sample.sh a07_gpt4o_zero_shot_rep3
```
Resumable: per-sample stage state in `results/_pipeline_state.json`; `--force` re-runs.
Slice with `--tasks/--models/--strategies/--only`.

## Phase 3 — static analysis (three layers, generalised)
| Layer | Script | Output |
|-------|--------|--------|
| Semgrep SAST | `run_semgrep.py` | `static-analysis/semgrep_<sample>.json` |
| CodeQL SAST | `run_codeql.py` | `static-analysis/codeql_<sample>.sarif` (skips cleanly if CLI absent) |
| LLM judge | `llm_judge.py` | `static-analysis/judge_<sample>.json` (+ false-positive flags, Risk-6) |
| aggregate | `phase3_static.py` | rows in `results/master_results.csv` + `results/evaluator_matrix.csv` |

CWE merge: `static_cwe_set = semgrep ∪ codeql ∪ judge_reviewed` (judge FPs excluded).

## Outputs (single source of truth — EXECUTION_GUIDE §7)
- `results/master_results.csv` — one row/sample; Phase-3 fills loc + CWE columns + vuln density,
  Phase-6 fills ASR, confirmation_rate, diversity H, secure/securepass.
- `results/evaluator_matrix.csv` — one row/(sample,CWE): semgrep/codeql/llm_judge/runtime_confirmed
  (feeds Cohen's/Fleiss' κ §3.6.4 and the MI analysis §3.6.5).

## Research integrity
Extraction writes model output verbatim; scaffold only ADDS files (tier `harness` = non-source;
tier `entry` = source-adjacent, flagged); missing deps / build scripts are flagged, not fixed.
Injected-file and missing-dependency rates are themselves a reportable *completeness* metric.

## Verified in build (2026-10-13)
- Extraction + scaffold on all 9 real A07 samples; auto-drafted contract.json matched the
  hand-written rep3 notes (accessToken / raw header).
- Semgrep live: real CWEs matching prior results (CWE-798 in zero_shot_rep1, CWE-352 throughout).
- CodeQL SARIF parser unit-tested; LLM judge wired with FP flagging (needs API key to run).
- Full Phase 4–6 live on rep3 (Postgres + native backend): ASR 60%, confirmation_rate 50%,
  2 runtime-only CWEs, diversity H=1.585 — the static-vs-dynamic gap for Experiments 3–4.

## File map
`scripts/poc_config.py` matrix · `generate_code.py` P1 · `lib_extract.py`/`extract_all.py` P1 ·
`lib_scaffold.py`/`scaffold_all.py` P1 · `run_semgrep.py`+`run_codeql.py`+`llm_judge.py`+`phase3_static.py` P3 ·
`attacks.py`+`run_zap.py` P5 · `phase6_metrics.py` P6 · `run_all.py` (P1–3 batch) · `run_sample.sh` (P4–6).
`prompts/_contract.txt` + `prompts/tasks/*` + `prompts/strategies/*`.
