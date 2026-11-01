import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamChat } from './ai'
import { isTerminalSseEvent, SseParser } from './sse'
import type { ParsedSseEvent } from '@/types/ai'

const request = {
  ConversationId: 'synthetic-conversation',
  AssistantId: 'synthetic',
  Message: '合成测试',
}
const response = (stream: ReadableStream<Uint8Array>) =>
  new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
const source = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })
afterEach(() => vi.unstubAllGlobals())

describe('流中断与取消恢复合同', () => {
  it('逐字符CRLF分块不将data误拆为新事件', () => {
    const parser = new SseParser()
    const events = [
      ...'event: delta\r\ndata: 一\r\ndata: 二\r\n\r\nevent: done\r\ndata: {}\r\n\r\n',
    ].flatMap((c) => parser.push(c))
    expect(events).toEqual([
      { event: 'delta', id: undefined, data: '一\n二' },
      { event: 'done', id: undefined, data: {} },
    ])
  })
  it('有部分正文但EOF无终态不报告成功，已收到正文保留', async () => {
    const body = source('event: delta\ndata: {"Content":"已有正文"}\n\n')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(body)))
    const events: ParsedSseEvent[] = []
    await expect(
      streamChat(request, new AbortController().signal, (e) => events.push(e)),
    ).rejects.toThrow('未收到完成状态')
    expect(events).toHaveLength(1)
    expect(body.locked).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('业务error后done继续消费且不被缺终态错误覆盖', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(
            source(
              'event: error\ndata: {"Code":"SAFE"}\n\nevent: done\ndata: {"MessageId":"saved"}\n\n',
            ),
          ),
        ),
    )
    const events: ParsedSseEvent[] = []
    await streamChat(request, new AbortController().signal, (e) => events.push(e))
    expect(events.map((e) => e.event)).toEqual(['error', 'done'])
  })
  it('只error无done仍保留实际业务错误，不改为成功或网络错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(source('event: error\ndata: {"Code":"SAFE"}\n\n'))),
    )
    const events: ParsedSseEvent[] = []
    await streamChat(request, new AbortController().signal, (e) => events.push(e))
    expect(events).toHaveLength(1)
  })
  it('等待网络分块期间取消会取消reader并立即结束', async () => {
    const cancelled = vi.fn()
    const body = new ReadableStream<Uint8Array>({ cancel: cancelled })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(body)))
    const controller = new AbortController()
    const task = streamChat(request, controller.signal, () => undefined)
    await vi.waitFor(() => expect(body.locked).toBe(true))
    controller.abort()
    await expect(task).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelled).toHaveBeenCalledTimes(1)
    expect(body.locked).toBe(false)
  })
  it('同chunk收到取消后不再处理晚到done', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(source('event: delta\ndata: partial\n\nevent: done\ndata: {}\n\n')),
        ),
    )
    const events: ParsedSseEvent[] = []
    await expect(
      streamChat(request, controller.signal, (e) => {
        events.push(e)
        controller.abort()
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(events.map((e) => e.event)).toEqual(['delta'])
  })
  it('agent终态与等待输入是合法收口，单产物不是', () => {
    for (const Type of [
      'run.completed',
      'run.failed',
      'run.cancelled',
      'clarification.required',
      'approval.required',
    ])
      expect(isTerminalSseEvent({ event: 'agent', data: { Type } })).toBe(true)
    expect(isTerminalSseEvent({ event: 'artifact.ready', data: {} })).toBe(false)
  })
})
