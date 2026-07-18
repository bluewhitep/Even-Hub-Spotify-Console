#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"
CONFIG_FILE="${SELF_HOST_CONFIG_FILE:-${ROOT_DIR}/self-host.config.json}"
CONTAINER_NAME="${CONTAINER_NAME:-even-hub-spotify-console-self-host}"
RUNTIME_IMAGE="${DOCKER_RUNTIME_IMAGE:-${DOCKER_IMAGE_NAME:-node:20-alpine}}"
CONTAINER_PORT="${CONTAINER_PORT:-5173}"
QR_SCRIPT="${APP_DIR}/scripts/generate-self-host-qr.mjs"
TAILSCALE_SCRIPT="${ROOT_DIR}/scripts/start-tailscale-proxy.sh"
DOCKER_PID=""
DETACH="${SELF_HOST_DETACH:-0}"

if [[ "${1:-}" == "--detach" ]]; then
  DETACH="1"
fi

print_clickable_link() {
  local label="$1"
  local url="$2"
  if [[ -t 1 ]]; then
    # OSC 8 hyperlink (supported by iTerm2, modern Terminal, VSCode terminal, etc.)
    printf '%s: \033]8;;%s\033\\%s\033]8;;\033\\\n' "${label}" "${url}" "${url}"
  else
    echo "${label}: ${url}"
  fi
}

print_green_link() {
  local label="$1"
  local url="$2"
  if [[ -t 1 ]]; then
    printf '%s: \033[32m%s\033[0m\n' "${label}" "${url}"
  else
    echo "${label}: ${url}"
  fi
}

prompt_yes_no() {
  local prompt="$1"
  local answer
  if [[ ! -t 0 ]]; then
    return 1
  fi
  read -r -p "${prompt} [y/N] " answer
  [[ "${answer}" =~ ^[Yy]$ ]]
}

cleanup() {
  set +e
  if [[ -n "${DOCKER_PID}" ]] && kill -0 "${DOCKER_PID}" 2>/dev/null; then
    kill "${DOCKER_PID}" 2>/dev/null || true
  fi
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}

trap cleanup INT TERM EXIT

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "[docker-self-host] missing config: ${CONFIG_FILE}"
  echo "[docker-self-host] create it from: ${ROOT_DIR}/self-host.config.example.json"
  exit 1
fi

CONFIG_CHECK_RESULT="$(
  node - "${CONFIG_FILE}" <<'NODE'
const fs = require('node:fs');
try {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const clientId = String(cfg.spotifyClientId || '').trim();
  const originRaw = String(cfg.serviceOrigin || '').trim();
  if (!/^[0-9a-f]{32}$/i.test(clientId)) {
    console.log('ERR:invalid_spotifyClientId');
    process.exit(0);
  }
  if (!originRaw) {
    console.log('ERR:missing_serviceOrigin');
    process.exit(0);
  }
  let u;
  try {
    u = new URL(originRaw);
  } catch {
    console.log('ERR:invalid_serviceOrigin_url');
    process.exit(0);
  }
  if (u.protocol !== 'https:') {
    console.log('ERR:serviceOrigin_must_be_https');
    process.exit(0);
  }
  if (u.pathname !== '/' || u.search || u.hash) {
    console.log('ERR:serviceOrigin_must_be_origin_only');
    process.exit(0);
  }

  if (!Array.isArray(cfg.allowedTailscaleUsers) || cfg.allowedTailscaleUsers.length < 1 ||
      cfg.allowedTailscaleUsers.length > 20 ||
      cfg.allowedTailscaleUsers.some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 254)) {
    console.log('ERR:invalid_allowedTailscaleUsers');
    process.exit(0);
  }
  if (cfg.allowedOrigins !== undefined && (!Array.isArray(cfg.allowedOrigins) || cfg.allowedOrigins.length > 20)) {
    console.log('ERR:invalid_allowedOrigins');
    process.exit(0);
  }
  for (const value of cfg.allowedOrigins || []) {
    if (typeof value !== 'string') {
      console.log('ERR:invalid_allowedOrigins');
      process.exit(0);
    }
    const origin = value.trim();
    if (origin === 'null') continue;
    if (origin === 'http://127.0.0.1:*') continue;
    let allowed;
    try {
      allowed = new URL(origin);
    } catch {
      console.log('ERR:invalid_allowedOrigins');
      process.exit(0);
    }
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(allowed.hostname);
    if ((allowed.protocol !== 'https:' && !(allowed.protocol === 'http:' && loopback)) ||
        allowed.pathname !== '/' || allowed.search || allowed.hash) {
      console.log('ERR:invalid_allowedOrigins');
      process.exit(0);
    }
  }

  const port = Number(cfg.localPort);
  if (String(cfg.localPort || '').trim() && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    console.log('ERR:invalid_localPort');
    process.exit(0);
  }

  console.log(`OK:${Number.isInteger(port) ? port : ''}`);
} catch {
  console.log('ERR:invalid_json');
}
NODE
)"

