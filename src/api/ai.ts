/** 工作区业务 API 门面；只负责协议映射，页面反馈和状态更新留给 store/调用方。 */
import { apiUrl, mutationHeaders, query, request, ApiError } from './http'
import { SseParser } from './sse'
import type {
  AISettings,
  AiModelDefinition,
  AiUsageSummary,
  Assistant,
  Attachment,
  ChatRequest,
  Conversation,
  ConversationPage,
  ExternalAuthCodeRequest,
  ExternalAuthLoginRequest,
  ExternalAuthRegisterRequest,
  ExternalAuthResult,
  ExternalPasswordLoginRequest,
  ExternalPasswordResetRequest,
  ExternalPasswordSetRequest,
  ExternalProfileUpdateRequest,
  KnowledgeDocument,
  MarkdownNote,
  Message,
  MessagePage,
  ParsedSseEvent,
  PersonalKnowledgeDocument,
  PublicChatRequest,
  SsoExchangeResult,
  UserSkill,
  WorkspaceModel,
  WorkspaceSession,
} from '@/types/ai'
import { buildFeedbackPayload, type FeedbackPayload } from './feedbackContract'
import { usageSummaryPath, type UsageSummaryQuery } from './usageContract'
import { normalizeMessageResponse } from '@/utils/messageAttachments'

const workspace = (path: string) => `/workspace${path}`

