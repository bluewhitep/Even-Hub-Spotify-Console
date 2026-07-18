# 配置指南

相关页面：[项目首页](./README.md) | [Spotify Developer Dashboard 设置](./spotify-dashboard.md) | [本机模拟器指南](./simulator.md) | [实机 Self-Host 指南](./device.md) | [Self-Hosting 详细流程](./self-hosting.md) | [使用说明](./usage.md) | [Troubleshooting 指南](./troubleshooting.md)

本页说明手机 WebView 内需要的运行时配置。

## Auth Mode

当前有两种认证路径：

| 模式 | 启动命令 | 用途 | Redirect URI |
| --- | --- | --- | --- |
| `client` | `cd app && npm run dev:simulator` | 本机模拟器 | `http://127.0.0.1:5173/callback.html` |
| `server` | `./scripts/start-self-host.sh` | 实机 self-host | `https://<device>.<tailnet>.ts.net/api/auth/callback` |

`client` 模式由 browser 直接完成 PKCE callback；`server` 模式由本地 self-host server 完成 Spotify callback 和 token 存储。

## Server Config File（Self-Host 脚本）

部署脚本读取：

- `self-host.config.json`（项目根目录）

完整配置模板：

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

字段规则：

- `spotifyClientId`：Dashboard 中的 32 位十六进制 Client ID；不要填写 Client Secret。
- `serviceOrigin`：最终的 Tailscale HTTPS origin。该值会自动加入浏览器 Origin 白名单。
- `allowedTailscaleUsers`（必填）：1–20 个允许访问的 Tailscale 登录名，通常是登录邮箱；必须与访问手机所属用户的登录名完整匹配，不要填写设备 hostname。
- `allowedOrigins`（可选）：额外允许的浏览器 Origin。打包版 EvenHub 建议使用 `"http://127.0.0.1:*"`，以兼容安装后自动分配的本地 WebView 端口。
- `localPort`：本地 loopback 端口。
- `mode`：保持 `custom-origin`。

`localPort` 可选。省略时，启动脚本默认使用 `5173`。
如果设置了 `PORT` 环境变量，`PORT` 会覆盖 `localPort`。

`allowedTailscaleUsers` 不能省略或留空，否则服务端会拒绝启动。它用于防止同一 tailnet 中未授权的其他成员控制你的 Spotify。准确登录名可在 Tailscale 客户端账户信息或管理后台 Users 页面查看。

`allowedOrigins` 可以使用精确 HTTPS origin、loopback HTTP origin、专用规则 `"http://127.0.0.1:*"`，或字面值 `"null"`。专用规则只匹配 `127.0.0.1` 上带有效端口的 HTTP Origin，不匹配 `localhost`、局域网或公网地址；请求仍必须通过 `allowedTailscaleUsers` 身份校验。`"null"` 会允许所有 opaque-origin WebView，请仅在实机确认 `Current page origin` 确实为 `null` 后使用。

这个文件由以下部分使用：

- `./scripts/start-self-host.sh`
- `./scripts/start-self-host-docker.sh`
- `server/local-server.mjs`

## 配置运行时设置

实机 self-host server 模式：

1. 在 `self-host.config.json` 中填写 `spotifyClientId`、`serviceOrigin` 和 `allowedTailscaleUsers`
2. 启动 self-host server 后，点击 `连接 Spotify`
3. 在设置页的 `服务器 API 地址` 输入 `<device>.<tailnet>.ts.net`，再点击 `保存并连接服务器`
4. 后台会自动配置：
   - `Service Origin` 是 `https://<device>.<tailnet>.ts.net`
   - `Redirect URI` 是 `https://<device>.<tailnet>.ts.net/api/auth/callback`
5. `Settings` / diagnostics 只用于核对 `Effective Redirect URI`，实机主流程不再要求手动保存 runtime config
6. 点击 `Connect Spotify`

## Server 模式的安全边界

- 受保护 API 必须同时通过 Tailscale 用户白名单和浏览器 Origin 白名单。
- 本地服务只监听 `127.0.0.1`；Tailscale Serve 是受支持的 HTTPS 入口。不要使用 Funnel，也不要把本地端口暴露到局域网或公网。
- Spotify access token 和 refresh token 只保存在 host 的 `.self-host/state.json`；目录权限为 `0700`，敏感文件权限为 `0600`。
- WebView 只获得授权状态、scope 和过期时间等非敏感摘要；Spotify 请求通过受限的 `/api/spotify` 后端代理完成。
- client debug 日志默认关闭。只有排错时才临时设置 `ENABLE_CLIENT_DEBUG_LOGS=1`，完成后立即关闭。
- 模拟器 `client` 模式仍由本机浏览器直接完成 PKCE；不要把该开发模式的本地存储当作实机 server 模式的令牌边界。

