/** 主题纯函数回归：验证持久值规范化与确定性切换，不依赖页面或存储。 */
import { describe, expect, it } from 'vitest'
import { nextTheme, normalizeTheme } from './theme'

describe('workspace theme', () => {
  it('normalizes unknown persisted values to light', () => {
    expect(normalizeTheme('dark')).toBe('dark')
    expect(normalizeTheme('system')).toBe('light')
    expect(normalizeTheme(null)).toBe('light')
  })

  it('toggles deterministically', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})
