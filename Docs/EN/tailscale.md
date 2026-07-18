# Tailscale HTTPS Guide

Related pages: [Home](./README.md) | [Self-Hosting Details](./self-hosting.md) | [Real Device Self-Host Guide](./device.md) | [Raspberry Pi Guide](./raspberry-pi.md) | [Docker Guide](./docker.md) | [Troubleshooting Guide](./troubleshooting.md)

Use this guide when you want to expose the local self-host backend through a stable `HTTPS` origin on your tailnet.

## Recommended Path

The primary supported path is:

- `tailscale serve --https`

This is the preferred option because Tailscale handles:

- HTTPS termination
- certificate issuance
- certificate renewal
- injecting the `Tailscale-User-Login` identity after the Serve proxy while stripping a client-supplied header with the same name

## Prerequisites

You need:

- a device signed into your Tailscale tailnet
- Tailscale online and working
- `MagicDNS` enabled
- `HTTPS Certificates` enabled in Tailscale
- the local backend already listening on `127.0.0.1:5173`
- the phone joined to the tailnet as a normal user-owned node, not a tagged node

Important:

- the final URL must be `https://...ts.net`
- do not use:
  - `http://...`
  - raw `100.x.x.x`
  - `localhost`
  - `127.0.0.1`
  as your Spotify redirect URI

## Start Tailscale HTTPS

If the local backend is already running on `127.0.0.1:5173`, expose it with:

```bash
tailscale serve --https=443 http://127.0.0.1:5173
```

Or use the helper script:

```bash
./scripts/start-tailscale-proxy.sh 5173
```

If `tailscale` is not in your `PATH` on macOS, use:

```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=443 http://127.0.0.1:5173
```

Your final URL will be similar to:

- `https://<device>.<tailnet>.ts.net`

## Is The `*.ts.net` URL Fixed?

Usually it is stable for the same device + tailnet, but it can change if:

- device hostname is changed
- tailnet name is changed
- device is removed/re-added in a way that changes its DNS name

If the URL changes, update Spotify Redirect URI to the new:

- `https://<new-device>.<tailnet>.ts.net/api/auth/callback`

Then clear session and reconnect.

## HTTPS Termination Rule

The local listener may remain on:

- `http://127.0.0.1:<port>`

HTTPS terminates at:

- Tailscale
- or your reverse proxy, if you are not using `tailscale serve --https`

But the final user-visible URL must be:

- `https://...ts.net`

Do not put the local listener address into Spotify Redirect URI settings.

## User Identity and Origin Allowlists

Protected APIs require two allowlists in addition to tailnet membership:

1. `Tailscale-User-Login`, injected by Tailscale Serve, must appear in `allowedTailscaleUsers` in `self-host.config.json`.
2. The browser `Origin` must equal `serviceOrigin` or appear in `allowedOrigins`.

`serviceOrigin` is allowed automatically. Packaged EvenHub should include `"http://127.0.0.1:*"` in `allowedOrigins` for dynamic WebView ports; the rule does not match `localhost`, LAN, or public addresses. If the device explicitly reports `null`, the literal value `"null"` may be used instead, but it allows every opaque-origin WebView.

The Node server must listen only on `127.0.0.1`. Tailscale can make the identity header trustworthy only for requests that pass through Serve. A client that can bypass Serve and reach the Node port directly could supply its own header. Do not use Funnel. Tagged nodes do not receive user identity headers and are not suitable as the phone request source. See the official [Tailscale Serve documentation](https://tailscale.com/docs/features/tailscale-serve) for identity-header behavior.

## Common Failures

The most common mistakes are:

1. the phone opened `http://...` instead of `https://...`
2. the phone opened a raw `100.x.x.x` address
3. Tailscale HTTPS was not active, so the browser blocked or downgraded the page
4. `allowedTailscaleUsers` contains a device hostname instead of the requesting user's Tailscale login
5. the phone is a tagged node, so Serve does not provide a user identity header

## Advanced Note

A custom reverse proxy does not automatically provide the trusted Tailscale user-identity boundary required by this project, so it is not a supported path. The supported default remains:

- `tailscale serve --https`

Any future custom-proxy design must accept only a trusted upstream, strip all client-supplied identity headers, inject a separately verified identity, and keep the Node upstream on loopback. Until those conditions are implemented and validated, use `tailscale serve --https`.
