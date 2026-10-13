"""Phase 3, Layer 2 — LLM security judge over one extracted app (generalised).

Replaces the hardcoded single-sample judge. Loads the app's JS, asks a model for a
CWE-tagged vulnerability list, then applies false-positive heuristics (EXECUTION_GUIDE
Risk-6): a hardcoded-secret flag on code that reads process.env, or an SQLi flag on
parameterised queries, is marked likely_fp so the reviewed CWE set stays honest.

Model is selectable (default gpt4o); any OpenAI-compatible provider in poc_config works,
so the cheap DeepSeek judge is a one-flag change.
"""
from __future__ import annotations
import glob, json, os, re, sys
from pathlib import Path

try:
    from poc_config import STATIC, MODELS
except Exception:
    STATIC = os.path.join(os.getcwd(), "static-analysis")
    MODELS = {"gpt4o": {"model": "gpt-4o", "base_url": None, "api_key_env": "OPENAI_API_KEY",
                        "temperature": 0.2, "max_tokens": 4096}}

MAX_CHARS = 45000

PROMPT = """You are a security auditor analysing a Node.js/React web application.
List every security vulnerability you find. For each, give: cwe (e.g. "CWE-89"),
severity (LOW/MEDIUM/HIGH/CRITICAL), file, line (int or null), description, exploit.
Focus on SQLi, XSS, CSRF, auth/session flaws, hardcoded secrets, missing input
validation, access control, SSRF. Respond ONLY as JSON: {"vulnerabilities":[...]}.

CODE:
"""


def _load_code(files_dir) -> str:
    buf, total = [], 0
    for f in sorted(glob.glob(str(Path(files_dir) / "**" / "*"), recursive=True)):
        if (not os.path.isfile(f) or "node_modules" in f
                or Path(f).suffix.lower() not in (".js", ".jsx", ".ts", ".tsx")):
            continue
        try:
            txt = open(f, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        rel = os.path.relpath(f, files_dir)
        chunk = f"\n// === FILE: {rel} ===\n{txt}"
        if total + len(chunk) > MAX_CHARS:
            chunk = chunk[: MAX_CHARS - total]
        buf.append(chunk); total += len(chunk)
        if total >= MAX_CHARS:
            break
    return "".join(buf)


def _flag_fps(vulns, code) -> list:
    uses_env = "process.env" in code
    parameterised = bool(re.search(r"\$\d|\?\s*[,)]|VALUES\s*\(\s*\$", code))
    for v in vulns:
        cwe = str(v.get("cwe", "")).upper()
        v["likely_fp"], v["fp_reason"] = False, ""
        if cwe.startswith("CWE-798") and uses_env:
            v["likely_fp"], v["fp_reason"] = True, "code reads secret from process.env"
        if cwe.startswith("CWE-89") and parameterised:
            v["likely_fp"], v["fp_reason"] = True, "queries appear parameterised ($1/placeholders)"
    return vulns


def judge(files_dir, sample_id="sample", model_key="gpt4o") -> dict:
    out = {"tool": "llm_judge", "model": model_key, "ok": False,
           "cwes": [], "cwes_reviewed": [], "n": 0, "n_reviewed": 0}
    code = _load_code(files_dir)
    if not code.strip():
        out["error"] = "no JS found"; return out
    mc = MODELS[model_key]
    key = os.environ.get(mc["api_key_env"])
    if not key:
        out["error"] = f"{mc['api_key_env']} not set"; return out
    try:
        from openai import OpenAI
    except ImportError:
        out["error"] = "openai not installed"; return out

    client = OpenAI(api_key=key, **({"base_url": mc["base_url"]} if mc.get("base_url") else {}))
    try:
        resp = client.chat.completions.create(
            model=mc["model"], messages=[{"role": "user", "content": PROMPT + code}],
            temperature=0.2, max_tokens=4096, response_format={"type": "json_object"})
        raw = resp.choices[0].message.content or "{}"
    except Exception as e:
        out["error"] = f"API error: {e}"; return out

    try:
        vulns = json.loads(raw).get("vulnerabilities", [])
    except json.JSONDecodeError:
        vulns = []
    vulns = _flag_fps(vulns, code)
    cwes = sorted({str(v.get("cwe", "")).split(":")[0].strip() for v in vulns if v.get("cwe")})
    reviewed = sorted({str(v.get("cwe", "")).split(":")[0].strip()
                       for v in vulns if v.get("cwe") and not v.get("likely_fp")})
    os.makedirs(STATIC, exist_ok=True)
    Path(STATIC, f"judge_{sample_id}.json").write_text(
        json.dumps({"raw": vulns, "cwes": cwes, "cwes_reviewed": reviewed}, indent=2))
    out.update(ok=True, cwes=cwes, cwes_reviewed=reviewed, n=len(vulns),
               n_reviewed=len([v for v in vulns if not v.get("likely_fp")]))
    return out


if __name__ == "__main__":
    fd = sys.argv[1]
    sid = sys.argv[2] if len(sys.argv) > 2 else Path(fd).name.replace("_files", "")
    mk = sys.argv[3] if len(sys.argv) > 3 else "gpt4o"
    r = judge(fd, sid, mk)
    print(f"[judge] {sid}: ok={r['ok']} cwes={r['cwes']} "
          f"reviewed={r['cwes_reviewed']} {r.get('error','')}")
