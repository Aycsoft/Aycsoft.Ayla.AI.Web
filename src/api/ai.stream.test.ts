/** 流传输回归：覆盖 UTF-8 分片、请求身份策略及正常/异常路径的 reader 锁释放。 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatRequest, ParsedSseEvent } from '@/types/ai'
import { streamChat, streamPublicChat } from './ai'

const chatRequest: ChatRequest = {
  ConversationId: 'conversation-1',
  AssistantId: 'assistant-1',
  Message: '测试消息',
}

/** 使用真实 ReadableStream/Response 验证消费行为，只替换网络请求。 */
function createResponse(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('chat stream transport', () => {
  it('preserves UTF-8 bytes across chunks and flushes the final event without a blank line', async () => {
    const bytes = new TextEncoder().encode('event: delta\ndata: 你好\n\nevent: done\ndata: {}')
    const response = createResponse(Array.from(bytes, (byte) => new Uint8Array([byte])))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    const events: ParsedSseEvent[] = []

    await streamChat(chatRequest, new AbortController().signal, (event) => events.push(event))

    expect(events).toEqual([
      { event: 'delta', id: undefined, data: '你好' },
      { event: 'done', id: undefined, data: {} },
    ])
    expect(response.body?.locked).toBe(false)
  })

  it('preserves separate credential and mutation-header contracts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(createResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal

    await streamChat(chatRequest, signal, () => undefined)
    await streamPublicChat({ Message: '公开消息' }, signal, () => undefined)

    expect(fetchMock.mock.calls[0][0]).toBe('/api/workspace/chat/stream')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      signal,
      headers: { 'X-CrossCart-AI-Request': '1' },
    })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/public/chat/stream')
    expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('credentials')
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('X-CrossCart-AI-Request')
  })

  it('releases the reader lock when an event consumer throws', async () => {
    const response = createResponse([new TextEncoder().encode('data: payload\n\n')])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    const failure = new Error('消费事件失败')

    await expect(
      streamPublicChat({ Message: '消息' }, new AbortController().signal, () => {
        throw failure
      }),
    ).rejects.toBe(failure)
    expect(response.body?.locked).toBe(false)
  })

  it('releases the reader lock when the underlying stream fails', async () => {
    const failure = new Error('连接断开')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(failure)
      },
    })
    const response = new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(
      streamChat(chatRequest, new AbortController().signal, () => undefined),
    ).rejects.toBe(failure)
    expect(response.body?.locked).toBe(false)
  })

  it('rejects a successful HTTP response that is not an SSE stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      streamPublicChat({ Message: '消息' }, new AbortController().signal, () => undefined),
    ).rejects.toMatchObject({ status: 502, message: '服务端未返回 SSE 流' })
  })
})
