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
