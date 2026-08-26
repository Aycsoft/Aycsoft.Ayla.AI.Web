export type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language: string }

export function parseMessageContent(value: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  const fence = /^ {0,3}```([^`\r\n]*)[\t ]*\r?\n/gm
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(value)) !== null) {
    const index = match.index ?? 0
    if (index > cursor) segments.push({ type: 'text', content: value.slice(cursor, index) })
    const language = (match[1].trim().split(/\s+/, 1)[0] || 'text').replace(/[^\w.+-]/g, '').toLowerCase() || 'text'
    const contentStart = fence.lastIndex
    const closingFence = /^ {0,3}```[\t ]*(?:\r?\n|$)/gm
    closingFence.lastIndex = contentStart
    const closing = closingFence.exec(value)
    if (!closing) {
      segments.push({ type: 'code', language, content: value.slice(contentStart).replace(/\r?\n$/, '') })
      cursor = value.length
      break
    }
    segments.push({ type: 'code', language, content: value.slice(contentStart, closing.index).replace(/\r?\n$/, '') })
    cursor = closingFence.lastIndex
    fence.lastIndex = cursor
  }
  if (cursor < value.length) segments.push({ type: 'text', content: value.slice(cursor) })
  return segments.length ? segments : [{ type: 'text', content: value }]
}

export type OutputKind = 'image' | 'video' | 'audio' | 'code' | 'file'

export function classifyOutput(type = '', fileName = '', contentType = ''): OutputKind {
  const marker = `${type} ${fileName} ${contentType}`.toLowerCase()
  if (/image|png|jpe?g|webp|gif|svg/.test(marker)) return 'image'
  if (/video|mp4|webm|mov|m4v/.test(marker)) return 'video'
  if (/audio|mp3|wav|m4a|ogg|flac/.test(marker)) return 'audio'
  if (/code|javascript|typescript|python|json|html|css|\.js\b|\.ts\b|\.py\b/.test(marker)) return 'code'
  return 'file'
}

export function isSuccessfulArtifact(status = ''): boolean {
  return ['ready', 'completed', 'succeeded', 'success'].includes(status.toLowerCase())
}
