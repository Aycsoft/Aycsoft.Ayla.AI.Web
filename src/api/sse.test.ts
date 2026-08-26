import { describe, expect, it } from 'vitest'
import { resolveTerminalMessageStatus, SseParser, unwrapAgentEvent } from './sse'

describe('SseParser', () => {
  it('parses fragmented CRLF events and multiline data', () => {
    const parser = new SseParser()
    expect(parser.push('event: delta\r\ndata: {"Cont')).toEqual([])
    expect(parser.push('ent":"你好"}\r\n\r\nevent: done\ndata: {"MessageId":"m1"}\n\n')).toEqual([
      { event: 'delta', id: undefined, data: { Content: '你好' } },
      { event: 'done', id: undefined, data: { MessageId: 'm1' } }
    ])
  })
  it('ignores heartbeat comments and preserves plain text', () => {
    const parser = new SseParser()
    expect(parser.push(': heartbeat\n\nevent: delta\ndata: plain\n\n')).toEqual([{ event: 'delta', id: undefined, data: 'plain' }])
  })
})

describe('unwrapAgentEvent', () => {
  it('exposes the real event type and payload from the agent envelope', () => {
    expect(unwrapAgentEvent({ event: 'agent', data: { Type: 'step.started', EventId: 'evt-1', Data: { StepId: 'step-1' } } })).toEqual({
      event: 'step.started', id: 'evt-1', data: { StepId: 'step-1' }
    })
  })
})

describe('resolveTerminalMessageStatus', () => {
  it('rejects a completed terminal event when no visible answer was produced', () => {
    expect(resolveTerminalMessageStatus('completed', '')).toBe('error')
    expect(resolveTerminalMessageStatus('completed', '  ')).toBe('error')
    expect(resolveTerminalMessageStatus('completed', '真实回复')).toBe('completed')
  })

  it('preserves explicit failures and cancellation', () => {
    expect(resolveTerminalMessageStatus('error', 'partial')).toBe('error')
    expect(resolveTerminalMessageStatus('stopped', '')).toBe('stopped')
  })
})