if [[ "${CONFIG_CHECK_RESULT}" == ERR:* ]]; then
  echo "[docker-self-host] invalid config content: ${CONFIG_CHECK_RESULT#ERR:}"
  echo "[docker-self-host] please fix ${CONFIG_FILE} and rerun."
  echo "[docker-self-host] required fields:"
  echo "  - spotifyClientId (32 hexadecimal characters)"
  echo "  - serviceOrigin (https origin only, no path/query/hash)"
  echo "  - allowedTailscaleUsers (1-20 exact Tailscale login names)"
  echo "[docker-self-host] optional field:"
  echo "  - allowedOrigins (exact HTTPS/loopback origins, http://127.0.0.1:* for packaged EvenHub, or \"null\")"
  echo "  - localPort (1-65535)"
  echo "[docker-self-host] copy and edit: ${ROOT_DIR}/self-host.config.example.json"
  exit 1
fi

CONFIG_PORT="${CONFIG_CHECK_RESULT#OK:}"

if [[ -z "${PORT:-}" ]]; then
  PORT="${CONFIG_PORT}"
fi
PORT="${PORT:-5173}"
mkdir -p "${ROOT_DIR}/.self-host" "${ROOT_DIR}/qr"

if ! command -v docker >/dev/null 2>&1; then
  echo "[docker-self-host] docker not found in PATH."
  exit 1
fi

echo "[docker-self-host] root: ${ROOT_DIR}"
echo "[docker-self-host] config: ${CONFIG_FILE}"
echo "[docker-self-host] runtime image: ${RUNTIME_IMAGE}"
echo "[docker-self-host] local port: ${PORT}"
echo "[docker-self-host] container port: ${CONTAINER_PORT}"

echo "[docker-self-host] step 1/4: install frontend dependencies (if needed)"
if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  if prompt_yes_no "Dependencies not found in app/node_modules. Install now?"; then
    (cd "${APP_DIR}" && npm install)
  else
    echo "[docker-self-host] dependency install declined. Stopping."
    exit 1
  fi
fi

echo "[docker-self-host] step 2/4: build frontend locally"
(cd "${APP_DIR}" && npm run build:device)

echo "[docker-self-host] step 3/4: start dockerized server with local build"
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker run --rm \
  --name "${CONTAINER_NAME}" \
  -w "/workspace" \
  -p "127.0.0.1:${PORT}:${CONTAINER_PORT}" \
  -e HOST="0.0.0.0" \
  -e PORT="${CONTAINER_PORT}" \
  -e SELF_HOST_CONFIG_FILE="/workspace/self-host.config.json" \
  -v "${CONFIG_FILE}:/workspace/self-host.config.json:ro" \
  -v "${ROOT_DIR}/server:/workspace/server:ro" \
  -v "${APP_DIR}/dist:/workspace/app/dist:ro" \
  -v "${ROOT_DIR}/.self-host:/workspace/.self-host" \
  -v "${ROOT_DIR}/qr:/workspace/qr" \
  "${RUNTIME_IMAGE}" \
  node "/workspace/server/local-server.mjs" &
DOCKER_PID="$!"

sleep 1

APP_URL="http://127.0.0.1:${PORT}"
QR_VIEW_URL="${APP_URL}/api/self-host/qr/view"
QR_PNG_FILE="${ROOT_DIR}/qr/evenhub-entry.png"

start_tailscale="no"
if [[ "${AUTO_START_TAILSCALE:-}" == "1" ]]; then
  start_tailscale="yes"
elif [[ "${AUTO_START_TAILSCALE:-}" == "0" ]]; then
  start_tailscale="no"
elif [[ -t 0 ]]; then
  read -r -p "Start tailscale https proxy now? [y/N] " answer
  if [[ "${answer}" =~ ^[Yy]$ ]]; then
    start_tailscale="yes"
  fi
fi

if [[ "${start_tailscale}" == "yes" ]]; then
  echo "[docker-self-host] configuring tailscale on host (not in container)..."
  if ! "${TAILSCALE_SCRIPT}" "${PORT}"; then
    echo "[docker-self-host] tailscale setup failed. QR generation skipped."
    exit 1
  fi

  echo
  print_clickable_link "App URL" "${APP_URL}"
  print_green_link "QR viewer (desktop local)" "${QR_VIEW_URL}"
  echo "QR png file: ${QR_PNG_FILE}"
  echo "Phone / glasses entry URL: use the Tailscale HTTPS serviceOrigin from self-host.config.json."
  echo "Manual tailscale command: ${TAILSCALE_SCRIPT} ${PORT}"
  echo "[docker-self-host] step 4/4: generate qr png"
  SELF_HOST_CONFIG_FILE="${CONFIG_FILE}" SELF_HOST_LOCAL_PORT="${PORT}" SELF_HOST_QR_QUIET=1 SELF_HOST_QR_TERMINAL=1 node "${QR_SCRIPT}"
  echo
else
  echo "[docker-self-host] tailscale not started. Run manually when needed."
  echo "[docker-self-host] QR is skipped because tailscale proxy was not started."
  echo "[docker-self-host] Generate QR manually after tailscale is ready, for example:"
  echo "  evenhub qr --url \"https://<device>.<tailnet>.ts.net\" --external"
fi

if [[ "${DETACH}" == "1" ]]; then
  echo "[docker-self-host] detached mode enabled."
  echo "[docker-self-host] container logs: docker logs -f ${CONTAINER_NAME}"
  trap - INT TERM EXIT
  DOCKER_PID=""
  exit 0
fi

wait "${DOCKER_PID}"
