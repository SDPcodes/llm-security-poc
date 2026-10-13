# PoC Execution Guide v3 — Efficient Run + Results Logging

**Project:** Understanding Security Vulnerabilities in LLM-Generated Web Application Code
(A07 PoC, Section 3.6.8 of the proposal)
**Audience:** you (execution) + supervisor (review)
**What this adds over `PoC_Guide_v2`:** every blocker hit during the rep3 walkthrough is pre-solved
here as a default, the whole 90-sample run is scripted instead of hand-run per sample, and every
number the proposal's metrics need is logged in one place as you go.

---

## 0. TL;DR — the five things that make this efficient

1. **Don't run the app inside Docker Compose.** The Codespaces Docker bridge drops
   container-to-container traffic (`ETIMEDOUT`). Run **Postgres in Docker, backend as a native
   host process** against the published port. (§4, §6-Risk-1)
2. **One contract file per sample** (`contract.json`) so the *same* attack script works on all 9/90
   apps without editing attack logic. Kills the "2/5 is actually false positives" problem. (§5)
3. **Log once, centrally.** Every phase appends to `results/master_results.csv` + a per-sample JSON.
   The stats scripts read only those. (§7)
4. **Separate cheap work from expensive work.** Generation + static analysis are cheap and
   parallel; only deployment + ZAP active scan are slow and serial. Batch accordingly. (§3, §8)
5. **API cost is trivial (~$10 for the PoC); compute-hours are the real budget.** Optimise ZAP and
   CodeQL, not token spend. (§8)

---

## 1. Scope (from the proposal §3.6.8)

| | PoC | Full study (§3.6.7) |
|---|---|---|
| Tasks | 5 (A01, A03, A07, A10, 1 cross-cutting) | 50–100 |
| Models | 2 (GPT-4o, DeepSeek-Coder) | 4 (+ Claude, Gemini) |
| Strategies | 3 (zero-shot, security-instructed, few-shot) | 3 |
| Reps | 3 | 3 |
| **Samples** | **90** | **1,800–3,600** |

Current status (this repo): A07 only, GPT-4o only, 9 samples generated; full pipeline proven on
`zero_shot_rep3`. This guide scales that to the full 90 and is written so the same scripts extend to
the full study by widening the loops.

---

## 2. The six PoC success criteria (proposal Table 3.4) — what each needs logged

| ID | Criterion | Threshold | Logged field(s) that prove it |
|----|-----------|-----------|-------------------------------|
| C1 | ≥50% of samples compile and run | ≥45/90 | `compiled`, `runs` |
| C2 | Static tools find ≥1 vuln in ≥60% of functional samples | Semgrep/CodeQL hit | `static_count` > 0 |
| C3 | Sandbox deploys + tears down with no manual steps | 100% automated | `deployed`, `teardown_ok` |
| C4 | Red team completes ≥5 attack iterations per app | all deployed apps | `attack_iterations` ≥ 5 |
| C5 | ≥1 static finding confirmed exploitable at runtime | Confirmation Rate > 0% | `confirmation_rate` |
| C6 | Adaptation produces ≥1 strategy change from prior outcomes | memory active | `adaptive_changes` ≥ 1 |

> **Note on C6 and the "adaptive" framework (proposal §3.4):** the v2 guide's `manual_attacks.py`
> is a *fixed* 5-attack script — it does **not** implement the Attack Planner / Memory feedback loop.
> For the PoC you have two honest options: (a) state that the PoC validates the *pipeline* and the
> adaptive loop is a Phase-3 deliverable (C6 = "framework designed, not yet active"), or (b) add the
> minimal memory loop in §9. Decide with your supervisor and record which in the summary. Don't mark
> C6 PASS off a script that has no memory.

---

## 3. Pipeline at a glance (cheap vs expensive)

