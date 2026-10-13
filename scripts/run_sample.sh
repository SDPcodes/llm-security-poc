#!/usr/bin/env bash
# Phases 4-6 for ONE sample (slow, serial): deploy -> ZAP + attacks -> metrics -> teardown.
# Postgres in Docker, backend NATIVE (EXECUTION_GUIDE Risk-1). Usage:
#   bash scripts/run_sample.sh <sample_id>
set -euo pipefail
SID="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/generated-code/${SID}_files"
BE="$(python3 - "$APP" <<'PY'
import json,sys,os
c=json.load(open(os.path.join(sys.argv[1],"contract.json")))
print(c.get("port",5000))
PY
)"
# backend dir (may be backend/ or server/ or app root)
BEDIR="$APP/backend"; [ -d "$BEDIR" ] || BEDIR="$APP/server"; [ -d "$BEDIR" ] || BEDIR="$APP"
# Harness supplies a RANDOM JWT secret only if the app defines none, so an auth bypass
# is only confirmed when the app itself hardcodes a weak secret (avoids a harness artifact).
JWT_ENV=""
grep -rqsE "^JWT_SECRET=" --include=.env "$APP" || JWT_ENV="JWT_SECRET=$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
echo "[deploy] postgres (docker) + backend native on :$BE"
docker rm -f poc-pg >/dev/null 2>&1 || true
docker run -d --name poc-pg -e POSTGRES_USER=pocuser -e POSTGRES_PASSWORD=pocpass123 \
  -e POSTGRES_DB=pocdb -p 5432:5432 postgres:16 >/dev/null
sleep 6
for sql in "$APP"/schema.sql "$APP"/*.sql; do [ -f "$sql" ] && \
  PGPASSWORD=pocpass123 psql -h localhost -U pocuser -d pocdb -f "$sql" >/dev/null 2>&1 || true; done
( cd "$BEDIR" && npm install --no-audit --no-fund >/dev/null 2>&1 \
  && env $JWT_ENV DATABASE_URL="postgresql://pocuser:pocpass123@localhost:5432/pocdb" \
     PORT="$BE" node $( [ -f server.js ] && echo server.js || echo index.js ) \
     >/tmp/be_$SID.log 2>&1 & )
sleep 6
echo "[redteam] ZAP (docker) + contract-driven attacks"
docker rm -f zap >/dev/null 2>&1 || true
docker run -d --name zap --network host ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true >/dev/null 2>&1 || \
  echo "  (ZAP image unavailable; skipping DAST, attacks still run)"
sleep 25
python3 "$ROOT/scripts/run_zap.py" "$APP" --sample-id "$SID" --baseline || true
python3 "$ROOT/scripts/attacks.py" "$APP" --sample-id "$SID" --adaptive || true
echo "[metrics]"; python3 "$ROOT/scripts/phase6_metrics.py" "$SID" || true
echo "[teardown]"; docker rm -f poc-pg zap >/dev/null 2>&1 || true; pkill -f "node server.js" 2>/dev/null || true
