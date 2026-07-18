# Configuration Guide

Related pages: [Home](./README.md) | [Spotify Developer Dashboard Setup](./spotify-dashboard.md) | [Local Simulator Guide](./simulator.md) | [Real Device Self-Host Guide](./device.md) | [Self-Hosting Details](./self-hosting.md) | [Usage Guide](./usage.md) | [Troubleshooting Guide](./troubleshooting.md)

This page covers the runtime configuration required inside the phone WebView.

## Auth Mode

There are two authentication paths:

| Mode | Start command | Use case | Redirect URI |
| --- | --- | --- | --- |
| `client` | `cd app && npm run dev:simulator` | Local simulator | `http://127.0.0.1:5173/callback.html` |
| `server` | `./scripts/start-self-host.sh` | Real device self-host | `https://<device>.<tailnet>.ts.net/api/auth/callback` |

`client` mode completes the PKCE callback in the browser. `server` mode lets the local self-host server handle the Spotify callback and token storage.

## Server Config File (Self-Host Script)

Deployment scripts read:

- `self-host.config.json` (project root)

Complete configuration template:

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

- `spotifyClientId`: the 32-character hexadecimal Client ID from Dashboard; never enter a Client Secret.
- `serviceOrigin`: the final Tailscale HTTPS origin. It is automatically included in the browser Origin allowlist.
- `allowedTailscaleUsers` (required): 1–20 allowed Tailscale login names, usually login email addresses. Each entry must exactly match the login associated with the phone user; do not enter a device hostname.
- `allowedOrigins` (optional): additional browser Origins. Packaged EvenHub use should include `"http://127.0.0.1:*"` to handle the local WebView port assigned after installation.
- `localPort`: the local loopback port.
- `mode`: keep `custom-origin`.

`localPort` is optional. If omitted, startup scripts default to `5173`.
If `PORT` env is set, `PORT` overrides `localPort`.

`allowedTailscaleUsers` cannot be omitted or empty; otherwise, the server refuses to start. It prevents other unauthorized members of the same tailnet from controlling your Spotify account. Find the exact login in the Tailscale client's account details or the admin console Users page.

`allowedOrigins` accepts exact HTTPS origins, loopback HTTP origins, the dedicated `"http://127.0.0.1:*"` rule, or the literal value `"null"`. The dedicated rule matches only HTTP Origins on `127.0.0.1` with a valid port; it does not match `localhost`, LAN, or public addresses, and every request still passes the `allowedTailscaleUsers` identity check. Use `"null"` only when the device actually reports a null Origin.

This file is used by:

- `./scripts/start-self-host.sh`
- `./scripts/start-self-host-docker.sh`
- `server/local-server.mjs`

## Configure Runtime Settings

Real-device self-host server mode:

1. Put `spotifyClientId`, `serviceOrigin`, and `allowedTailscaleUsers` in `self-host.config.json`
2. After starting the self-host server, tap `Connect Spotify`
3. Enter `<device>.<tailnet>.ts.net` in `Server API Origin`, then select `Save and connect server`
4. The backend configures:
   - `Service Origin` is `https://<device>.<tailnet>.ts.net`
   - `Redirect URI` is `https://<device>.<tailnet>.ts.net/api/auth/callback`
5. Use `Settings` / diagnostics only to verify `Effective Redirect URI`; the real-device main flow no longer requires manually saving runtime config
6. Tap `Connect Spotify`

## Server-Mode Security Boundary

- Protected APIs must pass both the Tailscale user allowlist and browser Origin allowlist.
- The local service listens only on `127.0.0.1`; Tailscale Serve is the supported HTTPS entry point. Do not use Funnel or expose the local port to a LAN or the public internet.
- Spotify access and refresh tokens stay in `.self-host/state.json` on the host. The directory mode is `0700`, and sensitive files use `0600`.
- The WebView receives only non-secret authorization metadata such as status, scopes, and expiry. Spotify requests go through the restricted `/api/spotify` backend proxy.
- Client debug logging is off by default. Set `ENABLE_CLIENT_DEBUG_LOGS=1` only temporarily while diagnosing a problem, then disable it again.
- Simulator `client` mode still completes PKCE directly in the local browser. Do not treat that development mode's local storage as the real-device server-mode token boundary.

Simulator client mode:

