# Phone WebView Guide

The phone WebView handles Spotify authorization, connection status, playback, playlists, and all display settings. For glasses controls, see the [GlassesView guide](./glassesview.md).

## First connection

### Local simulator

1. Make sure `npm run dev:simulator` and EvenHub simulator are both running.
2. Select **Login Spotify** and finish authorization in the browser.
3. Return to the app. If it does not refresh, close and reopen the simulator app.
4. Select **Connect Spotify**.

### Real-device self-host

1. Make sure `start-self-host.sh` is still running and the phone is on the same tailnet.
2. Select **Login Spotify**, finish authorization, and return to the Even app.
3. Normally you can select **Connect Spotify** immediately. If the page asks for a server domain, enter `<device>.<tailnet>.ts.net` without a scheme or path.
4. Wait for the status to show **Connected** before using playback or settings.

**Login Spotify** opens account authorization. **Connect Spotify** establishes or restores the Spotify session used by this WebView. They are separate steps.

## Playback area

The home page shows the current track, artist, album art, and progress. Available actions depend on the selected playback mode:

| Mode | Spotify Premium | Capability |
| --- | --- | --- |
| Embed | Not required | Spotify Embed playback; no complete remote controls |
| Remote | Required | Previous, play/pause, next, shuffle, and repeat controls |

“Premium not required” describes the Embed control itself; Spotify still requires the owner of a Development Mode app to have Premium.

Remote mode needs an available Spotify playback device. If controls do nothing, start a track in the official Spotify phone or desktop client and refresh this page.

## Playlists

- **Liked Songs** is always present and starts in shuffle mode.
- Settings can add up to eight more Spotify playlists.
- Selecting a playlist on the phone starts it immediately and synchronizes the glasses.
- `0.3.1+` includes the required library scopes and uses the generic `PUT` / `DELETE /me/library` endpoint for saved-state changes under Spotify's 2026 rules. If a newly created Development Mode app returns `403`, confirm that the app owner has Premium, the current user is on the Dashboard allowlist, and authorization was repeated after clearing the old session. See [troubleshooting](./troubleshooting.md) and Spotify's [February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).

## Settings

The settings page includes:

- UI language: 中文, English, or 日本語.
- Playback mode: Embed or Remote.
- Glasses control icons and inverted horizontal scrolling.
- Playlist slots.
- Progress style, border, text-only mode, album-art size, and opacity.
- Auto-hide enablement and delay.
- Developer mode.

Use the page's save action after editing. Display settings synchronize to GlassesView. Spotify credentials and the sign-in session are not part of an exported settings file.

## Save, load, and clear

- **Save settings config to server**: useful for self-host and later loading from the same service.
- **Save settings to local file**: exports display and control preferences for backup or migration.
- **Clear session**: removes current Spotify authorization state. Use it before reconnecting after changing the Client ID, service origin, or Spotify account.
- Clearing the session does not delete a settings file that you exported.

Do not share exports that contain a personal domain or internal configuration. The project never needs an exported Spotify password or Client Secret.

## Recover a connection

1. Confirm that an official Spotify client has an online playback device.
2. Use the WebView refresh action.
3. Confirm that the server script and Tailscale are still online.
4. If the domain and Client ID are unchanged, select **Connect Spotify** again.
5. If the domain, Client ID, or account changed, clear the session and sign in again.

If the connection still fails, use [troubleshooting](./troubleshooting.md).
