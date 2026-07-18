#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-${PORT:-5173}}"
HTTPS_PORT="${TS_HTTPS_PORT:-443}"
TARGET_URL="http://127.0.0.1:${PORT}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${SELF_HOST_CONFIG_FILE:-${ROOT_DIR}/self-host.config.json}"
TAILSCALE_BG="${TS_SERVE_BG:-1}"

if command -v tailscale >/dev/null 2>&1; then
  TAILSCALE_BIN="$(command -v tailscale)"
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  TAILSCALE_BIN="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
else
  echo "tailscale binary not found."
  echo "Install Tailscale or add it to PATH, then run this script again."
  exit 1
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

read_config_service_origin() {
  if [[ ! -f "${CONFIG_FILE}" ]]; then
    echo ""
    return
  fi

  node - "${CONFIG_FILE}" <<'NODE'
const fs = require('node:fs');
try {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const raw = String(cfg.serviceOrigin || '').trim();
  if (!raw) {
    process.exit(0);
  }
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash) {
    process.exit(0);
  }
  const protocol = u.protocol.toLowerCase();
  const hostname = u.hostname.toLowerCase();
  const isDefaultPort = (protocol === 'https:' && u.port === '443') || (protocol === 'http:' && u.port === '80');
  const port = !u.port || isDefaultPort ? '' : `:${u.port}`;
  process.stdout.write(`${protocol}//${hostname}${port}`);
} catch {
  process.exit(0);
}
NODE
}

detect_current_https_origin() {
  local status_json dns_name
  status_json="$("${TAILSCALE_BIN}" status --json 2>/dev/null || true)"
  if [[ -n "${status_json}" ]]; then
    dns_name="$(
      printf '%s' "${status_json}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);const d=((o||{}).Self||{}).DNSName||"";process.stdout.write(String(d));}catch{}});'
    )"
    dns_name="${dns_name%.}"
    if [[ -n "${dns_name}" && "${dns_name}" != "null" ]]; then
      echo "https://${dns_name}"
      return
    fi
  fi

  if [[ -f "${CONFIG_FILE}" ]]; then
    dns_name="$(
      node - "${CONFIG_FILE}" <<'NODE'
const fs = require('node:fs');
try {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const raw = String(cfg.serviceOrigin || '').trim();
  if (!raw) {
    process.exit(0);
  }
  const u = new URL(raw);
  if (u.protocol !== 'https:') {
    process.exit(0);
  }
  const protocol = u.protocol.toLowerCase();
  const hostname = u.hostname.toLowerCase();
  const isDefaultPort = (protocol === 'https:' && u.port === '443') || (protocol === 'http:' && u.port === '80');
  const port = !u.port || isDefaultPort ? '' : `:${u.port}`;
  process.stdout.write(`${protocol}//${hostname}${port}`);
} catch {
  process.exit(0);
}
NODE
    )"
    if [[ -n "${dns_name}" ]]; then
      echo "${dns_name}"
      return
    fi
  fi

  echo "https://<device>.<tailnet>.ts.net"
}

CURRENT_HTTPS_ORIGIN="$(detect_current_https_origin)"
CONFIG_HTTPS_ORIGIN="$(read_config_service_origin)"

if [[ -z "${CONFIG_HTTPS_ORIGIN}" ]]; then
  echo "[tailscale] missing or invalid serviceOrigin in ${CONFIG_FILE}"
  echo "[tailscale] please set serviceOrigin to your exact https ts.net origin first."
  exit 1
fi

if [[ "${CURRENT_HTTPS_ORIGIN}" != "https://<device>.<tailnet>.ts.net" && "${CURRENT_HTTPS_ORIGIN}" != "${CONFIG_HTTPS_ORIGIN}" ]]; then
  echo "[tailscale] origin mismatch detected."
  echo "[tailscale] tailscale current: ${CURRENT_HTTPS_ORIGIN}"
  echo "[tailscale] config serviceOrigin: ${CONFIG_HTTPS_ORIGIN}"
  echo "[tailscale] fix self-host.config.json (or your device/tailnet naming), then retry."
  exit 1
fi

echo "[tailscale] using: ${TAILSCALE_BIN}"
echo "[tailscale] proxy: ${CONFIG_HTTPS_ORIGIN} -> ${TARGET_URL}"
print_clickable_link "[tailscale] configured-https" "${CONFIG_HTTPS_ORIGIN}/"
if [[ "${CURRENT_HTTPS_ORIGIN}" != "https://<device>.<tailnet>.ts.net" ]]; then
  print_clickable_link "[tailscale] detected-https" "${CURRENT_HTTPS_ORIGIN}/"
fi

if [[ "${TS_DRY_RUN:-0}" == "1" ]]; then
  echo "[tailscale] dry-run mode enabled; skipping serve."
  exit 0
fi

if [[ "${TAILSCALE_BG}" == "1" ]]; then
  "${TAILSCALE_BIN}" serve --bg --yes --https="${HTTPS_PORT}" "${TARGET_URL}"
  echo "[tailscale] serve configured in background mode."
  exit 0
fi

exec "${TAILSCALE_BIN}" serve --https="${HTTPS_PORT}" "${TARGET_URL}"
