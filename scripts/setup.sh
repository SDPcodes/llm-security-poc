#!/bin/bash
# === DISASTER RECOVERY SETUP SCRIPT ===
# Run this to re-create your entire PoC environment
# Usage: bash scripts/setup.sh

echo "=== Installing Python packages ==="
pip install semgrep openai requests PyJWT

echo "=== Installing CodeQL ==="
if [ ! -d "$HOME/codeql-home" ]; then
wget -q https://github.com/github/codeql-cli-binaries/releases/latest/download/cod
eql-linux64.zip
unzip -q codeql-linux64.zip -d ~/codeql-home
rm codeql-linux64.zip
git clone --depth 1 https://github.com/github/codeql.git ~/codeql-home/codeql-repo
fi
export PATH="$HOME/codeql-home/codeql:$PATH"
echo 'export PATH="$HOME/codeql-home/codeql:$PATH"' >> ~/.bashrc

echo "=== Pulling Docker images ==="
docker pull ghcr.io/zaproxy/zaproxy:stable
docker pull postgres:16
docker pull node:18-alpine

echo "=== Verifying tools ==="
semgrep --version
codeql version
docker --version
node --version
python3 --version

echo "=== Setup complete! ==="