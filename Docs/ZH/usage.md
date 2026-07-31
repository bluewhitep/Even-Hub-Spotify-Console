# 使用说明

使用界面分为两个部分：手机 WebView 负责登录、连接、播放与设置；眼镜 GlassesView 负责快速查看和手势控制。

## 手机 WebView

阅读[手机 WebView 使用说明](./webview.md)，其中包括：

- 首次登录和连接顺序
- Embed 与 Remote 播放模式
- 播放控制和播放列表
- 显示设置、配置保存和会话清除
- 断线后的恢复顺序

## 眼镜 GlassesView

阅读[眼镜 GlassesView 使用说明](./glassesview.md)，其中包括：

- 左右滚动用于移动焦点，单击用于执行高亮项
- `H` 只隐藏 GlassesView，不退出应用，也不调用 Spotify API
- 隐藏后的第一次单击或左右滚动只恢复显示，不执行控制或移动焦点
- 双击只打开 Even 系统退出确认
- 播放、随机、循环、播放列表、设备切换与自动隐藏
- 常见无响应或空列表问题

## 推荐顺序

1. 先在手机端完成 Spotify 登录和连接。
2. 在 Spotify 官方客户端启动一首歌，确保存在活动设备。
3. 在手机端选择 Remote 模式和需要的播放列表。
4. 再打开 GlassesView 验证显示与手势。

尚未完成安装时，请先看[本地部署](./deployment.md)；出现错误时请看[故障排查](./troubleshooting.md)。
