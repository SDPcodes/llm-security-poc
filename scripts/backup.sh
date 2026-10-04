#!/bin/bash
# === BACKUP TO GITHUB ===
# Run after completing each phase: bash scripts/backup.sh "Phase X complete"

MESSAGE=${1:-"Work in progress backup"}
git add -A
git commit -m "$MESSAGE"
git push origin main
echo "Backed up to GitHub: $MESSAGE"