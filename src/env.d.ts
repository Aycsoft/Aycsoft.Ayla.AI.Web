/// <reference types="vite/client" />

declare module 'markdown-it-footnote'
declare module 'markdown-it-task-lists'

interface ImportMetaEnv {
  readonly VITE_APP_BASE_PATH?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SSO_LOGIN_URL?: string
}
