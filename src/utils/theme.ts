/** 工作区显式主题，不跟随系统自动变化。 */
export type WorkspaceTheme = 'light' | 'dark'

/** 无效或历史存储值一律回退亮色。 */
export const normalizeTheme = (value: string | null | undefined): WorkspaceTheme =>
  value === 'dark' ? 'dark' : 'light'
/** 在两种支持的主题间切换。 */
export const nextTheme = (value: WorkspaceTheme): WorkspaceTheme =>
  value === 'dark' ? 'light' : 'dark'

/** 同步根节点 class/data 属性并持久化；仅在浏览器初始化/交互阶段调用。 */
export function applyWorkspaceTheme(theme: WorkspaceTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  localStorage.setItem('crosscart-ai-theme', theme)
}
