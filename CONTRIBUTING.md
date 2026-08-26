# Contributing

感谢你参与 Ayla AI Workspace。

1. Fork 仓库并从 `master` 创建分支。
2. 运行 `pnpm install` 安装依赖。
3. 保持 API Key、Cookie、邮箱授权码和业务数据在仓库之外。
4. 提交前运行 `pnpm typecheck`、`pnpm test` 和 `pnpm build`。
5. 在 Pull Request 中说明问题背景、实现方式和界面变化。

新增功能应优先复用现有组件、API 封装、类型和设计变量。异步操作必须提供加载、重复提交保护和失败恢复，不得以静态 Mock 数据伪装服务端能力。
