/** 历史列表回归：使用固定本地日历测试分组边界，并验证分页重叠更新与顺序。 */
import { describe, expect, it } from 'vitest'
import type { Conversation } from '@/types/ai'
import { groupConversationsByAge, mergeConversationPages } from './conversationHistory'

const conversation = (id: string, updateTime?: string): Conversation => ({
  Id: id,
  AssistantId: 'assistant',
  Title: id,
  UpdateTime: updateTime,
})

describe('conversation history', () => {
  it('groups real conversation timestamps by local calendar boundaries', () => {
    const groups = groupConversationsByAge(
      [
        conversation('today', new Date(2026, 7, 28, 8).toISOString()),
        conversation('seven', new Date(2026, 7, 22, 12).toISOString()),
        conversation('thirty', new Date(2026, 6, 30, 12).toISOString()),
        conversation('older', new Date(2026, 6, 29, 23, 59, 59).toISOString()),
        conversation('missing'),
      ],
      new Date(2026, 7, 28, 12),
    )

    expect(groups.map((group) => [group.label, group.items.map((item) => item.Id)])).toEqual([
      ['最近', ['today']],
      ['近7天', ['seven']],
      ['近30天', ['thirty']],
      ['更早', ['older', 'missing']],
    ])
  })

  it('deduplicates overlapping pages while preserving the original order and fresh fields', () => {
    const merged = mergeConversationPages(
      [
        conversation('first', '2026-08-28T08:00:00'),
        conversation('overlap', '2026-08-27T08:00:00'),
      ],
      [
        { ...conversation('overlap', '2026-08-27T08:00:00'), Title: 'updated' },
        conversation('older', '2026-08-20T08:00:00'),
      ],
    )

    expect(merged.map((item) => item.Id)).toEqual(['first', 'overlap', 'older'])
    expect(merged[1].Title).toBe('updated')
  })
})
