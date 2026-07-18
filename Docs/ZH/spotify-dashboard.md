# Spotify Developer Dashboard 设置

本页只负责创建 Spotify app 和配置认证入口。完成后，你会得到一个可公开使用的 `Client ID`；本项目不需要也不应保存 `Client Secret`。

## 1. 准备账号

- 登录要使用本应用的 Spotify 账号。
- Spotify 当前的 Development Mode 要求 app 所有者拥有 Premium。
- Development Mode 最多允许 5 个已加入 allowlist 的用户。其他人的账号即使能打开页面，也无法完成授权。

最新限制以 Spotify 的 [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) 和 [2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) 为准。

## 2. 创建 app

1. 打开 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 并登录。
2. 选择 **Create app**。
3. 填写 App name 和 App description；内容可以说明这是个人 Even Hub Spotify 控制器。
4. 如果页面要求选择 API，选择 **Web API**。
5. 阅读并接受 Spotify 的条款，然后创建 app。
6. 打开新 app 的 **Settings**。Spotify 的 app 创建与设置字段说明见官方 [Apps guide](https://developer.spotify.com/documentation/web-api/concepts/apps)。

## 3. 填写 Redirect URI

只添加你实际会使用的模式。

### 本机模拟器

默认端口为 `5173`：

```text
http://127.0.0.1:5173/callback.html
```

如果修改了 `simulator.config.json` 的 `localPort`，这里的端口也必须同步修改。

### 真实设备 self-host

```text
https://<device>.<tailnet>.ts.net/api/auth/callback
```

示例中的 `<device>` 和 `<tailnet>` 必须替换成你自己的 Tailscale 名称。它必须与 `self-host.config.json` 的 `serviceOrigin` 使用同一个 origin。

### 精确匹配规则

Spotify 要求授权请求中的 Redirect URI 与 Dashboard 中保存的值完全一致，包括：

- `http` 或 `https`
- 主机名与端口
- 路径和尾部斜杠
- 字母大小写

Spotify 只允许明确的 loopback IP 使用 HTTP，因此本机必须写 `127.0.0.1`，不要写 `localhost`。详情见 Spotify 官方 [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)。

保存 Settings 后重新打开页面，确认两个 URI 没有被截断或改写。

## 4. 复制 Client ID

1. 回到 app 概览或 Settings。
2. 复制 **Client ID**。
3. 根据运行模式填入以下文件之一：

   - 本机模拟器：`simulator.config.json`
   - 真实设备：`self-host.config.json`

不要点击或复制 Client Secret，也不要把任何真实 ID、token 或配置文件提交到 Git。

## 5. 添加测试用户

如果其他 Spotify 账号也要使用：

1. 在 app Settings 打开 **Users Management**。
2. 选择 **Add new user**。
3. 填写该 Spotify 账号要求的姓名和邮箱。
4. 保存后，让该用户用同一个邮箱对应的 Spotify 账号授权。

## 6. 最终检查

- [ ] app 所有者是 Premium 账号。
- [ ] 模拟器 URI 使用 `127.0.0.1`，端口和本地配置相同。
- [ ] 实机 URI 使用 HTTPS，且以 `/api/auth/callback` 结尾。
- [ ] Dashboard、配置文件和实际访问地址的 origin 完全一致。
- [ ] 使用者已在 Users Management allowlist 中。
- [ ] 本地文件只包含 Client ID，不包含 Client Secret。

下一步：本机调试看[模拟器指南](./simulator.md)，真实设备看[本地部署](./deployment.md)。
