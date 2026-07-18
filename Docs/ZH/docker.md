# Docker 指南

相关页面：[项目首页](./README.md) | [Self-Hosting 详细流程](./self-hosting.md) | [实机 Self-Host 指南](./device.md) | [Tailscale HTTPS 指南](./tailscale.md) | [Raspberry Pi 指南](./raspberry-pi.md) | [Troubleshooting 指南](./troubleshooting.md)

如果你想在容器中运行 self-host 服务，而不是直接运行本地主机进程，请使用本指南。

## 范围

这条路径覆盖：

- 在宿主机本地构建前端
- 从容器中提供宿主机已构建的 `app/dist` 文件
- 通过稳定 HTTPS origin 暴露容器

这不会改变 Spotify 设置规则：

- 用户仍访问最终的 `https://...` origin
- Spotify 仍使用：
  - `https://<your-domain>/api/auth/callback`

## 推荐脚本（构建一次，轻量运行）

从项目根目录运行：

```bash
cd <repo-root>
./scripts/start-self-host-docker.sh
```

运行后立即返回 shell（detached mode）：

```bash
./scripts/start-self-host-docker.sh --detach
```

该脚本会：

1. 读取 `self-host.config.json`
2. 仅在缺少 `app/node_modules` 时安装前端依赖
3. 在宿主机本地执行 `npm run build:device`
4. 启动 Node 容器，并挂载本地 `server/` 和 `app/dist/`
5. 询问是否现在启动 tailscale proxy
6. 在 host machine 上运行 `start-tailscale-proxy.sh`（不在容器内）
7. 如果 tailscale 设置成功，生成未打包开发调试专用的本地 QR PNG（`qr/evenhub-entry.png`）
8. 打印开发调试专用的宿主机本地 QR viewer 链接：
   - `http://127.0.0.1:5173/api/self-host/qr/view`
9. 如果跳过 tailscale，则打印手动 `evenhub qr` 开发指引

容器运行时形态：

- runtime image：`node:20-alpine`
- 前端构建：宿主机本地 `app/dist`，只读挂载到容器
- mounts：
  - `server/`（read-only）
  - `app/dist/`（read-only）
  - `self-host.config.json`（read-only）
  - `.self-host/`（state）
  - `qr/`（可选的未打包开发 QR output）
- tailscale：
  - 始终在 host 上执行，以保持稳定的 `*.ts.net` identity
- local URL：
  - `http://127.0.0.1:5173`

`http://127.0.0.1:5173` 只用于宿主机内部访问和可选的开发 QR viewer。正式使用时，手机从本地 `.ehpk` 启动应用，再通过 Tailscale HTTPS `serviceOrigin` 访问后端。

## 手动等价命令

先在本地构建前端：

```bash
cd app
npm run build:device
cd ..
```

运行容器：

```bash
docker run --rm \
  --name even-hub-spotify-console-self-host \
  -w /workspace \
  -p 127.0.0.1:5173:5173 \
  -e HOST=0.0.0.0 \
  -e PORT=5173 \
  -e SELF_HOST_CONFIG_FILE=/workspace/self-host.config.json \
  -v "$PWD/self-host.config.json:/workspace/self-host.config.json:ro" \
  -v "$PWD/server:/workspace/server:ro" \
  -v "$PWD/app/dist:/workspace/app/dist:ro" \
  -v "$PWD/.self-host:/workspace/.self-host" \
  -v "$PWD/qr:/workspace/qr" \
  node:20-alpine \
  node /workspace/server/local-server.mjs
```

通过环境变量使用 detached mode：

```bash
SELF_HOST_DETACH=1 ./scripts/start-self-host-docker.sh
```

停止容器：

```bash
./scripts/stop-self-host.sh
```

停止容器并重置 tailscale serve 配置：

```bash
./scripts/stop-self-host.sh --tailscale
```

## 通过 Tailscale HTTPS 暴露

然后通过 Tailscale 暴露本地容器：

```bash
./scripts/start-tailscale-proxy.sh 5173
```

用户看到的 URL 是最终的 Tailscale HTTPS origin，例如：

- `https://<device>.<tailnet>.ts.net`

不要使用：

- `http://127.0.0.1:5173`
- `http://100.x.x.x`

作为 Spotify redirect URI。

## 必需的 Spotify Redirect URI

使用最终 HTTPS origin：

- `https://<device>.<tailnet>.ts.net/api/auth/callback`

不要把 Spotify 指向本地容器监听地址。

## 何时使用此路径

如果你需要以下能力，使用 Docker：

- 可重复的本地 host 设置
- 比直接运行 node/static 进程更清晰的进程边界
- 以后容易迁移到小型专用 host 的路径
