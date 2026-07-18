# Local Deployment

This guide explains how to run the self-host backend on a computer or Raspberry Pi, build an `.ehpk`, and open the package locally with Even Realities App / Even Hub on the phone. QR loading is only for unpackaged development pages; it is not the release installation or pairing flow.

## Prerequisites

| Item | Requirement |
| --- | --- |
| Operating system | macOS, Linux, or Raspberry Pi OS with a terminal |
| Node.js | `20.19+` or `22.12+`, with npm |
| Spotify | The app owner has Premium; the device Redirect URI is configured in Dashboard |
| Tailscale | The host and phone belong to the same trusted tailnet; the host has a `*.ts.net` HTTPS name |
| Even devices | Even Realities App is installed on the phone; the glasses have completed normal system pairing with the phone |
| Packaging tools | Git and `@evenrealities/evenhub-cli` |

Complete [Spotify Developer Dashboard Setup](./spotify-dashboard.md) first. The self-host Redirect URI must be:

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

## Install Development Dependencies

1. Clone the repository:

   ```bash
   git clone https://github.com/bluewhitep/Even-Hub-Spotify-Console.git
   cd Even-Hub-Spotify-Console
   ```

2. Install the locked frontend dependencies and EvenHub CLI:

   ```bash
   cd app
   npm ci
   cd ..
   npm install -g @evenrealities/evenhub-cli
   ```

3. Confirm that Tailscale is connected:

   ```bash
   tailscale status
   ```

The macOS GUI version of Tailscale is also supported; the startup script looks for its bundled CLI. See [Docker](./docker.md) and [Raspberry Pi](./raspberry-pi.md) for platform-specific steps.

## Configure the Backend

1. Create a local configuration from the template:

   ```bash
   cp self-host.config.example.json self-host.config.json
   ```

2. Edit `self-host.config.json`:

   ```json
   {
     "spotifyClientId": "your_spotify_client_id",
     "serviceOrigin": "https://your-device.your-tailnet.ts.net",
     "allowedTailscaleUsers": [
       "your-tailscale-user-login"
     ],
     "allowedOrigins": [
       "http://127.0.0.1:*"
     ],
     "localPort": 5173,
     "mode": "custom-origin"
   }
   ```

Field rules:

- `spotifyClientId`: the 32-character hexadecimal Client ID from Spotify Dashboard, not the Client Secret.
- `serviceOrigin`: an HTTPS origin only, without `/api/auth/callback`, another path, a query, or a trailing slash.
- `allowedTailscaleUsers`: allowed Tailscale user login names; each must match exactly. Do not enter a device hostname.
- `allowedOrigins`: packaged EvenHub uses `"http://127.0.0.1:*"` so an installation-assigned local WebView port can connect. It does not match `localhost`, LAN, or public addresses, and requests still require an allowed Tailscale user.
- `localPort`: the local server port; the default is `5173`.
- `mode`: keep `custom-origin`.

If the real device explicitly reports `Current page origin` as `null`, the literal value `"null"` can be added to `allowedOrigins`. It allows every opaque-origin WebView and must not be the default.

## Run the Local Automated Gate

Before deployment, run from the repository:

```bash
cd <repo-root>/app
npm ci
npm audit
npm test
npm run build:device
npm run pack:ehpk
```

Expected results: locked dependencies install, `npm audit` reports zero vulnerabilities, self-host security tests pass, and both the device build and `.ehpk` package succeed. These checks do not need Spotify or Even hardware, but they do not replace the manual device validation below.

## Start the Backend

Run from the repository root:

```bash
./scripts/start-self-host.sh
```

The script builds the frontend, starts the server on `127.0.0.1:<localPort>`, and asks whether to configure Tailscale Serve. Enable Tailscale HTTPS when prompted. Keep the terminal open; `Ctrl+C` stops the local Node server.

The current startup script may also print a development QR. Do not scan it for the packaged release flow. It only makes an unpackaged page that is still running on the development computer available to the phone.

