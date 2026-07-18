# 本地部署

本页说明如何在电脑或 Raspberry Pi 上运行 self-host 后端、生成 `.ehpk`，并由手机上的 Even Realities App / Even Hub 本地打开安装包。QR 只用于开发阶段加载未打包的网页，不是正式安装或配对流程。

## 先决条件

| 项目 | 要求 |
| --- | --- |
| 操作系统 | macOS、Linux 或 Raspberry Pi OS；需要可用终端 |
| Node.js | `20.19+` 或 `22.12+`，并带 npm |
| Spotify | app 所有者为 Premium；Dashboard 已配置实机 Redirect URI |
| Tailscale | 部署设备和手机已加入受信任的同一 tailnet；部署设备有 `*.ts.net` HTTPS 名称 |
| Even 设备 | 手机已安装 Even Realities App；眼镜已与手机完成系统配对 |
| 打包工具 | Git 与 `@evenrealities/evenhub-cli` |

先完成 [Spotify Developer Dashboard 设置](./spotify-dashboard.md)。Self-host 的 Redirect URI 必须是：

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

## 安装开发依赖

1. 克隆仓库：

   ```bash
   git clone https://github.com/bluewhitep/Even-Hub-Spotify-Console.git
   cd Even-Hub-Spotify-Console
   ```

2. 安装锁定的前端依赖和 EvenHub CLI：

   ```bash
   cd app
   npm ci
   cd ..
   npm install -g @evenrealities/evenhub-cli
   ```

3. 确认 Tailscale 已登录：

   ```bash
   tailscale status
   ```

macOS 图形版 Tailscale 也可以使用；启动脚本会查找应用内的 CLI。Docker 和 Raspberry Pi 的额外步骤分别见 [Docker](./docker.md) 与 [Raspberry Pi](./raspberry-pi.md)。

## 配置后端

1. 从模板创建本地配置：

   ```bash
   cp self-host.config.example.json self-host.config.json
   ```

2. 编辑 `self-host.config.json`：

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

字段要求：

- `spotifyClientId`：Spotify Dashboard 中的 32 位十六进制 Client ID，不是 Client Secret。
- `serviceOrigin`：只填写 HTTPS origin，不带 `/api/auth/callback`、其他路径、查询参数或结尾斜杠。
- `allowedTailscaleUsers`：填写允许访问的 Tailscale 用户登录名，必须完整匹配；不要填写设备 hostname。
- `allowedOrigins`：打包版 EvenHub 使用 `"http://127.0.0.1:*"`，兼容安装后自动分配的本地 WebView 端口；它不匹配 `localhost`、局域网或公网地址，且请求仍需通过 Tailscale 用户白名单。
- `localPort`：本地服务端口，默认 `5173`。
- `mode`：保持 `custom-origin`。

如果实机明确显示 `Current page origin` 为 `null`，可以把字面值 `"null"` 加入 `allowedOrigins`。这个值会允许所有 opaque-origin WebView，不应作为默认配置。

## 运行本地自动门禁

部署前从仓库运行：

```bash
cd <repo-root>/app
npm ci
npm audit
npm test
npm run build:device
npm run pack:ehpk
```

预期结果：依赖安装使用 lockfile、`npm audit` 为 0、self-host 安全测试通过、实机构建和 `.ehpk` 打包成功。这些检查不需要 Spotify 或 Even 设备，但不能替代后文的人工实机验证。

## 启动后端

从仓库根目录运行：

```bash
./scripts/start-self-host.sh
```

脚本会构建前端、在 `127.0.0.1:<localPort>` 启动服务，并询问是否配置 Tailscale Serve。出现提示时启用 Tailscale HTTPS。保持终端运行；按 `Ctrl+C` 会停止本地 Node 服务。

当前启动脚本可能同时输出开发用 QR。正式的 `.ehpk` 使用流程不扫描它；该 QR 仅让开发者从手机加载仍在电脑上运行的未打包页面。

## 打包 `.ehpk`

在另一个终端运行：

```bash
cd <repo-root>/app
npm run pack:ehpk
```

生成文件位于：

```text
ehpk/even-hub-spotify-console.<base-version>_<build-hash>.ehpk
```