```
                 CHEAP, PARALLEL (no Docker)              SLOW, SERIAL (Docker + ZAP)
  Phase 1 ─ generate ─┐
  Phase 2 ─ build test ┤ run these across all 90 first    Phase 4 ─ deploy ─┐
  Phase 3 ─ semgrep ───┤ (minutes each, embarrassingly    Phase 5 ─ ZAP + attacks ─┤ one app at a time
  Phase 3 ─ codeql ────┤  parallel)                        Phase 6 ─ metrics ───────┘ (per-sample)
  Phase 3 ─ llm judge ─┘
```

Run Phases 1–3 as a batch over all samples, commit, **then** loop Phases 4–6 one app at a time.
This keeps the slow Docker/ZAP work isolated and restartable.

---

## 4. Environment — set up once (fixes baked in)

```bash
# scripts/setup.sh  (extends the proposal's Phase 0.4)
set -e
pip install --quiet semgrep openai requests PyJWT matplotlib pandas scipy statsmodels
# CodeQL CLI + queries (version-matched to avoid the "Unknown kind Table" error, Risk-4)
#   use the codeql-action BUNDLE, not cli-binaries + separately-cloned queries
curl -sSL -o /tmp/cq.tgz https://github.com/github/codeql-action/releases/latest/download/codeql-bundle-linux64.tar.gz
mkdir -p .tooling && tar -xzf /tmp/cq.tgz -C .tooling     # .tooling/codeql/codeql
# Semgrep rules local clone (semgrep.dev registry is blocked in Codespaces, Risk-5)
git clone --depth 1 https://github.com/semgrep/semgrep-rules.git .tooling/semgrep-rules
docker pull ghcr.io/zaproxy/zaproxy:stable
# One-time kernel fix for the Codespaces Docker bridge (Risk-1)
sudo iptables -P FORWARD ACCEPT
```

**Secrets (proposal §3.7):** `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` as **Codespaces secrets** only
(Settings → Codespaces → Secrets). Never commit. Scripts read `os.environ[...]`. Confirm with
`[ -n "$OPENAI_API_KEY" ] && echo ok`.

---

## 5. The per-sample contract file — the key generalisation

Each generated app exposes a slightly different HTTP contract (route prefix, body field names,
auth-header style, port). Instead of editing the attack script per app, describe the app once:

`generated-code/<sample>_files/contract.json`
```json
{
  "port": 5000,
  "api_base": "/api",
  "register": {"path": "/register", "body": ["username", "email", "password"]},
  "login":    {"path": "/login", "body": ["email", "password"], "token_field": "accessToken"},
  "profile":  {"path": "/profile", "update_fields": ["username", "email"], "id_from": "token"},
  "auth_header": "raw"
}
```
- `token_field`: the JSON key the login response returns the JWT under (`token` or `accessToken`).
- `auth_header`: `raw` (value is the bare token) or `bearer` (value is `Bearer <token>`).
- `id_from`: `token` (profile id derived from JWT — IDOR-resistant) or `url` (has `/profile/:id`).

