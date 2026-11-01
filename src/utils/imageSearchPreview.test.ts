import { describe, expect, it } from 'vitest'
import { imageSearchPreviewUrl } from './imageSearchPreview'
describe('SSO两库受保护预览', () => {
  it('两库使用精确scope与文件ID的同源端点', () => {
    for (const Scope of ['file-library', 'developer-gallery'])
      expect(imageSearchPreviewUrl({ Scope, FileId: 'file_1-A' })).toBe(
        `/api/sso/visual-search-files/${Scope}/file_1-A`,
      )
  })
  it('未知和缺失scope拒绝，不回退默认图库', () => {
    for (const Scope of [undefined, '', 'product', 'developer', 'file-library/other'])
      expect(imageSearchPreviewUrl({ Scope, FileId: 'a' })).toBe('')
  })
  it('缺失、数字、路径和过长ID拒绝', () => {
    for (const FileId of [undefined, 123, '', '../a', 'a?scope=x', ' a ', 'a'.repeat(129)])
      expect(imageSearchPreviewUrl({ Scope: 'file-library', FileId })).toBe('')
  })
  it('服务端明确无可用预览时不尝试读取', () => {
    expect(
      imageSearchPreviewUrl({ Scope: 'file-library', FileId: 'a', PreviewAvailable: false }),
    ).toBe('')
  })
  it('历史Portal或外部URL不作为目的地，重新按真实命中身份鉴权', () => {
    for (const PreviewUrl of [
      '/api/AI/VisualSearchFiles/old',
      'https://untrusted.example/raw/other',
    ]) {
      const result = { Scope: 'developer-gallery', FileId: 'real', PreviewUrl }
      expect(imageSearchPreviewUrl(result)).toBe(
        '/api/sso/visual-search-files/developer-gallery/real',
      )
    }
  })
})
