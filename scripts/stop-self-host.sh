#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-even-hub-spotify-console-self-host}"
STOP_TAILSCALE=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/stop-self-host.sh [--tailscale]

Options:
  --tailscale   Also reset local tailscale serve config.
  --help        Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tailscale)
      STOP_TAILSCALE=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[stop-self-host] unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

if command -v docker >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null
    echo "[stop-self-host] stopped container: ${CONTAINER_NAME}"
  else
    echo "[stop-self-host] container not found: ${CONTAINER_NAME}"
  fi
else
  echo "[stop-self-host] docker not found in PATH; skipped container stop."
fi

if [[ "${STOP_TAILSCALE}" == "1" ]]; then
  if command -v tailscale >/dev/null 2>&1; then
    TAILSCALE_BIN="$(command -v tailscale)"
  elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
    TAILSCALE_BIN="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
  else
    TAILSCALE_BIN=""
  fi

  if [[ -n "${TAILSCALE_BIN}" ]]; then
    "${TAILSCALE_BIN}" serve reset >/dev/null
    echo "[stop-self-host] reset tailscale serve config."
  else
    echo "[stop-self-host] tailscale binary not found; skipped tailscale reset."
  fi
fi
