#!/usr/bin/env bash
# One-time setup for the automated pipeline (EXECUTION_GUIDE §4). Run from repo root.
set -e
pip install --quiet openai requests PyJWT semgrep pandas scipy statsmodels matplotlib \
  || pip install --quiet --break-system-packages openai requests PyJWT semgrep
mkdir -p .tooling
# local semgrep rules (semgrep.dev registry is blocked in Codespaces, Risk-5)
[ -d .tooling/semgrep-rules ] || \
  git clone --depth 1 https://github.com/semgrep/semgrep-rules.git .tooling/semgrep-rules
# CodeQL action BUNDLE = matched CLI + queries (avoids Risk-4)
if [ ! -x .tooling/codeql/codeql ]; then
  curl -sSL -o /tmp/cq.tgz \
    https://github.com/github/codeql-action/releases/latest/download/codeql-bundle-linux64.tar.gz
  tar -xzf /tmp/cq.tgz -C .tooling
fi
echo "Add these to your shell:"
echo "  export SEMGREP_RULES=\"$PWD/.tooling/semgrep-rules/javascript\""
echo "  export CODEQL=\"$PWD/.tooling/codeql/codeql\""
