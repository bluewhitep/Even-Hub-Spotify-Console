# Tailscale HTTPS ガイド

関連ページ：[ホーム](./README.md) | [Self-Hosting 詳細](./self-hosting.md) | [Real Device Self-Host ガイド](./device.md) | [Raspberry Pi ガイド](./raspberry-pi.md) | [Docker ガイド](./docker.md) | [Troubleshooting ガイド](./troubleshooting.md)

ローカル self-host backend を tailnet 上の安定した `HTTPS` origin として公開したい場合に使うガイドです。

## Recommended Path

主にサポートする経路：

- `tailscale serve --https`

これは推奨オプションです。Tailscale が次を処理します。

- HTTPS termination
- certificate issuance
- certificate renewal
- Serve proxy 後に `Tailscale-User-Login` user identity を注入し、client が送信した同名 header を削除

## Prerequisites

必要なもの：

- Tailscale tailnet に signed in している device
- Tailscale が online で動作していること
- `MagicDNS` が有効
- Tailscale で `HTTPS Certificates` が有効
- local backend がすでに `127.0.0.1:5173` で listening していること
- phone が tagged node ではなく、通常の user-owned node として tailnet に参加していること

重要：

- 最終 URL は `https://...ts.net` でなければなりません
- 次を Spotify redirect URI として使わないでください：
  - `http://...`
  - raw `100.x.x.x`
  - `localhost`
  - `127.0.0.1`

## Tailscale HTTPS を起動

local backend がすでに `127.0.0.1:5173` で running の場合、次で公開します。

```bash
tailscale serve --https=443 http://127.0.0.1:5173
```

または helper script：

```bash
./scripts/start-tailscale-proxy.sh 5173
```

macOS で `tailscale` が `PATH` にない場合：

```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=443 http://127.0.0.1:5173
```

最終 URL は次のようになります。

- `https://<device>.<tailnet>.ts.net`

## `*.ts.net` URL は固定？

通常、同じ device + tailnet では安定しています。ただし次の場合は変わる可能性があります。

- device hostname が変更された
- tailnet name が変更された
- device が remove/re-add され、DNS name が変わった

URL が変わった場合、Spotify Redirect URI を新しい値に更新します。

- `https://<new-device>.<tailnet>.ts.net/api/auth/callback`

その後、session を clear して再接続します。

## HTTPS Termination Rule

local listener は次のままでかまいません。

- `http://127.0.0.1:<port>`

HTTPS termination は次で行われます。

- Tailscale
- または `tailscale serve --https` を使わない場合は your reverse proxy

ただし最終的に user-visible な URL は次でなければなりません。

- `https://...ts.net`

local listener address を Spotify Redirect URI settings に入れないでください。

## User Identity と Origin Allowlist

protected API は tailnet membership に加えて 2 つの allowlist を要求します。

1. Tailscale Serve が注入する `Tailscale-User-Login` が `self-host.config.json` の `allowedTailscaleUsers` に含まれること。
2. browser `Origin` が `serviceOrigin` と一致するか、`allowedOrigins` に含まれること。

`serviceOrigin` は自動許可されます。packaged EvenHub では dynamic WebView port 用に `allowedOrigins` へ `"http://127.0.0.1:*"` を追加します。この rule は `localhost`、LAN、public address には一致しません。device が明示的に `null` を表示した場合は代わりに literal value `"null"` を使用できますが、すべての opaque-origin WebView を許可します。

Node server は `127.0.0.1` だけで listen する必要があります。Tailscale が identity header を信頼できる状態にするのは Serve を通った request だけです。client が Serve を迂回して Node port に直接到達できると、独自の header を送信できます。Funnel は使用しません。tagged node は user identity header を受け取らないため、phone request source には適しません。identity header の behavior は公式 [Tailscale Serve documentation](https://tailscale.com/docs/features/tailscale-serve) を参照してください。

## Common Failures

もっとも多い mistakes：

1. phone が `https://...` ではなく `http://...` を開いた
2. phone が raw `100.x.x.x` address を開いた
3. Tailscale HTTPS が active でなく、browser が page を block または downgrade した
4. `allowedTailscaleUsers` に request user の Tailscale login ではなく device hostname を設定した
5. phone が tagged node で、Serve が user identity header を提供しない

## Advanced Note

custom reverse proxy は、この project が必要とする trusted Tailscale user-identity boundary を自動では提供しないため、サポート対象外です。サポート対象の default は引き続き：

- `tailscale serve --https`

将来 custom proxy を設計する場合は、trusted upstream だけを受け入れ、client-supplied identity header をすべて削除し、別途検証した identity を注入し、Node upstream を loopback に限定する必要があります。これらを実装・検証するまでは `tailscale serve --https` を使用してください。
