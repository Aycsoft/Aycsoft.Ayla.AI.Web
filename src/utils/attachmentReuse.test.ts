import { describe, expect, it } from 'vitest'
import { canReuseAttachment } from './attachmentReuse'

describe('历史附件引用输入校验', () => {
  it('只接受真实标识和输入支持类型', () => {
    expect(canReuseAttachment({ FileId: 'real_1-A', FileName: 'photo.png' })).toBe(true)
    expect(canReuseAttachment({ FileId: 'doc1', FileName: '合同.docx' })).toBe(true)
  })
  it('拒绝无标识、路径标识和未知文件类型', () => {
    for (const FileId of ['', '../x', 'x?y', 'x'.repeat(129)])
      expect(canReuseAttachment({ FileId, FileName: 'photo.png' })).toBe(false)
    expect(canReuseAttachment({ FileId: 'real', FileName: 'unknown.exe' })).toBe(false)
    expect(canReuseAttachment({ FileId: 'real' })).toBe(false)
  })
})
