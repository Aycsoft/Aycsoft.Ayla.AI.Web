/** 历史消息展示回归：验证固定页脚清理、旧文件代理链接及危险引用协议拒绝。 */
import { describe, expect, it } from 'vitest'
import { citationDateLabel, citationUrl, stripLegacyAiFooter } from './messagePresentation'

describe('message presentation', () => {
  it('removes the obsolete AI disclosure from historical answers', () => {
    expect(
      stripLegacyAiFooter(
        '正文\n\n---\n内容由 AI 生成，重要信息请务必核查。作者备案：杨鹏 / Peng Yang (Perry Yang)',
      ),
    ).toBe('正文')
  })

  it('keeps ordinary rich text intact', () => {
    expect(stripLegacyAiFooter('## 标题\n\n[来源](https://example.com)')).toContain('[来源]')
  })

  it('rewrites legacy generated-file links to the authenticated workspace proxy', () => {
    expect(
      stripLegacyAiFooter('[打开生成文件](/api/AI/GeneratedFiles/file_123/Preview?download=1)'),
    ).toBe('[打开生成文件](/api/workspace/artifacts/file_123?download=1)')
  })

  it('accepts source URL field variants and rejects active protocols', () => {
    expect(citationUrl({ Title: 'source', SourceUrl: 'https://example.com/a' })).toBe(
      'https://example.com/a',
    )
    expect(citationUrl({ Title: 'bad', URL: 'javascript:alert(1)' })).toBe('')
  })
})

describe('citation dates', () => {
  it('keeps missing publication date distinct from retrieval time', () => {
    const source = { Url: 'https://example.com/a', RetrievedAt: '2026-10-30T17:00:00Z' }
    expect(citationDateLabel(source)).toBe('发布日期未知 · 检索 2026/10/31（北京时间）')
  })
  it('does not invent dates for invalid or absent timestamps', () => {
    expect(citationDateLabel({ Url: 'https://example.com', PublishedAt: 'invalid' })).toBe(
      '发布日期未知',
    )
    expect(citationDateLabel({ DocumentId: 'internal' })).toBe('')
  })
  it('preserves actual publication date independently', () => {
    expect(citationDateLabel({ Url: 'https://example.com', PublishedAt: '2026-10-30' })).toBe(
      '发布 2026/10/30',
    )
  })
})
