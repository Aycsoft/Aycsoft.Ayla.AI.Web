export interface ApiEnvelope<T> { Status?: number; Item?: T; Message?: string }
export interface Assistant { Id: string; Name: string; Icon?: string; WelcomeMessage?: string; QuickQuestions?: string[]; Description?: string; IsEnabled?: number }
export interface AISettings { Id?: string; Name: string; CompanyName: string; Subtitle: string; LogoFileId?: string; AuthorChineseName?: string; AuthorName?: string; AuthorEnglishName?: string; WelcomeMessage: string; QuickQuestions: string[] }
export interface Conversation { Id: string; AssistantId: string; AssistantName?: string; Title: string; IsEmpty?: boolean; MessageCount?: number; LastRunStatus?: string; GenerationStatus?: string; CreateTime?: string; UpdateTime?: string }
export interface ConversationPage { Items: Conversation[]; Total: number; Page: number; PageSize: number; HasMore: boolean }
export interface Attachment { FileId: string; FileName: string; ContentType?: string; FileSize?: number; ContentUrl?: string; DownloadUrl?: string; FileUrl?: string; PreviewUrl?: string }
export interface Citation { DocumentId?: string; DocumentName?: string; Title?: string; Url?: string; URL?: string; SourceUrl?: string; Uri?: string; Section?: string; Page?: number; Score?: number; FileId?: string; ContentUrl?: string; DownloadUrl?: string; Snippet?: string; Engine?: string; PublishedAt?: string }
export interface Artifact { ArtifactId: string; Type: string; FileId?: string; FileName: string; Status: string; ContentUrl?: string; PreviewUrl?: string; DownloadUrl?: string; Size?: number; Version?: number }
export type StepStatus = 'queued' | 'running' | 'waiting_user' | 'approval_required' | 'blocked' | 'completed' | 'failed' | 'cancelled' | 'skipped'
export interface TraceStep { StepId: string; Title: string; Detail?: string; Status: StepStatus; Progress?: number; ElapsedMs?: number; ToolCode?: string; Retryable?: boolean; StartedAtMs?: number }
export interface Message { Id: string; ConversationId?: string; Role: 'user' | 'assistant' | 'system'; Content: string; Status?: string; ErrorMessage?: string; CreateTime?: string; SequenceNo?: number; Attachments?: Attachment[]; PageContext?: { Attachments?: Attachment[] }; Citations?: Citation[]; WebSources?: Citation[]; ToolSteps?: Array<Record<string, unknown>>; AgentRun?: { RunId?: string; Status?: string; Steps?: TraceStep[]; Artifacts?: Artifact[] }; Artifacts?: Artifact[]; TotalDurationMs?: number; FirstTokenDurationMs?: number; GenerationStatus?: string; InputTokens?: number | null; OutputTokens?: number | null; Model?: string | null }
export interface MessagePage { Items: Message[]; HasMore: boolean; OldestSequence?: number }
export interface ChatOptions { Mode: 'auto' | 'deepThinking' | 'webSearch' | 'imageRecognition' | 'imageGeneration' | 'videoGeneration'; DeepThinking?: boolean; WebSearch?: boolean; ImageRecognition?: boolean; ImageGeneration?: boolean; VideoGeneration?: boolean; VideoDurationSeconds?: number; VideoAspectRatio?: string; InternalModelAlias?: string; ProviderId?: string; ModelId?: string; AllowFreeModel?: boolean }
export interface ChatRequest { ConversationId: string; Message: string; AssistantId: string; PageContext?: { Path: string; Title?: string; Attachments?: Attachment[] }; Options?: ChatOptions; Provider?: string; Model?: string }
export interface PublicChatRequest { Message: string; InternalModelAlias?: string }
export type StreamEventName = 'meta' | 'delta' | 'citation' | 'web-source' | 'tool' | 'error' | 'done' | 'agent' | 'run.started' | 'plan.proposed' | 'step.started' | 'step.progress' | 'step.completed' | 'step.failed' | 'step.cancelled' | 'step.blocked' | 'step.skipped' | 'artifact.ready' | 'artifact.failed' | 'run.completed' | 'run.failed' | 'run.cancelled'
export interface ParsedSseEvent { event: string; id?: string; data: unknown }
export interface KnowledgeDocument { Id: string; Name: string; FileId: string; FileName?: string; DocumentType?: string; ParseStatus?: string; IndexStatus?: string; ChunkCount?: number; IsEnabled?: number; UpdateTime?: string }
export interface PersonalKnowledgeDocument { Id: string; FileId: string; FileName: string; ContentType: string; Status: string; ChunkCount: number; ErrorMessage?: string; IsEnabled: boolean; CreatedTime: string; UpdatedTime: string }
export interface UserSkill { Id: string; UserId: string; Name: string; Description?: string; Instructions: string; IsEnabled: boolean; CreatedTime: string; UpdatedTime: string }
export interface MarkdownNote { Id: string; UserId: string; Title: string; ContentMarkdown: string; Tags: string[]; CreatedTime: string; UpdatedTime: string }
export type WorkspaceAccountType = 'internal' | 'external'
export interface WorkspaceSession { Authenticated: boolean; UserId?: string; UserName?: string; Email?: string; TenantId?: string; AccountType?: WorkspaceAccountType; HasPassword?: boolean; AvatarFileId?: string; AvatarContentUrl?: string; AvatarDownloadUrl?: string; Permissions: string[]; ExpiresAt?: string }
export interface SsoExchangeResult { ConversationId?: string; ExpiresAt: string; SessionCheckAfterSeconds: number }
export type ExternalAuthScene = 'login' | 'register' | 'reset-password'
export interface ExternalAuthCodeRequest { Email: string; Purpose: ExternalAuthScene }
export interface ExternalAuthLoginRequest { Email: string; Code: string }
export interface ExternalAuthRegisterRequest { DisplayName: string; Email: string; Code: string; Purposes: string[]; OtherPurpose?: string; Password?: string }
export interface ExternalPasswordLoginRequest { Email: string; Password: string }
export interface ExternalPasswordSetRequest { CurrentPassword?: string; NewPassword: string }
export interface ExternalPasswordResetRequest { Email: string; Code: string; NewPassword: string }
export interface ExternalProfileUpdateRequest { DisplayName: string; AvatarFileId?: string }
export type ExternalAuthResult = WorkspaceSession
export interface AiModelDefinition { Id: string; ProviderId: string; UpstreamModelId: string; InternalAlias: string; DisplayName: string; IsFree: boolean; Health: string; TestOnly: boolean; IsEnabled: boolean; SupportsStreaming: boolean; SupportsToolCalling: boolean }
export interface WorkspaceModel { InternalAlias: string; SelectionAlias?: string; DisplayName: string; BestFor: string; IsFree: boolean; SupportsReasoning: boolean; SupportsStreaming: boolean; SupportsToolCalling: boolean; SupportsFiles: boolean; SupportsImageGeneration: boolean; SupportsVideoGeneration: boolean; InputModalities: string[]; OutputModalities: string[]; Available: boolean; IsDefault: boolean; Health: string }
export interface AiUsageSummaryRow { UserId: string; UsageDate: string; ModelAlias: string; PromptTokens: number; CompletionTokens: number; TotalTokens: number; MeasuredInvocations: number }
export interface AiUsageSummary { From: string; To: string; Measurement: 'provider-reported' | string; Rows: AiUsageSummaryRow[] }
