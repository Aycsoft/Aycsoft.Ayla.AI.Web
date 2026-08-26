# Ayla AI Workspace

> CrossCart.AI.Web — 一个面向企业知识工作、内容生成与多模态协作的 Vue 3 AI 工作台。

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Aycsoft/CrossCart.AI.Web/actions/workflows/ci.yml/badge.svg)](https://github.com/Aycsoft/CrossCart.AI.Web/actions/workflows/ci.yml)

Ayla AI Workspace 是 CrossCart 的独立 AI Web 客户端。它提供无需登录的普通对话、登录后的会话记忆、文件分析、图片与视频生成、代码预览、任务进度、Token 用量、个人中心和企业 SSO 等完整交互。

本仓库只包含 Web 客户端，不包含模型密钥或 CrossCart.AI 服务端实现。所有模型调用、权限校验、文件存储和业务数据访问都必须由可信后端完成。

## 界面预览

### 工作台首页

![Ayla 工作台首页](docs/screenshots/ayla-home.png)

### 流式对话与富文本回答

![企业 AI 工作流对话](docs/screenshots/chat-workflow.png)

### 图片生成与任务工作区

![图片生成工作区](docs/screenshots/image-generation-workspace.png)

### 文档生成结果

![图文 PDF 生成结果](docs/screenshots/generated-biography-pdf.png)

## 主要能力

- 游客对话：无需登录即可使用普通 AI 对话。
- 企业与外部账户：企业 SSO、邮箱注册、验证码及密码登录。
- 多模型目录：按能力展示对话、推理、文件、图片和视频模型。
- 多模态创作：独立的对话、图片生成、视频生成工作模式。
- 文件工作区：上传、预览、下载、生成进度和多文件目录。
- 代码工作区：代码块复制、右侧可调整预览以及安全 HTML 沙箱。
- 丰富内容渲染：GFM、表格、任务列表、引用、链接、代码和来源卡片。
- 会话管理：历史记录、搜索、重命名、删除和运行状态提示。
- 可观测交互：流式响应、推理时间线、实时耗时、Token 用量与错误恢复。
- 个性化：浅色/深色主题、头像、名称、密码与反馈中心。
- 响应式布局：桌面端工作区与移动端自适应界面。

## 技术栈

- Vue 3 + TypeScript
- Vite 6
- Pinia
- Vue Router
- Element Plus
- UnoCSS
- Markdown-It / GFM
- Vitest

## 本地启动

要求 Node.js 18+、pnpm 9+，以及运行在 `localhost:5088` 的兼容 API 服务。

```powershell
git clone https://github.com/Aycsoft/CrossCart.AI.Web.git
cd CrossCart.AI.Web
Copy-Item .env.example .env.local
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5176/ai-workbench/`。默认 API 和 Portal 地址分别为 `http://localhost:5088`、`http://localhost:4000`。

生产同源部署时建议保留 `VITE_API_BASE_URL=/api`，由 Nginx 将 `/api/` 转发到后端。

## 环境变量

复制 `.env.example` 后按部署环境调整：

| 变量 | 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | 浏览器访问的 API 根路径 |
| `VITE_DEV_PROXY_TARGET` | Vite 本地代理目标 |
| `VITE_APP_BASE_PATH` | Web 部署子路径 |
| `VITE_SSO_LOGIN_URL` | 企业 SSO 授权入口 |
| `VITE_PORTAL_ORIGIN` | CrossCart Portal 地址 |
| `VITE_DEFAULT_AI_LOGO_URL` | 默认透明 Logo 地址 |
| `VITE_PORT` | 开发服务器端口 |

不要把任何模型 API Key、邮件授权码、数据库连接串或签名密钥写入 `VITE_*`。Vite 变量会被编译进浏览器产物。

## 后端接口约定

- `/api/public/*`：无需登录的设置、模型目录与普通对话。
- `/api/sso/*`：企业 SSO 会话兑换与退出。
- `/api/external-auth/*`：外部用户注册、登录和密码管理。
- `/api/workspace/*`：会话、消息、附件、生成任务、用量和个人资料。

流式对话使用 SSE，支持 `meta`、`delta`、`citation`、`web-source`、`tool`、`agent`、`done` 和 `error` 事件。

## 验证

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Nginx 部署

生产配置示例位于 [`deployment/nginx`](deployment/nginx)，包含 SPA 回退、API 反向代理、SSE 长连接、附件大小限制、Forwarded Headers 和健康检查。

## 安全与贡献

安全问题请不要直接创建公开 Issue，详见 [SECURITY.md](SECURITY.md)。欢迎提交 Issue 和 Pull Request，开发流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE) © Peng Yang (Perry Yang)
