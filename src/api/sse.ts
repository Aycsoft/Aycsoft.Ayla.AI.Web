/** SSE 文本协议解析：分离传输分块、事件信封与消息终态，不直接修改界面状态。 */
import type { ParsedSseEvent } from '@/types/ai'

/** 每次请求创建一个解析器，缓存尚未闭合的事件块。 */
export class SseParser {
  private buffer = ''
  /** 消费解码后的文本；done=true 时处理末尾没有空行的最后一个事件。 */
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

/** 兼容 agent 包装事件的 PascalCase/camelCase 字段，普通事件保持原样。 */
export const unwrapAgentEvent = (event: ParsedSseEvent): ParsedSseEvent => {
  if (event.event !== 'agent' || !event.data || typeof event.data !== 'object') return event
  const envelope = event.data as Record<string, unknown>
  const type = String(envelope.Type ?? envelope.type ?? '')
  if (!type) return event
  return {
    event: type,
    id: String(envelope.EventId ?? envelope.eventId ?? event.id ?? '') || undefined,
    data: envelope.Data ?? envelope.data,
  }
}

/** 显式失败/停止优先；没有可见回答的正常结束不能被展示为成功。 */
export const resolveTerminalMessageStatus = (
  status: string | undefined,
  content: string,
): 'completed' | 'error' | 'stopped' => {
  if (status === 'error' || status === 'stopped') return status
  return content.trim() ? 'completed' : 'error'
}

/** 心跳注释不产出事件，多行 data 按换行连接；非 JSON 增量作为文本保留。 */
const parseBlock = (block: string): ParsedSseEvent | undefined => {
  let event = 'message'
  let id: string | undefined
  const lines: string[] = []
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue
    const at = line.indexOf(':')
    const field = at < 0 ? line : line.slice(0, at)
    const value = at < 0 ? '' : line.slice(at + 1).replace(/^ /, '')
    if (field === 'event') event = value
    else if (field === 'id') id = value
    else if (field === 'data') lines.push(value)
  }
  if (!lines.length) return undefined
  const raw = lines.join('\n')
  let data: unknown = raw
  try {
    data = JSON.parse(raw)
  } catch {
    /* text delta is valid */
  }
  return { event, id, data }
}
