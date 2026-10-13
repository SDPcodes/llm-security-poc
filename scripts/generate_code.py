"""Phase 1 — generate the full matrix (5 tasks x 2 models x 3 strategies x 3 reps = 90).

Replaces the A07/GPT-4o-only script. Each prompt = task body + strategy wrapper + the
output contract (prompts/_contract.txt), which is what makes extraction reliable and stops
models dropping index.html/package.json. Saves raw markdown to generated-code/<sample>.md
using the repo naming convention. Resumable (skips existing .md unless --force).

  python3 scripts/generate_code.py                      # all 90
  python3 scripts/generate_code.py --tasks a07 --models gpt4o
  python3 scripts/generate_code.py --only a07_gpt4o_zero_shot_rep1
"""
from __future__ import annotations
import argparse, os, sys, time
from pathlib import Path
from poc_config import MODELS, PROMPTS, GENERATED, all_samples


def render_prompt(sample) -> str:
    body = Path(PROMPTS, "tasks", sample["requirements_file"] + ".txt").read_text()
    wrapper = Path(PROMPTS, "strategies", sample["strategy"] + ".txt").read_text()
    contract = Path(PROMPTS, "_contract.txt").read_text()
    return wrapper.replace("{{REQUIREMENTS}}", body.strip()).replace("{{CONTRACT}}", contract.strip())


def _client(mc):
    from openai import OpenAI
    key = os.environ.get(mc["api_key_env"])
    if not key:
        raise RuntimeError(f"{mc['api_key_env']} not set")
    return OpenAI(api_key=key, **({"base_url": mc["base_url"]} if mc.get("base_url") else {}))


def generate_one(sample, force=False) -> str:
    out = Path(GENERATED, sample["sample_id"] + ".md")
    if out.exists() and not force:
        return "skip"
    mc = MODELS[sample["model_key"]]
    client = _client(mc)
    prompt = render_prompt(sample)
    for attempt in range(4):
        try:
            resp = client.chat.completions.create(
                model=mc["model"], messages=[{"role": "user", "content": prompt}],
                temperature=mc["temperature"], max_tokens=mc["max_tokens"])
            raw = resp.choices[0].message.content or ""
            break
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(raw, encoding="utf-8")
    return f"{len(raw)} chars"


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--tasks"); ap.add_argument("--models")
    ap.add_argument("--strategies"); ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)
    samples = list(all_samples())
    if a.only:
        samples = [s for s in samples if s["sample_id"] in set(a.only.split(","))]
    if a.tasks:
        samples = [s for s in samples if s["task"] in set(a.tasks.split(","))]
    if a.models:
        samples = [s for s in samples if s["model_key"] in set(a.models.split(","))]
    if a.strategies:
        samples = [s for s in samples if s["strategy"] in set(a.strategies.split(","))]
    print(f"[generate] {len(samples)} sample(s)")
    for s in samples:
        try:
            r = generate_one(s, a.force)
            print(f"  {s['sample_id']}: {r}")
        except Exception as e:
            print(f"  {s['sample_id']}: ERROR {e}")


if __name__ == "__main__":
    main()
