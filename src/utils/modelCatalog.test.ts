/** 模型目录回归：验证公开搜索、服务端声明默认模型和免费能力筛选。 */
import { describe, expect, it } from 'vitest'
import type { WorkspaceModel } from '@/types/ai'
import { matchesModelSearch, preferredModelForCapability } from './modelCatalog'

const model: WorkspaceModel = {
  InternalAlias: 'aycsoft-aes-2.5-flash',
  SelectionAlias: 'aycsoft-aes-2.5-flash',
  DisplayName: 'aycsoft-aes-2.5-flash',
  BestFor: '日常问答与内容创作',
  IsFree: true,
  SupportsReasoning: false,
  SupportsStreaming: true,
  SupportsToolCalling: false,
  SupportsFiles: false,
  SupportsImageGeneration: false,
  SupportsVideoGeneration: false,
  InputModalities: ['text'],
  OutputModalities: ['text'],
  Available: true,
  IsDefault: false,
  Health: 'synced',
}

describe('model catalog presentation', () => {
  it('searches the server-provided best-for description', () => {
    expect(matchesModelSearch(model, '内容创作')).toBe(true)
    expect(matchesModelSearch(model, '视频生成')).toBe(false)
  })

  it('keeps provider brands out of the public alias', () => {
    expect(model.SelectionAlias).toBe('aycsoft-aes-2.5-flash')
    expect(model.SelectionAlias).not.toMatch(/agnes|openrouter/i)
  })

  it('uses only the server-declared API default for chat', () => {
    const local = {
      ...model,
      InternalAlias: 'aycsoft-pro-2.1',
      SelectionAlias: 'aycsoft-pro-2.1',
      IsFree: false,
    }
    const automatic = {
      ...model,
      InternalAlias: 'aycsoft-free',
      SelectionAlias: 'aycsoft-free',
      IsDefault: true,
    }

    expect(preferredModelForCapability([local, automatic], 'chat')?.SelectionAlias).toBe(
      'aycsoft-free',
    )
    expect(preferredModelForCapability([local], 'chat')).toBeUndefined()
  })

  it('never exposes a paid media model as a selectable free fallback', () => {
    const paidImage = {
      ...model,
      IsFree: false,
      SupportsStreaming: false,
      SupportsImageGeneration: true,
    }

    expect(preferredModelForCapability([paidImage], 'image')).toBeUndefined()
  })
})
