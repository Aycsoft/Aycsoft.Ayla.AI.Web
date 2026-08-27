import type { Artifact, Attachment, Message, MessagePage } from '@/types/ai'

const attachmentRoute = (fileId: string) => fileId
  ? `/api/sso/attachments/${encodeURIComponent(fileId)}`
  : ''

export const normalizeAttachment = (value: Attachment | Record<string, unknown>): Attachment => {
  const item = value as Attachment & Record<string, unknown>
  const fileId = String(item.FileId ?? item.fileId ?? '')
  const secureRoute = attachmentRoute(fileId)
  const previewUrl = String(item.ContentUrl ?? item.contentUrl ?? item.PreviewUrl ?? item.previewUrl ?? item.FileUrl ?? item.fileUrl ?? '') || secureRoute || undefined
  const fileUrl = String(item.DownloadUrl ?? item.downloadUrl ?? item.FileUrl ?? item.fileUrl ?? '') || (secureRoute ? `${secureRoute}?download=true` : undefined)
  return {
    FileId: fileId,
    FileName: String(item.FileName ?? item.fileName ?? '附件'),
    ContentType: String(item.ContentType ?? item.contentType ?? '') || undefined,
    FileSize: Number(item.FileSize ?? item.fileSize ?? item.Size ?? item.size ?? 0) || undefined,
    ContentUrl: previewUrl,
    DownloadUrl: fileUrl
  }
}

export const attachmentToArtifact = (value: Attachment | Record<string, unknown>): Artifact | undefined => {
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
    Size: attachment.FileSize
  }
}

export const collectWorkspaceArtifacts = (messages: Message[]): Artifact[] => {
  const items = messages.flatMap(message => [
    ...(message.Attachments || []).map(attachmentToArtifact).filter((item): item is Artifact => Boolean(item)),
    ...(message.Role === 'assistant' ? [...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])] : [])
  ])
  return items.filter((item, index, all) => all.findIndex(candidate => candidate.ArtifactId === item.ArtifactId) === index)
}

export const normalizeMessageAttachments = (message: Message): Message => {
  const raw = message as Message & Record<string, unknown>
  const context = (message.PageContext ?? raw.pageContext) as { Attachments?: Attachment[]; attachments?: Attachment[] } | undefined
  const attachments = message.Attachments?.length
    ? message.Attachments
    : (raw.attachments as Attachment[] | undefined)?.length
      ? raw.attachments as Attachment[]
      : context?.Attachments ?? context?.attachments
  if (!attachments?.length) return message
  return { ...message, Attachments: attachments.map(normalizeAttachment) }
}

export const normalizeMessageResponse = (response: MessagePage | Message[]): MessagePage | Message[] => Array.isArray(response)
  ? response.map(normalizeMessageAttachments)
  : { ...response, Items: response.Items.map(normalizeMessageAttachments) }
