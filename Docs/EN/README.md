# Even Hub Spotify Console Documentation

[![App Version](https://img.shields.io/badge/app-0.3.2-blue)](../../app.json) [![Even Hub SDK](https://img.shields.io/badge/Even%20Hub%20SDK-0.0.9-7c3aed)](../../app/package.json) [![Docs](https://img.shields.io/badge/docs-ZH%20%7C%20EN%20%7C%20JP-0f766e)](./README.md) [![Simulator](https://img.shields.io/badge/mode-simulator-2563eb)](./simulator.md) [![Self Host](https://img.shields.io/badge/mode-self--host-16a34a)](./deployment.md) [![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-orange)](../../LICENSE)

[中文](../ZH/README.md) | [English](./README.md) | [日本語](../JP/README.md) | [Project home](../../README.md)

Even Hub Spotify Console uses the phone WebView for Spotify sign-in, playback, and settings, and GlassesView for playback information and gesture controls.

## First-time setup

1. Complete the [Spotify Developer Dashboard setup](./spotify-dashboard.md).
2. Choose a runtime:
   - For the quickest trial or development workflow, use the [local simulator](./simulator.md).
   - For a real phone and glasses, follow [local deployment](./deployment.md).
3. After connecting, read the separate [phone WebView](./webview.md) and [GlassesView](./glassesview.md) guides.
4. If something fails, run the relevant checklist and then use [troubleshooting](./troubleshooting.md).

## Core guides

| Guide | What it covers |
| --- | --- |
| [Spotify Developer Dashboard](./spotify-dashboard.md) | Create the app, add Redirect URIs, copy the Client ID, and allow users |
| [Local deployment](./deployment.md) | Prerequisites, installation, configuration, startup, verification, update, stop, and uninstall |
| [Phone WebView](./webview.md) | Authorization, playback modes, playlists, settings persistence, and recovery |
| [GlassesView](./glassesview.md) | `H` hide, click/scroll recovery, double-click system exit confirmation, playlists, and device transfer |

## Runtime and configuration

- [Configuration fields](./configuration.md)
- [Local simulator](./simulator.md)
- [Real-device quick guide](./device.md)
- [Detailed self-hosting guide](./self-hosting.md)
- [Tailscale HTTPS (recommended)](./tailscale.md)
- [Docker deployment](./docker.md)
- [Raspberry Pi deployment](./raspberry-pi.md)

## Validation and troubleshooting

- [Troubleshooting](./troubleshooting.md)

## Security boundary

- [Privacy and local data](./privacy.md)
- Enter only the Spotify `Client ID`; never store or commit the `Client Secret`.
- `simulator.config.json`, `self-host.config.json`, `.self-host/`, and `qr/` are local runtime data and must not be committed.
- Tailscale Serve on a trusted private tailnet is recommended because it provides HTTPS, private access, and user identity together. Another HTTPS solution must enforce reliable access control and use a trusted reverse proxy to set `Tailscale-User-Login` to an identity allowed by `allowedTailscaleUsers`; a TLS certificate alone is not sufficient. Do not expose the service through Tailscale Funnel or a public reverse proxy.
- Clear the WebView session before authorizing again after changing the Client ID or service origin.
- [Security reporting](../../SECURITY.md) and [contribution guide](../../CONTRIBUTING.md)

## Platform and trademark notice

This is not an official Spotify or Even Realities product and does not imply endorsement or affiliation. Spotify defines control of a background Spotify application as a Streaming SDA; use this project only for private, personal, non-commercial purposes and comply with the [Spotify Developer Terms](https://developer.spotify.com/terms) and [Developer Policy](https://developer.spotify.com/policy). [MPL-2.0](../../LICENSE) covers this repository's code only; it grants no rights to third-party content, album artwork, trademarks, APIs, or platforms.

Spotify metadata and album artwork visible in documentation screenshots are shown only to explain the real interface. All rights remain with Spotify and the respective rightsholders; those assets are not licensed under MPL-2.0.