/** 后端接口按身份、会话、个人资料及管理能力分组；所有标识进入路径前必须编码。 */
export const aiApi = {
  // 身份与公开配置：内部 SSO、外部邮箱账号使用各自会话接口。
  /** 探测当前 Cookie 会话。 */
  session: () => request<WorkspaceSession>('/sso/session'),
  /** 获取未登录也可见的模型能力目录。 */
  publicModels: () => request<WorkspaceModel[]>('/public/models'),
  /** 将 ERP 一次性授权码兑换为工作区会话。 */
  exchange: (Code: string) =>
    request<SsoExchangeResult>('/sso/exchange', { method: 'POST', body: JSON.stringify({ Code }) }),
  /** 结束内部 SSO 会话。 */
  logout: () => request<void>('/sso/logout', { method: 'POST', body: '{}' }),
  /** 按登录/注册/重置场景申请验证码，冷却时间以服务端返回为准。 */
  sendExternalAuthCode: (data: ExternalAuthCodeRequest) =>
    request<{ RetryAfterSeconds?: number }>('/external-auth/code', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 注册外部账号，原样保留调用方已校验的密码。 */
  registerExternal: (data: ExternalAuthRegisterRequest) =>
    request<ExternalAuthResult>('/external-auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 使用邮箱验证码登录。 */
  loginExternal: (data: ExternalAuthLoginRequest) =>
    request<ExternalAuthResult>('/external-auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 使用外部账号密码登录。 */
  loginExternalPassword: (data: ExternalPasswordLoginRequest) =>
    request<ExternalAuthResult>('/external-auth/password/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 有旧密码时修改，否则走首次设置接口；两种请求字段名不同。 */
  setExternalPassword: (data: ExternalPasswordSetRequest) =>
    data.CurrentPassword
      ? request<{ Changed?: boolean }>('/external-auth/password/change', {
          method: 'POST',
          body: JSON.stringify({
            CurrentPassword: data.CurrentPassword,
            NewPassword: data.NewPassword,
          }),
        })
      : request<{ Changed?: boolean }>('/external-auth/password/set', {
          method: 'POST',
          body: JSON.stringify({ Password: data.NewPassword }),
        }),
  /** 使用验证码重置密码。 */
  resetExternalPassword: (data: ExternalPasswordResetRequest) =>
    request<void>('/external-auth/password/reset', { method: 'POST', body: JSON.stringify(data) }),
  /** 更新外部账号显示名称和头像文件关联。 */
  updateExternalProfile: (data: ExternalProfileUpdateRequest) =>
    request<{ Updated?: boolean }>('/external-auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  /** 结束外部账号会话。 */
  logoutExternal: () => request<void>('/external-auth/logout', { method: 'POST', body: '{}' }),
  /** 读取公开工作区品牌、欢迎语与快捷问题配置。 */
  settings: () => request<AISettings>('/public/settings'),
  // 会话业务：兼容后端分页与历史数组响应，归一化仅发生在读边界。
  /** 获取当前账号有权使用的助手。 */
  assistants: () => request<Assistant[]>(workspace('/assistants')),
  /** 按助手、关键词分页读取会话。 */
  conversations: (params: {
    AssistantId?: string
    Keyword?: string
    Page: number
    PageSize: number
  }) =>
    request<ConversationPage | Conversation[]>(`${workspace('/conversations')}?${query(params)}`),
  /** 创建会话；幂等键由调用方提供，避免快速重复提交。 */
  createConversation: (data: {
    AssistantId: string
    Title?: string
    Source?: 'portal' | 'ai-web' | 'api'
    IdempotencyKey?: string
  }) =>
    request<Conversation>(workspace('/conversations'), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 修改会话标题。 */
  renameConversation: (id: string, Title: string) =>
    request<Conversation>(workspace(`/conversations/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      body: JSON.stringify({ Title }),
    }),
  /** 删除指定会话；交互确认由调用页面负责。 */
  deleteConversation: (id: string) =>
    request<void>(workspace(`/conversations/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  /** 按序列游标读取历史消息，同时恢复兼容版本的附件字段。 */
  messages: async (id: string, BeforeSequence?: number) =>
    normalizeMessageResponse(
      await request<MessagePage | Message[]>(
        `${workspace(`/conversations/${encodeURIComponent(id)}/messages`)}?${query({ BeforeSequence, PageSize: 100 })}`,
      ),
    ),
  /** 通知服务端停止生成；本地流 AbortSignal 由调用方另行取消。 */
  stop: (GenerationId: string) =>
    request<{ Stopped?: boolean }>(workspace('/chat/stop'), {
      method: 'POST',
      body: JSON.stringify({ GenerationId }),
    }),
  /** 请求重新生成指定会话中的回答。 */
  regenerate: (ConversationId: string, MessageId?: string) =>
    request<Message>(workspace('/chat/regenerate'), {
      method: 'POST',
      body: JSON.stringify({ ConversationId, MessageId }),
    }),
  /** 提交消息评分与独立的业务关联字段。 */
  feedback: (id: string, feedback: FeedbackPayload) =>
    request<void>(workspace(`/messages/${encodeURIComponent(id)}/feedback`), {
      method: 'POST',
      body: JSON.stringify(buildFeedbackPayload(feedback)),
    }),
  /** 获取服务商已上报的用量，不执行客户端估算。 */
  usageSummary: (params: UsageSummaryQuery = {}) =>
    request<AiUsageSummary>(usageSummaryPath(params)),
  // 知识、技能与笔记：个人资源使用 personal 命名空间。
  /** 读取共享知识文档首批数据，沿用后端 PageIndex 分页契约。 */
  documents: () =>
    request<KnowledgeDocument[]>(`${workspace('/knowledge/documents')}?PageIndex=1&PageSize=100`),
  /** 读取当前用户个人知识列表。 */
  personalKnowledge: () => request<PersonalKnowledgeDocument[]>(workspace('/personal/knowledge')),
  /** 将已上传文件登记为个人知识文档。 */
  createPersonalKnowledge: (data: { FileId: string; FileName: string; ContentType: string }) =>
    request<PersonalKnowledgeDocument>(workspace('/personal/knowledge'), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 删除个人知识关联。 */
  deletePersonalKnowledge: (id: string) =>
    request<void>(workspace(`/personal/knowledge/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  /** 读取个人技能及启用状态。 */
  skills: () => request<UserSkill[]>(workspace('/personal/skills')),
  /** 新建个人技能指令。 */
  createSkill: (data: {
    Name: string
    Description?: string
    Instructions: string
    IsEnabled: boolean
  }) =>
    request<UserSkill>(workspace('/personal/skills'), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 完整更新技能的可编辑字段。 */
  updateSkill: (
    id: string,
    data: { Name: string; Description?: string; Instructions: string; IsEnabled: boolean },
  ) =>
    request<UserSkill>(workspace(`/personal/skills/${encodeURIComponent(id)}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  /** 删除指定个人技能。 */
  deleteSkill: (id: string) =>
    request<void>(workspace(`/personal/skills/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  /** 按可选关键词查询个人笔记。 */
  notes: (keyword?: string) =>
    request<MarkdownNote[]>(`${workspace('/personal/notes')}?${query({ keyword })}`),
  /** 获取单篇笔记正文。 */
  note: (id: string) =>
    request<MarkdownNote>(workspace(`/personal/notes/${encodeURIComponent(id)}`)),
  /** 创建 Markdown 笔记，渲染安全由展示层负责。 */
  createNote: (data: { Title: string; ContentMarkdown: string; Tags: string[] }) =>
    request<MarkdownNote>(workspace('/personal/notes'), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 更新笔记标题、正文与标签。 */
  updateNote: (id: string, data: { Title: string; ContentMarkdown: string; Tags: string[] }) =>
    request<MarkdownNote>(workspace(`/personal/notes/${encodeURIComponent(id)}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  /** 删除个人笔记。 */
  deleteNote: (id: string) =>
    request<void>(workspace(`/personal/notes/${encodeURIComponent(id)}`), { method: 'DELETE' }),
  // 管理及文件接口：权限以服务端校验为准，不因前端入口隐藏而省略。
  /** 读取启用的管理模型定义。 */
  models: () =>
    request<AiModelDefinition[]>(`${workspace('/admin/providers/models')}?includeDisabled=false`),
  /** 发起真实模型探测，可能产生服务商调用用量。 */
  testModel: (data: {
    ProviderId?: string
    ModelId?: string
    InternalAlias?: string
    Message: string
    RequireToolCalling?: boolean
  }) =>
    request<Record<string, unknown>>(workspace('/admin/providers/test'), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** 上传附件；让浏览器生成 multipart boundary，并拒绝缺少文件标识的成功响应。 */
  upload: async (file: File): Promise<Attachment> => {
    const form = new FormData()
    form.append('file', file)
    const uploadResponse = await fetch(apiUrl('/sso/attachments'), {
      method: 'POST',
      credentials: 'include',
      headers: mutationHeaders(),
      body: form,
    })
    if (uploadResponse.status === 401) throw new ApiError('上传文件需要先登录', 401)
    if (!uploadResponse.ok)
      throw new ApiError(
        (await uploadResponse.text().catch(() => '')) || '文件上传失败',
        uploadResponse.status,
      )
    const uploaded = (await uploadResponse.json()) as {
      FileId?: string
      FileName?: string
      ContentType?: string
      Size?: number
      ContentUrl?: string
      DownloadUrl?: string
    }
    if (!uploaded.FileId) throw new ApiError('文件服务未返回文件标识', 502)
    return {
      FileId: uploaded.FileId,
      FileName: uploaded.FileName || file.name,
      ContentType: uploaded.ContentType || file.type || 'application/octet-stream',
      FileSize: uploaded.Size || file.size,
      ContentUrl: uploaded.ContentUrl,
      DownloadUrl: uploaded.DownloadUrl,
    }
  },
}

/** 已登录会话流；携带 Cookie 与变更标识，调用方提供取消信号和事件处理器。 */
export async function streamChat(
  data: ChatRequest,
  signal: AbortSignal,
  onEvent: (event: ParsedSseEvent) => void,
) {
  const response = await fetch(apiUrl(workspace('/chat/stream')), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...mutationHeaders(),
    },
    body: JSON.stringify(data),
    signal,
  })
  if (response.status === 401) throw new ApiError('业务会话需要先登录', 401)
  if (!response.ok)
    throw new ApiError(
      (await response.text().catch(() => '')) || `AI 请求失败（${response.status}）`,
      response.status,
    )
  await consumeSseResponse(response, onEvent)
}

/** 公开聊天流保留独立请求头与凭据策略，只共享响应消费流程。 */
export async function streamPublicChat(
  data: PublicChatRequest,
  signal: AbortSignal,
  onEvent: (event: ParsedSseEvent) => void,
) {
  const response = await fetch(apiUrl('/public/chat/stream'), {
    method: 'POST',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  })
  if (!response.ok)
    throw new ApiError(
      (await response.text().catch(() => '')) || `AI 请求失败（${response.status}）`,
      response.status,
    )
  await consumeSseResponse(response, onEvent)
}

/**
 * 统一解码、解析和 reader 清理。TextDecoder 保留跨 chunk 的 UTF-8 字节，
 * 完成时 flush 最后一段；读取/回调异常继续向上抛出，finally 始终释放 reader 锁。
 */
async function consumeSseResponse(
  response: Response,
  onEvent: (event: ParsedSseEvent) => void,
): Promise<void> {
  if (!(response.headers.get('content-type') || '').includes('text/event-stream') || !response.body)
    throw new ApiError('服务端未返回 SSE 流', 502)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parser = new SseParser()
  try {
    while (true) {
      const { value, done } = await reader.read()
      parser.push(decoder.decode(value, { stream: !done }), done).forEach(onEvent)
      if (done) break
    }
  } finally {
    reader.releaseLock()
  }
}
