# Even Hub Spotify Console 中文文档

[![App Version](https://img.shields.io/badge/app-0.3.2-blue)](../../app.json) [![Even Hub SDK](https://img.shields.io/badge/Even%20Hub%20SDK-0.0.9-7c3aed)](../../app/package.json) [![Docs](https://img.shields.io/badge/docs-ZH%20%7C%20EN%20%7C%20JP-0f766e)](./README.md) [![Simulator](https://img.shields.io/badge/mode-simulator-2563eb)](./simulator.md) [![Self Host](https://img.shields.io/badge/mode-self--host-16a34a)](./deployment.md) [![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-orange)](../../LICENSE)

[中文](./README.md) | [English](../EN/README.md) | [日本語](../JP/README.md) | [项目首页](../../README.md)

Even Hub Spotify Console 让手机 WebView 负责 Spotify 登录、播放控制和设置，让 GlassesView 负责播放信息显示和眼镜手势控制。

## 第一次使用

1. 完成 [Spotify Developer Dashboard 设置](./spotify-dashboard.md)。
2. 选择运行方式：
   - 只想快速体验或开发：使用[本机模拟器](./simulator.md)。
   - 要在真实手机和眼镜上使用：按[本地部署指南](./deployment.md)操作。
3. 连接成功后分别阅读[手机 WebView](./webview.md)和[眼镜 GlassesView](./glassesview.md)说明。
4. 如果遇到错误，先运行对应检查清单，再查阅[故障排查](./troubleshooting.md)。

## 核心文档

| 文档 | 解决的问题 |
| --- | --- |
| [Spotify Developer Dashboard 设置](./spotify-dashboard.md) | 如何创建 app、填写 Redirect URI、复制 Client ID 和添加测试用户 |
| [本地部署](./deployment.md) | 先决条件、安装、配置、启动、验证、更新、停止与卸载 |
| [手机 WebView](./webview.md) | 登录、连接、播放模式、播放列表、设置保存与会话恢复 |
| [眼镜 GlassesView](./glassesview.md) | `H` 隐藏、单击/滚动恢复、双击系统退出确认、播放列表与设备切换 |

## 运行与配置

- [配置字段说明](./configuration.md)
- [本机模拟器指南](./simulator.md)
- [实机快速指南](./device.md)
- [Self-host 详细说明](./self-hosting.md)
- [Tailscale HTTPS（推荐）](./tailscale.md)
- [Docker 部署](./docker.md)
- [Raspberry Pi 部署](./raspberry-pi.md)

## 验证与排错

- [故障排查](./troubleshooting.md)

## 安全边界

- [隐私与本地数据](./privacy.md)
- 配置中只填写 Spotify `Client ID`，不要保存或提交 `Client Secret`。
- `simulator.config.json`、`self-host.config.json`、`.self-host/` 和 `qr/` 都是本地运行数据，不应提交。
- 推荐在受信任的私有 tailnet 中使用 Tailscale Serve，因为它同时提供 HTTPS、私有访问和用户身份。其他 HTTPS 方案必须提供可靠的访问控制，并由受信任的反向代理传入与 `allowedTailscaleUsers` 匹配的 `Tailscale-User-Login`；只有 HTTPS 证书并不足够。不要使用 Tailscale Funnel 或公共反向代理对外开放。
- 更换 Client ID 或服务域名后，先在 WebView 中清除会话，再重新授权。
- [安全问题报告](../../SECURITY.md)与[贡献指南](../../CONTRIBUTING.md)

## 平台与商标声明

本项目不是 Spotify 或 Even Realities 的官方产品，也不代表任何认可或合作关系。控制后台 Spotify 播放属于 Spotify 定义的 Streaming SDA；请仅用于私人、个人和非商业用途，并遵守 [Spotify Developer Terms](https://developer.spotify.com/terms) 与 [Developer Policy](https://developer.spotify.com/policy)。[MPL-2.0](../../LICENSE) 只许可本仓库代码，不授予第三方内容、专辑图、商标、API 或平台使用权。

文档截图中的 Spotify 元数据和专辑封面仅用于说明实际界面，相关权利仍归 Spotify 及各自权利人；这些素材不属于 MPL-2.0 授权内容。
