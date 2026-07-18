# 設定ガイド

関連ページ：[ホーム](./README.md) | [Spotify Developer Dashboard 設定](./spotify-dashboard.md) | [Local Simulator ガイド](./simulator.md) | [Real Device Self-Host ガイド](./device.md) | [Self-Hosting 詳細](./self-hosting.md) | [使用ガイド](./usage.md) | [Troubleshooting ガイド](./troubleshooting.md)

このページでは phone WebView 内で必要なランタイム設定を説明します。

## Auth Mode

現在は 2 つの authentication path があります。

| mode | 起動コマンド | 用途 | Redirect URI |
| --- | --- | --- | --- |
| `client` | `cd app && npm run dev:simulator` | local simulator | `http://127.0.0.1:5173/callback.html` |
| `server` | `./scripts/start-self-host.sh` | real device self-host | `https://<device>.<tailnet>.ts.net/api/auth/callback` |

`client` mode は browser 側で PKCE callback を完了します。`server` mode は local self-host server が Spotify callback と token storage を処理します。

## Server Config File（Self-Host Script）

デプロイスクリプトは次を読み込みます。

- `self-host.config.json`（プロジェクトルート）

完全な設定テンプレート：

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

フィールド規則：

- `spotifyClientId`：Dashboard の 32 文字の hexadecimal Client ID。Client Secret は入力しません。
- `serviceOrigin`：最終的な Tailscale HTTPS origin。browser Origin allowlist に自動追加されます。
- `allowedTailscaleUsers`（必須）：アクセスを許可する 1–20 個の Tailscale login name（通常は login email）。phone user に紐づく login と完全一致させ、device hostname は入力しません。
- `allowedOrigins`（任意）：追加で許可する browser Origin。packaged EvenHub では、install 後に割り当てられる local WebView port に対応するため `"http://127.0.0.1:*"` を指定します。
- `localPort`：local loopback port。
- `mode`：`custom-origin` のままにします。

`localPort` は任意です。省略した場合、起動スクリプトは `5173` をデフォルトにします。
`PORT` env が設定されている場合、`PORT` が `localPort` を上書きします。

`allowedTailscaleUsers` は省略または空にできません。その場合、server は起動を拒否します。これは同じ tailnet 内の未許可 user が Spotify を操作することを防ぎます。正確な login は Tailscale client の account details または admin console の Users page で確認できます。

`allowedOrigins` には完全な HTTPS origin、loopback HTTP origin、専用 rule `"http://127.0.0.1:*"`、または literal value `"null"` を指定できます。専用 rule は有効な port を持つ `127.0.0.1` の HTTP Origin だけに一致し、`localhost`、LAN、public address には一致しません。request は引き続き `allowedTailscaleUsers` の identity check を通過する必要があります。`"null"` は device が実際に null Origin を表示した場合だけ使用します。

このファイルは次で使用されます。

- `./scripts/start-self-host.sh`
- `./scripts/start-self-host-docker.sh`
- `server/local-server.mjs`

## Runtime Settings の設定

real-device self-host server mode：

1. `self-host.config.json` に `spotifyClientId`、`serviceOrigin`、`allowedTailscaleUsers` を入れる
2. self-host server 起動後、`Spotify接続` を tap する
3. `サーバー API Origin` に `<device>.<tailnet>.ts.net` を入力し、`保存してサーバー接続` を選ぶ
4. backend が次を設定する：
   - `Service Origin` が `https://<device>.<tailnet>.ts.net`
   - `Redirect URI` が `https://<device>.<tailnet>.ts.net/api/auth/callback`
5. `Settings` / diagnostics は `Effective Redirect URI` の確認に使う。real-device の主 flow では runtime config の手動保存は不要
6. `Connect Spotify` を tap する

## Server Mode の Security Boundary

- protected API は Tailscale user allowlist と browser Origin allowlist の両方を通過する必要があります。
- local service は `127.0.0.1` だけで listen します。Tailscale Serve がサポート対象の HTTPS entry point です。Funnel を使わず、local port を LAN や public internet に公開しないでください。
- Spotify access token と refresh token は host の `.self-host/state.json` にだけ保存されます。directory mode は `0700`、sensitive file は `0600` です。
- WebView が受け取るのは authorization status、scope、expiry などの non-secret metadata だけです。Spotify request は制限付き `/api/spotify` backend proxy を通ります。
- client debug log は default で無効です。問題調査中だけ一時的に `ENABLE_CLIENT_DEBUG_LOGS=1` を設定し、完了後に無効へ戻します。
- simulator `client` mode は local browser で PKCE を直接完了します。その development mode の local storage を real-device server mode の token boundary として扱わないでください。

simulator client mode：

