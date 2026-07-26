# Troubleshooting ガイド

関連ページ：[ホーム](./README.md) | [Spotify Developer Dashboard 設定](./spotify-dashboard.md) | [Local Simulator ガイド](./simulator.md) | [Real Device Self-Host ガイド](./device.md) | [Self-Hosting 詳細](./self-hosting.md) | [設定ガイド](./configuration.md) | [使用ガイド](./usage.md)

setup が正しそうに見えるのに authorization や runtime behavior が失敗する場合に使うページです。

最初の quick step：

```bash
./scripts/deploy-doctor.sh
```

## Redirect URI Mismatch

configured redirect URI が exact match でない場合、Spotify authorization はすぐに失敗します。

確認する fields：

- protocol
- hostname
- port（ある場合）
- path

正しい例：

- `https://x.ts.net/api/auth/callback`

誤り：

- `https://x.ts.net/api/auth/callback/`
- `https://x.ts.net/callback.html`
- `https://x.ts.net/`

domain が変わった場合：

1. `サーバードメイン入力` を選び、Settings に新しい domain を入力して `保存してサーバー接続` を選ぶ
2. 表示された `Effective Redirect URI` を確認する
3. Spotify Developer の Redirect URI を更新する
4. `Clear Session` をクリックする
5. 再接続する

## `403` Identity または Origin Denial

protected API が `tailscale_identity_denied` を返す場合：

1. request が local Node port への direct access ではなく Tailscale Serve を通っていることを確認する。
2. `allowedTailscaleUsers` に device hostname ではなく、phone request user の Tailscale login が入っていることを確認する。
3. phone が tagged node でないことを確認する。tagged node は Serve user identity header を受け取りません。
4. config 編集後に self-host server を再起動し、`./scripts/deploy-doctor.sh` を実行する。

`browser_origin_denied` を返す場合：

1. まず `serviceOrigin` が phone の HTTPS origin と完全一致することを確認する。この origin は自動許可されます。
2. packaged diagnostics が `http://127.0.0.1:<dynamic-port>` を表示する場合、`allowedOrigins` に専用 rule `"http://127.0.0.1:*"` があることを確認する。
3. actual value が明示的に `null` の場合だけ literal value `"null"` を許可する。これはすべての opaque-origin WebView に一致します。
4. global `*` は使用しない。完全な専用 rule `"http://127.0.0.1:*"` だけを使用し、Origin boundary は無効化しない。

## PKCE State Problems

frontend PKCE flow は、login state が expire したり return path が pending login request と一致しない場合に失敗します。

よくある failures：

- `state mismatch`
- `expired login`
- `missing login state`

表示される可能性がある backend / callback error codes：

- `pkce_state_missing`
- `pkce_state_mismatch`
- `pkce_pending_expired`
- `token_exchange_failed`
- `network_error`

発生した場合：

1. `Settings` に戻る
2. `Client ID` を確認する
3. `Effective Redirect URI` を確認する
4. `Clear Session` をクリックする
5. fresh login を開始し、複数の login window を同時に開かない

## WebView / Storage Isolation

Runtime config と login state は、すべての browser container で共有されるわけではありません。

例：

- Safari
- Even App WebView
- another browser
- private / incognito mode

origin が同じでも、storage が共有されない場合があります。

Safari に config があっても Even App WebView にない場合、それは正常です。WebView 内でもう一度設定してください。

## Cache / Refresh Behavior

redeploy しても behavior が変わらない場合：

1. 現在の Even App page を閉じて開き直す
2. 必要なら最新の `.ehpk` を再度開くか再インストールする
3. config が変わった場合は `Clear Session` を使う

WebView が cached app instance をすぐに捨てるとは限りません。

## Real-Device WebView が idle 後に blank になる

real-device の phone page がしばらく放置後に視覚的に blank になるが、diagnostics または client logs では DOM が存在し、`window-error` / `unhandledrejection` がない場合、まず `@evenrealities/even_hub_sdk` の version を確認してください。

現在の real-device release build は次に固定します。

```text
@evenrealities/even_hub_sdk@0.0.9
```

既知の risk：

- `0.0.10` から `src/shadow-timers.ts` が追加された
- `dist/index.js` に top-level side effect がある
- SDK import 時に global `window.setTimeout`、`window.setInterval`、`window.clearTimeout`、`window.clearInterval` を override する
- real Even App WebView では render frames が先に止まり、その後 timers も止まり、page が視覚的に blank になる可能性がある

upstream SDK がこの挙動を修正するか、shadow timers を無効化する option を提供するまでは、`0.0.10+` で real-device release package を build しないでください。

## Hidden Glasses UI Does Not Return Automatically

double-click で glasses UI を hide すると、もう一度 interaction で show するまで hidden のままです。

現在の behavior：

- foreground-enter は hidden UI を auto-show しません
- `Auto Hide` timeout は有効時に hide するだけで、auto-show はしません

Recovery paths：

1. glasses で double-click して再表示する
2. phone WebView の top refresh button を使う

## Development QR Generation / Viewer Issues

この section は未パッケージ開発ページだけに適用します。パッケージ版 `.ehpk` の install では QR を使用しません。

development mode が QR generation で失敗する場合：

1. `self-host.config.json` が存在し、有効な `serviceOrigin`（`https://...` origin only）を持つことを確認する
2. `evenhub` CLI が installed であることを確認する、または `app/` に `qrcode` を install する
3. 再実行：
   - `./scripts/start-self-host.sh`

QR viewer page が blank の場合：

- 開く：
  - `http://127.0.0.1:5173/api/self-host/qr/meta`
- metadata が存在することを確認する
- PNG file を確認する：
  - `qr/evenhub-entry.png`

## Diagnostics

`Settings` には support screenshot 用の diagnostics section があります。

Key fields：

- `Version`（`<app-version>_<6桁hex hash>`、例：`0.3.1_ab12cd`）
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

token がすぐ expire するように見える場合、まず device time / NTP を確認してください。

real-device `server` mode の diagnostics は authorization status、scope、expiry、redacted summary だけを表示し、access token や refresh token を含めないでください。client debug log は default で無効です。短時間の診断中だけ `ENABLE_CLIENT_DEBUG_LOGS=1` を設定し、その後は無効にして再起動します。

## Rate Limiting

polling が高密度すぎる場合や control actions を短時間に複数発火した場合、Spotify player endpoints が rate-limit responses を返すことがあります。

実用ルール：

- rapid repeated taps を避ける
- 複数 refresh を強制する前に、既存 polling loop が落ち着くのを待つ
- app が cooldown を表示する場合、すぐ retry せず待つ

Rate limiting は通常 configuration issue ではなく timing issue です。
