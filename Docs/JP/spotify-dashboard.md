# Spotify Developer Dashboard の設定

このページでは Spotify app の作成と認証先の設定だけを説明します。取得する `Client ID` は公開して利用できる識別子です。本プロジェクトでは `Client Secret` は不要であり、保存もしません。

## 1. アカウントを準備する

- app の所有者になる Spotify アカウントでログインします。
- Spotify の現在の Development Mode では、app 所有者に Premium が必要です。
- Development Mode で許可できるユーザーは最大 5 人です。許可リストにないアカウントは認証できません。

最新の制限は Spotify の [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) と [February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) を確認してください。

## 2. app を作成する

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) を開いてログインします。
2. **Create app** を選択します。
3. App name と App description を入力します。個人用の Even Hub Spotify コントローラーであることが分かる内容で構いません。
4. 使用する API の選択を求められた場合は **Web API** を選びます。
5. Spotify の規約を確認して同意し、app を作成します。
6. 作成した app の **Settings** を開きます。各項目の公式説明は [Apps guide](https://developer.spotify.com/documentation/web-api/concepts/apps) を参照してください。

## 3. Redirect URI を追加する

実際に使う実行モードだけを追加します。

### ローカルシミュレーター

既定ポートは `5173` です。

```text
http://127.0.0.1:5173/callback.html
```

`simulator.config.json` の `localPort` を変更した場合は、ここも同じポートに変更します。

### 実機 self-host

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

`<device>` と `<tailnet>` は自分の Tailscale 名に置き換えます。この URI の origin は、`self-host.config.json` の `serviceOrigin` と同じでなければなりません。

### 完全一致の規則

Spotify は、認証リクエストの Redirect URI と Dashboard に保存した値の完全一致を求めます。次のすべてが対象です。

- `http` と `https`
- ホスト名とポート
- パスと末尾のスラッシュ
- 英字の大文字・小文字

Spotify が HTTP を許可するのは明示的な loopback IP だけです。ローカルでは `localhost` ではなく `127.0.0.1` を使ってください。詳細は Spotify 公式の [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) を参照してください。

Settings を保存した後に開き直し、URI が短縮・変更されていないことを確認します。

## 4. Client ID をコピーする

1. app の概要または Settings に戻ります。
2. **Client ID** をコピーします。
3. 実行モードに対応するローカルファイルへ入力します。

   - ローカルシミュレーター：`simulator.config.json`
   - 実機：`self-host.config.json`

Client Secret は表示・コピーしないでください。実際の ID、token、ローカル設定ファイルを Git にコミットしないでください。

## 5. テストユーザーを追加する

別の Spotify アカウントにも利用を許可する場合：

1. app Settings の **Users Management** を開きます。
2. **Add new user** を選びます。
3. Spotify が求める氏名とメールアドレスを入力します。
4. 保存後、同じメールアドレスに対応する Spotify アカウントで認証します。

## 6. 最終確認

- [ ] app 所有者が Premium である。
- [ ] シミュレーター URI が `127.0.0.1` を使い、ポートがローカル設定と一致する。
- [ ] 実機 URI が HTTPS で、`/api/auth/callback` で終わる。
- [ ] Dashboard、設定ファイル、実際の URL の origin が完全に一致する。
- [ ] すべての利用者が Users Management に登録されている。
- [ ] ローカルファイルに Client ID だけがあり、Client Secret がない。

次の手順：ローカル開発は[シミュレーターガイド](./simulator.md)、実機利用は[ローカルデプロイ](./deployment.md)へ進んでください。
