/** 将多个后端版本的生成状态统一为侧栏显示状态。 */
import type { Conversation } from '@/types/ai'

/** 侧栏可显示的四类结果，未知值不强行标记成功。 */
export type ConversationRunStatus = 'running' | 'succeeded' | 'failed' | 'stopped'

/** 忽略大小写与首尾空白，未知/空状态返回 undefined。 */
export function normalizeConversationRunStatus(value?: string): ConversationRunStatus | undefined {
  const status = value?.trim().toLowerCase()
  if (!status) return undefined
  if (['queued', 'pending', 'streaming', 'running', 'generating', 'processing'].includes(status))
    return 'running'
  if (['completed', 'complete', 'succeeded', 'success', 'done'].includes(status)) return 'succeeded'
  if (['failed', 'failure', 'error'].includes(status)) return 'failed'
  if (['stopped', 'cancelled', 'canceled', 'aborted'].includes(status)) return 'stopped'
  return undefined
}

/** 当前生成状态优先于上一次运行状态，避免正在运行时仍显示旧失败。 */
export const conversationRunStatus = (conversation: Conversation) =>
  normalizeConversationRunStatus(conversation.GenerationStatus || conversation.LastRunStatus)
