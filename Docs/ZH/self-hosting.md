# Self-Hosting 详细流程

相关页面：[项目首页](./README.md) | [Spotify Developer Dashboard 设置](./spotify-dashboard.md) | [实机 Self-Host 指南](./device.md) | [本机模拟器指南](./simulator.md) | [配置指南](./configuration.md) | [使用说明](./usage.md) | [Tailscale HTTPS 指南](./tailscale.md) | [Docker 指南](./docker.md) | [Raspberry Pi 指南](./raspberry-pi.md) | [Troubleshooting 指南](./troubleshooting.md)

这是实机 self-host server 的详细设置流程。

如果只需要本机模拟器，请使用 [本机模拟器指南](./simulator.md)。

## Quick Start

正常 self-hosted 路径是：

1. 准备 `self-host.config.json`
2. 启动本地脚本（`./scripts/start-self-host.sh`）
3. 通过 Tailscale HTTPS 暴露本地 server（脚本提示或手动）
4. 用 `npm run pack:ehpk` 生成 `.ehpk`
5. 把 `.ehpk` 传到手机并用 Even Realities App / Even Hub 本地打开
6. 配置 Spotify Developer Redirect URI
7. 在手机 WebView 中连接 Spotify

实机 self-host 路径使用 server callback：

- `https://<device>.<tailnet>.ts.net/api/auth/callback`

## 1) 准备配置文件

创建或编辑：

```bash
cd <repo-root>
cp self-host.config.example.json self-host.config.json
```

示例：

```json
{
  "spotifyClientId": "your_spotify_client_id",
  "serviceOrigin": "https://your-device.your-tailnet.ts.net",
  "allowedTailscaleUsers": [
    "your-tailscale-user-login"
  ],
  "allowedOrigins": [
    "http://127.0.0.1:*"
  ],
  "localPort": 5173,
  "mode": "custom-origin"
}
```

`allowedTailscaleUsers` 是必填的非空数组，不能省略。填写允许访问的 Tailscale 用户登录名（通常是登录邮箱），不是设备 hostname；缺失或为空时，服务端会拒绝启动。这个限制用于防止同一 tailnet 中未授权的其他成员控制你的 Spotify。可在 Tailscale 客户端的账户信息或管理后台 Users 页面确认准确登录名。

`serviceOrigin` 会自动允许。打包版 EvenHub 在 `allowedOrigins` 中使用 `"http://127.0.0.1:*"`，这样应用更新后本地 WebView 端口变化也能连接；它只匹配 `127.0.0.1` 的有效 HTTP 端口，请求仍需通过 Tailscale 用户白名单。若实际 Origin 为 `null`，可改用字面值 `"null"`，但它会允许所有 opaque-origin WebView。

## 1.1) 端口选择

启动脚本按以下优先级解析本地端口：

1. `PORT` 环境变量
2. `localPort` in `self-host.config.json`
3. 默认 `5173`

示例：

```bash
PORT=8080 ./scripts/start-self-host.sh
```

```json
{
  "spotifyClientId": "your_spotify_client_id",
  "serviceOrigin": "https://your-device.your-tailnet.ts.net",
  "allowedTailscaleUsers": [
    "your-tailscale-user-login"
  ],
  "allowedOrigins": [
    "http://127.0.0.1:*"
  ],
  "localPort": 8080,
  "mode": "custom-origin"
}
```

## 2) 启动本地 Self-Host 脚本

从项目根目录运行：

```bash
./scripts/start-self-host.sh
```

该脚本会：

1. 读取 `self-host.config.json`
2. 构建前端
3. 在 `http://127.0.0.1:<port>` 启动后端
4. 询问是否现在启动 tailscale proxy（host machine）
5. 如果 tailscale 设置成功，同时生成开发调试专用 QR PNG 到 `qr/evenhub-entry.png`
6. 打印开发调试专用的宿主机本地 QR viewer 链接：
   - `http://127.0.0.1:<port>/api/self-host/qr/view`
7. 如果跳过 tailscale，则显示手动 `evenhub qr` 开发指引

如果跳过提示，可以手动启动 Tailscale：

```bash
./scripts/start-tailscale-proxy.sh <port>
```

随时运行部署检查：

```bash
./scripts/deploy-doctor.sh
```

停止服务：

```bash
./scripts/stop-self-host.sh
```

停止服务并重置 tailscale serve 配置：

```bash
./scripts/stop-self-host.sh --tailscale
```

QR 输出是未打包页面的开发辅助，不属于 `.ehpk` 安装流程。如果需要这种开发模式，可用 `evenhub qr` 手动生成；正式包无需生成或扫描 QR。

## 3) 在 Even App 中打开 `.ehpk`

先生成安装包：

```bash
cd <repo-root>/app
npm run pack:ehpk
```

把 `ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk` 传到手机，再通过文件管理器或分享面板选择 Even Realities App / Even Hub 本地打开。正式使用不扫描 QR。应用代码从本地包启动，Spotify API 和 self-host API 仍通过 `self-host.config.json` 中的 Tailscale HTTPS `serviceOrigin` 访问。

如果开发者确实要运行未打包页面，才使用 `qr/evenhub-entry.png` 或本地 QR viewer；该路径不能替代 `.ehpk` 实机验收。

