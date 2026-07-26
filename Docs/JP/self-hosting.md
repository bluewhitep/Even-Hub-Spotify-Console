# Self-Hosting 詳細

関連ページ：[ホーム](./README.md) | [Spotify Developer Dashboard 設定](./spotify-dashboard.md) | [Real Device Self-Host ガイド](./device.md) | [Local Simulator ガイド](./simulator.md) | [設定ガイド](./configuration.md) | [使用ガイド](./usage.md) | [Tailscale HTTPS ガイド](./tailscale.md) | [Docker ガイド](./docker.md) | [Raspberry Pi ガイド](./raspberry-pi.md) | [Troubleshooting ガイド](./troubleshooting.md)

これは real-device self-host server path の詳細 setup flow です。

local simulator だけを使う場合は [Local Simulator ガイド](./simulator.md) を見てください。

## Quick Start

通常の self-hosted path：

1. `self-host.config.json` を準備する
2. local script（`./scripts/start-self-host.sh`）を起動する
3. Tailscale HTTPS 経由で local server を公開する（script prompt または manual）
4. `npm run pack:ehpk` で `.ehpk` を生成する
5. `.ehpk` を phone に転送し、Even Realities App / Even Hub でローカルに開く
6. Spotify Developer Redirect URI を設定する
7. phone WebView で Spotify に接続する

real-device self-host path は server callback を使います。

- `https://<device>.<tailnet>.ts.net/api/auth/callback`

## 1) Config File を準備

作成または編集：

```bash
cd <repo-root>
cp self-host.config.example.json self-host.config.json
```

例：

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

`allowedTailscaleUsers` は必須の空でない配列で、省略できません。許可する Tailscale user login（通常はログイン email）を入力し、device hostname は使いません。この field がない、または空の場合、server は起動を拒否します。これは同じ tailnet 内の未許可 user が Spotify を操作することを防ぐためです。正確な login は Tailscale client の account details または admin console の Users page で確認できます。

`serviceOrigin` は自動許可されます。packaged EvenHub では `allowedOrigins` に `"http://127.0.0.1:*"` を使用し、app update 後に local WebView port が変わっても接続できるようにします。この rule は `127.0.0.1` の有効な HTTP port だけに一致し、request には引き続き許可済み Tailscale user が必要です。実際の Origin が `null` の場合は literal `"null"` を使用できますが、すべての opaque-origin WebView を許可します。

## 1.1) Port Selection

起動スクリプトは次の優先順位で local port を解決します。

1. `PORT` environment variable
2. `self-host.config.json` の `localPort`
3. default `5173`

例：

```bash
PORT=8080 ./scripts/start-self-host.sh
```

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
  "localPort": 8080,
  "mode": "custom-origin"
}
```

## 2) Local Self-Host Script を起動

project root から実行：

```bash
./scripts/start-self-host.sh
```

この script は次を行います。

1. `self-host.config.json` を読む
2. frontend を build する
3. backend を `http://127.0.0.1:<port>` で起動する
4. tailscale proxy を今起動するか確認する（host machine）
5. tailscale setup が成功した場合、開発専用 QR PNG も `qr/evenhub-entry.png` に生成する
6. 開発専用の host-local QR viewer link を表示する：
   - `http://127.0.0.1:<port>/api/self-host/qr/view`
7. tailscale を skip した場合、手動 `evenhub qr` 開発手順を表示する

prompt を skip した場合、Tailscale を手動で起動できます。

```bash
./scripts/start-tailscale-proxy.sh <port>
```

deploy checks はいつでも実行できます。

```bash
./scripts/deploy-doctor.sh
```

services を停止：

```bash
./scripts/stop-self-host.sh
```

services を停止し、tailscale serve config を reset：

```bash
./scripts/stop-self-host.sh --tailscale
```

QR output は未パッケージページ向けの開発補助であり、`.ehpk` install flow には含まれません。この開発 mode が必要な場合だけ `evenhub qr` を手動実行します。パッケージ版には QR は不要です。

## 3) Even App で `.ehpk` を開く

先に package を生成します。

```bash
cd <repo-root>/app
npm run pack:ehpk
```

`ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk` を phone に転送し、file manager または share sheet から Even Realities App / Even Hub でローカルに開きます。正式フローでは QR を scan しません。app code は local package から起動し、Spotify API と self-host API は `self-host.config.json` の Tailscale HTTPS `serviceOrigin` を使用します。

未パッケージページを実行する developer だけが `qr/evenhub-entry.png` または local QR viewer を使用します。この path は `.ehpk` の実機 acceptance の代わりにはなりません。

## 4) Tailscale HTTPS

script prompt で起動していない場合：

```bash
./scripts/start-tailscale-proxy.sh <port>
```

これにより local app が `https://<device>.<tailnet>.ts.net` origin 経由で公開されます。

