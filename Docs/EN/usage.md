# Usage

The UI has two parts: the phone WebView handles sign-in, connection, playback, and settings; GlassesView provides glanceable status and gesture controls.

## Phone WebView

Read the [phone WebView guide](./webview.md) for:

- Initial sign-in and connection order
- Embed and Remote modes
- Playback controls and playlists
- Display settings, configuration export, and session clearing
- Connection recovery

## GlassesView

Read the [GlassesView guide](./glassesview.md) for:

- Left/right scrolling moves focus; single-click runs the highlighted action
- `H` only hides GlassesView; it does not exit the app or call the Spotify API
- The first click or left/right scroll while hidden only restores the display, without running a control or moving focus
- Double-click only opens the Even system exit confirmation
- Playback, shuffle, repeat, playlists, device transfer, and auto-hide
- Empty-list and unresponsive-control checks

## Recommended order

1. Complete Spotify sign-in and connection on the phone.
2. Start a track in an official Spotify client so that an active device exists.
3. Choose Remote mode and playlists on the phone.
4. Open GlassesView and verify the display and gestures.

If installation is not complete, start with [local deployment](./deployment.md). For errors, use [troubleshooting](./troubleshooting.md).
