# プライバシーとローカルデータ

Even Hub Spotify Console は self-host project です。project maintainer が運営する中央 account、analytics、data collection service はありません。各 app instance は Spotify、Tailscale、および利用者自身の local self-host service と直接通信します。

## 処理するデータ

- Spotify `Client ID`、granted scope、token expiry、OAuth token。
- 現在の playback state、track / artist 名、playlist、保存状態、album-art URL。
- UI、GlassesView、playlist の設定。
- Self-host config の Tailscale user allowlist、service origin、allowed origins。

この project に Spotify `Client Secret` を入力しないでください。

## 保存場所

- Real-device self-host mode：OAuth token は host の `.self-host/state.json` に残り、phone WebView には返されません。local config は Git で追跡されない `self-host.config.json` に保存されます。
- Local simulator mode：OAuth session と interface 設定は、現在の browser または WebView の local storage に保存されます。
- Default では telemetry、advertising、remote analytics、maintainer-operated data upload service は含まれません。

Spotify API、album-art CDN、Tailscale は、それぞれの privacy policy に従って request に関連する network data と account data を処理します。

## 消去と接続解除

1. WebView settings の `Clear Session` で現在の Spotify session を消去します。
2. Spotify account の Apps page で Developer app の access を取り消します。
3. Self-host service を停止し、必要に応じて `.self-host/state.json`、`.self-host/client-debug.jsonl`、`self-host.config.json`、`simulator.config.json` を削除します。
4. Even Hub package を uninstall し、関連する WebView または browser site data を消去します。

`self-host.config.json` を削除すると、local に保存した Tailscale user allowlist も削除されます。必要な non-sensitive setting は削除前に backup してください。

## Log と security

Client debug log は default で無効です。troubleshooting のため一時的に有効にすると、request time、error code、playback-related metadata が記録される場合があります。OAuth code、token、verifier は implementation で redaction されますが、log は private local data として扱い、commit や公開をしないでください。

Self-host は loopback だけで listen し、信頼できる private tailnet 経由で使用してください。Tailscale Funnel を有効にしたり、public reverse proxy で service を公開したりしないでください。

## 利用者の責任

各 self-host user は自身の instance の data controller であり、host、Tailscale account、Spotify Developer app を保護する責任があります。[Spotify Developer Terms](https://developer.spotify.com/terms)、[Developer Policy](https://developer.spotify.com/policy)、適用法令に従ってください。public Issue に token、Client ID、user email、real origin、raw log を貼り付けないでください。
