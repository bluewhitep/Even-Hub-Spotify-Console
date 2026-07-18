#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${SELF_HOST_CONFIG_FILE:-${ROOT_DIR}/self-host.config.json}"
PORT="${PORT:-5173}"
LOCAL_BASE_URL="${SELF_HOST_LOCAL_BASE_URL:-http://127.0.0.1:${PORT}}"
HEALTH_URL="${LOCAL_BASE_URL}/api/health"
STATE_URL="${LOCAL_BASE_URL}/api/self-host/state"

FAIL_COUNT=0
WARN_COUNT=0

print_ok() {
  echo "[PASS] $1"
}

print_warn() {
  echo "[WARN] $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

print_fail() {
  echo "[FAIL] $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo "== Self-Host Deploy Doctor =="
echo "project: ${ROOT_DIR}"
echo "config:  ${CONFIG_FILE}"
echo "local:   ${LOCAL_BASE_URL}"
echo

if [[ ! -f "${CONFIG_FILE}" ]]; then
  print_fail "Config file not found. Create ${CONFIG_FILE} from self-host.config.example.json."
else
  CONFIG_CHECK_OUTPUT="$(
    node - "${CONFIG_FILE}" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
try {
  const raw = fs.readFileSync(file, 'utf8');
  const cfg = JSON.parse(raw);
  const spotifyClientId = String(cfg.spotifyClientId || '').trim();
  if (!/^[0-9a-f]{32}$/i.test(spotifyClientId)) {
    console.log('ERR:invalid_client_id');
    process.exit(0);
  }
  const originRaw = String(cfg.serviceOrigin || '').trim();
  if (!originRaw) {
    console.log('ERR:missing_service_origin');
    process.exit(0);
  }
  let url;
  try {
    url = new URL(originRaw);
  } catch {
    console.log('ERR:invalid_service_origin');
    process.exit(0);
  }
  if (url.protocol !== 'https:') {
    console.log('ERR:service_origin_not_https');
    process.exit(0);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    console.log('ERR:service_origin_not_origin_only');
    process.exit(0);
  }
  if (!Array.isArray(cfg.allowedTailscaleUsers) || cfg.allowedTailscaleUsers.length < 1 ||
      cfg.allowedTailscaleUsers.length > 20 ||
      cfg.allowedTailscaleUsers.some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 254)) {
    console.log('ERR:invalid_tailscale_users');
    process.exit(0);
  }
  if (cfg.allowedOrigins !== undefined && (!Array.isArray(cfg.allowedOrigins) || cfg.allowedOrigins.length > 20)) {
    console.log('ERR:invalid_allowed_origins');
    process.exit(0);
  }
  for (const value of cfg.allowedOrigins || []) {
    if (typeof value !== 'string') {
      console.log('ERR:invalid_allowed_origins');
      process.exit(0);
    }
    const origin = value.trim();
    if (origin === 'null') continue;
    if (origin === 'http://127.0.0.1:*') continue;
    let allowed;
    try {
      allowed = new URL(origin);
    } catch {
      console.log('ERR:invalid_allowed_origins');
      process.exit(0);
    }
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(allowed.hostname);
    if ((allowed.protocol !== 'https:' && !(allowed.protocol === 'http:' && loopback)) ||
        allowed.pathname !== '/' || allowed.search || allowed.hash) {
      console.log('ERR:invalid_allowed_origins');
      process.exit(0);
    }
  }
  const protocol = url.protocol.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const isDefaultPort =
    (protocol === 'https:' && url.port === '443') ||
    (protocol === 'http:' && url.port === '80');
  const port = !url.port || isDefaultPort ? '' : `:${url.port}`;
  const normalizedOrigin = `${protocol}//${hostname}${port}`;
  console.log(`OK:${spotifyClientId}:${normalizedOrigin}`);
} catch {
  console.log('ERR:invalid_json');
}
NODE
  )"

  if [[ "${CONFIG_CHECK_OUTPUT}" == ERR:* ]]; then
    case "${CONFIG_CHECK_OUTPUT}" in
      ERR:invalid_json)
        print_fail "Config JSON is invalid."
        ;;
      ERR:invalid_client_id)
        print_fail "spotifyClientId must be a 32-character hexadecimal Client ID."
        ;;
      ERR:missing_service_origin)
        print_fail "serviceOrigin is missing in config."
        ;;
      ERR:invalid_service_origin)
        print_fail "serviceOrigin is not a valid URL."
        ;;
      ERR:service_origin_not_https)
        print_fail "serviceOrigin must use HTTPS."
        ;;
      ERR:service_origin_not_origin_only)
        print_fail "serviceOrigin must be origin-only (no path/query/hash)."
        ;;
      ERR:invalid_tailscale_users)
        print_fail "allowedTailscaleUsers must contain 1-20 exact Tailscale login names."
        ;;
      ERR:invalid_allowed_origins)
        print_fail "allowedOrigins must contain exact HTTPS/loopback origins, http://127.0.0.1:* for packaged EvenHub, or \"null\"."
        ;;
      *)
        print_fail "Unknown config validation error: ${CONFIG_CHECK_OUTPUT}"
        ;;
    esac
  else
    SPOTIFY_CLIENT_ID="$(echo "${CONFIG_CHECK_OUTPUT}" | cut -d':' -f2)"
    # Recompute service origin robustly to avoid split surprises.
    SERVICE_ORIGIN="$(
      node - "${CONFIG_FILE}" <<'NODE'
