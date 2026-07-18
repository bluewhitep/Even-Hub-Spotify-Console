# Docker ガイド

関連ページ：[ホーム](./README.md) | [Self-Hosting 詳細](./self-hosting.md) | [Real Device Self-Host ガイド](./device.md) | [Tailscale HTTPS ガイド](./tailscale.md) | [Raspberry Pi ガイド](./raspberry-pi.md) | [Troubleshooting ガイド](./troubleshooting.md)

ローカル host process を直接実行する代わりに、self-host service を container で実行したい場合に使うガイドです。

## Scope

この経路が扱う内容：

- host でフロントエンドをローカルビルド
- host 側でビルド済みの `app/dist` を container から配信
- 安定した HTTPS origin 経由で container を公開

これは Spotify setup rules を変更しません。

- users は最終的な `https://...` origin にアクセスします
- Spotify は引き続き次を使います：
  - `https://<your-domain>/api/auth/callback`

## Recommended Script（Build Once, Run Lightweight）

プロジェクトルートから実行：

```bash
cd <repo-root>
./scripts/start-self-host-docker.sh
```

実行後すぐ shell に戻る（detached mode）：

```bash
./scripts/start-self-host-docker.sh --detach
```

このスクリプトは次を行います。

1. `self-host.config.json` を読み込む
2. `app/node_modules` がない場合のみ frontend dependencies をインストールする
3. host で `npm run build:device` を実行する
4. local `server/` と `app/dist/` を mount した Node container を起動する
5. tailscale proxy を今起動するか確認する
6. host machine 上で `start-tailscale-proxy.sh` を実行する（container 内ではない）
7. tailscale setup が成功した場合、未パッケージ開発専用の local QR PNG（`qr/evenhub-entry.png`）を生成する
8. development-only host-local QR viewer link を表示する：
   - `http://127.0.0.1:5173/api/self-host/qr/view`
9. tailscale をスキップした場合、手動 `evenhub qr` 開発手順を表示する

Container runtime shape：

- runtime image：`node:20-alpine`
- frontend build：host-local `app/dist` を read-only で container に mount
- mounts：
  - `server/`（read-only）
  - `app/dist/`（read-only）
  - `self-host.config.json`（read-only）
  - `.self-host/`（state）
  - `qr/`（optional unpackaged-development QR output）
- tailscale：
  - stable `*.ts.net` identity のため、常に host で実行します
- local URL：
  - `http://127.0.0.1:5173`

`http://127.0.0.1:5173` は host 内部 access と optional development QR viewer 専用です。パッケージ版では phone が local `.ehpk` を起動し、Tailscale HTTPS `serviceOrigin` 経由で backend に接続します。

## Manual Equivalent Command

まず frontend を local build：

```bash
cd app
npm run build:device
cd ..
```

container を実行：

```bash
docker run --rm \
  --name even-hub-spotify-console-self-host \
  -w /workspace \
  -p 127.0.0.1:5173:5173 \
  -e HOST=0.0.0.0 \
  -e PORT=5173 \
  -e SELF_HOST_CONFIG_FILE=/workspace/self-host.config.json \
  -v "$PWD/self-host.config.json:/workspace/self-host.config.json:ro" \
  -v "$PWD/server:/workspace/server:ro" \
  -v "$PWD/app/dist:/workspace/app/dist:ro" \
  -v "$PWD/.self-host:/workspace/.self-host" \
  -v "$PWD/qr:/workspace/qr" \
  node:20-alpine \
  node /workspace/server/local-server.mjs
```

env variable で detached mode：

```bash
SELF_HOST_DETACH=1 ./scripts/start-self-host-docker.sh
```

container を停止：

```bash
./scripts/stop-self-host.sh
```

container を停止し、tailscale serve config を reset：

```bash
./scripts/stop-self-host.sh --tailscale
```

## Tailscale HTTPS 経由で公開

その後、local container を Tailscale 経由で公開します。

```bash
./scripts/start-tailscale-proxy.sh 5173
```

ユーザー向け URL は最終的な Tailscale HTTPS origin です。例：

- `https://<device>.<tailnet>.ts.net`

Spotify redirect URI として次を使わないでください。

- `http://127.0.0.1:5173`
- `http://100.x.x.x`

## Required Spotify Redirect URI

最終 HTTPS origin を使います。

- `https://<device>.<tailnet>.ts.net/api/auth/callback`

Spotify を local container listener に向けないでください。

## When To Use This Path

次が必要なら Docker を使います。

- repeatable local host setup
- node/static process を直接実行するより明確な process boundary
- 後で小型 dedicated host に移しやすい経路
