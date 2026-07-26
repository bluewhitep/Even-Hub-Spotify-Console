# Even Hub Spotify Console 日本語ドキュメント

[![App Version](https://img.shields.io/badge/app-0.3.1-blue)](../../app.json) [![Even Hub SDK](https://img.shields.io/badge/Even%20Hub%20SDK-0.0.9-7c3aed)](../../app/package.json) [![Docs](https://img.shields.io/badge/docs-ZH%20%7C%20EN%20%7C%20JP-0f766e)](./README.md) [![Simulator](https://img.shields.io/badge/mode-simulator-2563eb)](./simulator.md) [![Self Host](https://img.shields.io/badge/mode-self--host-16a34a)](./deployment.md) [![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-orange)](../../LICENSE)

[中文](../ZH/README.md) | [English](../EN/README.md) | [日本語](./README.md) | [プロジェクトトップ](../../README.md)

Even Hub Spotify Console は、スマートフォンの WebView で Spotify のログイン・再生・設定を行い、GlassesView で再生情報の確認とジェスチャー操作を行うアプリです。

## 初回セットアップ

1. [Spotify Developer Dashboard の設定](./spotify-dashboard.md)を完了します。
2. 実行方法を選びます。
   - すぐに試す、または開発する場合：[ローカルシミュレーター](./simulator.md)
   - 実際のスマートフォンとグラスで使う場合：[ローカルデプロイ](./deployment.md)
3. 接続後は、[スマートフォン WebView](./webview.md)と[GlassesView](./glassesview.md)の個別ガイドを参照します。
4. 問題がある場合は、対応するチェックリストを実行してから[トラブルシューティング](./troubleshooting.md)を確認します。

## 主要ガイド

| ガイド | 内容 |
| --- | --- |
| [Spotify Developer Dashboard](./spotify-dashboard.md) | app の作成、Redirect URI、Client ID、テストユーザー |
| [ローカルデプロイ](./deployment.md) | 前提条件、導入、設定、起動、検証、更新、停止、アンインストール |
| [スマートフォン WebView](./webview.md) | 認証、再生モード、プレイリスト、設定の保存、復旧 |
| [GlassesView](./glassesview.md) | ジェスチャー、操作項目、プレイリスト、デバイス切替、自動非表示、復旧 |

## 実行と設定

- [設定項目](./configuration.md)
- [ローカルシミュレーター](./simulator.md)
- [実機クイックガイド](./device.md)
- [Self-host 詳細ガイド](./self-hosting.md)
- [Tailscale HTTPS（推奨）](./tailscale.md)
- [Docker デプロイ](./docker.md)
- [Raspberry Pi デプロイ](./raspberry-pi.md)

## 検証とトラブルシューティング

- [トラブルシューティング](./troubleshooting.md)

## セキュリティ境界

- [プライバシーとローカルデータ](./privacy.md)
- Spotify の `Client ID` だけを入力し、`Client Secret` は保存・コミットしないでください。
- `simulator.config.json`、`self-host.config.json`、`.self-host/`、`qr/` はローカル実行データであり、コミットしないでください。
- HTTPS、プライベートアクセス、ユーザー識別をまとめて提供できるため、信頼できるプライベート tailnet で Tailscale Serve を使う方法を推奨します。別の HTTPS 方式を使う場合は、確実なアクセス制御を行い、信頼できるリバースプロキシから `allowedTailscaleUsers` に一致する `Tailscale-User-Login` を設定する必要があります。TLS 証明書だけでは不十分です。Tailscale Funnel や公開リバースプロキシで外部公開しないでください。
- Client ID または service origin を変更した場合は、再認証の前に WebView のセッションを消去してください。
- [セキュリティ報告](../../SECURITY.md)と[コントリビューションガイド](../../CONTRIBUTING.md)

## プラットフォームと商標について

本プロジェクトは Spotify または Even Realities の公式製品ではなく、両社による承認や提携を示すものではありません。Spotify はバックグラウンドの Spotify app を操作する機能も Streaming SDA と定義しています。個人の私的・非商用利用に限定し、[Spotify Developer Terms](https://developer.spotify.com/terms) と [Developer Policy](https://developer.spotify.com/policy)を遵守してください。[MPL-2.0](../../LICENSE) が許諾するのは本リポジトリのコードだけであり、第三者のコンテンツ、アルバム画像、商標、API、プラットフォームの権利は含まれません。

ドキュメントの screenshot に表示される Spotify metadata と album artwork は実際の interface を説明するためだけのものです。権利は Spotify と各 rightsholder に帰属し、これらの素材は MPL-2.0 の対象ではありません。
