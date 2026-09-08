/** 媒体空态目录回归：验证显示条件、静态素材路径及参考图/关键帧模式完整性。 */
import { describe, expect, it } from 'vitest'
import { mediaInspirationFor, shouldShowMediaInspiration } from './mediaInspiration'

describe('media inspiration empty-state contract', () => {
  it('shows only for image or video mode before the conversation has content', () => {
    expect(shouldShowMediaInspiration('image', 0)).toBe(true)
    expect(shouldShowMediaInspiration('video', 0)).toBe(true)
    expect(shouldShowMediaInspiration('chat', 0)).toBe(false)
    expect(shouldShowMediaInspiration('image', 1)).toBe(false)
    expect(shouldShowMediaInspiration('video', 3)).toBe(false)
  })

  it('provides four fixed cases with bundled assets for every media mode', () => {
    for (const mode of ['image', 'video'] as const) {
      const items = mediaInspirationFor(mode)
      expect(items).toHaveLength(4)
      expect(new Set(items.map((item) => item.id)).size).toBe(4)
      expect(items.every((item) => item.prompt.length > item.summary.length)).toBe(true)
      expect(items.every((item) => item.asset.startsWith('cases/'))).toBe(true)
    }
  })

  it('covers reference-image creation modes explicitly', () => {
    expect(
      mediaInspirationFor('image').some((item) => item.generationMode === 'image-to-image'),
    ).toBe(true)
    expect(
      mediaInspirationFor('video').some((item) => item.generationMode === 'image-to-video'),
    ).toBe(true)
    expect(
      mediaInspirationFor('video').some((item) => item.generationMode === 'keyframe-video'),
    ).toBe(true)
  })
})
