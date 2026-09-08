/** 前后端共享传输类型；PascalCase 名称遵循现有 JSON 契约，不在页面层随意改名。 */

/** 旧版业务响应信封；成功状态为 0、1 或 200，Item 承载数据。 */
export interface ApiEnvelope<T> {
  Status?: number
  Item?: T
  Message?: string
}

/** 可访问助手目录；启用标识沿用服务端数值类型。 */
export interface Assistant {
  Id: string
  Name: string
  Icon?: string
  WelcomeMessage?: string
  QuickQuestions?: string[]
  Description?: string
  IsEnabled?: number
}

/** 公开品牌与欢迎页配置，兼容历史作者名称字段。 */
export interface AISettings {
  Id?: string
  Name: string
  CompanyName: string
  Subtitle: string
  LogoFileId?: string
  AuthorChineseName?: string
  AuthorName?: string
  AuthorEnglishName?: string
  WelcomeMessage: string
  QuickQuestions: string[]
}

/** 会话摘要；空状态来自后端，不依靠标题推断是否有消息。 */
export interface Conversation {
  Id: string
  AssistantId: string
  AssistantName?: string
  Title: string
  IsEmpty?: boolean
  MessageCount?: number
  LastRunStatus?: string
  GenerationStatus?: string
  CreateTime?: string
  UpdateTime?: string
}

/** 会话分页结果；HasMore 决定是否继续加载。 */
export interface ConversationPage {
  Items: Conversation[]
  Total: number
  Page: number
  PageSize: number
  HasMore: boolean
}

/** 上传附件元数据；URL 别名由附件工具统一转换。 */
export interface Attachment {
  FileId: string
  FileName: string
  ContentType?: string
  FileSize?: number
  ContentUrl?: string
  DownloadUrl?: string
  FileUrl?: string
  PreviewUrl?: string
}

/** 知识/检索引用；URL 字段兼容历史记录，展示前校验协议。 */
export interface Citation {
  DocumentId?: string
  DocumentName?: string
  Title?: string
  Url?: string
  URL?: string
  SourceUrl?: string
  Uri?: string
  Section?: string
  Page?: number
  Score?: number
  FileId?: string
  ContentUrl?: string
  DownloadUrl?: string
  Snippet?: string
  Engine?: string
  PublishedAt?: string
}

/** 生成产物元数据；Status 确认就绪后才可视为成功输出。 */
export interface Artifact {
  ArtifactId: string
  Type: string
  FileId?: string
  FileName: string
  Status: string
  ContentUrl?: string
  PreviewUrl?: string
  DownloadUrl?: string
  Size?: number
  Version?: number
}

/** 步骤生命周期；等待用户、等待批准与执行中分别表达。 */
export type StepStatus =
  | 'queued'
  | 'running'
  | 'waiting_user'
  | 'approval_required'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'

/** 执行步骤展示数据；ElapsedMs/StartedAtMs 单位为毫秒。 */
export interface TraceStep {
  StepId: string
  Title: string
  Detail?: string
  Status: StepStatus
  Progress?: number
  ElapsedMs?: number
  ToolCode?: string
  Retryable?: boolean
  StartedAtMs?: number
}

/** 持久化消息及可选生成详情；历史记录可能不含附件、计时或 token 字段。 */
export interface Message {
  Id: string
  ConversationId?: string
  Role: 'user' | 'assistant' | 'system'
  Content: string
  Status?: string
  ErrorMessage?: string
  CreateTime?: string
  SequenceNo?: number
  Attachments?: Attachment[]
  PageContext?: { Attachments?: Attachment[] }
  Citations?: Citation[]
  WebSources?: Citation[]
  ToolSteps?: Array<Record<string, unknown>>
  AgentRun?: { RunId?: string; Status?: string; Steps?: TraceStep[]; Artifacts?: Artifact[] }
  Artifacts?: Artifact[]
  TotalDurationMs?: number
  FirstTokenDurationMs?: number
  GenerationStatus?: string
  InputTokens?: number | null
  OutputTokens?: number | null
  Model?: string | null
}

/** 历史消息游标页；OldestSequence 用于向更早记录翻页。 */
export interface MessagePage {
  Items: Message[]
  HasMore: boolean
  OldestSequence?: number
}

/** 生成模式及能力开关；模型可用性和权限以服务端校验为准。 */
export interface ChatOptions {
  Mode:
    | 'auto'
    | 'deepThinking'
    | 'webSearch'
    | 'imageRecognition'
    | 'imageGeneration'
    | 'videoGeneration'
  DeepThinking?: boolean
  WebSearch?: boolean
  ImageRecognition?: boolean
  ImageGeneration?: boolean
  VideoGeneration?: boolean
  VideoDurationSeconds?: number
  VideoAspectRatio?: string
  InternalModelAlias?: string
  ProviderId?: string
  ModelId?: string
  AllowFreeModel?: boolean
}

/** 已登录业务会话请求；上下文附件必须引用已上传文件。 */
export interface ChatRequest {
  ConversationId: string
  Message: string
  AssistantId: string
  PageContext?: { Path: string; Title?: string; Attachments?: Attachment[] }
  Options?: ChatOptions
  Provider?: string
  Model?: string
}

/** 公开聊天请求；只提交文本与可选模型别名。 */
export interface PublicChatRequest {
  Message: string
  InternalModelAlias?: string
}