## Build the `.ehpk`

In another terminal, run:

```bash
cd <repo-root>/app
npm run pack:ehpk
```

The generated file is written to:

```text
ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk
```

`<build-hash>` is a six-character build hash. Each packaging run removes older generated packages with the same base name. `.ehpk` files and build metadata are ignored by Git.

## Install and Open the Package on the Phone

1. Transfer the generated `.ehpk` to the phone.
2. Open it from the phone's file manager or share sheet and choose Even Realities App / Even Hub as the handler.
3. Open the installed Spotify Console package from Even Hub. The exact “Open with” text varies by mobile OS, but the action is to open the `.ehpk` directly, not to scan a QR code.
4. On first launch, select `Input server domain`, enter `<device>.<tailnet>.ts.net` in `Server API Origin`, then select `Save and connect server`. You may omit `https://`; do not enter a path.
5. Select “Log in to Spotify,” return to the app after Spotify login, and then select “Connect Spotify.”
6. Start a track in the official Spotify client and confirm that both the phone WebView and GlassesView can read and control playback.

## Development QR Versus a Packaged App

| Path | Purpose | Uses `.ehpk` | Requires QR |
| --- | --- | --- | --- |
| Local simulator | Browser development without a device | No | No |
| Development QR | Loads an unpackaged page from the development computer for rapid iteration | No | Yes |
| Local package install | Opens the real packaged artifact in Even Hub | Yes | No |

The official command for the development path is `evenhub qr`. It must not be treated as the packaged installation step and does not replace `.ehpk` validation.

## Verify the Deployment

While the server is running, use another terminal:

```bash
./scripts/deploy-doctor.sh
```

At minimum, confirm that:

- configuration validation reports `PASS`;
- the local health endpoint is reachable;
- the runtime effective Redirect URI exactly matches Dashboard;
- the app opened from the local `.ehpk` can complete login and connection;
- GlassesView displays the current track and responds to a single-click action.

Spotify and Even device integration cannot be fully replaced by local automation, so manual real-device acceptance remains required before release. The detailed checklist and acceptance record are kept in local development documentation that is not tracked by Git.

## Update

1. Stop the current service and update the source:

   ```bash
   git pull --ff-only
   cd app
   npm ci
   cd ..
   ```

2. Restart the backend and run `npm run pack:ehpk` again.
3. Open the new `.ehpk` on the phone to update the package.
4. Rerun deploy doctor and manually verify authorization, playback, and glasses controls.

The local configuration can normally be retained. If the Client ID or service domain changes, clear the old WebView session before authorizing again.

## Stop and Uninstall

- Foreground Node deployment: press `Ctrl+C` in the `start-self-host.sh` terminal.
- Docker deployment: run `./scripts/stop-self-host.sh`.
- To also remove Tailscale Serve rules, run `./scripts/stop-self-host.sh --tailscale` or `tailscale serve reset`.
- Uninstall the package from Even Hub.
- If the CLI is no longer needed, run `npm uninstall -g @evenrealities/evenhub-cli`.
- Back up any local configuration you need before manually deleting the repository directory.

## Security Boundary

- Run only inside a trusted private tailnet. Do not enable Tailscale Funnel or attach a public reverse proxy.
- Tailscale Serve injects the requesting user's identity; `allowedTailscaleUsers` must contain only users who actually need access.
- Do not commit `self-host.config.json`, `.self-host/`, `qr/`, or any token.
- Do not bind `localPort` to a LAN or the public network. The Tailscale Serve upstream must remain on loopback, or a direct caller could spoof an identity header.
- In real-device server mode, Spotify tokens stay on the host. The WebView uses the restricted `/api/spotify` proxy and never receives an access or refresh token.
- This is a personal self-host application, not a public multi-user Spotify service.

Continue with [Phone WebView](./webview.md), [GlassesView](./glassesview.md), and [Troubleshooting](./troubleshooting.md).