1. `Settings` を開く
2. Spotify `Client ID` を貼り付ける
3. `Custom Origin` をオンのままにする
4. `http://127.0.0.1:<Port>` のような local origin のままにする
5. `Save Config` をクリックする
6. `Current config source` が `Runtime` であることを確認する
7. `Connect Spotify` をクリックする

## Spotify Developer Dashboard Fields

field location、よく使う URI、完全一致ルールは次を見てください。

- [Spotify Developer Dashboard 設定](./spotify-dashboard.md)

要約：

- simulator client mode は `/callback.html` を使う
- real-device server mode は `/api/auth/callback` を使う
- local HTTP は local simulator 専用です。`127.0.0.1` のような明示的な loopback IP を使い、`localhost` は使わない

## Glasses Runtime Settings

`Settings` における現在の runtime behavior：

- Progress bar styles：
  - `= -` はデフォルトの track length を使います
  - `█ ▒` は 20 cells 固定です
  - `■ □` は 20 cells 固定です
- Auto hide：
  - `Auto Hide` toggle が timeout hide の有効/無効を制御します
  - `Auto Hide (sec)` は `Auto Hide` が有効な場合のみ使われます
- Foreground enter は hidden glasses UI を自動表示しません。

## 重要な Origin ルール

ユーザーが実際にアドレスバーで見ている origin を使ってください。

例：

- ローカル app は `http://127.0.0.1:5173` で listen している
- Tailscale または reverse proxy が `https://x.ts.net` として公開している

この場合の実際の origin は：

- `https://x.ts.net`

次ではありません：

- `http://127.0.0.1:5173`

ローカル listener を Spotify Redirect URI 設定に入れないでください。

## Runtime Config Rules

- Runtime config key：
  - `spotify_self_host_config_v1`
- 優先順位：
  - `Server`（real-device self-host server mode）
  - `Runtime`
  - `Env`
  - `Missing`
- Runtime config は simulator / client mode のみで使います
- Runtime config を削除すると env にフォールバックします

## Service Origin Validation

許可：

- `https://x.ts.net`
- `https://x.ts.net:8443`

拒否：

- `https://x.ts.net/app`
- `https://x.ts.net/?a=1`
- `https://x.ts.net/#hash`
- `http://x.ts.net`
- `http://192.168.1.10:5173`
- `100.x.x.x`
- `x.ts.net`

Normalization rules：

- `https://x.ts.net:443` は `https://x.ts.net` になります
- `HTTPS://X.TS.NET` は `https://x.ts.net` になります
- 保存前に余分な whitespace は trim されます
- 保存後、normalized origin が input に書き戻されます

## Custom Origin（v1）

- `custom-origin` は real-device のデフォルト path です
- real device では `サーバードメイン入力` を tap し、Settings の `サーバー API Origin` に `<device>.<tailnet>.ts.net` を入力して `保存してサーバー接続` を tap します
- input は `https://` を省略できます。app が `https://<device>.<tailnet>.ts.net` を生成します
- `Service Origin` は origin のみで、`/api/auth/callback` は含めません
- `Effective Redirect URI` に Spotify Developer Dashboard へ追加する完全な callback が表示されます

## Effective Redirect URI

app は auth mode ごとに redirect URI を使い分けます。

| Mode | Effective Redirect URI |
| --- | --- |
| `client` / local simulator | `${effectiveServiceOrigin}/callback.html` |
| `server` / real-device self-host | `${effectiveServiceOrigin}/api/auth/callback` |

`Settings` では、この値は次の状態であるべきです。

- single-line
- copyable
- 正確な Spotify Redirect URI 値として使用する

## ドメインが変わった場合

ドメインが変わった場合：

1. `サーバードメイン入力` を tap し、Settings に新しい `<device>.<tailnet>.ts.net` を入力して `保存してサーバー接続` を tap する
2. 新しい `Effective Redirect URI` を確認する
3. Spotify Developer の Redirect URI を更新する
4. `Clear Session` をクリックする
5. もう一度 `Connect Spotify` をクリックする

ドメインが変わったのに Spotify Developer 側が古い Redirect URI のままだと、authorization は失敗します。

## Clear Config vs Clear Session

### `Clear Config`

次だけを削除します。

- `spotify_self_host_config_v1`

次は削除しません。

- token bundle
- PKCE pending state
- authorized metadata
- last auth error

### `Clear Session`

real-device `server` mode では、backend が `.self-host/state.json` の pending login、token、error state を削除します。WebView は token を保持しません。simulator `client` mode では browser の Spotify session state を削除します。

- `spotify_pkce_pending_v1`
- token bundle
- `authorized_client_id`
- `authorized_service_origin`
- last auth error

次は削除しません。

- `spotify_self_host_config_v1`
