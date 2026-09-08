/** 历史附件兼容层；统一字段与资源面板投影，不改变后端存储记录。 */
import type { Artifact, Attachment, Message, MessagePage } from '@/types/ai'

const attachmentRoute = (fileId: string) =>
  fileId ? `/api/sso/attachments/${encodeURIComponent(fileId)}` : ''

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
    ContentUrl: previewUrl,
    DownloadUrl: fileUrl,
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

/** 汇集上传附件与助手产物，按 ArtifactId 保留首次出现项和原顺序。 */
export const collectWorkspaceArtifacts = (messages: Message[]): Artifact[] => {
  const items = messages.flatMap((message) => [
    ...(message.Attachments || [])
      .map(attachmentToArtifact)
      .filter((item): item is Artifact => Boolean(item)),
    ...(message.Role === 'assistant'
      ? [...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])]
      : []),
  ])
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.ArtifactId)) return false
    seen.add(item.ArtifactId)
    return true
  })
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

/** 保留响应的数组/分页外形，让调用方无需通过 any 断言恢复原有类型。 */
export function normalizeMessageResponse(response: Message[]): Message[]
export function normalizeMessageResponse(response: MessagePage): MessagePage
export function normalizeMessageResponse(response: MessagePage | Message[]): MessagePage | Message[]
export function normalizeMessageResponse(
  response: MessagePage | Message[],
): MessagePage | Message[] {
  return Array.isArray(response)
    ? response.map(normalizeMessageAttachments)
    : { ...response, Items: response.Items.map(normalizeMessageAttachments) }
}