`<build-hash>` 是 6 位构建哈希。每次打包会清理旧的同名生成包；`.ehpk` 和构建元数据默认不进入 Git。

## 在手机本地安装并打开

1. 把生成的 `.ehpk` 传到手机。
2. 在手机文件管理器或分享面板中打开该文件，并选择 Even Realities App / Even Hub 处理。
3. 从 Even Hub 打开已安装的 Spotify Console 包。不同手机系统的“打开方式”文字可能不同，但目标是直接打开 `.ehpk`，不是扫描 QR。
4. 首次打开时点击“输入服务器域名”，在设置页的“服务器 API 地址”中填写 `<device>.<tailnet>.ts.net`，然后点击“保存并连接服务器”。可以不输入 `https://`，不要输入路径。
5. 点击“登录 Spotify”，完成 Spotify 登录后返回应用，再点击“连接 Spotify”。
6. 在 Spotify 官方客户端播放一首歌，确认手机 WebView 和 GlassesView 都能读取并控制当前播放。

## 开发 QR 与正式包的区别

| 路径 | 用途 | 是否使用 `.ehpk` | 是否需要 QR |
| --- | --- | --- | --- |
| 本机模拟器 | 无设备的浏览器调试 | 否 | 否 |
| 开发 QR | 手机加载电脑上的未打包开发页面，支持快速迭代 | 否 | 是 |
| 本地安装包 | 在 Even Hub 中打开真实打包产物 | 是 | 否 |

开发 QR 的官方命令是 `evenhub qr`。它不应写入正式安装步骤，也不能替代 `.ehpk` 验证。

## 验证部署

服务运行时，在另一个终端执行：

```bash
./scripts/deploy-doctor.sh
```

至少确认：

- 配置校验为 `PASS`。
- 本地 health endpoint 可访问。
- runtime effective Redirect URI 与 Dashboard 中的 URI 完全一致。
- 手机从本地 `.ehpk` 打开应用后能完成登录和连接。
- GlassesView 能显示当前曲目并响应单击操作。

Spotify 和 Even 设备集成不能由本地自动化完全替代，发布前必须完成人工实机验收；详细清单与验收记录保存在不被 Git 追踪的本地开发文档中。

## 更新

1. 停止当前服务并更新源码：

   ```bash
   git pull --ff-only
   cd app
   npm ci
   cd ..
   ```

2. 重新启动后端并运行 `npm run pack:ehpk`。
3. 在手机中重新打开新 `.ehpk` 完成更新。
4. 重新运行 deploy doctor，并人工验证授权、播放和眼镜控制。

一般可以保留本地配置；若 Client ID 或域名发生变化，必须先在 WebView 清除旧会话再授权。

## 停止与卸载

- 前台 Node 部署：在运行 `start-self-host.sh` 的终端按 `Ctrl+C`。
- Docker 部署：运行 `./scripts/stop-self-host.sh`。
- 同时移除 Tailscale Serve 规则：运行 `./scripts/stop-self-host.sh --tailscale`，或手动执行 `tailscale serve reset`。
- 在 Even Hub 中卸载该应用包。
- 不再需要 CLI 时，运行 `npm uninstall -g @evenrealities/evenhub-cli`。
- 确认是否需要备份本地配置后，再手动删除仓库目录。

## 安全边界

- 只在受信任的私有 tailnet 中运行；不要启用 Tailscale Funnel，也不要连接公共反向代理。
- Tailscale Serve 会注入请求用户身份；`allowedTailscaleUsers` 必须只包含实际需要访问的用户。
- 不要提交 `self-host.config.json`、`.self-host/`、`qr/` 或任何 token。
- 不要把 `localPort` 监听到局域网或公网；Tailscale Serve 的上游必须保持 loopback，否则调用者可伪造身份 header。
- 实机 server 模式的 Spotify token 只保存在 host；WebView 通过受限 `/api/spotify` 代理访问 Spotify，不会收到 access token 或 refresh token。
- 这是个人 self-host 应用，不是公开多用户 Spotify 服务。

继续阅读：[手机 WebView](./webview.md) · [眼镜 GlassesView](./glassesview.md) · [故障排查](./troubleshooting.md)
