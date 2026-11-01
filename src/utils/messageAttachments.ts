/** 历史附件兼容层；统一字段与资源面板投影，不改变后端存储记录。 */
import type { Artifact, Attachment, Message, MessagePage } from '@/types/ai'

const attachmentRoute = (fileId: string) =>
  fileId ? `/api/sso/attachments/${encodeURIComponent(fileId)}` : ''

/** Portal历史的受保护附件仅按同一FileId转到SSO网关，不回退匿名raw或改写任意地址。 */
const inheritedAttachmentUrl = (value: string | undefined, fileId: string, download = false) => {
  const prefix = '/api/AI/Chat/Attachments/'
  if (!value?.startsWith(prefix) || !fileId) return value
  try {
    if (decodeURIComponent(value.slice(prefix.length).split(/[?#]/, 1)[0] || '') !== fileId)
      return value
    return `${attachmentRoute(fileId)}${download ? '?download=true' : ''}`
  } catch {
    return value
  }
}

/** 兼容大小写及旧 URL 字段；地址缺失时回退到编码后的鉴权附件接口。 */
export const normalizeAttachment = (value: Attachment | Record<string, unknown>): Attachment => {
  const item = value as Attachment & Record<string, unknown>
  const fileId = String(item.FileId ?? item.fileId ?? '')
  const secureRoute = attachmentRoute(fileId)
  const previewUrl =
    String(
      item.ContentUrl ??
        item.contentUrl ??
        item.PreviewUrl ??
        item.previewUrl ??
        item.FileUrl ??
        item.fileUrl ??
        '',
    ) ||
    secureRoute ||
    undefined
  const fileUrl =
    String(item.DownloadUrl ?? item.downloadUrl ?? item.FileUrl ?? item.fileUrl ?? '') ||
    (secureRoute ? `${secureRoute}?download=true` : undefined)
  return {
    FileId: fileId,
    FileName: String(item.FileName ?? item.fileName ?? '附件'),
    ContentType: String(item.ContentType ?? item.contentType ?? '') || undefined,
    FileSize: Number(item.FileSize ?? item.fileSize ?? item.Size ?? item.size ?? 0) || undefined,
    ContentUrl: inheritedAttachmentUrl(previewUrl, fileId),
    DownloadUrl: inheritedAttachmentUrl(fileUrl, fileId, true),
  }
}

/** 将已有上传附件投影为资源项；缺少 FileId 的记录不能构造稳定资源标识。 */
export const attachmentToArtifact = (
  value: Attachment | Record<string, unknown>,
): Artifact | undefined => {
  const attachment = normalizeAttachment(value)
  if (!attachment.FileId) return undefined
  return {
    ArtifactId: `attachment:${attachment.FileId}`,
    Type: attachment.ContentType || 'attachment',
    FileId: attachment.FileId,
    FileName: attachment.FileName,
    Status: 'completed',
    ContentUrl: attachment.ContentUrl,
    PreviewUrl: attachment.ContentUrl,
    DownloadUrl: attachment.DownloadUrl,
    Size: attachment.FileSize,
  }
}

/** 合并同一产物的最新状态，保持顺序；显式较旧版本不能覆盖新版本。 */
export const mergeArtifacts = (items: Artifact[]): Artifact[] => {
  const merged = new Map<string, Artifact>()
  for (const item of items) {
    const previous = merged.get(item.ArtifactId)
    if (
      previous?.Version !== undefined &&
      item.Version !== undefined &&
      item.Version < previous.Version
    )
      continue
    merged.set(item.ArtifactId, { ...previous, ...item })
  }
  return [...merged.values()]
}

/** 汇集上传附件与助手产物，同一ID的就绪事件可更新历史中的pending状态。 */
export const collectWorkspaceArtifacts = (messages: Message[]): Artifact[] => {
  const items = messages.flatMap((message) => [
    ...(message.Attachments || [])
      .map(attachmentToArtifact)
      .filter((item): item is Artifact => Boolean(item)),
    ...(message.Role === 'assistant'
      ? [...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])]
      : []),
  ])
  return mergeArtifacts(items)
}

/** 顶层非空附件优先，缺失时回退历史 PageContext；不修改输入消息。 */
export const normalizeMessageAttachments = (message: Message): Message => {
  const raw = message as Message & Record<string, unknown>
  const context = (message.PageContext ?? raw.pageContext) as
    { Attachments?: Attachment[]; attachments?: Attachment[] } | undefined
  const attachments = message.Attachments?.length
    ? message.Attachments
    : (raw.attachments as Attachment[] | undefined)?.length
      ? (raw.attachments as Attachment[])
      : (context?.Attachments ?? context?.attachments)
  if (!attachments?.length) return message
  return { ...message, Attachments: attachments.map(normalizeAttachment) }
}

/** 历史DTO只有GenerationStatus时恢复真实展示状态；不改原正文、错误码或产物。 */
export const normalizeMessageState = (message: Message): Message => {
  if (message.Role !== 'assistant') return message
  const state = (message.GenerationStatus || message.Status || '').toLowerCase()
  if (['cancelled', 'canceled', 'stopped'].includes(state))
    return { ...message, Status: 'stopped', SuggestedQuestions: [] }
  if (['partial', 'incomplete'].includes(state))
    return {
      ...message,
      Status: 'partial',
      ErrorMessage:
        message.ErrorMessage || '本轮只完成了部分结果，请查看原回复中的限制；已保留实际产物。',
    }
  if (
    ['failed', 'error', 'tool_failed', 'document_evidence_unavailable'].includes(state) ||
    message.ErrorCode
  )
    return {
      ...message,
      Status: 'error',
      ErrorMessage:
        message.ErrorMessage || '这次请求未完成，请查看原回复中的原因；已有内容和产物已保留。',
      SuggestedQuestions: [],
    }
  if (['completed', 'tool_completed', 'succeeded'].includes(state))
    return { ...message, Status: 'completed' }
  return message
}

/** 保留响应的数组/分页外形，让调用方无需通过 any 断言恢复原有类型。 */
export function normalizeMessageResponse(response: Message[]): Message[]
export function normalizeMessageResponse(response: MessagePage): MessagePage
export function normalizeMessageResponse(response: MessagePage | Message[]): MessagePage | Message[]
export function normalizeMessageResponse(
  response: MessagePage | Message[],
): MessagePage | Message[] {
  return Array.isArray(response)
    ? response.map((message) => normalizeMessageAttachments(normalizeMessageState(message)))
    : {
        ...response,
        Items: response.Items.map((message) =>
          normalizeMessageAttachments(normalizeMessageState(message)),
        ),
      }
}