模拟器 client 模式：

1. 打开 `Settings`
2. 粘贴你的 Spotify `Client ID`
3. 保持 `Custom Origin` 开启
4. 保留 `http://127.0.0.1:<Port>` 这类本机 origin
5. 点击 `Save Config`
6. 确认 `Current config source` 是 `Runtime`
7. 点击 `Connect Spotify`

## Spotify Developer Dashboard 字段位置

字段位置、常用 URI 和精确匹配规则见：

- [Spotify Developer Dashboard 设置](./spotify-dashboard.md)

摘要：

- 模拟器 client 模式使用 `/callback.html`
- 实机 server 模式使用 `/api/auth/callback`
- 本地 HTTP 只用于本机模拟器，使用 `127.0.0.1` 这类明确 loopback IP，不使用 `localhost`

## Glasses Runtime Settings

在 `Settings` 中，当前运行时行为是：

- 进度条样式：
  - `= -` 使用默认轨道长度
  - `█ ▒` 固定为 20 个字符单元
  - `■ □` 固定为 20 个字符单元
- Auto hide：
  - `Auto Hide` 开关控制是否启用 timeout 隐藏
  - 只有启用 `Auto Hide` 时才使用 `Auto Hide (sec)`
- Foreground enter 不会自动显示已隐藏的 glasses UI。

## 重要 Origin 规则

使用用户在地址栏里实际看到的 origin。

示例：

- 本地 app 监听 `http://127.0.0.1:5173`
- Tailscale 或反向代理把它暴露为 `https://x.ts.net`

那么真实 origin 是：

- `https://x.ts.net`

不是：

- `http://127.0.0.1:5173`

不要把本地监听地址放进 Spotify Redirect URI 设置。

## Runtime Config 规则

- Runtime config key：
  - `spotify_self_host_config_v1`
- 优先级：
  - `Server`（实机 self-host server 模式）
  - `Runtime`
  - `Env`
  - `Missing`
- Runtime config 只用于模拟器 / client 模式
- 删除 runtime config 后会回退到 env

## Service Origin 校验

接受：

- `https://x.ts.net`
- `https://x.ts.net:8443`

拒绝：

- `https://x.ts.net/app`
- `https://x.ts.net/?a=1`
- `https://x.ts.net/#hash`
- `http://x.ts.net`
- `http://192.168.1.10:5173`
- `100.x.x.x`
- `x.ts.net`

规范化规则：

- `https://x.ts.net:443` 会变成 `https://x.ts.net`
- `HTTPS://X.TS.NET` 会变成 `https://x.ts.net`
- 保存前会裁掉多余空白
- 保存后，会把规范化后的 origin 写回输入框

## Custom Origin（v1）

- `custom-origin` 是实机默认路径
- 实机点击 `输入服务器域名` 后会打开设置页；在 `服务器 API 地址` 中输入 `<device>.<tailnet>.ts.net`，再点击 `保存并连接服务器`
- 输入可以不包含 `https://`，app 会自动生成 `https://<device>.<tailnet>.ts.net`
- `Service Origin` 只填写 origin，不包含 `/api/auth/callback`
- `Effective Redirect URI` 会显示需要填到 Spotify Developer Dashboard 的完整 callback

## Effective Redirect URI

应用按认证模式使用：

| 模式 | Effective Redirect URI |
| --- | --- |
| `client` / 本机模拟器 | `${effectiveServiceOrigin}/callback.html` |
| `server` / 实机 self-host | `${effectiveServiceOrigin}/api/auth/callback` |

在 `Settings` 中，这个值应当：

- 单行显示
- 可复制
- 作为 Spotify Redirect URI 的精确值使用

## 如果域名变化

如果你的域名变化：

1. 点击 `输入服务器域名`，在设置页输入新的 `<device>.<tailnet>.ts.net`，再点击 `保存并连接服务器`
2. 检查新的 `Effective Redirect URI`
3. 更新 Spotify Developer 中的 Redirect URI
4. 点击 `Clear Session`
5. 再次点击 `Connect Spotify`

如果域名已变，但 Spotify Developer 仍保留旧 Redirect URI，授权会失败。

## Clear Config vs Clear Session

### `Clear Config`

只清除：

- `spotify_self_host_config_v1`

不会清除：

- token bundle
- PKCE pending state
- authorized metadata
- last auth error

### `Clear Session`

实机 `server` 模式会让后端清除 `.self-host/state.json` 中的 pending login、token 和错误状态；WebView 不持有 token。模拟器 `client` 模式会清除浏览器中的 Spotify session state：

- `spotify_pkce_pending_v1`
- token bundle
- `authorized_client_id`
- `authorized_service_origin`
- last auth error

不会清除：

- `spotify_self_host_config_v1`
