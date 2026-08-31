# CrossCart.AI.Web Nginx 部署

此部署方式把 AI Web 与 CrossCart.AI.Api 暴露为同一个浏览器源：

- Web：`http://localhost/ai-workbench/#/chat`
- API：`http://localhost/api/*`
- Nginx 到 API：`http://localhost:5088`
- 搜索发现：`http://localhost/robots.txt`、`http://localhost/sitemap.xml`、`http://localhost/ai-workbench/about.html`

同源部署可确保外部用户 Cookie、SSO Cookie、附件上传、生成文件预览/下载和 SSE 会话流都走同一个站点，不需要开放跨域凭据。

## 1. 构建 Web

在构建机的 `F:\Work\CrossCart.AI.Web` 执行：

```powershell
$env:VITE_API_BASE_URL = '/api'
$env:VITE_APP_BASE_PATH = '/ai-workbench/'
$env:VITE_PORTAL_ORIGIN = 'http://localhost:4000'
$env:VITE_SSO_LOGIN_URL = 'http://localhost:4000/#/ai/sso/authorize'
pnpm install --frozen-lockfile
pnpm build
```

构建后必须确认 `dist/index.html` 中的 JS/CSS 地址以 `/ai-workbench/assets/` 开头。不要把开发代理地址或 Provider API Key 放进 `VITE_*`；所有 `VITE_*` 都会进入浏览器产物。

## 2. 安装静态文件与配置

以下示例在 Linux Nginx 服务器执行：

```bash
sudo install -d -m 0755 /var/www/crosscart-ai-web/ai-workbench
sudo rsync -a --delete ./dist/ /var/www/crosscart-ai-web/ai-workbench/

sudo install -m 0644 deployment/nginx/crosscart-ai-proxy-headers.conf \
  /etc/nginx/snippets/crosscart-ai-proxy-headers.conf
sudo install -m 0644 deployment/nginx/crosscart-ai-web.conf \
  /etc/nginx/conf.d/crosscart-ai-web.conf

sudo nginx -t
sudo systemctl reload nginx
```

如果使用真实域名和 HTTPS，应替换 `server_name`、证书、监听配置、`VITE_PORTAL_ORIGIN` 与 `VITE_SSO_LOGIN_URL`；浏览器访问地址和 ERP 回跳白名单必须登记完全一致的公开 AI Web 地址。API 上游仍使用同机的 `localhost:5088`，不要换成浏览器可见的外网地址。如果该 `server` 还承载 ERP，可把本配置的 `/ai-workbench/` 与 `/api/` location 合并到现有 ERP server 中，不要覆盖 ERP 的 `/` location。

## 3. ASP.NET Core 转发头

当前 Nginx 已发送 `X-Forwarded-For`、`X-Forwarded-Proto`、`X-Forwarded-Host` 与 `X-Forwarded-Port`。CrossCart.AI.Api 当前已在认证和路由之前调用 `UseForwardedHeaders()`，并将转发层数限制为 1。Nginx 与 API 同机、上游使用 `localhost:5088` 时，ASP.NET Core 默认只信任 loopback 代理的限制与本配置一致。

API 和 Nginx 位于同一主机时可按实际网络栈信任 loopback；生产环境不要无条件清空 `KnownNetworks`/`KnownProxies` 来信任互联网来源的转发头。

## 4. 验收

```bash
curl -I http://localhost/ai-workbench/
curl -fsS http://localhost/health/live
curl -fsS http://localhost/health/ready
curl -N -H 'Content-Type: application/json' \
  --data '{"Message":"ping"}' \
  http://localhost/api/public/chat/stream
```

还需在浏览器完成以下真实链路：

1. 打开 `http://localhost/ai-workbench/#/chat`，刷新后静态资源无 404。
2. 匿名对话能逐段收到 SSE，而不是等待整轮结束后一次性显示。
3. 外部用户登录后 Cookie 保持有效，附件能上传。
4. 历史图片、视频和文档可以预览、下载。
5. ERP 登录返回 `http://localhost/ai-workbench/#/auth/sso/callback?...`，且不发生循环重定向。

`nginx -t` 必须通过后才能 reload。配置中附件上限为 25 MB，覆盖当前单文件 20 MB 的业务限制；如果后端限制调整，应同步修改 `client_max_body_size`，但 Nginx 上限不应替代后端校验。
