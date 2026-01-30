#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
NODE_LOG="${NODE_LOG:-/tmp/lubee-node.log}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[run] missing env file: ${ENV_FILE}"
  echo "[run] create one (see RUN_NGINX.md) or pass ENV_FILE=/path/to/.env"
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

echo "[run] starting node app (logs: ${NODE_LOG})"
cd "${ROOT_DIR}"
nohup node app.js > "${NODE_LOG}" 2>&1 &
echo $! > /tmp/lubee-node.pid

echo "[run] starting nginx (config: ${ROOT_DIR}/nginx/nginx.conf)"
nginx -c "${ROOT_DIR}/nginx/nginx.conf"

echo "[run] ready:"
echo "  - http://127.0.0.1:8080/healthz"
echo "  - websocket smoke: node scripts/smoke_socketio_websocket.js ws://127.0.0.1:8080"

