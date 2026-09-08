/// <reference types="vite/client" />

/** Vite 环境和缺少上游声明的 Markdown 插件；这里只描述浏览器可见配置，不能放密钥。 */
declare module 'markdown-it-footnote'
declare module 'markdown-it-task-lists'

interface ImportMetaEnv {
  /** 静态部署子路径，与 Vite base 和宿主路由保持一致。 */
  readonly VITE_APP_BASE_PATH?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SSO_LOGIN_URL?: string
  readonly VITE_PORTAL_ORIGIN?: string
  readonly VITE_WORKSPACE_ORIGIN?: string
  readonly VITE_DEFAULT_AI_LOGO_URL?: string
}