Tailscale Serve は protected API 向けに request user identity も注入します。backend は `allowedTailscaleUsers` 内の login だけを受け入れ、local upstream は `127.0.0.1` のままにします。Funnel、LAN/public internet への local port 公開、phone request source としての tagged node は使用しないでください。tagged node には必要な user identity header がありません。

## 5) Spotify Developer

field location、real-device URI、完全一致ルールは次を見てください。

- [Spotify Developer Dashboard 設定](./spotify-dashboard.md)

real-device self-host server で使う値：

- `Website`：`https://<device>.<tailnet>.ts.net`
- `Redirect URI`：`https://<device>.<tailnet>.ts.net/api/auth/callback`

その後、`Client ID` を `self-host.config.json` にコピーします。

実機では先に `Spotifyにログイン` を選び、Google クイックログインではなく Spotify アカウントを使います。認証後に plugin へ戻るか開き直してください。初回接続または server address が違う場合は `サーバードメイン入力` を選び、Settings の `サーバー API Origin` に `<device>.<tailnet>.ts.net` を入力して `保存してサーバー接続` を選びます。`https://` は省略でき、backend が完全な callback を生成します。

## 6) WebView 内 Runtime Settings

Runtime setting details：

- [設定ガイド](./configuration.md)

含まれる内容：

- `Client ID`
- `Service Origin`
- `サーバードメイン入力` で開く Settings、`サーバー API Origin`、`保存してサーバー接続`
- exact redirect URI rules
- `Clear Config`
- `Clear Session`

## Callback、Diagnostics、Failure Recovery

完全な troubleshooting と callback behavior notes：

- [Troubleshooting ガイド](./troubleshooting.md)

含まれる内容：

- `state mismatch`
- expired login
- WebView storage isolation
- diagnostics fields
- cache / refresh behavior

## 7) ローカル自動 Check と実機 Acceptance

各 release candidate で最低限、次を実行します。

```bash
cd <repo-root>/app
npm ci
npm audit
npm test
npm run build:device
npm run pack:ehpk
```

local gate は dependencies、server-side token containment、identity/Origin denial、Spotify proxy route allowlist、build、package を検証します。Spotify authorization、playback control、phone WebView、glasses GlassesView は、local automation から Spotify account と Even hardware に接続できないため、manual test が必要です。詳細 checklist と acceptance record は Git で追跡しない local development documentation に保存します。

## 8) Spotify Web API 2026 Compatibility

現在の implementation は migration 後の API shape を使用します。save/remove は Spotify URI を含む generic `PUT` / `DELETE /me/library` を使い、playlist total は `items.total` を優先しながら legacy `tracks.total` fallback も保持します。[Spotify February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) を参照してください。これらの compatibility 対応は Spotify の account、quota、commercial-use policy を変更しません。

## 9) EvenHub Pack Metadata（`app.json`）

EvenHub CLI で metadata template を生成：

```bash
evenhub init
```

この project で使用する packaging field の例：

```json
{
  "package_id": "com.example.g2demo",
  "edition": "202601",
  "name": "G2 Demo",
  "version": "0.3.1",
  "min_app_version": "0.1.0",
  "tagline": "A short description of the app",
  "description": "A relatively long description of the app",
  "author": "Your Name",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["evenhub.evenrealities.com"],
    "fs": ["./assets"]
  }
}
```

packing 前に入力するもの：

- `package_id`：unique app ID（reverse-domain style。他 app の ID を再利用しない）
- `edition`：EvenHub workflow が別の edition code を必要としない限り CLI template のまま
- `name`：app display name
- `version`：app version string
- `min_app_version`：minimum Even app version
- `tagline` / `description`：short and long app description
- `author`：author info
- `entrypoint`：built output の startup HTML file（この project では `index.html`）
- `permissions`：必要な scopes（`network`、`fs` など）のみ残す

Pack command：

```bash
cd <repo-root>
cd app
npm run pack:ehpk
```

package は次に書き込まれます。

```text
ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk
```

Optional package ID availability check：

```bash
evenhub pack app.json ./app/dist --check
```

## Notes

- Raspberry Pi と Docker variants：
  - [Raspberry Pi ガイド](./raspberry-pi.md)
  - [Docker ガイド](./docker.md)
  - Docker mode も host 上で Tailscale を実行します。生成される QR は未パッケージ開発専用です
- Tailscale details と prerequisites：
  - [Tailscale HTTPS ガイド](./tailscale.md)

接続後は、[スマートフォン WebView](./webview.md)と[GlassesView](./glassesview.md)の個別ガイドを参照してください。

## Legacy Manual Flow

backend は手動でも実行できます。

```bash
cd <repo-root>/app
npm install
npm run host:device
```

これにより local backend が次で起動します。

- `127.0.0.1:5173`
