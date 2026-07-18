# ローカルデプロイ

このページでは、PC または Raspberry Pi で self-host backend を起動し、`.ehpk` を生成して、スマートフォンの Even Realities App / Even Hub からローカルパッケージを開く方法を説明します。QR は未パッケージの開発ページを読み込むためだけに使用し、正式なインストールやペアリングには使用しません。

## 前提条件

| 項目 | 要件 |
| --- | --- |
| OS | macOS、Linux、または Raspberry Pi OS。ターミナルが使用可能であること |
| Node.js | npm 付きの `20.19+` または `22.12+` |
| Spotify | app owner が Premium で、Dashboard に実機用 Redirect URI を設定済み |
| Tailscale | host と phone が同じ信頼済み tailnet に参加し、host に `*.ts.net` HTTPS 名があること |
| Even デバイス | phone に Even Realities App をインストール済みで、glasses と phone の通常のシステムペアリングが完了していること |
| パッケージツール | Git と `@evenrealities/evenhub-cli` |

先に [Spotify Developer Dashboard の設定](./spotify-dashboard.md)を完了してください。Self-host の Redirect URI は次の値です。

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

## 開発依存関係のインストール

1. repository を clone します。

   ```bash
   git clone https://github.com/bluewhitep/Even-Hub-Spotify-Console.git
   cd Even-Hub-Spotify-Console
   ```

2. lock 済み frontend dependencies と EvenHub CLI をインストールします。

   ```bash
   cd app
   npm ci
   cd ..
   npm install -g @evenrealities/evenhub-cli
   ```

3. Tailscale の接続を確認します。

   ```bash
   tailscale status
   ```

macOS の GUI 版 Tailscale も使用できます。startup script は app 内の CLI も検索します。プラットフォーム固有の手順は [Docker](./docker.md) と [Raspberry Pi](./raspberry-pi.md)を参照してください。

## Backend の設定

1. template からローカル設定を作成します。

   ```bash
   cp self-host.config.example.json self-host.config.json
   ```

2. `self-host.config.json` を編集します。

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

- `spotifyClientId`：Spotify Dashboard の 32 文字の hexadecimal Client ID。Client Secret ではありません。
- `serviceOrigin`：HTTPS origin だけを入力し、`/api/auth/callback`、別の path、query、末尾の slash は含めません。
- `allowedTailscaleUsers`：アクセスを許可する Tailscale user login name。完全一致が必要で、device hostname は入力しません。
- `allowedOrigins`：packaged EvenHub では `"http://127.0.0.1:*"` を使用し、install 時に割り当てられる local WebView port に対応します。`localhost`、LAN、public address には一致せず、request には引き続き許可済み Tailscale user が必要です。
- `localPort`：local server port。default は `5173` です。
- `mode`：`custom-origin` のままにします。

real device が `Current page origin` を明示的に `null` と表示した場合、literal value `"null"` を `allowedOrigins` に追加できます。これはすべての opaque-origin WebView を許可するため、default にしないでください。

## ローカル自動 Gate の実行

deployment 前に repository から実行します。

```bash
cd <repo-root>/app
npm ci
npm audit
npm test
npm run build:device
npm run pack:ehpk
```

期待結果：lockfile を使った dependency install、`npm audit` が 0、self-host security test が pass、device build と `.ehpk` package が成功します。これらは Spotify や Even hardware なしで実行できますが、後述の manual device validation の代わりにはなりません。

## Backend の起動

repository root で実行します。

```bash
./scripts/start-self-host.sh
```

script は frontend を build し、`127.0.0.1:<localPort>` で server を起動して、Tailscale Serve を設定するか確認します。prompt では Tailscale HTTPS を有効にしてください。terminal は開いたままにします。`Ctrl+C` で local Node server が停止します。

現在の startup script は開発用 QR も出力する場合があります。パッケージ版の正式フローでは読み取らないでください。この QR は開発用 PC で動作中の未パッケージページを phone に読み込むためだけのものです。

## `.ehpk` の生成

別の terminal で実行します。

```bash
cd <repo-root>/app
npm run pack:ehpk
```

生成ファイルは次の場所に書き込まれます。

```text
ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk
```

