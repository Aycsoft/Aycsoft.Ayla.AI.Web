# 组件职责与维护约定

这里存放工作区共享的 Vue 组件。页面负责路由与布局组合，Store 负责会话和身份状态，组件负责输入、展示及明确的交互流程；协议字段转换与安全处理复用 `api`、`utils` 层。

## 文件导航

| 功能         | 文件                                                                                                           | 维护边界                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 会话输入     | `ChatComposer.vue`                                                                                             | 草稿、上传队列、能力选择、发送与停止入口           |
| 消息展示     | `MessageList.vue`                                                                                              | 时间线、滚动跟随、反馈上传与提交                   |
| 富文本与代码 | `RichMessageContent.vue`、`CodeBlockCard.vue`                                                                  | 安全 Markdown 出口、代码草稿及隔离运行             |
| 生成结果     | `ArtifactOutputCard.vue`、`GenerationProgressCard.vue`                                                         | 真实状态驱动结果卡，不用展示进度判断完成           |
| 工作台       | `ArtifactWorkspace.vue`、`CodePreviewWorkspace.vue`                                                            | 资产标签页和代码沙箱，各自管理尺寸及监听清理       |
| 附件与预览   | `MessageAttachmentList.vue`、`ResourcePreviewDialog.vue`、`ResilientMediaPreview.vue`、`ResourceErrorCard.vue` | 文件访问、预览地址生命周期、重试与错误展示         |
| 会话导航     | `ConversationSidebar.vue`、`ConversationActionDialog.vue`                                                      | 历史分页和导航；确认表单不自行持久化               |
| 欢迎与布局   | `EmptyWorkspace.vue`、`MediaWorkspacePanel.vue`、`PersonalWorkspaceLayout.vue`                                 | 模式化欢迎内容、灵感提示词及个人资源页面布局       |
| 账号弹窗     | `ExternalProfileDialog.vue`、`ExternalPasswordDialog.vue`                                                      | 真实资料/密码接口、校验、保存状态和成功事件        |
| 反馈表单     | `FeedbackDialog.vue`                                                                                           | 采集表单值；父级负责异步请求和 busy 状态           |
| 选择器       | `ModelPicker.vue`、`OptionPicker.vue`                                                                          | 受控选项选择，通过 update:modelValue 通知父级      |
| 执行状态     | `ReasoningTimeline.vue`、`TracePanel.vue`                                                                      | 执行步骤、摘要与资产入口，不直接展示内部推理       |
| 用量         | `TokenUsagePanel.vue`、`UsageSummaryPanel.vue`、`UsageSummaryDialog.vue`                                       | 单消息统计、账号汇总及弹窗壳；缺失数据不伪造为结果 |
| 品牌与来源   | `BrandLogo.vue`、`SourceFavicon.vue`                                                                           | 品牌及引用图标的可预测降级                         |
| 回归测试     | `ResourcePreviewDialog.test.ts`                                                                                | 真实组件生命周期下的旧请求隔离及 Blob URL 释放     |

## 交互契约

- `open` 是父级状态，`close` 是请求关闭事件；弹窗不要直接修改传入的状态。
- `sent` 表示输入提交已经发起，不代表响应完成；消息生命周期仍由会话 Store 维护。
- `ayla:artifact-open` 的 `detail` 是服务端资产 ID；`ayla:code-preview-open` 携带 `language`、`code`、`srcdoc`，由页面工作台消费；`ayla:code-preview-close` 不带业务数据。
- 上传、保存和反馈必须让实际 Promise 覆盖完整 busy 周期，并在事件入口防止重复调用。截图/头像先上传获得文件 ID，再提交业务关联。
- 切换资源、关闭弹窗和卸载组件时应中止旧请求；即使请求忽略取消，也不得回写新资源的状态。创建的 Blob URL 必须在替换或卸载时回收。
- 代码预览 iframe 只允许脚本、不允许同源权限。Markdown 的 `v-html` 只接受安全渲染器返回值，禁止传入模型原文。

## 验证

在仓库根目录运行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 和 `pnpm test`。组件请求竞态测试使用 Vue 自定义渲染宿主执行真实 setup/watch/unmount，不替代真实浏览器的布局、拖拽、剪贴板、上传及登录流程验收。
