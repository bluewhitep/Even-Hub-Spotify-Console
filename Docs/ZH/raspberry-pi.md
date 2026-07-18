# Raspberry Pi 指南

相关页面：[项目首页](./README.md) | [Self-Hosting 详细流程](./self-hosting.md) | [实机 Self-Host 指南](./device.md) | [Tailscale HTTPS 指南](./tailscale.md) | [Docker 指南](./docker.md) | [Troubleshooting 指南](./troubleshooting.md)

如果你想用小型常开主机做个人部署，请使用本指南。

## 核心规则

Raspberry Pi 可以在本地托管 app：

- `http://127.0.0.1:<port>`

但用户必须通过最终 HTTPS URL 访问，例如：

- `https://<pi>.<tailnet>.ts.net`

不要把本地监听地址放进 Spotify Redirect URI 设置。

## 方案 1：纯静态 + Tailscale HTTPS

推荐方式（项目根目录脚本）：

```bash
cd <repo-root>
./scripts/start-self-host.sh
```

只要 Raspberry Pi 安装了 Node 和 npm，这个脚本就可以运行。
它会读取 `self-host.config.json`、构建 app、启动本地 server，并可选择启动 tailscale proxy。脚本生成的 QR 仅用于未打包开发调试；正式实机使用仍需从 `app/` 运行 `npm run pack:ehpk`，再在手机本地打开 `.ehpk`。

手动等价流程：

```bash
cd app
npm install
npm run build:device
npx serve -s dist -l tcp://127.0.0.1:5173
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=443 http://127.0.0.1:5173
```

用户看到的 URL 是：

- `https://<pi>.<tailnet>.ts.net`

## 可选容器变体

如果你想让 Raspberry Pi 在容器中运行前端，请使用这里的 Docker 路径：

- [Docker 指南](./docker.md)

容器模式的项目根目录脚本：

```bash
cd <repo-root>
./scripts/start-self-host-docker.sh
```

## 必须区分的规则

- Raspberry Pi 只需要托管本地 HTTP listener
- HTTPS 可以在 Tailscale 终止
- Spotify 必须使用最终公开 HTTPS origin
- redirect URI 必须是：
  - `https://<pi>.<tailnet>.ts.net/api/auth/callback`

## 为什么有用

Raspberry Pi 可以提供：

- 稳定的个人 self-host 目标
- 小型常开设备
- 比临时笔记本会话更干净的长期运行方案
