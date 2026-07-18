# Contributing

[中文](#中文) | [English](#english) | [日本語](#日本語)

## 中文

### 开始前

请先搜索已有 Issue 和 PR。修复应保持范围小且可验证；除非维护者明确要求，不要顺带改版本号、重写无关代码或增加依赖。

### 本地验证

需要 Node.js `20.19+` 或 `22.12+`、npm，以及用于打包的 Even Hub CLI。运行：

```bash
cd app
npm ci
npm audit --audit-level=high
npm test
npm run build
npm run build:device
npm run pack:ehpk
```

Spotify 与 Even 设备链路无法由本地测试完全覆盖。影响授权、播放控制、手机 WebView 或 GlassesView 的改动，PR 中必须说明已完成的人工验证和未验证边界。

### 提交与文档

- 不要提交 `simulator.config.json`、`self-host.config.json`、`.self-host/`、`.tmp/`、token、Cookie、Client Secret、真实服务地址或未脱敏日志。
- 用户可见行为、配置或部署流程变化时，同步更新中文、英文和日文文档。
- 不要添加无明确再分发权的专辑封面、截图、商标或其他第三方素材。仓库现有截图的风险接受不构成新素材授权。
- 提交 PR 时写清动机、改动范围、验证命令、人工测试结果和剩余风险。

贡献内容按本仓库 [MPL-2.0](./LICENSE) 许可证提供。提交代码或文档前，请确认你有权贡献其中的内容。

## English

### Before you start

Search existing Issues and PRs first. Keep fixes small and verifiable. Do not bump versions, rewrite unrelated code, or add dependencies unless a maintainer requests it.

### Local validation

You need Node.js `20.19+` or `22.12+`, npm, and the Even Hub CLI for packaging. Run:

```bash
cd app
npm ci
npm audit --audit-level=high
npm test
npm run build
npm run build:device
npm run pack:ehpk
```

Local tests cannot fully cover Spotify and Even hardware integration. A PR affecting authorization, playback, the phone WebView, or GlassesView must state what was manually tested and what remains unverified.

### Changes and documentation

- Do not commit `simulator.config.json`, `self-host.config.json`, `.self-host/`, `.tmp/`, tokens, cookies, Client Secrets, real service origins, or unsanitized logs.
- Keep the Chinese, English, and Japanese docs synchronized when user-visible behavior, configuration, or deployment changes.
- Do not add album artwork, screenshots, trademarks, or other third-party assets without clear redistribution rights. Acceptance of the existing screenshot risk does not license new assets.
- In the PR, describe the motivation, scope, verification commands, manual results, and remaining risks.

Contributions are provided under this repository's [MPL-2.0](./LICENSE) license. Confirm that you have the right to contribute all submitted code and documentation.

## 日本語

### 作業を始める前に

既存の Issue と PR を先に検索してください。修正は小さく検証可能な範囲に保ちます。maintainer の明示的な依頼がない限り、version の変更、無関係な code の書き換え、dependency の追加を行わないでください。

### ローカル検証

Node.js `20.19+` または `22.12+`、npm、package 作成用の Even Hub CLI が必要です。次を実行します。

```bash
cd app
npm ci
npm audit --audit-level=high
npm test
npm run build
npm run build:device
npm run pack:ehpk
```

local test だけでは Spotify と Even hardware の連携を完全には検証できません。authorization、playback、phone WebView、GlassesView に影響する PR では、完了した manual test と未検証の範囲を明記してください。

### 変更とドキュメント

- `simulator.config.json`、`self-host.config.json`、`.self-host/`、`.tmp/`、token、Cookie、Client Secret、実際の service origin、未加工の log を commit しないでください。
- user-visible behavior、configuration、deployment が変わる場合、中文・English・日本語 docs を同期してください。
- 再配布権が明確でない album artwork、screenshot、trademark、その他の第三者素材を追加しないでください。既存 screenshot のリスク受容は新しい素材の許諾ではありません。
- PR には目的、変更範囲、検証 command、manual test 結果、残るリスクを記載してください。

contribution はこの repository の [MPL-2.0](./LICENSE) に基づいて提供されます。提出する code と docs のすべてについて、contribution の権利があることを確認してください。
