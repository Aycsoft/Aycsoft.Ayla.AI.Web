import type { Conversation } from '@/types/ai'

export type ConversationRunStatus = 'running' | 'succeeded' | 'failed' | 'stopped'

export function normalizeConversationRunStatus(value?: string): ConversationRunStatus | undefined {
  const status = value?.trim().toLowerCase()
  if (!status) return undefined
  if (['queued', 'pending', 'streaming', 'running', 'generating', 'processing'].includes(status)) return 'running'
  if (['completed', 'complete', 'succeeded', 'success', 'done'].includes(status)) return 'succeeded'
  if (['failed', 'failure', 'error'].includes(status)) return 'failed'
  if (['stopped', 'cancelled', 'canceled', 'aborted'].includes(status)) return 'stopped'
  return undefined
}

export const conversationRunStatus = (conversation: Conversation) => normalizeConversationRunStatus(conversation.GenerationStatus || conversation.LastRunStatus)