Write it once per sample (2 minutes reading the app's routes). The attack runner and the success
criteria read from it, so **the attack logic never changes** — only the contract does. This is what
turns the brittle, false-positive-prone `manual_attacks.py` into a fair instrument across 90 apps.

> **Why this matters for your results:** on `zero_shot_rep3`, the v2 script reported 2/5 that were
> *harness artifacts* (wrong body field → NOT NULL 500 misread as SQLi; `Bearer` header rejected by
> a raw-header app). With a contract file those become true negatives, and the two genuine findings
> (XSS reflection, no-CSRF) stand on their own. Record **true** findings, not contract mismatches.

---

## 6. Phase-by-phase (condensed, with fixes)

Driver script `scripts/run_sample.sh <sample>` does one sample end-to-end; `scripts/run_all.sh`
loops it. Below is what each phase must do and the gotcha it must avoid.

**Phase 1 — Generate & extract.** `generate_code.py` loops (task × model × strategy × rep), saves raw
`*.md`, then `extract_all.py` writes `<sample>_files/` preserving the app's own folder structure.
*Gotcha:* models emit varied trees (backend/ vs server/ vs flat) and sometimes omit CRA boilerplate
(`public/index.html`); the extractor keeps only what the model produced — note any scaffold you add.

**Phase 2 — Functional (Pass@1).** Build the app, start Postgres (Docker), run the native backend,
hit register→login→profile. Log `compiled`, `runs`, `functional_pass`.
*Gotcha (Risk-2):* build the backend image/`node_modules` on **Debian/glibc** (`node:18`, not
`node:18-alpine`) or native `bcrypt` segfaults (exit 139).

**Phase 3 — Static (SAST + judge).** `run_semgrep.py` (local rules), `run_codeql.py` (bundle),
`llm_judge.py` (GPT-4o, CWE-tagged). Log each tool's CWE set.
*Gotchas:* skip `node_modules` before the judge (`IsADirectoryError`); use the **version-matched
bundle** (Risk-4); the judge over-calls — flag likely false positives (hardcoded-secret when code
uses `process.env`; SQLi when queries are parameterised). Keep the raw judge output **and** a
reviewed column.

**Phase 4 — Deploy.** Postgres in Docker (published `5432`); backend native on the host against
`localhost:5432`; frontend optional for API attacks. Log `deployed`, `teardown_ok` (C3).
*Gotcha (Risk-1):* never rely on container→container networking in Codespaces.

**Phase 5 — Red team.** `run_zap.py` (ZAP in Docker `--network host`, target `localhost:<port>`) +
`attacks.py` (reads `contract.json`). Log `asr_pct`, `confirmed_cwes`, `zap_alert_count`,
`attack_iterations`, `attack_diversity_H`.
*Gotcha:* seed ZAP with the API endpoints (no crawlable pages); poll the ZAP API for readiness
(30–60 s boot).

**Phase 6 — Metrics.** `calculate_metrics.py` appends one row to `master_results.csv` and writes
`results/poc_summary_<sample>.json`. Teardown: `docker compose down -v; docker rm -f zap;
pkill -f "node server.js"`.

---

## 7. Results logging — the single source of truth

Everything the proposal's metrics need comes from **two artefacts**. Design them now so you never
re-derive numbers.

### 7.1 `results/master_results.csv` — one row per sample

```
sample_id,task,model,strategy,rep,loc,
compiled,runs,functional_pass,
secure,securepass,
semgrep_cwes,codeql_cwes,judge_cwes,static_cwe_set,static_count,vuln_density_kloc,cvss_list,
asr_pct,attack_iterations,confirmed_cwes,confirmation_rate,runtime_only_count,attack_diversity_H,
zap_alert_count,zap_risk_breakdown,
adaptive_improvement,
judge_fp_notes,harness_caveats
```

Field → metric mapping:

| Metric (proposal) | Eq. | Built from |
|---|---|---|
| Pass@k | 3.1 | `functional_pass` grouped by (task,model,strategy) over reps |
| Secure@k | §3.6.2 | `secure` (no confirmed runtime exploit) grouped likewise |
| SecurePass@k | 3.2 | `functional_pass AND secure` grouped likewise |
| Vulnerability density | §3.6.2 | `static_count / (loc/1000)` |
| CVSS distribution | §3.6.2 | `cvss_list` |
| ASR (per OWASP cat) | §3.6.6 | `asr_pct` grouped by task |
| Attack Diversity Index H | 3.5 | distinct `confirmed_cwes` → entropy |
| Confirmation Rate | §3.6.6 | `confirmation_rate` (static∩runtime / static) |
| Adaptive Improvement Rate | §3.6.6 | `adaptive_improvement` (ASR trend over iterations) |

### 7.2 `results/evaluator_matrix.csv` — one row per (sample, CWE) for agreement/MI

```
sample_id,cwe,semgrep,codeql,llm_judge,runtime_confirmed
```
This is what Experiment 2 (Cohen's/Fleiss' κ, §3.6.4) and the information-theoretic analysis
(§3.6.5) read. Without it you cannot compute inter-rater reliability later — populate it in Phase 3
(static columns) and Phase 5 (runtime column).

### 7.3 Per-sample JSON (`results/poc_summary_<sample>.json`)
Human-readable snapshot per sample (the proposal's Phase-6 artefact), carrying the C1–C6 verdicts
and the caveats. Keep the `rep` and filenames parameterised so samples never overwrite each other —
the v2 script hardcodes `rep1`; **always template the sample id.**

---

## 8. Resources & cost

### 8.1 API cost (the small number)
PoC = 90 samples = 45 GPT-4o + 45 DeepSeek. Per sample ≈ generation (~0.6k in / ~3k out) + judge
(~5k in / ~1k out).

| Model | ~$/sample* | ×45 | Notes |
|---|---|---|---|
| GPT-4o | ~$0.05–0.08 | **~$3–6** | gen + judge |
| DeepSeek-Coder | ~$0.01 | **~$0.5** | ~10–20× cheaper |
| **PoC total** | | **< $10** | even with retries |

\* Example rates — **verify current pricing** ([GPT-4o](https://pricepertoken.com/pricing-page/model/openai-gpt-4o),
[DeepSeek](https://www.morphllm.com/deepseek-api)); OpenAI ≈ $2.50/1M in, $10/1M out; DeepSeek far
lower. Full study (1,800–3,600 samples, 4 models incl. pricier Claude/Gemini) ≈ **$100–400** total —
still modest. **Cut it further:** OpenAI/Anthropic **Batch API = 50% off** for generation + judge
(both are non-interactive), and use `gpt-4o-mini` for a judge sensitivity pass.

### 8.2 Compute — the real constraint
| Step | ~time/sample | ×90 |
|---|---|---|
| Generation + static (parallel) | 1–3 min | a few hrs wall-clock |
| CodeQL DB build | 1–3 min | ~3 hrs |
| ZAP **active** scan | 5–15 min | **8–22 hrs** ← dominant |
| Deploy + manual attacks | 1–2 min | ~3 hrs |

Codespaces free tier = **120 hrs/month**. The PoC fits; the **full study does not** (ZAP active ×
3,600 ≈ hundreds of hrs). Levers: use **ZAP baseline (passive) scan** (~1–2 min) for the bulk and
reserve full active scans for a representative subset; **cache CodeQL DBs**; run static analysis in
parallel (no Docker); for the full study move the slow loop to a **cheap always-on VM** (GCP/AWS
student credits in §3.7) rather than Codespaces. Storage: CodeQL DBs are large — `.gitignore`
`.tooling/`, `*.sarif`, `codeql-db-*/`, and keep only the CSV/JSON summaries in git.

### 8.3 Local vs API for DeepSeek
The proposal lists optional GPU for local inference. **Don't** — DeepSeek API at ~$0.5 for the PoC
is far cheaper than GPU rental and removes a whole setup/debug surface. Reserve local GPU for the
full study only if rate limits bite.

---

## 9. (Optional) Minimal adaptive loop for C6

If you want C6 genuinely active rather than deferred, wrap the fixed attacks in a tiny memory loop
that satisfies "≥1 strategy change from prior outcomes" without the full Planner LLM:

1. Run the 5 attacks; record which **succeeded** and which **CWE classes** they hit.
2. **Adapt rule:** if SQLi succeeded on `/profile`, next iteration *escalates* (auth-bypass with the
   leaked context); if an attack was blocked, *drop* it and spend the iteration on a mutation of a
   successful one. Persist `{iteration, attack, result}` to `red-teaming/memory_<sample>.json`.
3. Log `adaptive_changes` (count of strategy switches) and `adaptive_improvement` (ASR at iter N −
   ASR at iter 1).

This is defensible as "adaptation mechanism present" while staying far simpler than the full Phase-3
framework — note clearly in the write-up that it's the PoC-scale version.

---

## 10. Statistical analysis (so the data is usable, proposal §3.6.3–3.6.6)

Write `scripts/analyze.py` (pandas + scipy/statsmodels) that reads the two CSVs and emits:

- **Pass@k / Secure@k / SecurePass@k** per (task, model, strategy) with **bootstrap 95% CIs**.
- **H1** (security-instructed > zero-shot SecurePass@k): Mann–Whitney U, Bonferroni-corrected, Cliff's δ.
- **H2** (vuln density varies by model): Kruskal–Wallis / χ².
- **H3** (A03/A07 higher vuln rates): χ² on category × vuln.
- **Cohen's/Fleiss' κ** (E2, H4/H5) from `evaluator_matrix.csv`; exclusive-detection % per evaluator.
- **Confirmation Rate & false-positive/negative rates** (E4, H7/H9/H10): confusion matrix of
  static-found vs runtime-confirmed; McNemar's test.
- **Mutual information / entropy** (§3.6.5) of prompt-strategy vs CWE outcomes.

Keep every figure reproducible from the two CSVs — that's what makes the dissertation defensible.

---

## 11. Risk register (challenges hit → standing mitigation)

| # | Risk / symptom | Root cause | Standing fix |
|---|---|---|---|
| 1 | Backend→DB `ETIMEDOUT`, intermittent | Codespaces Docker **bridge** drops container→container packets | `sudo iptables -P FORWARD ACCEPT`; run **backend native**, Postgres in Docker on a **published** port |
| 2 | Backend exit 139 (SIGSEGV), restarts climb | native `bcrypt` glibc binary on Alpine **musl** | build/run on `node:18` (Debian), not `-alpine` |
| 3 | Attacks under/over-report (e.g. false SQLi) | script hardcoded to one app contract | **`contract.json`** per sample (§5); fix the success heuristic (SQL *syntax* error, not any 500) |
| 4 | CodeQL `Unknown kind "Table" [UNSUPPORTED_KIND]` | CLI older than cloned queries | use the **codeql-action bundle** (matched CLI+queries) |
| 5 | Semgrep registry blocked | Codespaces egress | **local clone** of `semgrep-rules`, `SEMGREP_RULES=...` |
| 6 | LLM judge false positives | over-cautious semantic judge | keep raw + **reviewed** columns; spot-check env-secret & parameterised-query calls |
| 7 | Results overwritten between samples | hardcoded `rep1` filenames | **template the sample id** in every output path |
| 8 | ZAP 0 alerts / `url_not_found` | API has no crawlable pages | **seed endpoints** via ZAP API; poll for daemon readiness |
| 9 | Codespace lost / PC broken | — | auto-`backup.sh` after every phase (proposal's disaster-recovery plan) |

---

## 12. Run checklist

**Once:** `bash scripts/setup.sh` · confirm secrets · `iptables -P FORWARD ACCEPT`.
**Batch (all 90):** `generate` → `extract` → write `contract.json` per sample → `semgrep` →
`codeql` → `llm_judge` → commit. Populate static columns of both CSVs.
**Serial (per sample):** deploy (native backend + Docker PG) → ZAP + attacks → append metrics →
teardown → `backup.sh "<sample> done"`.
**End:** `analyze.py` → figures + stats → fill C1–C6 per sample → final `backup.sh`.

**Definition of done (PoC):** `master_results.csv` has 90 rows, `evaluator_matrix.csv` populated,
C1–C6 evaluated with evidence, calibration outcomes recorded (optimal N, per-module ASR, time/app,
baseline Confirmation Rate — proposal §3.6.8.5), everything pushed.

---

*Guide v3 — supersedes the execution mechanics of PoC_Guide_v2 (methodology unchanged; proposal
§3.6 remains authoritative). The deviations from v2 are infrastructure fixes and logging structure,
not changes to the research design.*
