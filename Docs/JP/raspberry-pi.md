# Raspberry Pi ガイド

関連ページ：[ホーム](./README.md) | [Self-Hosting 詳細](./self-hosting.md) | [Real Device Self-Host ガイド](./device.md) | [Tailscale HTTPS ガイド](./tailscale.md) | [Docker ガイド](./docker.md) | [Troubleshooting ガイド](./troubleshooting.md)

個人デプロイ用の小型 always-on host が欲しい場合に使うガイドです。

## Core Rule

Raspberry Pi は app をローカルで host できます。

- `http://127.0.0.1:<port>`

ただし users は最終 HTTPS URL からアクセスする必要があります。例：

- `https://<pi>.<tailnet>.ts.net`

ローカル listener address を Spotify Redirect URI 設定に入れないでください。

## Option 1: Pure Static + Tailscale HTTPS

推奨（project-root script）：

```bash
cd <repo-root>
./scripts/start-self-host.sh
```

Raspberry Pi に Node と npm が入っていれば、この script は動作します。
`self-host.config.json` を読み込み、app を build し、local server を起動します。必要なら Tailscale proxy も起動できます。生成される QR は未パッケージ開発専用です。パッケージ版の実機使用では `app/` から `npm run pack:ehpk` を実行し、phone で `.ehpk` をローカルに開きます。

Manual equivalent：

```bash
cd app
npm install
npm run build:device
npx serve -s dist -l tcp://127.0.0.1:5173
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=443 http://127.0.0.1:5173
```

ユーザー向け URL：

- `https://<pi>.<tailnet>.ts.net`

## Optional Container Variant

Raspberry Pi で frontend を container 実行したい場合は、こちらの Docker 経路を使います。

- [Docker ガイド](./docker.md)

container mode の project-root script：

```bash
cd <repo-root>
./scripts/start-self-host-docker.sh
```

## Rules To Keep Straight

- Raspberry Pi は local HTTP listener を host できればよい
- HTTPS は Tailscale で terminate できます
- Spotify は最終 public HTTPS origin を使う必要があります
- redirect URI は次でなければなりません：
  - `https://<pi>.<tailnet>.ts.net/api/auth/callback`

## Why This Is Useful

Raspberry Pi は次を提供します。

- 安定した personal self-host target
- 小型 always-on device
- 一時的な laptop session より clean な長期実行 setup