const fs = require('node:fs');
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const u = new URL(String(cfg.serviceOrigin).trim());
const protocol = u.protocol.toLowerCase();
const hostname = u.hostname.toLowerCase();
const isDefaultPort =
  (protocol === 'https:' && u.port === '443') ||
  (protocol === 'http:' && u.port === '80');
const port = !u.port || isDefaultPort ? '' : `:${u.port}`;
process.stdout.write(`${protocol}//${hostname}${port}`);
NODE
    )"
    EXPECTED_REDIRECT_URI="${SERVICE_ORIGIN}/api/auth/callback"
    ALLOWED_TAILSCALE_USER="$(
      node - "${CONFIG_FILE}" <<'NODE'
const fs = require('node:fs');
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(String(cfg.allowedTailscaleUsers[0]).trim());
NODE
    )"
    print_ok "Config is valid."
    echo "      spotifyClientId: ${SPOTIFY_CLIENT_ID:0:6}...${SPOTIFY_CLIENT_ID: -4}"
    echo "      serviceOrigin:   ${SERVICE_ORIGIN}"
    echo "      redirectUri:     ${EXPECTED_REDIRECT_URI}"
    echo "      access identity: ${ALLOWED_TAILSCALE_USER}"
  fi
fi

if command -v tailscale >/dev/null 2>&1; then
  print_ok "tailscale CLI found in PATH."
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  print_ok "tailscale CLI found at macOS app path."
else
  print_warn "tailscale CLI not found. Tailscale HTTPS proxy may need manual setup."
fi

if [[ -n "${SERVICE_ORIGIN:-}" ]] && [[ "${SERVICE_ORIGIN}" == *".ts.net"* ]]; then
  print_ok "serviceOrigin looks like Tailscale HTTPS origin."
elif [[ -n "${SERVICE_ORIGIN:-}" ]]; then
  print_warn "serviceOrigin is not a *.ts.net origin (this is fine if you use another HTTPS domain)."
fi

if curl -fsS "${HEALTH_URL}" >/tmp/deploy-doctor-health.json 2>/dev/null; then
  BUILD_VERSION="$(
    node - /tmp/deploy-doctor-health.json <<'NODE'
const fs = require('node:fs');
try {
  const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(String(obj.buildVersion || 'unknown'));
} catch {
  process.stdout.write('unknown');
}
NODE
  )"
  print_ok "Local self-host server is reachable at ${HEALTH_URL}."
  echo "      buildVersion: ${BUILD_VERSION}"
else
  print_warn "Local self-host server is not reachable at ${HEALTH_URL}."
fi

if [[ -n "${ALLOWED_TAILSCALE_USER:-}" ]] && curl -fsS -H "Tailscale-User-Login: ${ALLOWED_TAILSCALE_USER}" "${STATE_URL}" >/tmp/deploy-doctor-state.json 2>/dev/null; then
  STATE_EFFECTIVE_REDIRECT="$(
    node - /tmp/deploy-doctor-state.json <<'NODE'
const fs = require('node:fs');
try {
  const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(String(obj.effectiveRedirectUri || ''));
} catch {
  process.stdout.write('');
}
NODE
  )"
  STATE_SOURCE="$(
    node - /tmp/deploy-doctor-state.json <<'NODE'
const fs = require('node:fs');
try {
  const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(String(obj.configSource || 'unknown'));
} catch {
  process.stdout.write('unknown');
}
NODE
  )"
  print_ok "Local state endpoint is reachable."
  echo "      configSource: ${STATE_SOURCE}"
  echo "      effectiveRedirectUri: ${STATE_EFFECTIVE_REDIRECT}"
  STATE_TOKEN_BOUNDARY="$(
    node - /tmp/deploy-doctor-state.json <<'NODE'
const fs = require('node:fs');
try {
  const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const raw = JSON.stringify(obj);
  const leaked = Object.hasOwn(obj, 'tokenBundle') || /\"(?:access_token|refresh_token)\"\s*:/.test(raw);
  process.stdout.write(leaked ? 'LEAK' : 'PASS');
} catch {
  process.stdout.write('INVALID');
}
NODE
  )"
  if [[ "${STATE_TOKEN_BOUNDARY}" == "PASS" ]]; then
    print_ok "State API does not expose Spotify access or refresh tokens."
  else
    print_fail "State API token-boundary check failed (${STATE_TOKEN_BOUNDARY})."
  fi
  if [[ -n "${EXPECTED_REDIRECT_URI:-}" ]] && [[ -n "${STATE_EFFECTIVE_REDIRECT}" ]]; then
    if [[ "${EXPECTED_REDIRECT_URI}" == "${STATE_EFFECTIVE_REDIRECT}" ]]; then
      print_ok "Expected redirect URI matches runtime effective redirect URI."
    else
      print_warn "Config redirect URI and runtime effective redirect URI are different."
    fi
  fi
else
  print_warn "Local state endpoint is not reachable at ${STATE_URL}."
fi

echo
echo "== Summary =="
echo "fail: ${FAIL_COUNT}"
echo "warn: ${WARN_COUNT}"

if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  exit 1
fi

exit 0
