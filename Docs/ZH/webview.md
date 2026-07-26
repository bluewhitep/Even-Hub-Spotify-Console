# 手机 WebView 使用说明

手机 WebView 负责 Spotify 授权、连接状态、播放控制、播放列表和全部显示设置。眼镜端操作另见 [GlassesView 使用说明](./glassesview.md)。

## 首次连接

### 本机模拟器

1. 确认 `npm run dev:simulator` 和 EvenHub simulator 都已启动。
2. 点击“登录 Spotify”，在浏览器完成授权。
3. 返回应用；若页面未自动刷新，关闭再重新打开模拟器应用。
4. 点击“连接 Spotify”。

### 实机 self-host

1. 确认 `start-self-host.sh` 仍在运行，手机已连接同一个 tailnet。
2. 点击“登录 Spotify”，完成授权后返回 Even app。
3. 通常可直接点击“连接 Spotify”。如果页面要求服务器域名，填写 `<device>.<tailnet>.ts.net`，不要加协议或路径。
4. 状态显示“已连接”后再操作播放和设置。

“登录 Spotify”负责打开账号登录页；“连接 Spotify”负责建立或恢复 WebView 的 Spotify 会话，两步用途不同。

## 播放区域

主页显示当前曲目、歌手、专辑图和播放进度。可用操作取决于设置中的播放模式：

| 模式 | Spotify Premium | 能力 |
| --- | --- | --- |
| Embed | 不要求 | 使用 Spotify Embed 播放；不提供完整的远程控制 |
| Remote | 要求 | 上一首、播放/暂停、下一首、随机播放和循环模式 |

“Embed 不要求 Premium”只描述 Embed 控件本身；Spotify Development Mode 仍要求 app 所有者拥有 Premium。

Remote 模式需要 Spotify 中存在可用的播放设备。若按钮无反应，先在 Spotify 手机或桌面客户端播放一首歌，再刷新本页面。

## 播放列表

- “Liked Songs”固定保留，并以随机播放方式启动。
- 设置页最多可再选择 8 个 Spotify 播放列表。
- 手机端选择播放列表会立即开始播放；眼镜端也会同步同一列表。
- `0.3.1` 已包含所需的 library scope，并按 Spotify 2026 规则使用通用 `PUT` / `DELETE /me/library` 处理收藏状态。新建 Development Mode app 若返回 `403`，请确认 app owner 为 Premium、当前用户已加入 Dashboard allowlist，并在清除旧会话后重新授权；详见[故障排查](./troubleshooting.md)和 Spotify 的 [2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)。

## 设置

设置页包含：

- 界面语言：中文、English、日本語。
- 播放模式：Embed 或 Remote。
- 眼镜控制图标与是否反转左右滚动。
- 播放列表槽位。
- 进度条样式、边框、纯文字模式、专辑图大小与透明度。
- 自动隐藏开关和等待秒数。
- 开发者模式。

修改后使用页面内的保存操作。显示设置会同步到 GlassesView；Spotify 登录会话不属于可导出的设置内容。

## 保存、载入与清除

- “保存设置配置到服务器”：适合 self-host，同一服务再次打开时可载入。
- “保存设置到本地文件”：导出显示与操作偏好，用于备份或迁移。
- “清除会话”：删除当前 Spotify 授权状态；修改 Client ID、service origin 或账号后应先执行此操作。
- 清除会话不会自动删除你导出的设置文件。

不要分享包含个人域名或内部配置的导出文件。项目不会要求你导出 Spotify 密码或 Client Secret。

## 恢复连接

按以下顺序处理常见断连：

1. 确认 Spotify 客户端中有一个在线设备并正在播放。
2. 点击 WebView 的刷新操作。
3. 确认服务器脚本和 Tailscale 仍在线。
4. 域名或 Client ID 未变时，先再次点击“连接 Spotify”。
5. 域名、Client ID 或账号已变时，清除会话并重新登录。

仍无法恢复时查看[故障排查](./troubleshooting.md)。
