/** 消息展示分段；文本交给安全 Markdown，围栏代码交给专用代码卡片。 */
export type MessageSegment =
  { type: 'text'; content: string } | { type: 'code'; content: string; language: string }

/** 识别三反引号围栏；流式未闭合代码块仍作为代码显示，避免渲染过程中闪回正文。 */
export function parseMessageContent(value: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  const fence = /^ {0,3}```([^`\r\n]*)[\t ]*\r?\n/gm
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(value)) !== null) {
    const index = match.index ?? 0
    if (index > cursor) segments.push({ type: 'text', content: value.slice(cursor, index) })
    const language =
      (match[1].trim().split(/\s+/, 1)[0] || 'text').replace(/[^\w.+-]/g, '').toLowerCase() ||
      'text'
    const contentStart = fence.lastIndex
    const closingFence = /^ {0,3}```[\t ]*(?:\r?\n|$)/gm
    closingFence.lastIndex = contentStart
    const closing = closingFence.exec(value)
    if (!closing) {
      segments.push({
        type: 'code',
        language,
        content: value.slice(contentStart).replace(/\r?\n$/, ''),
      })
      cursor = value.length
      break
    }
    segments.push({
      type: 'code',
      language,
      content: value.slice(contentStart, closing.index).replace(/\r?\n$/, ''),
    })
    cursor = closingFence.lastIndex
    fence.lastIndex = cursor
  }
  if (cursor < value.length) segments.push({ type: 'text', content: value.slice(cursor) })
  return segments.length ? segments : [{ type: 'text', content: value }]
}

/** 资源面板支持的预览类别，不作为上传文件的安全验证结果。 */
export type OutputKind = 'image' | 'video' | 'audio' | 'code' | 'file'

/** 综合产物类型、文件名与 MIME 推断展示类别，无法识别时按普通文件处理。 */
export function classifyOutput(type = '', fileName = '', contentType = ''): OutputKind {
  const marker = `${type} ${fileName} ${contentType}`.toLowerCase()
  if (/image|png|jpe?g|webp|gif|svg/.test(marker)) return 'image'
  if (/video|mp4|webm|mov|m4v/.test(marker)) return 'video'
  if (/audio|mp3|wav|m4a|ogg|flac/.test(marker)) return 'audio'
  if (/code|javascript|typescript|python|json|html|css|\.js\b|\.ts\b|\.py\b/.test(marker))
    return 'code'
  return 'file'
}

/** 只接受明确成功的后端状态，运行中/失败资源不能作为生成案例。 */
export function isSuccessfulArtifact(status = ''): boolean {
  return ['ready', 'completed', 'succeeded', 'success'].includes(status.toLowerCase())
}
