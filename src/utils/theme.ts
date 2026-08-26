export type WorkspaceTheme = 'light' | 'dark'

export const normalizeTheme = (value: string | null | undefined): WorkspaceTheme => value === 'dark' ? 'dark' : 'light'
export const nextTheme = (value: WorkspaceTheme): WorkspaceTheme => value === 'dark' ? 'light' : 'dark'

export function applyWorkspaceTheme(theme: WorkspaceTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  localStorage.setItem('crosscart-ai-theme', theme)
}
