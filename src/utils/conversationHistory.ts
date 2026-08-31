import type { Conversation } from '@/types/ai'

export type ConversationHistoryGroupKey = 'recent' | 'seven-days' | 'thirty-days' | 'older'

export interface ConversationHistoryGroup {
  key: ConversationHistoryGroupKey
  label: string
  items: Conversation[]
}

const historyGroups: Array<{ key: ConversationHistoryGroupKey; label: string }> = [
  { key: 'recent', label: '最近' },
  { key: 'seven-days', label: '近7天' },
  { key: 'thirty-days', label: '近30天' },
  { key: 'older', label: '更早' }
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
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

export function groupConversationsByAge(conversations: Conversation[], now = new Date()): ConversationHistoryGroup[] {
  const today = startOfLocalDay(now)
  const sevenDaysAgo = shiftLocalDays(today, -6).getTime()
  const thirtyDaysAgo = shiftLocalDays(today, -29).getTime()
  const todayTimestamp = today.getTime()
  const buckets = new Map<ConversationHistoryGroupKey, Conversation[]>()

  for (const conversation of conversations) {
    const timestamp = conversationTimestamp(conversation)
    const key: ConversationHistoryGroupKey = timestamp === undefined || timestamp < thirtyDaysAgo
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

  return historyGroups.flatMap(group => {
    const items = buckets.get(group.key)
    return items?.length ? [{ ...group, items }] : []
  })
}

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
