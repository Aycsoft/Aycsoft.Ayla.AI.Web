import type { Conversation, Message, MessagePage } from '@/types/ai'

export const hasNoMessages = (response: MessagePage | Message[]) => (Array.isArray(response) ? response : response.Items).length === 0

export async function findReusableEmptyConversation(
  conversations: Conversation[],
  currentId: string,
  currentMessages: Message[],
  loadMessages: (id: string) => Promise<MessagePage | Message[]>
): Promise<Conversation | undefined> {
  const explicit = conversations.find(item => item.IsEmpty === true || item.MessageCount === 0)
  if (explicit) return explicit
  const current = conversations.find(item => item.Id === currentId)
  if (current && currentMessages.length === 0) return current
  for (const item of conversations) {
    if (item.IsEmpty === false || (item.MessageCount ?? 0) > 0) continue
    if (hasNoMessages(await loadMessages(item.Id))) return item
  }
  return undefined
}

export function createSingleFlight<T>(factory: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined
  return () => {
    if (!pending) pending = factory().finally(() => { pending = undefined })
    return pending
  }
}