`<build-hash>` は 6 文字の build hash です。パッケージ生成時には同じ base name の古い生成物が削除されます。`.ehpk` と build metadata は Git の対象外です。

## Phone でローカルインストールして開く

1. 生成した `.ehpk` を phone に転送します。
2. phone の file manager または share sheet から開き、Even Realities App / Even Hub を処理先に選びます。
3. Even Hub からインストール済みの Spotify Console package を開きます。モバイル OS によって「このアプリで開く」の文言は異なりますが、QR を scan するのではなく `.ehpk` を直接開きます。
4. 初回起動時に `サーバードメイン入力` を選び、`サーバー API Origin` に `<device>.<tailnet>.ts.net` を入力して `保存してサーバー接続` を選びます。`https://` は省略できますが、path は入力しません。
5. 「Spotify にログイン」を選び、Spotify login 後に app へ戻ってから「Spotify に接続」を選びます。
6. Spotify 公式 client で曲を再生し、phone WebView と GlassesView の両方から playback を取得・操作できることを確認します。

## 開発 QR とパッケージ版の違い

| パス | 用途 | `.ehpk` を使用 | QR が必要 |
| --- | --- | --- | --- |
| ローカル simulator | 実機なしの browser 開発 | いいえ | いいえ |
| 開発 QR | 開発 PC 上の未パッケージページを読み込み、短いサイクルで検証 | いいえ | はい |
| ローカル package install | Even Hub で実際の package artifact を開く | はい | いいえ |

開発パスの公式 command は `evenhub qr` です。正式な package install 手順として扱わず、`.ehpk` 検証の代わりにもなりません。

## デプロイの検証

server の実行中に、別の terminal で次を実行します。

```bash
./scripts/deploy-doctor.sh
```

最低限、次を確認します。

- configuration validation が `PASS`。
- local health endpoint に接続できる。
- runtime effective Redirect URI が Dashboard と完全一致する。
- local `.ehpk` から開いた app で login と connection を完了できる。
- GlassesView に現在の track が表示され、single-click 操作に応答する。

Spotify と Even device の統合はローカル自動化だけでは完全に代替できないため、release 前に manual real-device acceptance が必要です。詳細 checklist と acceptance record は Git で追跡しない local development documentation に保存します。

## 更新

1. 現在の service を停止して source を更新します。

   ```bash
   git pull --ff-only
   cd app
   npm ci
   cd ..
   ```

2. backend を再起動し、`npm run pack:ehpk` を再実行します。
3. phone で新しい `.ehpk` を開いて package を更新します。
4. deploy doctor を再実行し、authorization、playback、glasses controls を手動確認します。

local config は通常そのまま使用できます。Client ID または service domain を変更した場合は、再認証前に古い WebView session を clear してください。

## 停止とアンインストール

- foreground Node deployment：`start-self-host.sh` を実行している terminal で `Ctrl+C`。
- Docker deployment：`./scripts/stop-self-host.sh`。
- Tailscale Serve rule も削除する場合：`./scripts/stop-self-host.sh --tailscale` または `tailscale serve reset`。
- Even Hub から app package をアンインストールします。
- CLI が不要な場合：`npm uninstall -g @evenrealities/evenhub-cli`。
- 必要な local config を backup してから repository directory を手動削除します。

## セキュリティ境界

- 信頼済み private tailnet 内だけで実行します。Tailscale Funnel や public reverse proxy は使用しません。
- Tailscale Serve は request user の identity を注入します。`allowedTailscaleUsers` には本当にアクセスが必要な user だけを入れます。
- `self-host.config.json`、`.self-host/`、`qr/`、token を commit しません。
- `localPort` を LAN や public network に bind しません。Tailscale Serve upstream は loopback に限定しないと、direct caller が identity header を偽装できます。
- real-device server mode の Spotify token は host にだけ保存されます。WebView は制限付き `/api/spotify` proxy を使い、access token や refresh token を受け取りません。
- これは個人用 self-host app であり、public multi-user Spotify service ではありません。

続きは [Phone WebView](./webview.md)、[GlassesView](./glassesview.md)、[Troubleshooting](./troubleshooting.md)を参照してください。
