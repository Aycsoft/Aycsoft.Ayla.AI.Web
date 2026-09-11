/** 时间协议回归：UTC 旧值、显式时区和跨本地午夜的会话分组。 */
import { describe, expect, it } from 'vitest'
import { formatMessageTime, parseApiTime } from './apiTime'
import { groupConversationsByAge } from './conversationHistory'

describe('API timestamps', () => {
  it('treats zone-less database timestamps as UTC without shifting explicit offsets twice', () => {
    const expected = Date.parse('2026-09-11T01:30:00Z')
    for (const value of [
      '2026-09-11T01:30:00',
      '2026-09-11 01:30:00',
      '2026-09-11T01:30:00Z',
      '2026-09-11T09:30:00+08:00',
    ]) {
      expect(parseApiTime(value).getTime()).toBe(expected)
    }
    expect(parseApiTime('2026-09-11T01:30:00.123456').toISOString()).toBe(
      '2026-09-11T01:30:00.123Z',
    )
  })

  it('formats the same local time before and after message history reload', () => {
    expect(formatMessageTime('2026-09-11T01:30:00')).toBe(formatMessageTime('2026-09-11T01:30:00Z'))
    expect(formatMessageTime('invalid')).toBe('')
    expect(formatMessageTime()).toBe('')
  })

  it('uses the local day for a UTC message near midnight', () => {
    const localToday = new Date(2026, 8, 11, 0, 30)
    const value = localToday.toISOString().replace(/Z$/, '')
    const result = groupConversationsByAge(
      [{ Id: 'today', AssistantId: 'a', Title: 't', CreateTime: value }],
      new Date(2026, 8, 11, 12),
    )
    expect(result[0]?.key).toBe('recent')
  })
})