1. Open `Settings`
2. Paste your Spotify `Client ID`
3. Keep `Custom Origin` enabled
4. Keep the local origin such as `http://127.0.0.1:<Port>`
5. Click `Save Config`
6. Confirm `Current config source` is `Runtime`
7. Click `Connect Spotify`

## Spotify Developer Dashboard Fields

Field location, common URIs, and exact-match rules are documented in:

- [Spotify Developer Dashboard Setup](./spotify-dashboard.md)

Summary:

- simulator client mode uses `/callback.html`
- real-device server mode uses `/api/auth/callback`
- local HTTP is only for the local simulator and uses an explicit loopback IP such as `127.0.0.1`; do not use `localhost`

## Glasses Runtime Settings

In `Settings`, current runtime behavior is:

- Progress bar styles:
  - `= -` uses the default track length
  - `█ ▒` is fixed at 20 cells
  - `■ □` is fixed at 20 cells
- Auto hide:
  - `Auto Hide` toggle controls whether timeout hiding is active
  - `Auto Hide (sec)` is used only when `Auto Hide` is enabled
- Foreground enter does not auto-show hidden glasses UI.

## Important Origin Rule

Use the origin the user actually sees in the address bar.

Example:

- local app listens on `http://127.0.0.1:5173`
- Tailscale or a reverse proxy exposes it as `https://x.ts.net`

Then the real origin is:

- `https://x.ts.net`

Not:

- `http://127.0.0.1:5173`

Do not put the local listener into Spotify Redirect URI settings.

## Runtime Config Rules

- Runtime config key:
  - `spotify_self_host_config_v1`
- Priority:
  - `Server` (real-device self-host server mode)
  - `Runtime`
  - `Env`
  - `Missing`
- Runtime config is used only for simulator / client mode
- Removing runtime config falls back to env

## Service Origin Validation

Accepted:

- `https://x.ts.net`
- `https://x.ts.net:8443`

Rejected:

- `https://x.ts.net/app`
- `https://x.ts.net/?a=1`
- `https://x.ts.net/#hash`
- `http://x.ts.net`
- `http://192.168.1.10:5173`
- `100.x.x.x`
- `x.ts.net`

Normalization rules:

- `https://x.ts.net:443` becomes `https://x.ts.net`
- `HTTPS://X.TS.NET` becomes `https://x.ts.net`
- extra whitespace is trimmed before save
- after save, the normalized origin is written back to the input

## Custom Origin (v1)

- `custom-origin` is the real-device default path
- on real devices, tap `Input server domain`, enter `<device>.<tailnet>.ts.net` in `Server API Origin`, then tap `Save and connect server`
- the input may omit `https://`; the app generates `https://<device>.<tailnet>.ts.net`
- `Service Origin` is origin-only and does not include `/api/auth/callback`
- `Effective Redirect URI` shows the complete callback value to add in Spotify Developer Dashboard

## Effective Redirect URI

The app uses a mode-specific redirect URI:

| Mode | Effective Redirect URI |
| --- | --- |
| `client` / local simulator | `${effectiveServiceOrigin}/callback.html` |
| `server` / real-device self-host | `${effectiveServiceOrigin}/api/auth/callback` |

In `Settings` this value should be:

- single-line
- copyable
- used as the exact Spotify Redirect URI value

## If The Domain Changes

If your domain changes:

1. Tap `Input server domain`, enter the new `<device>.<tailnet>.ts.net` in Settings, then tap `Save and connect server`
2. Check the new `Effective Redirect URI`
3. Update the Redirect URI in Spotify Developer
4. Click `Clear Session`
5. Click `Connect Spotify` again

If the domain changed but Spotify Developer still has the old Redirect URI, authorization will fail.

## Clear Config vs Clear Session

### `Clear Config`

Clears only:

- `spotify_self_host_config_v1`

Does not clear:

- token bundle
- PKCE pending state
- authorized metadata
- last auth error

### `Clear Session`

In real-device `server` mode, this asks the backend to remove pending login, token, and error state from `.self-host/state.json`; the WebView does not hold tokens. In simulator `client` mode, it clears browser Spotify session state:

- `spotify_pkce_pending_v1`
- token bundle
- `authorized_client_id`
- `authorized_service_origin`
- last auth error

Does not clear:

- `spotify_self_host_config_v1`
