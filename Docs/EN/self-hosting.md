# Self-Hosting Details

Related pages: [Home](./README.md) | [Spotify Developer Dashboard Setup](./spotify-dashboard.md) | [Real Device Self-Host Guide](./device.md) | [Local Simulator Guide](./simulator.md) | [Configuration Guide](./configuration.md) | [Usage Guide](./usage.md) | [Tailscale HTTPS Guide](./tailscale.md) | [Docker Guide](./docker.md) | [Raspberry Pi Guide](./raspberry-pi.md) | [Troubleshooting Guide](./troubleshooting.md)

This is the detailed setup flow for the real-device self-host server path.

For the local simulator only, use [Local Simulator Guide](./simulator.md).

## Quick Start

The normal self-hosted path is:

1. prepare `self-host.config.json`
2. start the local script (`./scripts/start-self-host.sh`)
3. expose local server through Tailscale HTTPS (script prompt or manual)
4. build the `.ehpk` with `npm run pack:ehpk`
5. transfer the `.ehpk` to the phone and open it locally with Even Realities App / Even Hub
6. configure Spotify Developer Redirect URI
7. connect Spotify in the phone WebView

The real-device self-host path uses the server callback:

- `https://<device>.<tailnet>.ts.net/api/auth/callback`

## 1) Prepare Config File

Create or edit:

```bash
cd <repo-root>
cp self-host.config.example.json self-host.config.json
```

Example:

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

`allowedTailscaleUsers` is required and must be a non-empty array. Enter the allowed Tailscale user login, usually the login email, not a device hostname. The server refuses to start when this field is missing or empty. This prevents other unauthorized members of the same tailnet from controlling your Spotify account. Find the exact login in the Tailscale client's account details or the admin console Users page.

`serviceOrigin` is automatically allowed. Packaged EvenHub should use `"http://127.0.0.1:*"` in `allowedOrigins` so a changed local WebView port after an app update can connect. It matches only valid HTTP ports on `127.0.0.1`, and requests still require an allowed Tailscale user. If the actual Origin is `null`, you may instead use the literal `"null"`, which allows every opaque-origin WebView.

## 1.1) Port Selection

Startup scripts resolve local port with this priority:

1. `PORT` environment variable
2. `localPort` in `self-host.config.json`
3. default `5173`

Examples:

```bash
PORT=8080 ./scripts/start-self-host.sh
```

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
  "localPort": 8080,
  "mode": "custom-origin"
}
```

## 2) Start Local Self-Host Script

Run from project root:

```bash
./scripts/start-self-host.sh
```

This script will:

1. read `self-host.config.json`
2. build frontend
3. start backend on `http://127.0.0.1:<port>`
4. ask whether to start tailscale proxy now (host machine)
5. if tailscale setup succeeds, also generate a development-only QR PNG at `qr/evenhub-entry.png`
6. print the host-local development QR viewer link:
   - `http://127.0.0.1:<port>/api/self-host/qr/view`
7. if tailscale is skipped, show manual `evenhub qr` development guidance instead

If you skip the prompt, you can start Tailscale manually:

```bash
./scripts/start-tailscale-proxy.sh <port>
```

Run deploy checks anytime:

```bash
./scripts/deploy-doctor.sh
```

Stop services:

```bash
./scripts/stop-self-host.sh
```

Stop services and reset tailscale serve config:

```bash
./scripts/stop-self-host.sh --tailscale
```

QR output is a development aid for an unpackaged page; it is not part of `.ehpk` installation. Use `evenhub qr` manually only when you need that development mode. A packaged app does not need a QR.

## 3) Open the `.ehpk` in Even App

Build the package first:

```bash
cd <repo-root>/app
npm run pack:ehpk
```

Transfer `ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk` to the phone, then open it locally through the file manager or share sheet with Even Realities App / Even Hub. The release flow does not scan a QR. App code starts from the local package; Spotify and self-host API requests still use the Tailscale HTTPS `serviceOrigin` from `self-host.config.json`.

Only developers running an unpackaged page should use `qr/evenhub-entry.png` or the local QR viewer. That path does not replace `.ehpk` device acceptance.

## 4) Tailscale HTTPS

If not started by script prompt:

```bash
./scripts/start-tailscale-proxy.sh <port>
```

This exposes the local app through your `https://<device>.<tailnet>.ts.net` origin.