## 4) Tailscale HTTPS

如果没有通过脚本提示启动：

```bash
./scripts/start-tailscale-proxy.sh <port>
```

这会通过你的 `https://<device>.<tailnet>.ts.net` origin 暴露本地 app。

Tailscale Serve 同时为受保护 API 注入请求用户身份。后端只接受 `allowedTailscaleUsers` 中的登录名，并要求本地 upstream 保持在 `127.0.0.1`。不要使用 Funnel；不要把 local port 暴露到 LAN 或公网；不要用 tagged node 作为手机请求来源，因为 tagged node 不提供所需的用户身份 header。

## 5) Spotify Developer

字段位置、实机 URI 和精确匹配规则见：

- [Spotify Developer Dashboard 设置](./spotify-dashboard.md)

实机 self-host server 使用：

- `Website`：`https://<device>.<tailnet>.ts.net`
- `Redirect URI`：`https://<device>.<tailnet>.ts.net/api/auth/callback`

然后把 `Client ID` 复制到 `self-host.config.json`。

实机手机端先点击 `登录 Spotify`，不要使用 Google 快捷登录。成功后返回或重新打开该插件。首次连接或服务器地址不正确时，点击 `输入服务器域名`，在设置页的 `服务器 API 地址` 输入 `<device>.<tailnet>.ts.net`，再点击 `保存并连接服务器`；可以省略 `https://`，后台会生成完整 callback。

## 6) WebView 中的 Runtime Settings

Runtime setting 详情见：

- [配置指南](./configuration.md)

包括：

- `Client ID`
- `Service Origin`
- `输入服务器域名` 打开的设置页、`服务器 API 地址` 和 `保存并连接服务器` 操作
- 精确 redirect URI 规则
- `Clear Config`
- `Clear Session`

## Callback、Diagnostics 和失败恢复

完整 troubleshooting 和 callback 行为说明见：

- [Troubleshooting 指南](./troubleshooting.md)

包括：

- `state mismatch`
- expired login
- WebView storage isolation
- diagnostics fields
- cache / refresh behavior

连接成功后，分别查看[手机 WebView](./webview.md)和[眼镜 GlassesView](./glassesview.md)说明。

## 7) 本地自动检查与实机验收

每次发布候选包至少运行：

```bash
cd <repo-root>/app
npm ci
npm audit
npm test
npm run build:device
npm run pack:ehpk
```

本地测试会验证依赖、服务端令牌边界、身份与 Origin 拒绝、Spotify 代理路由白名单、构建和打包。Spotify 授权、播放控制、手机 WebView 与眼镜 GlassesView 仍须人工测试，因为本地自动化无法连接你的 Spotify 账号和 Even 设备；详细清单和验收记录仅保存在不被 Git 追踪的本地开发文档中。

## 8) Spotify Web API 2026 兼容性

当前实现已使用 2026 迁移后的接口形态：收藏/取消收藏通过通用 `PUT` / `DELETE /me/library` 并提交 Spotify URI；播放列表总数优先读取 `items.total`，同时保留旧 `tracks.total` 回退。参见 [Spotify February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)。这些兼容处理不改变 Spotify 对账号、配额或商业使用的政策限制。

## 9) EvenHub Pack Metadata（`app.json`）

使用 EvenHub CLI 生成 metadata template：

```bash
evenhub init
```

本项目使用的打包字段示例：

```json
{
  "package_id": "com.example.g2demo",
  "edition": "202601",
  "name": "G2 Demo",
  "version": "0.3.0",
  "min_app_version": "0.1.0",
  "tagline": "A short description of the app",
  "description": "A relatively long description of the app",
  "author": "Your Name",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["evenhub.evenrealities.com"],
    "fs": ["./assets"]
  }
}
```

打包前需要填写：

- `package_id`：唯一 app ID（reverse-domain 风格，不要复用其他 app 的 ID）
- `edition`：除非你的 EvenHub workflow 需要其他 edition code，否则保持 CLI template
- `name`：app 显示名
- `version`：app version string
- `min_app_version`：最低 Even app version
- `tagline` / `description`：短描述和长描述
- `author`：作者信息
- `entrypoint`：构建输出中的启动 HTML 文件（本项目是 `index.html`）
- `permissions`：只保留需要的 scope（`network`、`fs` 等）

打包命令：

```bash
cd <repo-root>
cd app
npm run pack:ehpk
```

包会写入：

```text
ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk
```

可选 package ID 可用性检查：

```bash
evenhub pack app.json ./app/dist --check
```

## Notes

- Raspberry Pi 和 Docker 变体文档在这里：
  - [Raspberry Pi 指南](./raspberry-pi.md)
  - [Docker 指南](./docker.md)
  - Docker 模式也在 host 上运行 Tailscale；脚本生成的 QR 仅用于未打包开发调试
- Tailscale 详情和前置条件：
  - [Tailscale HTTPS 指南](./tailscale.md)

## Legacy Manual Flow

你仍然可以手动运行后端：

```bash
cd <repo-root>/app
npm install
npm run host:device
```

这会在下面地址启动本地后端：

- `127.0.0.1:5173`
