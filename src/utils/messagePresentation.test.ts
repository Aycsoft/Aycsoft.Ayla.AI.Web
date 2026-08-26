import { describe, expect, it } from 'vitest'
import { citationUrl, stripLegacyAiFooter } from './messagePresentation'

describe('message presentation', () => {
  it('removes the obsolete AI disclosure from historical answers', () => {
    expect(stripLegacyAiFooter('正文\n\n---\n内容由 AI 生成，重要信息请务必核查。作者备案：杨鹏 / Peng Yang (Perry Yang)')).toBe('正文')
  })

  it('keeps ordinary rich text intact', () => {
    expect(stripLegacyAiFooter('## 标题\n\n[来源](https://example.com)')).toContain('[来源]')
  })

  it('rewrites legacy generated-file links to the authenticated workspace proxy', () => {
    expect(stripLegacyAiFooter('[打开生成文件](/api/AI/GeneratedFiles/file_123/Preview?download=1)'))
      .toBe('[打开生成文件](/api/workspace/artifacts/file_123?download=1)')
  })

  it('accepts source URL field variants and rejects active protocols', () => {
    expect(citationUrl({ Title: 'source', SourceUrl: 'https://example.com/a' })).toBe('https://example.com/a')
    expect(citationUrl({ Title: 'bad', URL: 'javascript:alert(1)' })).toBe('')
  })
})
