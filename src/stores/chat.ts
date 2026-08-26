import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aiApi, streamChat, streamPublicChat } from '@/api/ai'
import { resolveTerminalMessageStatus, unwrapAgentEvent } from '@/api/sse'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { createGenerationPlaceholder, removeGenerationPlaceholder, settleRunningTraces, updateGenerationPlaceholder } from '@/utils/streamLifecycle'
import { createSingleFlight, findReusableEmptyConversation } from '@/utils/emptyConversation'
import { conversationRunStatus, type ConversationRunStatus } from '@/utils/conversationRunStatus'
import type { Artifact, Assistant, Attachment, ChatOptions, Conversation, Message, ParsedSseEvent, TraceStep } from '@/types/ai'

const record = (data: unknown) => (data && typeof data === 'object' ? data as Record<string, any> : {})
const pick = (data: Record<string, any>, pascal: string, camel: string) => data[pascal] ?? data[camel]

export const useChatStore = defineStore('chat', () => {
  const assistants = ref<Assistant[]>([]); const conversations = ref<Conversation[]>([])
  const currentId = ref(''); const messages = ref<Message[]>([]); const traces = ref<TraceStep[]>([]); const artifacts = ref<Artifact[]>([])
  const loading = ref(false); const streaming = ref(false); const generationId = ref(''); const lastError = ref('')
  const aborter = ref<AbortController>(); const current = computed(() => conversations.value.find(x => x.Id === currentId.value))
  const assistant = computed(() => assistants.value.find(x => x.Id === current.value?.AssistantId) || assistants.value[0])
  const loginRequired = ref(false)
  const lastOptions = ref<ChatOptions>({ Mode: 'auto' })
  const activeGenerationKind = ref<'image' | 'video' | 'file' | ''>('')
  const conversationStatuses = ref<Record<string, ConversationRunStatus>>({})

  async function bootstrap(conversationId?: string) {
    loading.value = true; lastError.value = ''
    try {
      if (!useAuthStore().session) {
        assistants.value = [{ Id: 'public', Name: useSettingsStore().brand, IsEnabled: 1 }]
        conversations.value = []; currentId.value = ''; messages.value = []; loginRequired.value = false
        return
      }
      assistants.value = (await aiApi.assistants()).filter(x => x.IsEnabled !== 0)
      const response = await aiApi.conversations({ Page: 1, PageSize: 100 })
      conversations.value = Array.isArray(response) ? response : response.Items
      conversationStatuses.value = Object.fromEntries(conversations.value.map(item => [item.Id, conversationRunStatus(item)]).filter((entry): entry is [string, ConversationRunStatus] => Boolean(entry[1])))
      const requested = conversationId && conversations.value.some(x => x.Id === conversationId) ? conversationId : conversations.value[0]?.Id
      if (requested) await select(requested)
    } catch (error) { lastError.value = (error as Error).message }
    finally { loading.value = false }
  }

  async function select(id: string) {
    if (streaming.value) return
    currentId.value = id; traces.value = []; artifacts.value = []; lastError.value = ''
    const response = await aiApi.messages(id)
    messages.value = Array.isArray(response) ? response : response.Items
    const latest = [...messages.value].reverse().find(x => x.Role === 'assistant')
    traces.value = latest?.AgentRun?.Steps || []
    artifacts.value = messages.value.flatMap(message => message.Role === 'assistant'
      ? [...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])]
      : []).filter((item, index, all) => all.findIndex(candidate => candidate.ArtifactId === item.ArtifactId) === index)
  }

  async function hydrateActiveConversation() {
    if (!currentId.value || !useAuthStore().session) return
    const response = await aiApi.messages(currentId.value)
    const persisted = Array.isArray(response) ? response : response.Items
    if (!persisted.length) return
    messages.value = persisted
    const latest = [...persisted].reverse().find(item => item.Role === 'assistant')
    if (latest?.AgentRun?.Steps?.length) traces.value = latest.AgentRun.Steps
    artifacts.value = persisted.flatMap(message => message.Role === 'assistant'
      ? [...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])]
      : []).filter((item, index, all) => all.findIndex(candidate => candidate.ArtifactId === item.ArtifactId) === index)
  }

  async function createInternal(): Promise<Conversation> {
    if (!useAuthStore().session) {
      currentId.value = ''; messages.value = []; traces.value = []; artifacts.value = []; loginRequired.value = false
      return { Id: '', AssistantId: 'public', Title: '临时对话' }
    }
    const selected = assistants.value[0]
    if (!selected) throw new Error('当前没有可用的 AI 助手')
    const reusable = await findReusableEmptyConversation(conversations.value, currentId.value, messages.value, id => aiApi.messages(id))
    if (reusable) { await select(reusable.Id); return reusable }
    const conversation = await aiApi.createConversation({
      AssistantId: selected.Id,
      Title: '新会话',
      Source: 'ai-web',
      IdempotencyKey: crypto.randomUUID()
    })
    conversations.value.unshift(conversation); currentId.value = conversation.Id; messages.value = []; traces.value = []; artifacts.value = []
    return conversation
  }

  const create = createSingleFlight(createInternal)

  async function remove(id: string) {
    await aiApi.deleteConversation(id); conversations.value = conversations.value.filter(x => x.Id !== id)
    delete conversationStatuses.value[id]
    if (currentId.value === id) { currentId.value = ''; messages.value = []; if (conversations.value[0]) await select(conversations.value[0].Id) }
  }

  function applyEvent(event: ParsedSseEvent, assistantMessage: Message) {
    if (assistantMessage.Status === 'stopped') return
    event = unwrapAgentEvent(event)
    const data = record(event.data)
    if (event.event === 'meta') generationId.value = String(pick(data, 'GenerationId', 'generationId') || '')
    else if (event.event === 'delta' || event.event === 'message.delta') {
      assistantMessage.Content += String(pick(data, 'Content', 'content') || (typeof event.data === 'string' ? event.data : ''))
      updateGenerationPlaceholder(traces.value, '正在生成回答', '内容正在实时返回')
    }
    else if (event.event === 'citation' || event.event === 'web-source') (assistantMessage.Citations ||= []).push(data)
    else if (event.event === 'tool') {
      removeGenerationPlaceholder(traces.value)
      const invocation = String(pick(data, 'InvocationId', 'invocationId') || pick(data, 'ToolCode', 'toolCode') || crypto.randomUUID())
      const stage = String(pick(data, 'Stage', 'stage') || 'started')
      const existing = traces.value.find(x => x.StepId === invocation)
      const patch: TraceStep = { StepId: invocation, Title: String(pick(data, 'Message', 'message') || pick(data, 'ToolCode', 'toolCode') || '执行只读业务工具'), ToolCode: pick(data, 'ToolCode', 'toolCode'), Status: stage === 'completed' ? 'completed' : stage === 'failed' ? 'failed' : 'running', ElapsedMs: Number(pick(data, 'ElapsedMs', 'elapsedMs') || 0) || undefined }
      existing ? Object.assign(existing, patch) : traces.value.push(patch)
    } else if (event.event === 'run.started') {
      updateGenerationPlaceholder(traces.value, '正在分析任务', '已接收请求，正在组织执行步骤')
    } else if (event.event === 'plan.proposed') {
      if (!traces.value.some(x => x.StepId === 'plan')) traces.value.push({ StepId: 'plan', Title: '执行计划已生成', Status: 'completed' })
    } else if (event.event.startsWith('step.')) {
      removeGenerationPlaceholder(traces.value)
      const payload = record(pick(data, 'Data', 'data') || data); const id = String(pick(payload, 'StepId', 'stepId') || event.id || crypto.randomUUID())
      const eventStatus = event.event.slice('step.'.length)
      const terminalStatuses = ['completed', 'failed', 'cancelled', 'blocked', 'skipped']
      const status = (terminalStatuses.includes(eventStatus) ? eventStatus : 'running') as TraceStep['Status']
      const step: TraceStep = { StepId: id, Title: String(pick(payload, 'Title', 'title') || 'Agent 执行步骤'), Detail: pick(payload, 'Detail', 'detail'), Status: status, Progress: Number(pick(payload, 'Progress', 'progress') || 0) || undefined, ElapsedMs: Number(pick(payload, 'ElapsedMs', 'elapsedMs') || 0) || undefined }
      const existing = traces.value.find(x => x.StepId === id); existing ? Object.assign(existing, step) : traces.value.push(step)
    } else if (event.event === 'artifact.ready') {
      const payload = record(pick(data, 'Data', 'data') || data); const item = payload.Artifact || payload.artifact || payload
      const artifact = item as Artifact
      if (artifact.ArtifactId) {
        if (!artifacts.value.some(x => x.ArtifactId === artifact.ArtifactId)) artifacts.value.push(artifact)
        const messageArtifacts = (assistantMessage.Artifacts ||= [])
        const existing = messageArtifacts.find(x => x.ArtifactId === artifact.ArtifactId)
        existing ? Object.assign(existing, artifact) : messageArtifacts.push(artifact)
      }
    } else if (event.event === 'error' || event.event === 'run.failed') {
      const failure = String(pick(data, 'Message', 'message') || pick(data, 'ErrorCode', 'errorCode') || pick(record(pick(data, 'Data', 'data')), 'Message', 'message') || 'AI 执行失败')
      lastError.value = failure
      assistantMessage.ErrorMessage = failure
      assistantMessage.Status = 'error'
      settleRunningTraces(traces.value, 'failed')
    } else if (event.event === 'done' || event.event === 'run.completed' || event.event === 'run.cancelled') {
      const payload = record(pick(data, 'Data', 'data') || data)
      assistantMessage.Id = String(pick(payload, 'MessageId', 'messageId') || assistantMessage.Id)
      const final = pick(payload, 'Content', 'content'); if (final && !assistantMessage.Content) assistantMessage.Content = String(final)
      if (assistantMessage.Status !== 'error') assistantMessage.Status = event.event.includes('cancel') ? 'stopped' : 'completed'
      settleRunningTraces(traces.value, event.event.includes('cancel') ? 'cancelled' : 'completed')
    }
  }

  async function send(text: string, attachments: Attachment[], options: ChatOptions) {
    if (streaming.value || !text.trim()) return
    loginRequired.value = false
    lastOptions.value = { ...options }
    activeGenerationKind.value = options.ImageGeneration || options.Mode === 'imageGeneration'
      ? 'image'
      : options.VideoGeneration || options.Mode === 'videoGeneration' ? 'video' : ''
    const anonymous = !useAuthStore().session
    if (anonymous && attachments.length) { loginRequired.value = true; throw new Error('上传文件需要先登录') }
    if (!currentId.value) await create()
    const currentAssistant = assistant.value
    if (!currentAssistant) throw new Error('当前没有可用的 AI 助手')
    const conversationId = anonymous ? 'public' : currentId.value
    const startedAt = Date.now()
    const user: Message = { Id: `local-user-${startedAt}`, ConversationId: conversationId, Role: 'user', Content: text.trim(), Attachments: attachments, Status: 'completed', CreateTime: new Date(startedAt).toISOString() }
    let answer: Message = { Id: `local-ai-${startedAt}`, ConversationId: conversationId, Role: 'assistant', Content: '', Status: 'streaming', CreateTime: new Date(startedAt).toISOString() }
    messages.value.push(user, answer)
    answer = messages.value.at(-1)!
    traces.value = [createGenerationPlaceholder()]; artifacts.value = []; lastError.value = ''; streaming.value = true; generationId.value = ''
    if (!anonymous) conversationStatuses.value[currentId.value] = 'running'
    aborter.value = new AbortController()
    try {
      const onEvent = (event: ParsedSseEvent) => {
        if (event.event === 'auth-required') {
          loginRequired.value = true
          const data = record(event.data)
          answer.Content = String(pick(data, 'Message', 'message') || '该功能需要登录后使用。')
          answer.Status = 'completed'
          settleRunningTraces(traces.value, 'completed')
          return
        }
        applyEvent(event, answer)
      }
      if (anonymous) await streamPublicChat({ Message: text.trim(), InternalModelAlias: options.InternalModelAlias }, aborter.value.signal, onEvent)
      else await streamChat({ ConversationId: currentId.value, Message: text.trim(), AssistantId: currentAssistant.Id, PageContext: { Path: window.location.pathname, Title: document.title, Attachments: attachments }, Options: options }, aborter.value.signal, onEvent)
      answer.Status = resolveTerminalMessageStatus(answer.Status, answer.Content)
      answer.TotalDurationMs ??= Math.max(0, Date.now() - startedAt)
      if (answer.Status === 'error' && !answer.ErrorMessage) {
        answer.ErrorMessage = '服务端已结束本次请求，但没有返回可显示的内容。请重试或检查模型健康状态。'
        lastError.value = answer.ErrorMessage
      }
      const conversation = current.value; if (conversation?.Title === '新会话') conversation.Title = text.trim().slice(0, 30)
      if (!anonymous) await hydrateActiveConversation().catch(() => undefined)
    } catch (error) {
      if ((error as Error).name === 'AbortError') answer.Status = 'stopped'
      else { answer.Status = 'error'; answer.ErrorMessage = (error as Error).message; lastError.value = (error as Error).message }
      settleRunningTraces(traces.value, answer.Status === 'stopped' ? 'cancelled' : 'failed')
    } finally {
      answer.TotalDurationMs ??= Math.max(0, Date.now() - startedAt)
      settleRunningTraces(traces.value, answer.Status === 'error' ? 'failed' : answer.Status === 'stopped' ? 'cancelled' : 'completed')
      streaming.value = false; aborter.value = undefined
      activeGenerationKind.value = ''
      if (!anonymous) conversationStatuses.value[currentId.value] = answer.Status === 'error' ? 'failed' : answer.Status === 'stopped' ? 'stopped' : 'succeeded'
    }
  }

  async function stop() {
    const pending = [...messages.value].reverse().find(x => x.Role === 'assistant' && x.Status === 'streaming')
    if (pending) pending.Status = 'stopped'
    traces.value.filter(x => x.Status === 'running').forEach(x => { x.Status = 'cancelled' })
    aborter.value?.abort()
    streaming.value = false
    if (currentId.value) conversationStatuses.value[currentId.value] = 'stopped'
    const activeGenerationId = generationId.value
    if (activeGenerationId) void aiApi.stop(activeGenerationId).catch(() => undefined)
  }

  async function retry() {
    const lastUser = [...messages.value].reverse().find(x => x.Role === 'user')
    if (!lastUser) return
    if (messages.value.at(-1)?.Role === 'assistant') messages.value.pop()
    messages.value.pop()
    await send(lastUser.Content, lastUser.Attachments || [], { ...lastOptions.value })
  }

  return { assistants, conversations, conversationStatuses, currentId, messages, traces, artifacts, loading, streaming, lastError, loginRequired, activeGenerationKind, current, assistant, bootstrap, select, create, remove, send, stop, retry }
})
