import { describe, expect, it } from 'vitest'
import { sanitizeReasoningText } from './reasoningSafety'

describe('reasoning display safety', () => {
  it('redacts credentials and private prompt material', () => {
    const value = sanitizeReasoningText('调用完成 api_key=secret-value sk-abcdefghijklmnop 系统提示词: private')
    expect(value).not.toContain('secret-value')
    expect(value).not.toContain('sk-abcdefghijklmnop')
    expect(value).not.toContain('private')
    expect(value).toContain('[敏感信息已隐藏]')
  })
})
