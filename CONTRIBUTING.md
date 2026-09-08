# Contributing

感谢你参与 [Ayla AI Workspace](https://github.com/Aycsoft/Aycsoft.Ayla.AI.Web)。

## 本地开发

1. Fork 仓库，从 `master` 创建功能分支。使用 Node.js 22.13+、pnpm 9.15.3；修改宿主需要 .NET 10 SDK。
2. `pnpm install --frozen-lockfile`，复制 `.env.example` 为 `.env.local`，配置真实兼容后端。
3. 先定位现有组件、API、类型与工具，再增加功能；不重复创建相同职责的封装。
4. 修改或新增文件时说明具体职责、公共契约和不直观的设计原因。新增文件后运行 `node scripts/check-files.mjs --write` 更新目录。
5. `pnpm format` 后运行 `pnpm check`。宿主还需运行下文 .NET 检查。

```sh
dotnet restore deploy/Host/CrossCart.AI.Web.Host.csproj
dotnet format deploy/Host/CrossCart.AI.Web.Host.csproj --verify-no-changes --no-restore
dotnet build deploy/Host/CrossCart.AI.Web.Host.csproj --no-restore
```

## 提交与评审

- 开始前阅读 [代码规范](docs/coding-standards.md) 和 [架构说明](docs/architecture.md)。
- 一次 PR 聚焦一个问题，说明背景、涉及模块、行为变化、测试证据和未验证边界；界面改动附截图。
- 修改业务分支时同步增加相应回归测试；异步操作应有加载、重复提交保护、取消/卸载清理和失败恢复。
- 不能通过删除测试、任意强转、全局关闭规则或静态 Mock 伪装真实业务能力。
- CI 检查是最低门槛。登录、上传、流式对话、历史恢复、媒体生成需要真实服务验收，写清测试环境与结果。
- API Key、Cookie、邮箱授权码、私有文件和业务数据不得提交。截图与示例素材须确认允许公开。

## 文档和例外

配置文件使用旁注或代码规范文档解释；JSON 不添加非法注释，锁文件只由包管理器生成，LICENSE 不做格式改写。精确的 lint 例外必须紧邻风险点并解释理由，例如经过安全渲染器输出的唯一 HTML 入口；不得用例外绕过未解决问题。

新增功能应优先复用现有组件、API 封装、类型和设计变量。异步操作必须提供加载、重复提交保护和失败恢复，不得以静态 Mock 数据伪装服务端能力。
