import { apiUrl, mutationHeaders, query, request, ApiError } from './http'
import { SseParser } from './sse'
import type { AISettings, AiModelDefinition, AiUsageSummary, Assistant, Attachment, ChatRequest, Conversation, ConversationPage, ExternalAuthCodeRequest, ExternalAuthLoginRequest, ExternalAuthRegisterRequest, ExternalAuthResult, ExternalPasswordLoginRequest, ExternalPasswordResetRequest, ExternalPasswordSetRequest, ExternalProfileUpdateRequest, KnowledgeDocument, MarkdownNote, Message, MessagePage, ParsedSseEvent, PersonalKnowledgeDocument, PublicChatRequest, SsoExchangeResult, UserSkill, WorkspaceModel, WorkspaceSession } from '@/types/ai'
import { buildFeedbackPayload, type FeedbackPayload } from './feedbackContract'
import { usageSummaryPath, type UsageSummaryQuery } from './usageContract'
import { normalizeMessageResponse } from '@/utils/messageAttachments'

const workspace = (path: string) => `/workspace${path}`

export const aiApi = {
  session: () => request<WorkspaceSession>('/sso/session'),
  publicModels: () => request<WorkspaceModel[]>('/public/models'),
  exchange: (Code: string) => request<SsoExchangeResult>('/sso/exchange', { method: 'POST', body: JSON.stringify({ Code }) }),
  logout: () => request<void>('/sso/logout', { method: 'POST', body: '{}' }),
  sendExternalAuthCode: (data: ExternalAuthCodeRequest) => request<{ RetryAfterSeconds?: number }>('/external-auth/code', { method: 'POST', body: JSON.stringify(data) }),
  registerExternal: (data: ExternalAuthRegisterRequest) => request<ExternalAuthResult>('/external-auth/register', { method: 'POST', body: JSON.stringify(data) }),
  loginExternal: (data: ExternalAuthLoginRequest) => request<ExternalAuthResult>('/external-auth/login', { method: 'POST', body: JSON.stringify(data) }),
  loginExternalPassword: (data: ExternalPasswordLoginRequest) => request<ExternalAuthResult>('/external-auth/password/login', { method: 'POST', body: JSON.stringify(data) }),
  setExternalPassword: (data: ExternalPasswordSetRequest) => data.CurrentPassword
    ? request<{ Changed?: boolean }>('/external-auth/password/change', { method: 'POST', body: JSON.stringify({ CurrentPassword: data.CurrentPassword, NewPassword: data.NewPassword }) })
    : request<{ Changed?: boolean }>('/external-auth/password/set', { method: 'POST', body: JSON.stringify({ Password: data.NewPassword }) }),
  resetExternalPassword: (data: ExternalPasswordResetRequest) => request<void>('/external-auth/password/reset', { method: 'POST', body: JSON.stringify(data) }),
  updateExternalProfile: (data: ExternalProfileUpdateRequest) => request<{ Updated?: boolean }>('/external-auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  logoutExternal: () => request<void>('/external-auth/logout', { method: 'POST', body: '{}' }),
  settings: () => request<AISettings>('/public/settings'),
  assistants: () => request<Assistant[]>(workspace('/assistants')),
  conversations: (params: { AssistantId?: string; Keyword?: string; Page: number; PageSize: number }) => request<ConversationPage | Conversation[]>(`${workspace('/conversations')}?${query(params)}`),
  createConversation: (data: { AssistantId: string; Title?: string; Source?: 'portal' | 'ai-web' | 'api'; IdempotencyKey?: string }) => request<Conversation>(workspace('/conversations'), { method: 'POST', body: JSON.stringify(data) }),
  renameConversation: (id: string, Title: string) => request<Conversation>(workspace(`/conversations/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify({ Title }) }),
  deleteConversation: (id: string) => request<void>(workspace(`/conversations/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  messages: async (id: string, BeforeSequence?: number) => normalizeMessageResponse(await request<MessagePage | Message[]>(`${workspace(`/conversations/${encodeURIComponent(id)}/messages`)}?${query({ BeforeSequence, PageSize: 100 })}`)),
  stop: (GenerationId: string) => request<{ Stopped?: boolean }>(workspace('/chat/stop'), { method: 'POST', body: JSON.stringify({ GenerationId }) }),
  regenerate: (ConversationId: string, MessageId?: string) => request<Message>(workspace('/chat/regenerate'), { method: 'POST', body: JSON.stringify({ ConversationId, MessageId }) }),
  feedback: (id: string, feedback: FeedbackPayload) => request<void>(workspace(`/messages/${encodeURIComponent(id)}/feedback`), { method: 'POST', body: JSON.stringify(buildFeedbackPayload(feedback)) }),
  usageSummary: (params: UsageSummaryQuery = {}) => request<AiUsageSummary>(usageSummaryPath(params)),
  documents: () => request<KnowledgeDocument[]>(`${workspace('/knowledge/documents')}?PageIndex=1&PageSize=100`),
  personalKnowledge: () => request<PersonalKnowledgeDocument[]>(workspace('/personal/knowledge')),
  createPersonalKnowledge: (data: { FileId: string; FileName: string; ContentType: string }) => request<PersonalKnowledgeDocument>(workspace('/personal/knowledge'), { method: 'POST', body: JSON.stringify(data) }),
  deletePersonalKnowledge: (id: string) => request<void>(workspace(`/personal/knowledge/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  skills: () => request<UserSkill[]>(workspace('/personal/skills')),
  createSkill: (data: { Name: string; Description?: string; Instructions: string; IsEnabled: boolean }) => request<UserSkill>(workspace('/personal/skills'), { method: 'POST', body: JSON.stringify(data) }),
  updateSkill: (id: string, data: { Name: string; Description?: string; Instructions: string; IsEnabled: boolean }) => request<UserSkill>(workspace(`/personal/skills/${encodeURIComponent(id)}`), { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: string) => request<void>(workspace(`/personal/skills/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  notes: (keyword?: string) => request<MarkdownNote[]>(`${workspace('/personal/notes')}?${query({ keyword })}`),
  note: (id: string) => request<MarkdownNote>(workspace(`/personal/notes/${encodeURIComponent(id)}`)),
  createNote: (data: { Title: string; ContentMarkdown: string; Tags: string[] }) => request<MarkdownNote>(workspace('/personal/notes'), { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: { Title: string; ContentMarkdown: string; Tags: string[] }) => request<MarkdownNote>(workspace(`/personal/notes/${encodeURIComponent(id)}`), { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id: string) => request<void>(workspace(`/personal/notes/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  models: () => request<AiModelDefinition[]>(`${workspace('/admin/providers/models')}?includeDisabled=false`),
  testModel: (data: { ProviderId?: string; ModelId?: string; InternalAlias?: string; Message: string; RequireToolCalling?: boolean }) => request<Record<string, unknown>>(workspace('/admin/providers/test'), { method: 'POST', body: JSON.stringify(data) }),
  upload: async (file: File): Promise<Attachment> => {
    const form = new FormData(); form.append('file', file)
    const uploadResponse = await fetch(apiUrl('/sso/attachments'), { method: 'POST', credentials: 'include', headers: mutationHeaders(), body: form })
    if (uploadResponse.status === 401) throw new ApiError('上传文件需要先登录', 401)
    if (!uploadResponse.ok) throw new ApiError((await uploadResponse.text().catch(() => '')) || '文件上传失败', uploadResponse.status)
    const uploaded = await uploadResponse.json() as { FileId?: string; FileName?: string; ContentType?: string; Size?: number; ContentUrl?: string; DownloadUrl?: string }
    if (!uploaded.FileId) throw new ApiError('文件服务未返回文件标识', 502)
    return { FileId: uploaded.FileId, FileName: uploaded.FileName || file.name, ContentType: uploaded.ContentType || file.type || 'application/octet-stream', FileSize: uploaded.Size || file.size, ContentUrl: uploaded.ContentUrl, DownloadUrl: uploaded.DownloadUrl }
  }
}

export async function streamChat(data: ChatRequest, signal: AbortSignal, onEvent: (event: ParsedSseEvent) => void) {
  const response = await fetch(apiUrl(workspace('/chat/stream')), { method: 'POST', credentials: 'include', headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', ...mutationHeaders() }, body: JSON.stringify(data), signal })
  if (response.status === 401) throw new ApiError('业务会话需要先登录', 401)
  if (!response.ok) throw new ApiError((await response.text().catch(() => '')) || `AI 请求失败（${response.status}）`, response.status)
  if (!(response.headers.get('content-type') || '').includes('text/event-stream') || !response.body) throw new ApiError('服务端未返回 SSE 流', 502)
  const reader = response.body.getReader(); const decoder = new TextDecoder(); const parser = new SseParser()
  try {
    while (true) {
      const { value, done } = await reader.read()
      parser.push(decoder.decode(value, { stream: !done }), done).forEach(onEvent)
      if (done) break
    }
  } finally { reader.releaseLock() }
}

export async function streamPublicChat(data: PublicChatRequest, signal: AbortSignal, onEvent: (event: ParsedSseEvent) => void) {
  const response = await fetch(apiUrl('/public/chat/stream'), { method: 'POST', headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal })
  if (!response.ok) throw new ApiError((await response.text().catch(() => '')) || `AI 请求失败（${response.status}）`, response.status)
  if (!(response.headers.get('content-type') || '').includes('text/event-stream') || !response.body) throw new ApiError('服务端未返回 SSE 流', 502)
  const reader = response.body.getReader(); const decoder = new TextDecoder(); const parser = new SseParser()
  try {
    while (true) {
      const { value, done } = await reader.read()
      parser.push(decoder.decode(value, { stream: !done }), done).forEach(onEvent)
      if (done) break
    }
  } finally { reader.releaseLock() }
}
