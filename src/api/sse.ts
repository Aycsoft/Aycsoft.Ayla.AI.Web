import type { ParsedSseEvent } from '@/types/ai'

export class SseParser {
  private buffer = ''
  push(chunk: string, done = false): ParsedSseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const events: ParsedSseEvent[] = []
    let boundary = this.buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const block = this.buffer.slice(0, boundary)
      this.buffer = this.buffer.slice(boundary + 2)
      const parsed = parseBlock(block)
      if (parsed) events.push(parsed)
      boundary = this.buffer.indexOf('\n\n')
    }
    if (done && this.buffer.trim()) {
      const parsed = parseBlock(this.buffer)
      if (parsed) events.push(parsed)
      this.buffer = ''
    }
    return events
  }
}

export const unwrapAgentEvent = (event: ParsedSseEvent): ParsedSseEvent => {
  if (event.event !== 'agent' || !event.data || typeof event.data !== 'object') return event
  const envelope = event.data as Record<string, unknown>
  const type = String(envelope.Type ?? envelope.type ?? '')
  if (!type) return event
  return {
    event: type,
    id: String(envelope.EventId ?? envelope.eventId ?? event.id ?? '') || undefined,
    data: envelope.Data ?? envelope.data
  }
}

export const resolveTerminalMessageStatus = (status: string | undefined, content: string): 'completed' | 'error' | 'stopped' => {
  if (status === 'error' || status === 'stopped') return status
  return content.trim() ? 'completed' : 'error'
}

const parseBlock = (block: string): ParsedSseEvent | undefined => {
  let event = 'message'; let id: string | undefined; const lines: string[] = []
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue
    const at = line.indexOf(':'); const field = at < 0 ? line : line.slice(0, at); const value = at < 0 ? '' : line.slice(at + 1).replace(/^ /, '')
    if (field === 'event') event = value
    else if (field === 'id') id = value
    else if (field === 'data') lines.push(value)
  }
  if (!lines.length) return undefined
  const raw = lines.join('\n'); let data: unknown = raw
  try { data = JSON.parse(raw) } catch { /* text delta is valid */ }
  return { event, id, data }
}