/** 已知 SSE/agent 事件集合；解析器仍保留未知事件以兼容扩展。 */
export type StreamEventName =
  | 'meta'
  | 'delta'
  | 'citation'
  | 'web-source'
  | 'tool'
  | 'error'
  | 'done'
  | 'agent'
  | 'run.started'
  | 'plan.proposed'
  | 'step.started'
  | 'step.progress'
  | 'step.completed'
  | 'step.failed'
  | 'step.cancelled'
  | 'step.blocked'
  | 'step.skipped'
  | 'artifact.ready'
  | 'artifact.failed'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled'

/** 解析后的 SSE 事件；消费方须按事件类型收窄 unknown 数据。 */
export interface ParsedSseEvent {
  event: string
  id?: string
  data: unknown
}

/** 共享知识文档及其解析、索引状态。 */
export interface KnowledgeDocument {
  Id: string
  Name: string
  FileId: string
  FileName?: string
  DocumentType?: string
  ParseStatus?: string
  IndexStatus?: string
  ChunkCount?: number
  IsEnabled?: number
  UpdateTime?: string
}

/** 个人知识文档，含异步处理状态、错误信息与时间戳。 */
export interface PersonalKnowledgeDocument {
  Id: string
  FileId: string
  FileName: string
  ContentType: string
  Status: string
  ChunkCount: number
  ErrorMessage?: string
  IsEnabled: boolean
  CreatedTime: string
  UpdatedTime: string
}

/** 个人可复用技能指令；启用技能不等于获得执行权限。 */
export interface UserSkill {
  Id: string
  UserId: string
  Name: string
  Description?: string
  Instructions: string
  IsEnabled: boolean
  CreatedTime: string
  UpdatedTime: string
}

/** 个人 Markdown 笔记；正文通过安全渲染器展示。 */
export interface MarkdownNote {
  Id: string
  UserId: string
  Title: string
  ContentMarkdown: string
  Tags: string[]
  CreatedTime: string
  UpdatedTime: string
}

/** 区分内部 ERP SSO 账号与外部注册账号。 */
export type WorkspaceAccountType = 'internal' | 'external'

/** 会话快照；未登录时用户信息可缺失，Permissions 用于前端入口控制。 */
export interface WorkspaceSession {
  Authenticated: boolean
  UserId?: string
  UserName?: string
  Email?: string
  TenantId?: string
  AccountType?: WorkspaceAccountType
  HasPassword?: boolean
  AvatarFileId?: string
  AvatarContentUrl?: string
  AvatarDownloadUrl?: string
  Permissions: string[]
  ExpiresAt?: string
}

/** 一次性授权码兑换结果；SessionCheckAfterSeconds 单位为秒。 */
export interface SsoExchangeResult {
  ConversationId?: string
  ExpiresAt: string
  SessionCheckAfterSeconds: number
}

/** 邮箱验证码用途，服务端按场景隔离校验。 */
export type ExternalAuthScene = 'login' | 'register' | 'reset-password'

/** 申请指定用途邮箱验证码的请求。 */
export interface ExternalAuthCodeRequest {
  Email: string
  Purpose: ExternalAuthScene
}

/** 邮箱验证码登录请求。 */
export interface ExternalAuthLoginRequest {
  Email: string
  Code: string
}

/** 注册资料；OtherPurpose 仅在选择 other 时提交，密码可选。 */
export interface ExternalAuthRegisterRequest {
  DisplayName: string
  Email: string
  Code: string
  Purposes: string[]
  OtherPurpose?: string
  Password?: string
}

/** 密码登录凭据；禁止记录到日志或前端持久存储。 */
export interface ExternalPasswordLoginRequest {
  Email: string
  Password: string
}

/** 首次设置/修改密码输入；有 CurrentPassword 时执行修改流程。 */
export interface ExternalPasswordSetRequest {
  CurrentPassword?: string
  NewPassword: string
}

/** 邮箱验证码重置密码请求。 */
export interface ExternalPasswordResetRequest {
  Email: string
  Code: string
  NewPassword: string
}

/** 外部账号可编辑资料；头像关联已上传文件，不传本地路径。 */
export interface ExternalProfileUpdateRequest {
  DisplayName: string
  AvatarFileId?: string
}

/** 认证结果与会话探测共用同一快照结构。 */
export type ExternalAuthResult = WorkspaceSession

/** 管理端模型配置；提供商和上游标识不可直接作为公开展示目录。 */
export interface AiModelDefinition {
  Id: string
  ProviderId: string
  UpstreamModelId: string
  InternalAlias: string
  DisplayName: string
  IsFree: boolean
  Health: string
  TestOnly: boolean
  IsEnabled: boolean
  SupportsStreaming: boolean
  SupportsToolCalling: boolean
}

/** 公开模型能力目录；SelectionAlias 为可提交选择值，Available 表示可用性。 */
export interface WorkspaceModel {
  InternalAlias: string
  SelectionAlias?: string
  DisplayName: string
  BestFor: string
  IsFree: boolean
  SupportsReasoning: boolean
  SupportsStreaming: boolean
  SupportsToolCalling: boolean
  SupportsFiles: boolean
  SupportsImageGeneration: boolean
  SupportsVideoGeneration: boolean
  InputModalities: string[]
  OutputModalities: string[]
  Available: boolean
  IsDefault: boolean
  Health: string
}

/** 按用户、日期、模型的服务商实测用量；不使用客户端字符数推算。 */
export interface AiUsageSummaryRow {
  UserId: string
  UsageDate: string
  ModelAlias: string
  PromptTokens: number
  CompletionTokens: number
  TotalTokens: number
  MeasuredInvocations: number
}

/** 用量范围与来源；Measurement 接受扩展来源字符串。 */
export interface AiUsageSummary {
  From: string
  To: string
  Measurement: 'provider-reported' | string
  Rows: AiUsageSummaryRow[]
}
