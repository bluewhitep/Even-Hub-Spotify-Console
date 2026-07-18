# Privacy and Local Data

Even Hub Spotify Console is self-hosted. It does not provide a central account, analytics, or data-collection service operated by the project maintainer. Your app instance communicates directly with Spotify, Tailscale, and your own local self-host service.

## Data processed

- Spotify `Client ID`, granted scopes, token expiry, and OAuth tokens.
- Current playback state, track and artist names, playlists, saved state, and album-art URLs.
- UI, GlassesView, and playlist settings.
- Tailscale user allowlist, service origin, and allowed origins from the self-host configuration.

Never enter a Spotify `Client Secret` in this project.

## Where data is stored

- Real-device self-host mode: OAuth tokens remain in `.self-host/state.json` on the host and are not returned to the phone WebView. Local configuration remains in the untracked `self-host.config.json`.
- Local simulator mode: the OAuth session and interface settings remain in local storage for the current browser or WebView.
- The project includes no telemetry, advertising, remote analytics, or maintainer-operated data upload service by default.

Spotify APIs, the album-art CDN, and Tailscale process request-related network and account data under their own privacy policies.

## Clear and disconnect

1. Use `Clear Session` in WebView settings to clear the current Spotify session.
2. Revoke the Developer app from the Apps page of your Spotify account.
3. Stop the self-host service and, when appropriate, delete `.self-host/state.json`, `.self-host/client-debug.jsonl`, `self-host.config.json`, and `simulator.config.json`.
4. Uninstall the Even Hub package and clear the related WebView or browser site data.

Deleting `self-host.config.json` also removes the locally stored Tailscale user allowlist. Back up any non-sensitive settings you still need before deletion.

## Logs and security

Client debug logging is disabled by default. If temporarily enabled for troubleshooting, logs may include request times, error codes, and playback-related metadata. OAuth codes, tokens, and verifiers are redacted by the implementation, but logs must still be treated as private local data and must not be committed or published.

Self-host must listen only on loopback and be used through a trusted private tailnet. Do not enable Tailscale Funnel or expose the service through a public reverse proxy.

## User responsibility

Each self-host user controls the data in their own instance and must protect the host, Tailscale account, and Spotify Developer app. Use must comply with the [Spotify Developer Terms](https://developer.spotify.com/terms), [Developer Policy](https://developer.spotify.com/policy), and applicable law. Never paste tokens, Client IDs, user email addresses, real origins, or raw logs into a public Issue.
