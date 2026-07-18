# 隐私与本地数据

Even Hub Spotify Console 是 self-host 项目，不提供由项目维护者运营的中央账号、分析或数据收集服务。你的应用实例直接与 Spotify、Tailscale 和你自己的本地 self-host 服务通信。

## 处理的数据

- Spotify `Client ID`、授权 scope、token 有效期和 OAuth token。
- 当前播放状态、歌曲和艺人名称、播放列表、收藏状态与专辑图 URL。
- UI、GlassesView 和播放列表设置。
- Self-host 配置中的 Tailscale 用户 allowlist、service origin 和 allowed origins。

不要在本项目中填写 Spotify `Client Secret`。

## 数据保存位置

- 实机 self-host 模式：OAuth token 保存在 host 的 `.self-host/state.json`，不会返回给手机 WebView；本地配置保存在未跟踪的 `self-host.config.json`。
- 本机模拟器模式：OAuth session 和界面设置保存在当前浏览器或 WebView 的本地存储中。
- 项目默认不包含遥测、广告、远程分析或由维护者运营的数据上传服务。

Spotify API、专辑图 CDN 和 Tailscale 会按各自的隐私政策处理与请求有关的网络和账号数据。

## 清除和断开

1. 在 WebView 设置中使用 `Clear Session` 清除当前 Spotify session。
2. 在 Spotify 账号的 Apps 页面撤销该 Developer app 的访问权限。
3. 停止 self-host 服务，并按需删除 `.self-host/state.json`、`.self-host/client-debug.jsonl`、`self-host.config.json` 和 `simulator.config.json`。
4. 卸载 Even Hub package，并清除相关 WebView 或浏览器站点数据。

删除 `self-host.config.json` 会同时删除本地保存的 Tailscale 用户 allowlist。执行前请自行备份仍需保留的非敏感配置。

## 日志与安全

Client debug log 默认关闭。排错时若临时启用，日志可能包含请求时间、错误码和播放相关元数据；实现会脱敏 OAuth code、token 和 verifier，但日志仍应视为本地私密数据，不应提交或公开。

Self-host 只应监听 loopback，并通过受信任的私有 tailnet 使用。不要启用 Tailscale Funnel，也不要使用公共反向代理暴露服务。

## 使用者责任

每位 self-host 使用者都是自己实例的数据控制者，应保护 host、Tailscale 账号和 Spotify Developer app，并遵守 [Spotify Developer Terms](https://developer.spotify.com/terms)、[Developer Policy](https://developer.spotify.com/policy)及适用法律。报告问题时不要在公开 Issue 中粘贴 token、Client ID、用户邮箱、真实 origin 或日志原文。
