# スマートフォン WebView ガイド

スマートフォン WebView は、Spotify 認証、接続状態、再生、プレイリスト、すべての表示設定を担当します。グラスの操作は [GlassesView ガイド](./glassesview.md)を参照してください。

## 初回接続

### ローカルシミュレーター

1. `npm run dev:simulator` と EvenHub simulator の両方が動作していることを確認します。
2. **Spotifyにログイン** を選び、ブラウザーで認証を完了します。
3. app に戻ります。自動更新されない場合は simulator app を閉じて開き直します。
4. **Spotify接続** を選びます。

### 実機 self-host

1. `start-self-host.sh` が動作中で、スマートフォンが同じ tailnet に接続していることを確認します。
2. **Spotifyにログイン** を選び、認証後に Even app へ戻ります。
3. 通常はそのまま **Spotify接続** を選べます。サーバードメインを求められた場合は、scheme や path を付けずに `<device>.<tailnet>.ts.net` を入力します。
4. 状態が **接続済み** になってから再生と設定を操作します。

**Spotifyにログイン** はアカウント認証を開き、**Spotify接続** はこの WebView が使う Spotify セッションを確立または復元します。別々の手順です。

## 再生エリア

ホーム画面には現在の曲、アーティスト、アルバム画像、進行状況が表示されます。使用できる操作は再生モードによって異なります。

| モード | Spotify Premium | 機能 |
| --- | --- | --- |
| Embed | 不要 | Spotify Embed で再生。完全なリモート操作は不可 |
| Remote | 必要 | 前の曲、再生/一時停止、次の曲、シャッフル、リピート |

「Premium 不要」は Embed 操作自体についての説明です。Spotify の Development Mode では、app 所有者に Premium が必要です。

Remote モードには利用可能な Spotify 再生デバイスが必要です。操作できない場合は、Spotify 公式のスマートフォンまたはデスクトップアプリで曲を再生してから、この画面を更新してください。

## プレイリスト

- **Liked Songs** は常に表示され、シャッフルで再生を開始します。
- 設定から Spotify プレイリストを最大 8 件追加できます。
- スマートフォンで選ぶとすぐ再生が始まり、グラスにも同期されます。
- `0.3.1+` は必要な library scope を含み、Spotify 2026 ルールに従って保存状態の変更に汎用 `PUT` / `DELETE /me/library` endpoint を使用します。新しい Development Mode app で `403` が返る場合は、app owner が Premium であること、現在の user が Dashboard allowlist に追加されていること、古い session を消去して再認証したことを確認してください。詳しくは[トラブルシューティング](./troubleshooting.md)と Spotify の [February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)を参照してください。

## 設定

設定画面には次の項目があります。

- UI 言語：中文、English、日本語。
- 再生モード：Embed または Remote。
- グラスの操作アイコンと左右スクロールの反転。
- プレイリスト枠。
- 進行表示、枠線、文字のみ表示、アルバム画像の大きさと透明度。
- 自動非表示の有効化と待ち時間。
- 開発者モード。

変更後は画面内の保存操作を使います。表示設定は GlassesView に同期されます。Spotify の認証情報やログインセッションは、書き出す設定ファイルには含まれません。

## 保存、読込、消去

- **設定をサーバーに保存**：self-host で、同じサービスから後で読み込む場合に利用します。
- **設定をローカルファイルに保存**：表示・操作設定をバックアップまたは移行します。
- **セッション消去**：現在の Spotify 認証状態を削除します。Client ID、service origin、Spotify アカウントを変更した後は、再接続前に実行します。
- セッションを消去しても、書き出した設定ファイルは削除されません。

個人ドメインや内部設定を含む書き出しファイルを共有しないでください。本プロジェクトが Spotify のパスワードや Client Secret の書き出しを要求することはありません。

## 接続を復旧する

1. Spotify 公式クライアントにオンラインの再生デバイスがあることを確認します。
2. WebView の更新操作を使います。
3. サーバースクリプトと Tailscale が動作中であることを確認します。
4. ドメインと Client ID が変わっていなければ、もう一度 **Spotify接続** を選びます。
5. ドメイン、Client ID、アカウントを変更した場合は、セッションを消去して再ログインします。

復旧しない場合は[トラブルシューティング](./troubleshooting.md)を参照してください。
