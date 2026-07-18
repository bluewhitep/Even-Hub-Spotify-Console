# Raspberry Pi Guide

Related pages: [Home](./README.md) | [Self-Hosting Details](./self-hosting.md) | [Real Device Self-Host Guide](./device.md) | [Tailscale HTTPS Guide](./tailscale.md) | [Docker Guide](./docker.md) | [Troubleshooting Guide](./troubleshooting.md)

Use this guide if you want a small always-on host for personal deployment.

## Core Rule

The Raspberry Pi can host the app locally on:

- `http://127.0.0.1:<port>`

But users must access it through the final HTTPS URL, for example:

- `https://<pi>.<tailnet>.ts.net`

Do not put the local listener address into Spotify Redirect URI settings.

## Option 1: Pure Static + Tailscale HTTPS

Recommended (project-root script):

```bash
cd <repo-root>
./scripts/start-self-host.sh
```

This script works on Raspberry Pi as long as Node and npm are installed.
It reads `self-host.config.json`, builds the app, starts the local server, and can optionally start the Tailscale proxy. Any QR it generates is only for unpackaged development. For packaged device use, run `npm run pack:ehpk` from `app/` and open the `.ehpk` locally on the phone.

Manual equivalent:

```bash
cd app
npm install
npm run build:device
npx serve -s dist -l tcp://127.0.0.1:5173
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=443 http://127.0.0.1:5173
```

The user-facing URL is:

- `https://<pi>.<tailnet>.ts.net`

## Optional Container Variant

If you want the Raspberry Pi to run the frontend in a container, use the Docker path here:

- [Docker Guide](./docker.md)

Project-root script for container mode:

```bash
cd <repo-root>
./scripts/start-self-host-docker.sh
```

## Rules To Keep Straight

- the Raspberry Pi only needs to host the local HTTP listener
- HTTPS can terminate at Tailscale
- Spotify must use the final public HTTPS origin
- the redirect URI must be:
  - `https://<pi>.<tailnet>.ts.net/api/auth/callback`

## Why This Is Useful

A Raspberry Pi gives you:

- a stable personal self-host target
- a small always-on device
- a cleaner long-running setup than a temporary laptop session
