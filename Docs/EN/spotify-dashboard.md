# Spotify Developer Dashboard Setup

This guide only covers creating a Spotify app and configuring its authentication entry points. You will obtain a public Client ID. This project neither needs nor should store a Client Secret.

## 1. Prepare the account

- Sign in with the Spotify account that will own the app.
- Spotify currently requires the owner of a Development Mode app to have Premium.
- Development Mode allows up to five allowlisted users. An account that is not on the allowlist cannot authorize the app.

Check Spotify's [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) and [February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) for current limits.

## 2. Create the app

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and sign in.
2. Select **Create app**.
3. Enter an App name and App description, such as a personal Even Hub Spotify controller.
4. If the form asks which API you will use, select **Web API**.
5. Review and accept Spotify's terms, then create the app.
6. Open **Settings** for the new app. See Spotify's [Apps guide](https://developer.spotify.com/documentation/web-api/concepts/apps) for the official field descriptions.

## 3. Add Redirect URIs

Add only the modes you will actually use.

### Local simulator

The default port is `5173`:

```text
http://127.0.0.1:5173/callback.html
```

If you change `localPort` in `simulator.config.json`, update the port here too.

### Real-device self-host

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

Replace `<device>` and `<tailnet>` with your Tailscale names. The URI must use the same origin as `serviceOrigin` in `self-host.config.json`.

### Exact-match rules

Spotify requires the Redirect URI in the authorization request to exactly match a saved Dashboard value, including:

- `http` versus `https`
- host and port
- path and trailing slash
- letter case

Spotify permits HTTP only for an explicit loopback IP, so use `127.0.0.1`, not `localhost`. See Spotify's [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) documentation.

Save Settings, reopen them, and make sure neither URI was truncated or changed.

## 4. Copy the Client ID

1. Return to the app overview or Settings.
2. Copy **Client ID**.
3. Put it in one local file:

   - Local simulator: `simulator.config.json`
   - Real device: `self-host.config.json`

Do not reveal or copy the Client Secret, and never commit a real ID, token, or local configuration file.

## 5. Add test users

For every other Spotify account that needs access:

1. Open **Users Management** in the app settings.
2. Select **Add new user**.
3. Enter the name and email Spotify requests.
4. Save, then have that person authorize with the Spotify account for the same email.

## 6. Final check

- [ ] The app owner has Premium.
- [ ] The simulator URI uses `127.0.0.1`, and its port matches the local configuration.
- [ ] The real-device URI uses HTTPS and ends in `/api/auth/callback`.
- [ ] The Dashboard, configuration file, and actual URL use exactly the same origin.
- [ ] Every user is present in Users Management.
- [ ] Local files contain the Client ID but no Client Secret.

Next: use the [simulator guide](./simulator.md) for local development or [local deployment](./deployment.md) for a real device.
