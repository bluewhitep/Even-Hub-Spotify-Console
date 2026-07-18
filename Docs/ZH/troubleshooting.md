# Troubleshooting 指南

相关页面：[项目首页](./README.md) | [Spotify Developer Dashboard 设置](./spotify-dashboard.md) | [本机模拟器指南](./simulator.md) | [实机 Self-Host 指南](./device.md) | [Self-Hosting 详细流程](./self-hosting.md) | [配置指南](./configuration.md) | [使用说明](./usage.md)

当设置看起来正确，但授权或运行时行为仍失败时，使用本页。

快速第一步：

```bash
./scripts/deploy-doctor.sh
```

## Redirect URI 不匹配

如果配置的 redirect URI 不是精确匹配，Spotify 授权会立即失败。

检查这些字段：

- protocol
- hostname
- port（如果有）
- path

正确：

- `https://x.ts.net/api/auth/callback`

错误：

- `https://x.ts.net/api/auth/callback/`
- `https://x.ts.net/callback.html`
- `https://x.ts.net/`

如果域名变化：

1. 点击 `输入服务器域名`，在设置页输入新域名并点击 `保存并连接服务器`
2. 检查页面显示的 `Effective Redirect URI`
3. 更新 Spotify Developer 中的 Redirect URI
4. 点击 `Clear Session`
5. 再次连接

## `403` 身份或 Origin 被拒绝

受保护 API 返回 `tailscale_identity_denied` 时：

1. 确认请求通过 Tailscale Serve，而不是直接访问 Node 的本地端口。
2. 确认 `allowedTailscaleUsers` 填写的是手机请求用户的 Tailscale 登录名，不是设备 hostname。
3. 确认手机不是 tagged node；tagged node 不会收到 Serve 的用户身份 header。
4. 修改配置后重启 self-host server，再运行 `./scripts/deploy-doctor.sh`。

返回 `browser_origin_denied` 时：

1. 先确认 `serviceOrigin` 与手机使用的 HTTPS origin 完全一致；这个 origin 会自动允许。
2. 打包版若显示 `http://127.0.0.1:<动态端口>`，确认 `allowedOrigins` 包含专用规则 `"http://127.0.0.1:*"`。
3. 只有实际值明确为 `null` 时才允许字面值 `"null"`；它会匹配所有 opaque-origin WebView。
4. 不要使用全局 `*`；仅支持完整的专用规则 `"http://127.0.0.1:*"`，也不要关闭 Origin 校验。

## PKCE State 问题

当前端 PKCE 流程中的登录状态过期，或返回路径与 pending login request 不匹配时，会失败。

常见失败：

- `state mismatch`
- `expired login`
- `missing login state`

你可能看到的 backend / callback error code：

- `pkce_state_missing`
- `pkce_state_mismatch`
- `pkce_pending_expired`
- `token_exchange_failed`
- `network_error`

发生这种情况时：

1. 回到 `Settings`
2. 确认 `Client ID`
3. 确认 `Effective Redirect URI`
4. 点击 `Clear Session`
5. 开始一次新的登录，并避免同时打开多个登录窗口

## WebView / Storage Isolation

Runtime config 和 login state 不会在所有浏览器容器中通用共享。

示例：

- Safari
- Even App WebView
- 另一个浏览器
- private / incognito mode

即使 origin 相同，storage 也可能不共享。

如果 Safari 中有 config，但 Even App WebView 中没有，这是正常的；需要在 WebView 中重新配置。

## Cache / Refresh Behavior

如果重新部署后行为没有变化：

1. 关闭当前 Even App 页面并重新打开
2. 如有需要，重新打开或重新安装最新 `.ehpk`
3. 如果 config 变化，使用 `Clear Session`

不要假设 WebView 会立即丢弃缓存中的 app instance。

## 实机 WebView 放置后空白

如果实机手机页面放置一段时间后变成空白，但 diagnostics 或 client log 显示 DOM 仍存在、没有 `window-error` / `unhandledrejection`，优先检查 `@evenrealities/even_hub_sdk` 版本。

当前实机发布版本应固定使用：

```text
@evenrealities/even_hub_sdk@0.0.9
```

已知风险：

- `0.0.10` 开始新增 `src/shadow-timers.ts`
- `dist/index.js` 有顶层副作用
- SDK import 时会覆盖全局 `window.setTimeout`、`window.setInterval`、`window.clearTimeout`、`window.clearInterval`
- 实机 Even App WebView 中可能出现 render frame 停止、随后 timer 停止，页面视觉上变成空白

在上游 SDK 修复或提供关闭 shadow timers 的选项前，不要用 `0.0.10+` 打实机发布包。

## 隐藏的 Glasses UI 不会自动返回

如果双击隐藏 glasses UI，它会保持隐藏，直到你通过交互再次显示。

当前行为：

- foreground-enter 不会自动显示隐藏 UI
- `Auto Hide` timeout 只在启用时隐藏；它不会自动显示

恢复路径：

1. 在 glasses 上双击以再次显示
2. 使用手机 WebView 顶部刷新按钮

## 开发 QR Generation / Viewer 问题

本节只适用于加载未打包开发页面。正式 `.ehpk` 安装不使用 QR。

如果开发模式在 QR generation 阶段失败：

1. 确认 `self-host.config.json` 存在，并且有有效的 `serviceOrigin`（只能是 `https://...` origin）
2. 确认已安装 `evenhub` CLI，或在 `app/` 中安装 `qrcode`
3. 重新运行：
   - `./scripts/start-self-host.sh`

如果 QR viewer 页面空白：

- 打开：
  - `http://127.0.0.1:5173/api/self-host/qr/meta`
- 确认 metadata 存在
- 检查 PNG 文件：
  - `qr/evenhub-entry.png`

## Diagnostics

`Settings` 中包含用于支持截图的 diagnostics 区域。

关键字段：

- `Version`（`<app-version>_<6位hex hash>`，例如 `0.3.0_ab12cd`）
- `Connection`
- `Client ID`
- `Runtime`
- `Current page origin`
- `Effective serviceOrigin`
- `Effective redirectUri`
- `Authorized metadata`
- `clientNow`
- `tokenExpiresAt`
- `Last error`

如果 token 看起来立即过期，先检查设备时间 / NTP。

实机 `server` 模式的 diagnostics 只应显示授权状态、scope、过期时间和脱敏摘要，不应出现 access token 或 refresh token。client debug 日志默认关闭；只有短时排错才设置 `ENABLE_CLIENT_DEBUG_LOGS=1`，完成后重启服务并关闭。

## Rate Limiting

当轮询过密或快速触发多个控制动作时，Spotify player endpoint 可能返回 rate-limit response。

实践规则：

- 避免快速重复点击
- 在强制多次 refresh 前，让现有 polling loop 稳定下来
- 如果 app 报告 cooldown，等待它结束，不要立刻重试

Rate limiting 通常是时序问题，不是配置问题。
