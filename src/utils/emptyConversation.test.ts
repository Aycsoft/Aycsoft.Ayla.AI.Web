import { describe, expect, it, vi } from 'vitest'
import { createSingleFlight, findReusableEmptyConversation } from './emptyConversation'

describe('findReusableEmptyConversation', () => {
  it('uses explicit server empty metadata without relying on title', async () => {
    const load = vi.fn()
    const result = await findReusableEmptyConversation([
      { Id: 'used-new', AssistantId: 'a', Title: '新会话', IsEmpty: false },
      { Id: 'blank', AssistantId: 'a', Title: '已命名草稿', MessageCount: 0 }
    ], '', [], load)
    expect(result?.Id).toBe('blank'); expect(load).not.toHaveBeenCalled()
  })

  it('queries message data when metadata is unavailable', async () => {
    const load = vi.fn(async (id: string) => id === 'used' ? [{ Id: 'm', Role: 'user', Content: 'hi' }] : [])
    const result = await findReusableEmptyConversation([
      { Id: 'used', AssistantId: 'a', Title: '新会话' },
      { Id: 'blank', AssistantId: 'a', Title: '其他标题' }
    ], '', [], load as never)
    expect(result?.Id).toBe('blank'); expect(load).toHaveBeenCalledTimes(2)
  })
  it('deduplicates rapid create requests and unlocks after completion', async () => {
    const factory = vi.fn(async () => ({ Id: crypto.randomUUID() }))
    const run = createSingleFlight(factory)
    const [first, second] = await Promise.all([run(), run()])
    expect(first).toBe(second); expect(factory).toHaveBeenCalledTimes(1)
    await run(); expect(factory).toHaveBeenCalledTimes(2)
  })
})
