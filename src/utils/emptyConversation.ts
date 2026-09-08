/** 空会话复用与创建并发控制；依赖真实消息/元数据，不使用标题猜测。 */
import type { Conversation, Message, MessagePage } from '@/types/ai'

/** 兼容数组与分页响应的空消息判断。 */
export const hasNoMessages = (response: MessagePage | Message[]) =>
  (Array.isArray(response) ? response : response.Items).length === 0

/** 原地更新已接受消息的本地摘要，避免下一次创建误复用当前会话。 */
export function syncConversationMessageState(
  conversation: Conversation | undefined,
  messageCount: number,
) {
  if (!conversation) return
  conversation.MessageCount = Math.max(0, messageCount)
  conversation.IsEmpty = conversation.MessageCount === 0
}

/**
 * 先信任明确元数据，再检查当前本地消息，最后逐个加载未知会话的真实消息。
 * 本地已接受消息优先于滞后的 IsEmpty；加载失败向上传递，不冒险判定为空。
 */
export async function findReusableEmptyConversation(
  conversations: Conversation[],
  currentId: string,
  currentMessages: Message[],
  loadMessages: (id: string) => Promise<MessagePage | Message[]>,
): Promise<Conversation | undefined> {
  const explicit = conversations.find((item) => {
    if (item.Id === currentId && currentMessages.length > 0) return false
    return item.IsEmpty === true || item.MessageCount === 0
  })
  if (explicit) return explicit
  const current = conversations.find((item) => item.Id === currentId)
  if (current && currentMessages.length === 0) return current
  for (const item of conversations) {
    if (item.Id === currentId && currentMessages.length > 0) continue
    if (item.IsEmpty === false || (item.MessageCount ?? 0) > 0) continue
    if (hasNoMessages(await loadMessages(item.Id))) return item
  }
  return undefined
}

/** 共享尚未完成的 Promise；成功或失败均解锁，后续调用可重新执行。 */
export function createSingleFlight<T>(factory: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined
  return () => {
    if (!pending)
      pending = factory().finally(() => {
        pending = undefined
      })
    return pending
  }
}
