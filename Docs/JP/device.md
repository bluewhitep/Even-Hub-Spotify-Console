# Real Device Self-Host ガイド

関連ページ：[ホーム](./README.md) | [Spotify Developer Dashboard 設定](./spotify-dashboard.md) | [Local Simulator ガイド](./simulator.md) | [Self-Hosting 詳細](./self-hosting.md) | [使用ガイド](./usage.md) | [Tailscale HTTPS ガイド](./tailscale.md) | [Docker ガイド](./docker.md) | [Raspberry Pi ガイド](./raspberry-pi.md) | [Troubleshooting ガイド](./troubleshooting.md)

このページは実機 phone と glasses で使う場合の入口です。

## 適用範囲

この path を使う場面：

- 実際の Even app でページを開く
- glasses WebView が同じ HTTPS origin にアクセスする必要がある
- local self-host server が Spotify OAuth callback と token storage を扱う
- Spotify callback は `/api/auth/callback` に戻る

local debug のみの場合は [Local Simulator ガイド](./simulator.md) を見てください。

## 関連ドキュメント

共通設定：

- [Spotify Developer Dashboard 設定](./spotify-dashboard.md)
- [設定ガイド](./configuration.md)
- [Troubleshooting ガイド](./troubleshooting.md)

実機専用：

- [Self-Hosting 詳細](./self-hosting.md)
- [Tailscale HTTPS ガイド](./tailscale.md)
- [Docker ガイド](./docker.md)
- [Raspberry Pi ガイド](./raspberry-pi.md)

## 起動

プロジェクトルートからの推奨コマンド：

```bash
./scripts/start-self-host.sh
```

手動 backend path：

```bash
cd app
npm run host:device
```

`host:device` は次を設定します。

```text
VITE_SPOTIFY_AUTH_MODE=server
```

詳細手順は [Self-Hosting 詳細](./self-hosting.md) を見てください。

## Spotify Redirect URI

real-device self-host server mode では次を使います。

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

使わない値：

```text
https://<device>.<tailnet>.ts.net/callback.html
```

入力欄の詳細は [Spotify Developer Dashboard 設定](./spotify-dashboard.md) を見てください。

## Local Package と HTTPS

パッケージ版の実機 flow：

1. local server と Tailscale proxy を起動する。
2. `npm run pack:ehpk` で `.ehpk` を生成する。
3. `.ehpk` を phone に転送し、Even Realities App / Even Hub でローカルに開く。

startup script が生成する QR は、PC 上の未パッケージ開発ページを読み込むためだけのものです。正式な install や device pairing の手順ではありません。

手動で HTTPS 公開する場合は [Tailscale HTTPS ガイド](./tailscale.md) を見てください。

## デプロイ変体

- 通常 local host：[Self-Hosting 詳細](./self-hosting.md)
- containerized host：[Docker ガイド](./docker.md)
- 小型 always-on host：[Raspberry Pi ガイド](./raspberry-pi.md)

## 検証

接続前に確認：

- `self-host.config.json` に `spotifyClientId` がある
- `serviceOrigin` は最終 HTTPS origin
- `allowedTailscaleUsers` に phone request user の正確な Tailscale login があり、device hostname ではない
- `allowedOrigins` に `"http://127.0.0.1:*"` を指定し、packaged WebView の install 時に割り当てられる local port に対応する
- Spotify Dashboard に `https://<device>.<tailnet>.ts.net/api/auth/callback` がある
- 表示される server domain が `<device>.<tailnet>.ts.net` である
- `サーバードメイン入力` を選び、Settings の `サーバー API Origin` を入力して `保存してサーバー接続` を選ぶ。`https://` は省略できる
- phone page の `Service Origin` が `https://<device>.<tailnet>.ts.net` になっている
- phone page の `Redirect URI` が `https://<device>.<tailnet>.ts.net/api/auth/callback` になっている
- `Settings` / diagnostics の `Effective Redirect URI` が `/api/auth/callback` で終わる

実機では `Spotifyにログイン` を選び、Google クイックログインではなく Spotify アカウントでログインします。認証後に plugin へ戻るか開き直し、server origin を保存して接続してから `Spotify接続` を選びます。

接続後は、[スマートフォン WebView](./webview.md)と[GlassesView](./glassesview.md)の個別ガイドを参照してください。