Tailscale Serve also injects the requesting user's identity for protected APIs. The backend accepts only logins in `allowedTailscaleUsers`, and the local upstream must remain on `127.0.0.1`. Do not use Funnel, expose the local port to a LAN or the public internet, or use a tagged node as the phone request source; tagged nodes do not receive the required user identity header.

## 5) Spotify Developer

Field location, real-device URI, and exact-match rules are documented in:

- [Spotify Developer Dashboard Setup](./spotify-dashboard.md)

Real-device self-host server uses:

- `Website`: `https://<device>.<tailnet>.ts.net`
- `Redirect URI`: `https://<device>.<tailnet>.ts.net/api/auth/callback`

Then copy the `Client ID` into `self-host.config.json`.

On a real device, select `Login Spotify` and use your Spotify account rather than Google quick login. Return to or reopen the plugin after authorization. For the first connection or when the server address is wrong, select `Input server domain`, enter `<device>.<tailnet>.ts.net` in `Server API Origin`, then select `Save and connect server`. You may omit `https://`; the backend derives the full callback.

## 6) Runtime Settings In WebView

Runtime setting details are documented in:

- [Configuration Guide](./configuration.md)

This includes:

- `Client ID`
- `Service Origin`
- Settings opened by `Input server domain`, including `Server API Origin` and `Save and connect server`
- exact redirect URI rules
- `Clear Config`
- `Clear Session`

## Callback, Diagnostics, and Failure Recovery

The full troubleshooting and callback behavior notes are documented in:

- [Troubleshooting Guide](./troubleshooting.md)

This includes:

- `state mismatch`
- expired login
- WebView storage isolation
- diagnostics fields
- cache / refresh behavior

## 7) Local Automated Checks and Device Acceptance

Run at least these checks for every release candidate:

```bash
cd <repo-root>/app
npm ci
npm audit
npm test
npm run build:device
npm run pack:ehpk
```

The local gate checks dependencies, server-side token containment, identity and Origin denial, the Spotify proxy route allowlist, building, and packaging. Spotify authorization, playback control, phone WebView, and glasses GlassesView still require manual testing because local automation cannot connect to your Spotify account and Even hardware. The detailed checklist and acceptance record remain in local development documentation that is not tracked by Git.

## 8) Spotify Web API 2026 Compatibility

The implementation uses the post-migration API shape: save/remove uses generic `PUT` / `DELETE /me/library` with a Spotify URI, and playlist totals prefer `items.total` while retaining a legacy `tracks.total` fallback. See the [Spotify February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide). These compatibility changes do not alter Spotify's account, quota, or commercial-use policies.

## 9) EvenHub Pack Metadata (`app.json`)

Use EvenHub CLI to generate metadata template:

```bash
evenhub init
```

Packaging field example used by this project:

```json
{
  "package_id": "com.example.g2demo",
  "edition": "202601",
  "name": "G2 Demo",
  "version": "0.3.0",
  "min_app_version": "0.1.0",
  "tagline": "A short description of the app",
  "description": "A relatively long description of the app",
  "author": "Your Name",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["evenhub.evenrealities.com"],
    "fs": ["./assets"]
  }
}
```

What to fill before packing:

- `package_id`: unique app ID (reverse-domain style, do not reuse another app's ID)
- `edition`: keep CLI template unless your EvenHub workflow requires another edition code
- `name`: app display name
- `version`: app version string
- `min_app_version`: minimum Even app version
- `tagline` / `description`: short and long app description
- `author`: author info
- `entrypoint`: startup HTML file in your built output (`index.html` in this project)
- `permissions`: keep only required scopes (`network`, `fs`, etc.)

Pack command:

```bash
cd <repo-root>
cd app
npm run pack:ehpk
```

The package is written to:

```text
ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk
```

Optional package ID availability check:

```bash
evenhub pack app.json ./app/dist --check
```

## Notes

- Raspberry Pi and Docker variants are documented here:
  - [Raspberry Pi Guide](./raspberry-pi.md)
  - [Docker Guide](./docker.md)
  - Docker mode also runs Tailscale on the host; any generated QR is only for unpackaged development
- Tailscale details and prerequisites:
  - [Tailscale HTTPS Guide](./tailscale.md)

After connecting, see the separate [phone WebView](./webview.md) and [GlassesView](./glassesview.md) guides.

## Legacy Manual Flow

You can still run the backend manually:

```bash
cd <repo-root>/app
npm install
npm run host:device
```

This starts local backend on:

- `127.0.0.1:5173`
