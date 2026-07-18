# Security Policy

[中文](#中文) | [English](#english) | [日本語](#日本語)

## 中文

### 支持范围

仅维护最新的 `0.3.x` 稳定版本；旧包和第三方修改包不在支持范围内。

### 私下报告漏洞

请优先在本仓库的 **Security** 页面选择 **Report a vulnerability**，通过 GitHub Private Vulnerability Reporting 提交。若该入口不可用，请只创建一个不含漏洞细节的公开 Issue，请求维护者提供私下沟通方式。不要在公开 Issue、PR、截图或日志中放入利用步骤、Spotify token、Cookie、Client Secret、Tailscale 身份信息或真实服务地址。

报告请包含受影响版本、影响、最小复现步骤和已脱敏日志。维护者会尽快确认，但当前不承诺固定响应或修复时限。

### 安全边界

适合报告的内容包括 token 泄漏、认证绕过、Tailscale 身份或 origin 校验绕过、Spotify 代理越界请求，以及会把 self-host 服务暴露到非预期网络的问题。Spotify、Even Realities 或 Tailscale 平台自身的问题应报告给对应厂商。

Self-host 仅设计用于受信任的私有 tailnet；不要通过 Tailscale Funnel 或公共反向代理公开。

## English

### Supported versions

Only the latest stable `0.3.x` release is maintained. Older packages and third-party modified builds are unsupported.

### Report a vulnerability privately

Use **Report a vulnerability** on this repository's **Security** page to submit through GitHub Private Vulnerability Reporting. If that option is unavailable, open only a public Issue requesting a private contact channel and include no vulnerability details. Never place exploit steps, Spotify tokens, cookies, Client Secrets, Tailscale identity data, or real service origins in a public Issue, PR, screenshot, or log.

Include the affected version, impact, minimal reproduction, and sanitized logs. The maintainer will acknowledge reports as soon as practical, but no fixed response or remediation deadline is promised.

### Security boundary

Relevant reports include token exposure, authentication bypass, Tailscale identity or origin validation bypass, out-of-scope Spotify proxy requests, and unintended self-host network exposure. Vulnerabilities in Spotify, Even Realities, or Tailscale products should be reported to the relevant vendor.

Self-host is designed only for a trusted private tailnet. Do not expose it through Tailscale Funnel or a public reverse proxy.

## 日本語

### サポート対象

最新の安定版 `0.3.x` のみを保守します。古い package と第三者が変更した build はサポート対象外です。

### 脆弱性の非公開報告

この repository の **Security** ページにある **Report a vulnerability** から GitHub Private Vulnerability Reporting を使用してください。この項目がない場合は、脆弱性の詳細を含めず、非公開の連絡手段を求める公開 Issue だけを作成してください。exploit 手順、Spotify token、Cookie、Client Secret、Tailscale identity、実際の service origin を公開 Issue、PR、screenshot、log に記載しないでください。

対象 version、影響、最小の再現手順、マスク済み log を含めてください。maintainer は可能な限り早く確認しますが、固定の応答期限や修正期限は約束しません。

### セキュリティ境界

token 漏えい、認証 bypass、Tailscale identity または origin validation の bypass、Spotify proxy の範囲外 request、self-host の意図しない network 公開は報告対象です。Spotify、Even Realities、Tailscale 製品自体の問題は各 vendor に報告してください。

Self-host は信頼できる private tailnet 内だけで使用する設計です。Tailscale Funnel や公開 reverse proxy で外部公開しないでください。
