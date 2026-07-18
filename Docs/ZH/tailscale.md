# Tailscale HTTPS 指南

相关页面：[项目首页](./README.md) | [Self-Hosting 详细流程](./self-hosting.md) | [实机 Self-Host 指南](./device.md) | [Raspberry Pi 指南](./raspberry-pi.md) | [Docker 指南](./docker.md) | [Troubleshooting 指南](./troubleshooting.md)

当你想通过 tailnet 上稳定的 `HTTPS` origin 暴露本地 self-host backend 时，使用本指南。

## 推荐路径

主要支持路径是：

- `tailscale serve --https`

这是首选，因为 Tailscale 会处理：

- HTTPS termination
- certificate issuance
- certificate renewal
- 为 Serve 代理后的请求注入 `Tailscale-User-Login` 用户身份，并移除客户端伪造的同名 header

## 前置条件

你需要：

- 一台已登录到你的 Tailscale tailnet 的设备
- Tailscale 在线并正常工作
- 已启用 `MagicDNS`
- 已在 Tailscale 中启用 `HTTPS Certificates`
- 本地后端已经监听 `127.0.0.1:5173`
- 手机使用普通用户身份加入 tailnet，而不是 tagged node

重要：

- 最终 URL 必须是 `https://...ts.net`
- 不要使用：
  - `http://...`
  - 原始 `100.x.x.x`
  - `localhost`
  - `127.0.0.1`
  作为 Spotify redirect URI

## 启动 Tailscale HTTPS

如果本地后端已经运行在 `127.0.0.1:5173`，用下面命令暴露：

```bash
tailscale serve --https=443 http://127.0.0.1:5173
```

或使用 helper script：

```bash
./scripts/start-tailscale-proxy.sh 5173
```

如果 macOS 上 `tailscale` 不在你的 `PATH` 中，使用：

```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=443 http://127.0.0.1:5173
```

你的最终 URL 类似：

- `https://<device>.<tailnet>.ts.net`

## `*.ts.net` URL 是否固定？

通常对同一设备 + tailnet 是稳定的，但以下情况可能变化：

- 修改了设备 hostname
- 修改了 tailnet 名称
- 设备被移除并重新加入，导致 DNS 名称变化

如果 URL 变化，把 Spotify Redirect URI 更新为新的：

- `https://<new-device>.<tailnet>.ts.net/api/auth/callback`

然后清除 session 并重新连接。

## HTTPS Termination 规则

本地 listener 可以保持在：

- `http://127.0.0.1:<port>`

HTTPS 终止在：

- Tailscale
- 或你的反向代理，如果你没有使用 `tailscale serve --https`

但用户最终可见 URL 必须是：

- `https://...ts.net`

不要把本地 listener 地址放进 Spotify Redirect URI 设置。

## 用户身份与 Origin 白名单

受保护 API 不只依赖“已加入 tailnet”，还要求两层白名单：

1. Tailscale Serve 注入的 `Tailscale-User-Login` 必须在 `self-host.config.json` 的 `allowedTailscaleUsers` 中。
2. 浏览器的 `Origin` 必须等于 `serviceOrigin`，或出现在 `allowedOrigins` 中。

`serviceOrigin` 会自动允许。打包版 EvenHub 应在 `allowedOrigins` 中加入 `"http://127.0.0.1:*"`，兼容动态 WebView 端口；该规则不匹配 `localhost`、局域网或公网地址。若实机明确显示 `null`，可以改用字面值 `"null"`，但它会允许所有 opaque-origin WebView。

必须让 Node server 只监听 `127.0.0.1`。Tailscale 只会保证通过 Serve 的请求身份 header 可信；如果客户端能绕过 Serve 直接访问 Node 端口，就能自行伪造 header。不要使用 Funnel。tagged node 不会获得用户身份 header，因此不适合作为手机请求来源。身份 header 行为见 [Tailscale Serve 官方说明](https://tailscale.com/docs/features/tailscale-serve)。

## 常见失败

最常见错误是：

1. 手机打开了 `http://...` 而不是 `https://...`
2. 手机打开了原始 `100.x.x.x` 地址
3. Tailscale HTTPS 未启用，因此浏览器阻止或降级了页面
4. `allowedTailscaleUsers` 填了设备 hostname，而不是请求用户的 Tailscale 登录名
5. 手机是 tagged node，导致 Serve 不提供用户身份 header

## 高级说明

自建反向代理不会自动提供本项目需要的可信 Tailscale 用户身份边界，因此不属于受支持路径。默认且受支持的方案是：

- `tailscale serve --https`

如果以后扩展自建代理，必须同时做到：只接受可信上游、删除所有客户端传入的身份 header、重新注入经过验证的身份，并保持 Node upstream 为 loopback。在实现和验证这些条件前，请使用 `tailscale serve --https`。
