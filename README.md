# Even Hub Spotify Console

[![App Version](https://img.shields.io/badge/app-0.3.0-blue)](./app.json) [![Even Hub SDK](https://img.shields.io/badge/Even%20Hub%20SDK-0.0.9-7c3aed)](./app/package.json) [![Docs](https://img.shields.io/badge/docs-ZH%20%7C%20EN%20%7C%20JP-0f766e)](./Docs/ZH/README.md) [![Simulator](https://img.shields.io/badge/mode-simulator-2563eb)](./Docs/ZH/simulator.md) [![Self Host](https://img.shields.io/badge/mode-self--host-16a34a)](./Docs/ZH/deployment.md) [![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-orange)](./LICENSE)

[中文](./Docs/ZH/README.md) | [English](./Docs/EN/README.md) | [日本語](./Docs/JP/README.md)

在 Even Hub 手机 WebView 中连接 Spotify，在眼镜端查看播放状态并控制播放。项目提供本机模拟器调试，以及通过 HTTPS 部署到真实设备的 self-host 模式；推荐使用 Tailscale 提供 HTTPS 和访问身份。

> 本项目仍处于发布前阶段。推荐在你信任的私有 tailnet 内使用 Tailscale Serve，不要通过 Tailscale Funnel 暴露到互联网。其他 HTTPS 方案也可以使用，但必须同时提供可靠的访问控制，并由受信任的反向代理传入与 `allowedTailscaleUsers` 白名单匹配的 `Tailscale-User-Login` 身份；只有 HTTPS 证书而没有身份校验并不足够。

本项目不是 Spotify 或 Even Realities 的官方产品，也不代表任何认可或合作关系。Spotify 将控制后台 Spotify 播放也归入 Streaming SDA；请仅用于私人、个人和非商业用途，并遵守 [Spotify Developer Terms](https://developer.spotify.com/terms) 与 [Developer Policy](https://developer.spotify.com/policy)。

## 最快开始：本机模拟器

先准备 Node.js `20.19+` 或 `22.12+`、npm、一个 Spotify Premium 账号，以及 Spotify Developer app。

1. 在 Spotify Developer Dashboard 添加 Redirect URI：

   ```text
   http://127.0.0.1:5173/callback.html
   ```

2. 克隆项目并创建本地配置：

   ```bash
   git clone https://github.com/bluewhitep/Even-Hub-Spotify-Console.git
   cd Even-Hub-Spotify-Console
   cp simulator.config.example.json simulator.config.json
   ```

3. 把 `simulator.config.json` 中的 `spotifyClientId` 改成你的 Client ID。只使用 Client ID，不要填写 Client Secret。

4. 安装并启动：

   ```bash
   npm install -g @evenrealities/evenhub-simulator
   cd app
   npm ci
   npm run dev:simulator
   ```

5. 在另一个终端打开模拟器：

   ```bash
   evenhub-simulator "http://127.0.0.1:5173/?simulator=true"
   ```

首次打开后，在手机 WebView 点击“登录 Spotify”，完成授权后返回应用，再点击“连接 Spotify”。完整排错步骤见[本机模拟器指南](./Docs/ZH/simulator.md)。

## 实机使用

真实手机和眼镜需要一个稳定的 HTTPS 地址。本项目推荐 Tailscale，因为 Tailscale Serve 能同时提供受信任的 HTTPS、私有网络访问和用户身份。使用 Tailscale 时，Spotify callback 为：

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

也可以使用其他能够提供 HTTPS 的私有部署方案，但反向代理必须完成用户认证，并安全地传入与服务端白名单匹配的 `Tailscale-User-Login` 请求头。不要让客户端自行设置或覆盖这个请求头，也不要把服务端口直接暴露到局域网或互联网；普通 HTTPS 转发本身不能替代当前服务端的身份校验。

从先决条件、Dashboard 配置、`.ehpk` 打包到手机本地安装的完整流程见[本地部署指南](./Docs/ZH/deployment.md)。QR 只用于开发阶段加载未打包页面，不是正式安装方式。

## 核心文档

- [Spotify Developer Dashboard 设置](./Docs/ZH/spotify-dashboard.md)：创建应用、填写两个 Redirect URI、添加测试用户。
- [本地部署](./Docs/ZH/deployment.md)：先决条件、安装、启动、验证、更新和卸载。
- [手机 WebView 使用说明](./Docs/ZH/webview.md)：授权、播放模式、播放列表、设置与恢复。
- [眼镜 GlassesView 使用说明](./Docs/ZH/glassesview.md)：手势、控制项、播放列表、设备切换与隐藏/恢复。
- [隐私与本地数据](./Docs/ZH/privacy.md)：处理的数据、保存位置、清除会话与日志边界。
- [故障排查](./Docs/ZH/troubleshooting.md)：认证、网络、开发 QR 和设备问题。

完整文档目录：[中文](./Docs/ZH/README.md) · [English](./Docs/EN/README.md) · [日本語](./Docs/JP/README.md)

安全问题与参与贡献：[安全政策](./SECURITY.md) · [贡献指南](./CONTRIBUTING.md)

## 许可证

本项目使用 [Mozilla Public License 2.0](./LICENSE)。分发你修改过的 MPL 覆盖文件时，需要提供这些文件的源码；它仍允许项目与独立的专有文件组合使用。

MPL-2.0 只许可本仓库代码，不授予 Spotify 或 Even Realities 的内容、专辑图、商标、API 或平台使用权。

文档截图中的 Spotify 元数据和专辑封面仅用于说明实际界面，相关权利仍归 Spotify 及各自权利人；它们不属于 MPL-2.0 授权内容。使用 Spotify 内容时还必须遵守 Spotify 的署名、回链和展示规则。
