# Docker Guide

Related pages: [Home](./README.md) | [Self-Hosting Details](./self-hosting.md) | [Real Device Self-Host Guide](./device.md) | [Tailscale HTTPS Guide](./tailscale.md) | [Raspberry Pi Guide](./raspberry-pi.md) | [Troubleshooting Guide](./troubleshooting.md)

Use this guide if you want to run the self-host service in a container instead of running the local host process directly.

## Scope

This path covers:

- building the frontend locally on the host
- serving the host-built `app/dist` files from a container
- exposing the container through a stable HTTPS origin

This does not change the Spotify setup rules:

- users still access the final `https://...` origin
- Spotify still uses:
  - `https://<your-domain>/api/auth/callback`

## Recommended Script (Build Once, Run Lightweight)

Run from project root:

```bash
cd <repo-root>
./scripts/start-self-host-docker.sh
```

Run and return to shell immediately (detached mode):

```bash
./scripts/start-self-host-docker.sh --detach
```

This script:

1. reads `self-host.config.json`
2. installs frontend dependencies only if `app/node_modules` is missing
3. builds the frontend locally with `npm run build:device`
4. starts a Node container that mounts the local `server/` and `app/dist/`
5. asks whether to start tailscale proxy now
6. runs `start-tailscale-proxy.sh` on host machine (not in container)
7. if tailscale setup succeeds, generates a local QR PNG only for unpackaged development (`qr/evenhub-entry.png`)
8. prints the development-only host-local QR viewer link:
   - `http://127.0.0.1:5173/api/self-host/qr/view`
9. if tailscale is skipped, prints manual `evenhub qr` development guidance

Container runtime shape:

- runtime image: `node:20-alpine`
- frontend build: host-local `app/dist`, mounted read-only into the container
- mounts:
  - `server/` (read-only)
  - `app/dist/` (read-only)
  - `self-host.config.json` (read-only)
  - `.self-host/` (state)
  - `qr/` (optional unpackaged-development QR output)
- tailscale:
  - always executed on host for stable `*.ts.net` identity
- local URL:
  - `http://127.0.0.1:5173`

`http://127.0.0.1:5173` is only for host-internal access and the optional development QR viewer. In packaged use, the phone starts the local `.ehpk` and then reaches the backend through the Tailscale HTTPS `serviceOrigin`.

## Manual Equivalent Command

Build the frontend locally:

```bash
cd app
npm run build:device
cd ..
```

Run container:

```bash
docker run --rm \
  --name even-hub-spotify-console-self-host \
  -w /workspace \
  -p 127.0.0.1:5173:5173 \
  -e HOST=0.0.0.0 \
  -e PORT=5173 \
  -e SELF_HOST_CONFIG_FILE=/workspace/self-host.config.json \
  -v "$PWD/self-host.config.json:/workspace/self-host.config.json:ro" \
  -v "$PWD/server:/workspace/server:ro" \
  -v "$PWD/app/dist:/workspace/app/dist:ro" \
  -v "$PWD/.self-host:/workspace/.self-host" \
  -v "$PWD/qr:/workspace/qr" \
  node:20-alpine \
  node /workspace/server/local-server.mjs
```

Detached mode via env variable:

```bash
SELF_HOST_DETACH=1 ./scripts/start-self-host-docker.sh
```

Stop container:

```bash
./scripts/stop-self-host.sh
```

Stop container and reset tailscale serve config:

```bash
./scripts/stop-self-host.sh --tailscale
```

## Expose It Through Tailscale HTTPS

Then expose the local container through Tailscale:

```bash
./scripts/start-tailscale-proxy.sh 5173
```

The user-facing URL is the final Tailscale HTTPS origin, for example:

- `https://<device>.<tailnet>.ts.net`

Do not use:

- `http://127.0.0.1:5173`
- `http://100.x.x.x`

as the Spotify redirect URI.

## Required Spotify Redirect URI

Use the final HTTPS origin:

- `https://<device>.<tailnet>.ts.net/api/auth/callback`

Do not point Spotify at the local container listener.

## When To Use This Path

Use Docker if you want:

- a repeatable local host setup
- a cleaner process boundary than running a node/static process directly
- a path that is easy to move onto a small dedicated host later
