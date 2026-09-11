/** 历史会话纯数据处理：按本地日历分组、合并分页，不修改输入数组。 */
import type { Conversation } from '@/types/ai'
import { parseApiTime } from './apiTime'

/** 侧栏固定分组键，与显示文案分离。 */
export type ConversationHistoryGroupKey = 'recent' | 'seven-days' | 'thirty-days' | 'older'

/** 按时间桶整理的会话；组内保留接口传入顺序。 */
export interface ConversationHistoryGroup {
  key: ConversationHistoryGroupKey
  label: string
  items: Conversation[]
}

const historyGroups: Array<{ key: ConversationHistoryGroupKey; label: string }> = [
  { key: 'recent', label: '最近' },
  { key: 'seven-days', label: '近7天' },
  { key: 'thirty-days', label: '近30天' },
  { key: 'older', label: '更早' },
]

const startOfLocalDay = (value: Date) => {
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  return result
}

const shiftLocalDays = (value: Date, days: number) => {
  const result = new Date(value)
  result.setDate(result.getDate() + days)
  return result
}

const conversationTimestamp = (conversation: Conversation) => {
  const value = conversation.UpdateTime || conversation.CreateTime
  if (!value) return undefined
  const timestamp = parseApiTime(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

/** 近 7/30 天包含今天；无效时间归入更早，按日历而非固定毫秒差划分。 */
export function groupConversationsByAge(
  conversations: Conversation[],
  now = new Date(),
): ConversationHistoryGroup[] {
  const today = startOfLocalDay(now)
  const sevenDaysAgo = shiftLocalDays(today, -6).getTime()
  const thirtyDaysAgo = shiftLocalDays(today, -29).getTime()
  const todayTimestamp = today.getTime()
  const buckets = new Map<ConversationHistoryGroupKey, Conversation[]>()

  for (const conversation of conversations) {
    const timestamp = conversationTimestamp(conversation)
    const key: ConversationHistoryGroupKey =
      timestamp === undefined || timestamp < thirtyDaysAgo
        ? 'older'
        : timestamp < sevenDaysAgo
          ? 'thirty-days'
          : timestamp < todayTimestamp
            ? 'seven-days'
            : 'recent'
    const items = buckets.get(key) || []
    items.push(conversation)
    buckets.set(key, items)
  }

  return historyGroups.flatMap((group) => {
    const items = buckets.get(group.key)
    return items?.length ? [{ ...group, items }] : []
  })
}

/** 按 Id 去重，重叠记录更新字段但保持首次出现位置。 */
export function mergeConversationPages(current: Conversation[], incoming: Conversation[]) {
  const merged: Conversation[] = []
  const positions = new Map<string, number>()

  for (const conversation of [...current, ...incoming]) {
    const position = positions.get(conversation.Id)
    if (position === undefined) {
      positions.set(conversation.Id, merged.length)
      merged.push(conversation)
    } else {
      merged[position] = { ...merged[position], ...conversation }
    }
  }

  return merged
}
