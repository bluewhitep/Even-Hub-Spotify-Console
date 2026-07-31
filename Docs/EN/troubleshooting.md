# Troubleshooting Guide

Related pages: [Home](./README.md) | [Spotify Developer Dashboard Setup](./spotify-dashboard.md) | [Local Simulator Guide](./simulator.md) | [Real Device Self-Host Guide](./device.md) | [Self-Hosting Details](./self-hosting.md) | [Configuration Guide](./configuration.md) | [Usage Guide](./usage.md)

Use this page when setup appears correct but authorization or runtime behavior still fails.

Quick first step:

```bash
./scripts/deploy-doctor.sh
```

## Redirect URI Mismatch

Spotify authorization fails immediately if the configured redirect URI is not an exact match.

Check these fields:

- protocol
- hostname
- port (if any)
- path

Correct:

- `https://x.ts.net/api/auth/callback`

Incorrect:

- `https://x.ts.net/api/auth/callback/`
- `https://x.ts.net/callback.html`
- `https://x.ts.net/`

If the domain changed:

1. Select `Input server domain`, enter the new domain in Settings, and select `Save and connect server`
2. Check the displayed `Effective Redirect URI`
3. Update the Redirect URI in Spotify Developer
4. Click `Clear Session`
5. Connect again

## `403` Identity or Origin Denial

If a protected API returns `tailscale_identity_denied`:

1. Confirm the request passes through Tailscale Serve instead of reaching the local Node port directly.
2. Confirm `allowedTailscaleUsers` contains the Tailscale login of the phone's requesting user, not a device hostname.
3. Confirm the phone is not a tagged node; tagged nodes do not receive Serve user identity headers.
4. Restart the self-host server after editing configuration, then run `./scripts/deploy-doctor.sh`.

If it returns `browser_origin_denied`:

1. First confirm `serviceOrigin` exactly matches the HTTPS origin used by the phone; that origin is allowed automatically.
2. If packaged diagnostics show `http://127.0.0.1:<dynamic-port>`, confirm `allowedOrigins` contains the dedicated `"http://127.0.0.1:*"` rule.
3. Allow the literal value `"null"` only when the actual value is explicitly `null`; it matches every opaque-origin WebView.
4. Do not use a global `*`; only the complete `"http://127.0.0.1:*"` rule is supported. Do not disable the Origin boundary.

## PKCE State Problems

The frontend PKCE flow can fail when the login state expires or the return path does not match the pending login request.

Common failures:

- `state mismatch`
- `expired login`
- `missing login state`

Backend / callback error codes you may see:

- `pkce_state_missing`
- `pkce_state_mismatch`
- `pkce_pending_expired`
- `token_exchange_failed`
- `network_error`

If this happens:

1. Go back to `Settings`
2. Verify `Client ID`
3. Verify `Effective Redirect URI`
4. Click `Clear Session`
5. Start a fresh login and avoid opening multiple concurrent login windows

## WebView / Storage Isolation

Runtime config and login state are not universally shared across browser containers.

Examples:

- Safari
- Even App WebView
- another browser
- private / incognito mode

Even if the origin is the same, storage may still not be shared.

If config exists in Safari but not inside the Even App WebView, that is normal; configure it again inside the WebView.

## Cache / Refresh Behavior

If you redeploy and behavior does not change:

1. Close the current Even App page and reopen it
2. If needed, reopen or reinstall the latest `.ehpk`
3. If config changed, use `Clear Session`

Do not assume the WebView immediately discards its cached app instance.

## Real-Device WebView Goes Blank After Idle

If the real-device phone page becomes visually blank after sitting idle, but diagnostics or client logs still show an existing DOM and no `window-error` / `unhandledrejection`, check the `@evenrealities/even_hub_sdk` version first.

The current real-device release build should stay pinned to:

```text
@evenrealities/even_hub_sdk@0.0.9
```

Known risk:

- `0.0.10` added `src/shadow-timers.ts`
- `dist/index.js` has a top-level side effect
- when the SDK is imported, it overrides global `window.setTimeout`, `window.setInterval`, `window.clearTimeout`, and `window.clearInterval`
- in the real Even App WebView, this can stop render frames first, then timers, leaving the page visually blank

Do not build a real-device release package with `0.0.10+` until the upstream SDK fixes this behavior or provides an option to disable shadow timers.

## Recovering a Hidden GlassesView

After manual `H` hide or `Auto Hide`, GlassesView stays hidden until it receives a recovery interaction.

Current behavior:

- foreground-enter does not auto-show hidden UI
- `Auto Hide` timeout only hides when enabled; it does not auto-show

Recovery paths:

1. Click or scroll once in either direction on the glasses. The first interaction only restores the display; it does not play, skip, select a list item, transfer playback, or move focus
2. If gesture recovery fails, use the top refresh button in the phone WebView as a fault-recovery path. Phone forced refresh does not open the system exit confirmation

Double-click no longer hides or restores GlassesView; it opens the Even system exit confirmation.

## Development QR Generation / Viewer Issues

This section only applies to unpackaged development pages. Packaged `.ehpk` installation does not use a QR.

If development mode fails at QR generation:

1. ensure `self-host.config.json` exists and has valid `serviceOrigin` (`https://...` origin only)
2. ensure `evenhub` CLI is installed or install `qrcode` in `app/`
3. rerun:
   - `./scripts/start-self-host.sh`

If QR viewer page is blank:

- open:
  - `http://127.0.0.1:5173/api/self-host/qr/meta`
- confirm metadata exists
- check PNG file:
  - `qr/evenhub-entry.png`

## Diagnostics

`Settings` includes a diagnostics section for support screenshots.

Key fields:

- `Version` (`<app-version>_<6-char hex hash>`, for example `0.3.2_ab12cd`)
- `Connection`
- `Client ID`
- `Runtime`
- `Current page origin`
- `Effective serviceOrigin`
- `Effective redirectUri`
- `Authorized metadata`
- `clientNow`
- `tokenExpiresAt`
- `Last error`

If tokens appear to expire immediately, check device time / NTP first.

In real-device `server` mode, diagnostics should show only authorization status, scopes, expiry, and redacted summaries. They must not contain an access or refresh token. Client debug logging is off by default; set `ENABLE_CLIENT_DEBUG_LOGS=1` only for a short diagnostic session, then restart with it disabled.

## Rate Limiting

Spotify player endpoints can return rate-limit responses when polling is too dense or multiple control actions are fired too quickly.

Practical rules:

- avoid rapid repeated taps
- let the existing polling loop settle before forcing multiple refreshes
- if the app reports a cooldown, wait for it instead of retrying immediately

Rate limiting is usually a timing issue, not a configuration issue.
