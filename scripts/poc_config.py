"""Single source of truth for the PoC/full-study experiment matrix.

PoC (proposal §3.6.8.1): 5 tasks × 2 models × 3 strategies × 3 reps = 90 samples.
Widen TASKS / MODELS here to scale to the full study — nothing else changes.

Pure stdlib (no PyYAML) so it runs on a bare Codespace.
"""
import os

# --- models -------------------------------------------------------------------
# All accessed via the OpenAI-compatible Chat Completions API (one client path).
MODELS = {
    "gpt4o": {
        "model": "gpt-4o",
        "base_url": None,                       # default OpenAI endpoint
        "api_key_env": "OPENAI_API_KEY",
        "temperature": 0.7,
        "max_tokens": 16000,
    },
    "deepseek": {                               # DeepSeek-Coder lineage, OpenAI-compatible
        "model": "deepseek-chat",
        "base_url": "https://api.deepseek.com/v1",
        "api_key_env": "DEEPSEEK_API_KEY",
        "temperature": 0.7,
        "max_tokens": 16000,
    },
}

STRATEGIES = ["zero_shot", "security_instructed", "few_shot"]
REPS = 3

# --- tasks (proposal Table 3.1) ----------------------------------------------
# requirements_file -> prompts/tasks/<file>.txt (the functional spec body).
# a07 reuses the repo's original prompt text verbatim for continuity with the
# 9 already-analysed samples.
TASKS = [
    {"id": "a01", "owasp": "A01 Broken Access Control",
     "title": "Role-based project dashboard", "requirements_file": "a01"},
    {"id": "a03", "owasp": "A03 Injection",
     "title": "Product search + contact form", "requirements_file": "a03"},
    {"id": "a07", "owasp": "A07 Identification & Authentication Failures",
     "title": "Account login with sessions", "requirements_file": "a07"},
    {"id": "a10", "owasp": "A10 Server-Side Request Forgery",
     "title": "URL preview / link unfurl", "requirements_file": "a10"},
    {"id": "cross", "owasp": "Cross-cutting (A01/A03/A05)",
     "title": "Authenticated file upload manager", "requirements_file": "cross"},
]

# --- repo paths ---------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERATED = os.path.join(ROOT, "generated-code")
PROMPTS = os.path.join(ROOT, "prompts")
STATIC = os.path.join(ROOT, "static-analysis")
RESULTS = os.path.join(ROOT, "results")
REDTEAM = os.path.join(ROOT, "red-teaming")
TOOLING = os.path.join(ROOT, ".tooling")


def sample_id(task_id, model_key, strategy, rep):
    """Repo naming convention: a07_gpt4o_zero_shot_rep1."""
    return f"{task_id}_{model_key}_{strategy}_rep{rep}"


def all_samples():
    for task in TASKS:
        for model_key in MODELS:
            for strategy in STRATEGIES:
                for rep in range(1, REPS + 1):
                    yield {
                        "sample_id": sample_id(task["id"], model_key, strategy, rep),
                        "task": task["id"], "owasp": task["owasp"],
                        "title": task["title"], "requirements_file": task["requirements_file"],
                        "model_key": model_key, "strategy": strategy, "rep": rep,
                    }


if __name__ == "__main__":
    s = list(all_samples())
    print(f"{len(s)} samples = {len(TASKS)} tasks x {len(MODELS)} models x "
          f"{len(STRATEGIES)} strategies x {REPS} reps")
    for x in s[:3] + s[-1:]:
        print("  ", x["sample_id"])
