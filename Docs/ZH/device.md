# 实机 Self-Host 指南

相关页面：[项目首页](./README.md) | [Spotify Developer Dashboard 设置](./spotify-dashboard.md) | [本机模拟器指南](./simulator.md) | [Self-Hosting 详细流程](./self-hosting.md) | [使用说明](./usage.md) | [Tailscale HTTPS 指南](./tailscale.md) | [Docker 指南](./docker.md) | [Raspberry Pi 指南](./raspberry-pi.md) | [Troubleshooting 指南](./troubleshooting.md)

本页是实机手机和 glasses 使用的入口说明。

## 适用场景

使用本页路径时：

- 在真实 Even app 中打开页面
- glasses WebView 需要访问同一个 HTTPS origin
- 本地 self-host server 负责 Spotify OAuth callback 和 token 存储
- Spotify callback 回到 `/api/auth/callback`

如果只是本机调试，请看 [本机模拟器指南](./simulator.md)。

## 相关文档

共同设置：

- [Spotify Developer Dashboard 设置](./spotify-dashboard.md)
- [配置指南](./configuration.md)
- [Troubleshooting 指南](./troubleshooting.md)

实机专用：

- [Self-Hosting 详细流程](./self-hosting.md)
- [Tailscale HTTPS 指南](./tailscale.md)
- [Docker 指南](./docker.md)
- [Raspberry Pi 指南](./raspberry-pi.md)

## 启动

推荐从项目根目录运行：

```bash
./scripts/start-self-host.sh
```

手动后端路径：

```bash
cd app
npm run host:device
```

`host:device` 会设置：

```text
VITE_SPOTIFY_AUTH_MODE=server
```

详细流程见 [Self-Hosting 详细流程](./self-hosting.md)。

## Spotify Redirect URI

实机 self-host server 模式使用：

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

不要使用：

```text
https://<device>.<tailnet>.ts.net/callback.html
```

完整填写方式见 [Spotify Developer Dashboard 设置](./spotify-dashboard.md)。

## 本地安装包和 HTTPS

正式实机流程中：

1. 启动本地 server 和 Tailscale proxy。
2. 运行 `npm run pack:ehpk` 生成 `.ehpk`。
3. 把 `.ehpk` 传到手机，并由 Even Realities App / Even Hub 本地打开。

启动脚本生成的 QR 只用于加载电脑上的未打包开发页面，不是正式安装或设备配对步骤。

如果需要手动配置 HTTPS 暴露，查看 [Tailscale HTTPS 指南](./tailscale.md)。

## 部署变体

- 常规本机 host：看 [Self-Hosting 详细流程](./self-hosting.md)
- 容器化 host：看 [Docker 指南](./docker.md)
- 小型常开 host：看 [Raspberry Pi 指南](./raspberry-pi.md)

## 验证

连接成功前确认：

- `self-host.config.json` 中有你的 `spotifyClientId`
- `serviceOrigin` 是最终 HTTPS origin
- `allowedTailscaleUsers` 包含手机请求用户的精确 Tailscale 登录名，不是设备 hostname
- `allowedOrigins` 包含 `"http://127.0.0.1:*"`，以兼容打包版自动分配的本地 WebView 端口
- Spotify Dashboard 中添加了 `https://<device>.<tailnet>.ts.net/api/auth/callback`
- 页面显示的服务器域名应为 `<device>.<tailnet>.ts.net`
- 点击 `输入服务器域名`，在设置页填写 `服务器 API 地址`，再点击 `保存并连接服务器`；可以不加 `https://`
- 手机页面显示 `Service Origin` 为 `https://<device>.<tailnet>.ts.net`
- 手机页面显示 `Redirect URI` 为 `https://<device>.<tailnet>.ts.net/api/auth/callback`
- `Settings` / diagnostics 中的 `Effective Redirect URI` 以 `/api/auth/callback` 结尾

实机登录 Spotify 时，在手机页面点击 `登录 Spotify`。不要使用 Google 快捷登录；请使用 Spotify 账号登录。成功后返回或重新打开该插件，先保存并连接服务器地址，再点击 `连接 Spotify`。

连接成功后，分别查看[手机 WebView](./webview.md)和[眼镜 GlassesView](./glassesview.md)说明。
