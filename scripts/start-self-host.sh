#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"
CONFIG_FILE="${SELF_HOST_CONFIG_FILE:-${ROOT_DIR}/self-host.config.json}"
HOST="${HOST:-127.0.0.1}"
QR_SCRIPT="${APP_DIR}/scripts/generate-self-host-qr.mjs"
TAILSCALE_SCRIPT="${ROOT_DIR}/scripts/start-tailscale-proxy.sh"
SERVER_PID=""

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
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "[self-host] missing config: ${CONFIG_FILE}"
  echo "[self-host] create it from: ${ROOT_DIR}/self-host.config.example.json"
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
  echo "[self-host] invalid config content: ${CONFIG_CHECK_RESULT#ERR:}"
  echo "[self-host] please fix ${CONFIG_FILE} and rerun."
  echo "[self-host] required fields:"
  echo "  - spotifyClientId (32 hexadecimal characters)"
  echo "  - serviceOrigin (https origin only, no path/query/hash)"
  echo "  - allowedTailscaleUsers (1-20 exact Tailscale login names)"
  echo "[self-host] optional field:"
  echo "  - allowedOrigins (exact HTTPS/loopback origins, http://127.0.0.1:* for packaged EvenHub, or \"null\")"
  echo "  - localPort (1-65535)"
  echo "[self-host] copy and edit: ${ROOT_DIR}/self-host.config.example.json"
  exit 1
fi

CONFIG_PORT="${CONFIG_CHECK_RESULT#OK:}"

if [[ -z "${PORT:-}" ]]; then
  PORT="${CONFIG_PORT}"
fi
PORT="${PORT:-5173}"

echo "[self-host] root: ${ROOT_DIR}"
echo "[self-host] config: ${CONFIG_FILE}"
echo "[self-host] host: ${HOST}"
echo "[self-host] port: ${PORT}"

echo "[self-host] step 1/4: install frontend dependencies (if needed)"
if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  if prompt_yes_no "Dependencies not found in app/node_modules. Install now?"; then
    (cd "${APP_DIR}" && npm install)
  else
    echo "[self-host] dependency install declined. Stopping."
    exit 1
  fi
fi

echo "[self-host] step 2/4: build frontend"
(cd "${APP_DIR}" && npm run build:device)

echo "[self-host] step 3/4: start local server"
HOST="${HOST}" PORT="${PORT}" SELF_HOST_CONFIG_FILE="${CONFIG_FILE}" node "${ROOT_DIR}/server/local-server.mjs" &
SERVER_PID="$!"
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
  echo "[self-host] configuring tailscale on host..."
  if ! "${TAILSCALE_SCRIPT}" "${PORT}"; then
    echo "[self-host] tailscale setup failed. QR generation skipped."
    exit 1
  fi

  echo
  print_clickable_link "App URL" "${APP_URL}"
  print_green_link "QR viewer (desktop local)" "${QR_VIEW_URL}"
  echo "QR png file: ${QR_PNG_FILE}"
  echo "Phone / glasses entry URL: use the Tailscale HTTPS serviceOrigin from self-host.config.json."
  echo "Manual tailscale command: ${TAILSCALE_SCRIPT} ${PORT}"
  echo "[self-host] step 4/4: generate qr png"
  SELF_HOST_CONFIG_FILE="${CONFIG_FILE}" SELF_HOST_LOCAL_PORT="${PORT}" SELF_HOST_QR_QUIET=1 SELF_HOST_QR_TERMINAL=1 node "${QR_SCRIPT}"
  echo
else
  echo "[self-host] tailscale not started. Run manually when needed."
  echo "[self-host] QR is skipped because tailscale proxy was not started."
  echo "[self-host] Generate QR manually after tailscale is ready, for example:"
  echo "  evenhub qr --url \"https://<device>.<tailnet>.ts.net\" --external"
fi

wait "${SERVER_PID}"
