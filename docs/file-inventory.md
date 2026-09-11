# 文件目录与验收清单

由 `node scripts/check-files.mjs --write` 生成。覆盖所有 Git 已跟踪及未忽略的新文件；排除依赖、构建与本地审查产物。职责取自手写文件说明，清单存在不等于业务验收完成。

共 172 个文件。新增/删除文件或修改职责说明后重新生成；人工审查标准见 [代码规范](coding-standards.md)。

| 文件                                               | 职责 / 资源用途                                                                          | 验收方式                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `.editorconfig`                                    | 跨编辑器缩进、编码和换行约定                                                             | 文件检查；支持的格式由 Prettier 校验                 |
| `.env.example`                                     | 开发环境公开配置示例                                                                     | 文件检查；配置人工审查；部署环境验收                 |
| `.env.production`                                  | 现有生产站点公开地址，不含服务凭据                                                       | 文件检查；配置人工审查；部署环境验收                 |
| `.gitattributes`                                   | Git 文本换行与二进制资源分类                                                             | 文件检查；支持的格式由 Prettier 校验                 |
| `.github/workflows/ci.yml`                         | PR 和主分支使用相同质量门禁，避免本地通过而开源贡献无法复现。                            | 文件检查；支持的格式由 Prettier 校验                 |
| `.gitignore`                                       | 排除依赖、构建和本地调试数据                                                             | 文件检查；支持的格式由 Prettier 校验                 |
| `.prettierignore`                                  | 格式化的生成文件与法律文本边界                                                           | 文件检查；支持的格式由 Prettier 校验                 |
| `.prettierrc.json`                                 | 前端与文档格式参数                                                                       | 文件检查；支持的格式由 Prettier 校验                 |
| `AUTHORS.md`                                       | Authors                                                                                  | 文件检查；支持的格式由 Prettier 校验                 |
| `CITATION.cff`                                     | 软件引用元数据与作者身份                                                                 | 文件检查；支持的格式由 Prettier 校验                 |
| `CONTRIBUTING.md`                                  | Contributing                                                                             | 文件检查；支持的格式由 Prettier 校验                 |
| `LICENSE`                                          | MIT 许可法律正文，保持原样                                                               | 法律正文保留                                         |
| `README.md`                                        | Ayla AI Workspace                                                                        | 文件检查；支持的格式由 Prettier 校验                 |
| `SECURITY.md`                                      | Security Policy                                                                          | 文件检查；支持的格式由 Prettier 校验                 |
| `deploy/Dockerfile.kestrel`                        | 预构建宿主镜像：构建上下文需同时提供 dotnet publish 的 host/ 和 Vite 的 dist/。          | 文件检查；配置人工审查；部署环境验收                 |
| `deploy/Dockerfile.prebuilt`                       | 预构建静态镜像：构建上下文需提供 dist/ 与本目录的 nginx.conf。                           | 文件检查；配置人工审查；部署环境验收                 |
| `deploy/Host/ApiProxyExtensions.cs`                | / <summary>                                                                              | 文件检查；dotnet format/build                        |
| `deploy/Host/CrossCart.AI.Web.Host.csproj`         | .NET 10 静态站点与代理宿主项目                                                           | 文件检查；dotnet format/build                        |
| `deploy/Host/Program.cs`                           | 宿主入口：注册流式上游客户端，再依次处理 API、静态文件和站点路由。                       | 文件检查；dotnet format/build                        |
| `deploy/nginx.conf`                                | 容器内同源入口：静态资源位于子路径，API 转发保留认证头并禁用 SSE 缓冲。                  | 文件检查；配置人工审查；部署环境验收                 |
| `deployment/nginx/README.md`                       | CrossCart.AI.Web Nginx 部署                                                              | 文件检查；支持的格式由 Prettier 校验                 |
| `deployment/nginx/crosscart-ai-proxy-headers.conf` | 被站点各 API location 复用的请求头契约；仅应由可信入口代理设置。                         | 文件检查；配置人工审查；部署环境验收                 |
| `deployment/nginx/crosscart-ai-web.conf`           | CrossCart.AI.Web - Nginx same-origin deployment                                          | 文件检查；配置人工审查；部署环境验收                 |
| `docs/architecture.md`                             | Ayla Web architecture                                                                    | 文件检查；支持的格式由 Prettier 校验                 |
| `docs/coding-standards.md`                         | 代码规范                                                                                 | 文件检查；支持的格式由 Prettier 校验                 |
| `docs/file-inventory.md`                           | 版本控制文件逐路径目录与验收方式                                                         | 文件检查；支持的格式由 Prettier 校验                 |
| `docs/screenshots/account-access.png`              | 项目文档截图：account-access.png                                                         | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/ayla-home.png`                   | 项目文档截图：ayla-home.png                                                              | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/chat-workflow.png`               | 项目文档截图：chat-workflow.png                                                          | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/generated-biography-pdf.png`     | 项目文档截图：generated-biography-pdf.png                                                | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/ghtml.png`                       | 项目文档截图：ghtml.png                                                                  | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/gimage.png`                      | 项目文档截图：gimage.png                                                                 | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/image-generation-workspace.png`  | 项目文档截图：image-generation-workspace.png                                             | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/project-overview.png`            | 项目文档截图：project-overview.png                                                       | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/screenshots/video-generation-workspace.png`  | 项目文档截图：video-generation-workspace.png                                             | 资源保留；公开授权与视觉/播放人工验收                |
| `docs/seo-and-discovery.md`                        | SEO and project discovery checklist                                                      | 文件检查；支持的格式由 Prettier 校验                 |
| `docs/standardization-plan.md`                     | 全项目规范化计划与验收                                                                   | 文件检查；支持的格式由 Prettier 校验                 |
| `eslint.config.mjs`                                | Vue/TypeScript 质量门禁；语法排版交给 Prettier，避免两套规则互相改写。                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `index.html`                                       | SPA 文档入口；元信息用于公开发现，交互内容由 src/main.ts 挂载。                          | 文件检查；支持的格式由 Prettier 校验                 |
| `package.json`                                     | 依赖、运行要求与开发验收命令                                                             | 文件检查；支持的格式由 Prettier 校验                 |
| `pnpm-lock.yaml`                                   | pnpm 生成的依赖解析锁定                                                                  | pnpm frozen-lockfile                                 |
| `public/about.html`                                | 无需 JavaScript 的项目介绍页；与 README 的品牌、能力和部署入口保持一致。                 | 文件检查；支持的格式由 Prettier 校验                 |
| `public/ayla-logo.png`                             | 公开展示素材：ayla-logo.png                                                              | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/image-lifestyle-lavender.png`        | 公开展示素材：image-lifestyle-lavender.png                                               | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/image-product-diffuser.png`          | 公开展示素材：image-product-diffuser.png                                                 | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/image-tech-shoe.png`                 | 公开展示素材：image-tech-shoe.png                                                        | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/image-to-image-diffuser.png`         | 公开展示素材：image-to-image-diffuser.png                                                | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/video-cinematic-scene.mp4`           | 公开展示素材：video-cinematic-scene.mp4                                                  | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/video-image-to-video.mp4`            | 公开展示素材：video-image-to-video.mp4                                                   | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/video-keyframe-transition.mp4`       | 公开展示素材：video-keyframe-transition.mp4                                              | 资源保留；公开授权与视觉/播放人工验收                |
| `public/cases/video-product-motion.mp4`            | 公开展示素材：video-product-motion.mp4                                                   | 资源保留；公开授权与视觉/播放人工验收                |
| `public/favicon.svg`                               | 站点矢量图标                                                                             | 文件检查；支持的格式由 Prettier 校验                 |
| `scripts/check-files.mjs`                          | 逐文件验收入口：校验清单、UTF-8/LF 与手写代码职责说明；--write 仅生成目录文档。          | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/App.vue`                                      | 应用根节点：恢复用户主题并异步加载品牌设置，路由负责具体页面。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/ai.stream.test.ts`                        | 流传输回归：覆盖 UTF-8 分片、请求身份策略及正常/异常路径的 reader 锁释放。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/ai.ts`                                    | 工作区业务 API 门面；只负责协议映射，页面反馈和状态更新留给 store/调用方。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/ai.upload.test.ts`                        | 附件上传传输契约：验证 Cookie、变更标识及浏览器生成的 multipart 请求；fetch 使用替身。   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/feedbackContract.test.ts`                 | 结构化反馈回归：验证关联字段独立传输及空白清理，防止退回拼接 Comment 的旧协议。          | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/feedbackContract.ts`                      | 结构化反馈协议；会话、模型与截图分别关联，不混入描述文本。                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/http.ts`                                  | HTTP 传输边界：统一 Cookie、变更请求标识及后端业务信封，不负责页面提示。                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/sse.test.ts`                              | SSE 单元回归：覆盖分片、心跳、agent 信封及无内容终态；不依赖真实模型接口。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/sse.ts`                                   | SSE 文本协议解析：分离传输分块、事件信封与消息终态，不直接修改界面状态。                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/usageContract.test.ts`                    | 用量协议回归：核对鉴权路径、日期参数及服务商实测行聚合，不构造估算用量。                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/api/usageContract.ts`                         | 用量查询与展示聚合；只统计后端上报值，不在前端估算 token。                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ArtifactOutputCard.vue`            | * 消息中的生成资产卡片，依据真实状态展示进度、失败提示或预览。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ArtifactWorkspace.vue`             | * 资产工作台：标签页管理、代码读取、鉴权下载与宽度调整。                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/BrandLogo.vue`                     | * 统一品牌标识，加载失败依次回退到随包图片和文字。                                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ChatComposer.vue`                  | * 消息输入与创作入口，管理会话草稿、附件上传和模型能力。                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/CodeBlockCard.vue`                 | * 代码块复制、局部编辑和隔离运行入口，不在主页面执行生成代码。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/CodePreviewWorkspace.vue`          | * 代码侧边预览容器，使用受限 iframe 承载沙箱文档。                                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ConversationActionDialog.vue`      | * 会话重命名与删除确认表单，不直接调用业务接口。                                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ConversationSidebar.vue`           | * 工作区导航与会话历史入口，协调分页、路由、账号弹窗和会话操作。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/EmptyWorkspace.vue`                | * 空会话欢迎区，按登录状态与创作模式展示快捷提示和媒体灵感。                             | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ExternalPasswordDialog.vue`        | * 外部账号密码表单，前端强度提示不能替代服务端身份校验。                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ExternalProfileDialog.vue`         | * 外部账号资料编辑器，先上传头像取得文件 ID，再提交资料关联。                            | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/FeedbackDialog.vue`                | * 消息反馈表单，收集分类、说明、联系方式及可选截图。                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/GenerationProgressCard.vue`        | * 生成任务占位卡，显示阶段和参考耗时，不据展示进度判断完成。                             | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/MediaWorkspacePanel.vue`           | * 媒体灵感列表，从共享配置读取图片、视频示例与提示词。                                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/MessageAttachmentList.vue`         | * 消息附件列表，兼容字段并提供预览、下载与逐项重试。                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/MessageList.vue`                   | * 消息时间线，组合正文、附件、引用、资产、耗时和反馈入口。                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ModelPicker.vue`                   | * 按对话、图片或视频能力过滤模型的受控选择器。                                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/OptionPicker.vue`                  | * 带说明文字的轻量受控选项选择器，不自行持久化值。                                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/PersonalWorkspaceLayout.vue`       | * 知识库、Skill 和笔记共享布局，统一标题、导航和移动侧栏。                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/README.md`                         | 组件职责与维护约定                                                                       | 文件检查；支持的格式由 Prettier 校验                 |
| `src/components/ReasoningTimeline.vue`             | * 会话执行轨迹摘要，只展示经过安全清洗的用户可见步骤。                                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ResilientMediaPreview.vue`         | * 生成媒体延迟就绪预览，短时退避重试并回收 Blob URL。                                    | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ResourceErrorCard.vue`             | * 资源失败的共享展示卡，统一错误信息与重试入口。                                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ResourcePreviewDialog.test.ts`     | 附件预览生命周期回归：旧响应不得在切换、关闭或卸载后重建 Blob URL。                      | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/ResourcePreviewDialog.vue`         | * 附件预览弹窗，通过统一资源访问器加载内容并管理 Blob URL。                              | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/RichMessageContent.vue`            | * 富文本渲染入口，拆分代码围栏并交给独立代码卡片。                                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/SourceFavicon.vue`                 | * 引用来源图标，URL 变化重新加载，失败时显示通用图标。                                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/TokenUsagePanel.vue`               | * 单条消息 Token 用量和模型标识，不推算缺失统计。                                        | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/TracePanel.vue`                    | * 可折叠执行轨迹和资产导航，展示当前步骤及完成数量。                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/UsageSummaryDialog.vue`            | * 账号用量弹窗壳，复用 UsageSummaryPanel 读取和展示统计。                                | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/components/UsageSummaryPanel.vue`             | * 真实账号用量展示，按共享统计契约聚合模型和每日明细。                                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/composables/useWorkspaceCollection.test.ts`   | 列表加载公共流程回归：合并刷新、成功赋值、错误保留及重试恢复。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/composables/useWorkspaceCollection.ts`        | 个人工作区列表的读取状态；写入操作仍由业务页面负责。                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/env.d.ts`                                     | / <reference types="vite/client" />                                                      | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/gfm.css`                                      | Safe GFM message typography. Raw HTML is disabled by the renderer.                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/main.ts`                                      | 应用启动入口：加载基础样式与图标，在挂载前按依赖顺序注册状态和路由。                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/router.ts`                                    | 工作台路由及登录探测边界；访客可使用聊天，其余工作区需要会话。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/stores/auth.ts`                               | 认证会话唯一来源：区分企业 SSO 与外部邮箱账号，凭证由服务端管理。                        | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/stores/chat.ts`                               | 会话状态编排：分页、选择、创建与流式请求生命周期；协议转换见 chatEvents。                | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/stores/chatEvents.test.ts`                    | SSE 状态映射回归：覆盖增量、步骤合并、产物去重与终态保护。                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/stores/chatEvents.ts`                         | * 将服务端 SSE 协议映射为会话消息、执行轨迹与产物。                                      | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/stores/settings.ts`                           | 工作台品牌配置：远端优先，配置服务不可用时保留可渲染默认值。                             | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles.css`                                   | 全局样式入口：按原级联顺序加载责任模块，顺序本身属于视觉契约。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/account.css`                           | 内部和外部账号入口、登录表单及窄屏适配。                                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/case-gallery.css`                      | 空白任务案例图库的最终布局覆盖，保持在灵感规则之后。                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/composer-inspiration.css`              | 输入区关联的灵感与案例布局及移动端规则。                                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/empty-inspiration.css`                 | 空白创作任务的灵感区域与小屏布局。                                                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/foundation.css`                        | 基础主题变量、全局控件、初始工作台布局与响应式规则。                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/history-auth.css`                      | 历史滚动交互、账号提供方与 SSO 状态页面。                                                | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/media-workspace.css`                   | 媒体创作面板、生成进度和内容视口高度约束。                                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/message-assets.css`                    | 媒体灵感定位、正文附件分层与紧凑文件行。                                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/outputs.css`                           | 结构化消息、代码运行预览与生成产物展示。                                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/theme-surfaces.css`                    | 侧栏折叠恢复、深色表面与账号弹窗主题覆盖。                                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/workspace-interactions.css`            | 用量反馈、会话菜单、个人工作区表单与运行状态。                                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/styles/workspace.css`                         | 工作台视觉变量、导航、输入区、模型选择与创作入口。                                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/templates.test.ts`                            | 全部 Vue 页面与组件模板编译回归；类型检查不能替代事件表达式的真实模板编译。              | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/types/ai.ts`                                  | 前后端共享传输类型；PascalCase 名称遵循现有 JSON 契约，不在页面层随意改名。              | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/apiTime.test.ts`                        | 时间协议回归：UTC 旧值、显式时区和跨本地午夜的会话分组。                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/apiTime.ts`                             | API 时间统一解析：历史 MySQL UTC 值可能没有时区，显式偏移和 Z 保持原义。                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/backendResource.test.ts`                | 后端文件地址回归：验证下载参数兼容、链接优先级及危险/物理路径拒绝。                      | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/backendResource.ts`                     | 后端资源链接适配及带会话下载；不接受本地文件系统路径。                                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/conversationHistory.test.ts`            | 历史列表回归：使用固定本地日历测试分组边界，并验证分页重叠更新与顺序。                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/conversationHistory.ts`                 | 历史会话纯数据处理：按本地日历分组、合并分页，不修改输入数组。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/conversationRunStatus.test.ts`          | 运行状态回归：验证后端状态别名映射与当前生成状态优先级。                                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/conversationRunStatus.ts`               | 将多个后端版本的生成状态统一为侧栏显示状态。                                             | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/elapsedTime.test.ts`                    | 耗时文案回归：覆盖零值、非法数值、秒截断以及分钟/小时边界。                              | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/elapsedTime.ts`                         | 将毫秒耗时向下取整为 h/m/s 文案；非法或负输入按零处理。                                  | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/emptyConversation.test.ts`              | 空会话复用回归：用消息加载替身验证元数据优先、本地消息保护与创建并发去重。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/emptyConversation.ts`                   | 空会话复用与创建并发控制；依赖真实消息/元数据，不使用标题猜测。                          | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/executionTrace.test.ts`                 | 执行时间线回归：核对工具分类、公开摘要脱敏、真实计数、终态计时和历史映射。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/executionTrace.ts`                      | 执行步骤展示适配：只显示公开进度，不把内部推理原文作为用户可见摘要。                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/externalAuth.test.ts`                   | 外部注册表单回归：验证邮箱规范化、用途去重和有条件提交其他用途。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/externalAuth.ts`                        | 外部账号表单规范化；此处格式提示不能替代服务端验证码与身份校验。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/mediaInspiration.test.ts`               | 媒体空态目录回归：验证显示条件、静态素材路径及参考图/关键帧模式完整性。                  | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/mediaInspiration.ts`                    | 媒体空态示例目录：静态素材是创作参考，不代表当前用户生成结果。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/messageAttachments.test.ts`             | 历史附件回归：验证字段别名、顶层优先、鉴权路径回退与上传/生成资源汇集。                  | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/messageAttachments.ts`                  | 历史附件兼容层；统一字段与资源面板投影，不改变后端存储记录。                             | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/messageContent.test.ts`                 | 消息输出回归：验证围栏分段、流式未闭合代码、产物分类及 JSON/预览限制；不证明浏览器隔离。 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/messageContent.ts`                      | 消息展示分段；文本交给安全 Markdown，围栏代码交给专用代码卡片。                          | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/messagePresentation.test.ts`            | 历史消息展示回归：验证固定页脚清理、旧文件代理链接及危险引用协议拒绝。                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/messagePresentation.ts`                 | 历史消息与来源展示适配，不修改原始消息内容或引用记录。                                   | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/modelCatalog.test.ts`                   | 模型目录回归：验证公开搜索、服务端声明默认模型和免费能力筛选。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/modelCatalog.ts`                        | 服务端模型目录的搜索与默认选择，不推测未声明的模型能力或可用性。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/navigation.test.ts`                     | 部署导航回归：固定 origin/base 测试 hash 查询、ERP 回调编码和探测失败回退。              | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/navigation.ts`                          | 统一工作区与 ERP 的 hash 路由地址，兼容子目录部署。                                      | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/password.test.ts`                       | 密码提示策略回归：验证字符分类与当前长度要求，不代替服务端认证测试。                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/password.ts`                            | 统计小写、大写、数字、符号四类字符，用于外部账号密码强度提示。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/reasoningSafety.test.ts`                | 进度脱敏回归：验证已知凭据与提示词片段替换，不宣称穷尽所有敏感内容格式。                 | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/reasoningSafety.ts`                     | 公开进度文本的防御性脱敏；有限模式匹配不替代服务端敏感数据隔离。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/safeCodeRunner.ts`                      | * 浏览器代码示例运行辅助：JSON 校验、iframe 预览及可终止 Worker。                        | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/safeMarkdown.test.ts`                   | Markdown 安全回归：核对 GFM 输出、链接属性及 HTML/主动协议拦截。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/safeMarkdown.ts`                        | Markdown 展示安全边界：关闭原始 HTML，对链接和图片使用独立白名单。                       | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/streamLifecycle.test.ts`                | 流生命周期回归：验证稳定占位、真实步骤替换和终态收口，不覆盖既有完成结果。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/streamLifecycle.ts`                     | 流式生成时间线的原地状态更新；真实步骤到达后移除临时占位。                               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/theme.test.ts`                          | 主题纯函数回归：验证持久值规范化与确定性切换，不依赖页面或存储。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/theme.ts`                               | 工作区显式主题，不跟随系统自动变化。                                                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/uuid.test.ts`                           | UUID 兼容回归：替换并恢复 crypto，验证原生调用与 RFC 4122 v4 位设置。                    | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/utils/uuid.ts`                                | * 创建客户端消息/幂等关联标识，优先原生 UUID，再回退随机字节并设置 v4 位。               | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/ChatView.vue`                           | 聊天工作区布局及面板联动；会话数据与流式请求由 chat store 管理。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/KnowledgeView.vue`                      | 个人知识上传/删除及企业授权文档只读展示；解析和索引状态以服务端为准。                    | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/LoginView.vue`                          | 企业 SSO 与外部账号登录入口，统一组织验证码、注册和密码重置交互。                        | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/ModelLabView.vue`                       | 管理员模型诊断页；仅展示服务端允许的模型，密钥始终不进入浏览器。                         | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/NotesView.vue`                          | 个人 Markdown 笔记列表与草稿编辑器；预览统一经过安全 Markdown 渲染。                     | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/SkillsView.vue`                         | 当前账号的 Skill 规范编辑、文件导入和启停；导入只填入草稿，不自动保存。                  | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `src/views/SsoCallbackView.vue`                    | 企业 SSO 回调：验证一次性码，兑换会话并续接服务端绑定的对话。                            | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `tsconfig.json`                                    | TypeScript 严格类型检查和模块解析约定                                                    | 文件检查；支持的格式由 Prettier 校验                 |
| `uno.config.ts`                                    | 原子样式入口；使用统一预设，业务语义样式维护在 src/styles 下。                           | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
| `vite.config.ts`                                   | 构建与开发服务：统一部署子路径、同源 API 代理和第三方依赖分包。                          | 文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试 |
