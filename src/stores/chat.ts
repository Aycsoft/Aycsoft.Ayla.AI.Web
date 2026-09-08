/** 会话状态编排：分页、选择、创建与流式请求生命周期；协议转换见 chatEvents。 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aiApi, streamChat, streamPublicChat } from '@/api/ai'
import { resolveTerminalMessageStatus } from '@/api/sse'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { createGenerationPlaceholder, settleRunningTraces } from '@/utils/streamLifecycle'
import {
  createSingleFlight,
  findReusableEmptyConversation,
  syncConversationMessageState,
} from '@/utils/emptyConversation'
import { conversationRunStatus, type ConversationRunStatus } from '@/utils/conversationRunStatus'
import { collectWorkspaceArtifacts } from '@/utils/messageAttachments'
import { createUuid } from '@/utils/uuid'
import { normalizePersistedTraceSteps } from '@/utils/executionTrace'
import { mergeConversationPages } from '@/utils/conversationHistory'
import type {
  Artifact,
  Assistant,
  Attachment,
  ChatOptions,
  Conversation,
  Message,
  ParsedSseEvent,
  TraceStep,
} from '@/types/ai'

import { createChatEventHandler, record, pick } from './chatEvents'

const conversationPageSize = 50

export const useChatStore = defineStore('chat', () => {
  // 当前工作区状态：消息属于选中会话，轨迹/产物在加载或生成时重新构建。
  const assistants = ref<Assistant[]>([])
  const conversations = ref<Conversation[]>([])
  const currentId = ref('')
  const messages = ref<Message[]>([])
  const traces = ref<TraceStep[]>([])
  const artifacts = ref<Artifact[]>([])
  const loading = ref(false)
  const streaming = ref(false)
  const generationId = ref('')
  const lastError = ref('')
  const aborter = ref<AbortController>()
  const current = computed(() => conversations.value.find((x) => x.Id === currentId.value))
  const assistant = computed(
    () => assistants.value.find((x) => x.Id === current.value?.AssistantId) || assistants.value[0],
  )
  const loginRequired = ref(false)
  const lastOptions = ref<ChatOptions>({ Mode: 'auto' })
  const activeGenerationKind = ref<'image' | 'video' | 'file' | ''>('')
  // 列表运行状态独立于当前消息，供侧栏展示后台持久化状态与本地生成状态。
  const conversationStatuses = ref<Record<string, ConversationRunStatus>>({})
  const conversationPage = ref(0)
  const conversationsHasMore = ref(false)
  const conversationsLoadingMore = ref(false)

  /** 合并分页结果并同步每个会话的运行状态，按 Id 去重。 */
  function applyConversationPage(items: Conversation[], replace: boolean) {
    conversations.value = replace
      ? mergeConversationPages([], items)
      : mergeConversationPages(conversations.value, items)
    for (const item of items) {
      const status = conversationRunStatus(item)
      if (status) conversationStatuses.value[item.Id] = status
      else delete conversationStatuses.value[item.Id]
    }
  }

  /** 同时兼容历史数组响应与带分页元数据的接口响应。 */
  async function fetchConversationPage(page: number, replace = false) {
    const response = await aiApi.conversations({ Page: page, PageSize: conversationPageSize })
    const items = Array.isArray(response) ? response : response.Items
    applyConversationPage(items, replace)
    conversationPage.value = Array.isArray(response) ? page : Number(response.Page) || page
    conversationsHasMore.value = Array.isArray(response) ? false : response.HasMore
  }

  /** 访客、加载中或已到末页时不继续请求，失败信息交给工作区展示。 */
  async function loadMoreConversations() {
    if (!useAuthStore().session || conversationsLoadingMore.value || !conversationsHasMore.value)
      return
    conversationsLoadingMore.value = true
    try {
      await fetchConversationPage(conversationPage.value + 1)
    } catch (error) {
      lastError.value = (error as Error).message
    } finally {
      conversationsLoadingMore.value = false
    }
  }

  /** 初始化账户可见助手/会话；匿名模式不请求私人历史。 */
  async function bootstrap(conversationId?: string) {
    loading.value = true
    lastError.value = ''
    try {
      if (!useAuthStore().session) {
        assistants.value = [{ Id: 'public', Name: useSettingsStore().brand, IsEnabled: 1 }]
        conversations.value = []
        conversationPage.value = 0
        conversationsHasMore.value = false
        currentId.value = ''
        messages.value = []
        loginRequired.value = false
        return
      }
      assistants.value = (await aiApi.assistants()).filter((x) => x.IsEnabled !== 0)
      conversationStatuses.value = {}
      await fetchConversationPage(1, true)
      const requested =
        conversationId && conversations.value.some((x) => x.Id === conversationId)
          ? conversationId
          : conversations.value[0]?.Id
      if (requested) await select(requested)
    } catch (error) {
      lastError.value = (error as Error).message
    } finally {
      loading.value = false
    }
  }

  /** 切换会话并从最后一条助手消息恢复轨迹；生成期间禁止切换。 */
  async function select(id: string) {
    if (streaming.value) return
    currentId.value = id
    traces.value = []
    artifacts.value = []
    lastError.value = ''
    const response = await aiApi.messages(id)
    messages.value = Array.isArray(response) ? response : response.Items
    const selectedConversation = conversations.value.find((item) => item.Id === id)
    syncConversationMessageState(selectedConversation, messages.value.length)
    const latest = [...messages.value].reverse().find((x) => x.Role === 'assistant')
    traces.value = latest?.AgentRun?.Steps?.length
      ? latest.AgentRun.Steps
      : normalizePersistedTraceSteps(latest?.ToolSteps)
    artifacts.value = collectWorkspaceArtifacts(messages.value)
  }

  /** 生成后回读服务端持久化结果，补全消息 Id、轨迹和产物。 */
  async function hydrateActiveConversation() {
    if (!currentId.value || !useAuthStore().session) return
    const response = await aiApi.messages(currentId.value)
    const persisted = Array.isArray(response) ? response : response.Items
    if (!persisted.length) return
    messages.value = persisted
    syncConversationMessageState(current.value, persisted.length)
    const latest = [...persisted].reverse().find((item) => item.Role === 'assistant')
    if (latest?.AgentRun?.Steps?.length) traces.value = latest.AgentRun.Steps
    else if (latest?.ToolSteps?.length)
      traces.value = normalizePersistedTraceSteps(latest.ToolSteps)
    artifacts.value = collectWorkspaceArtifacts(persisted)
  }

  /** 优先复用已确认无消息的会话，真正创建时附带幂等键。 */
  async function createInternal(): Promise<Conversation> {
    if (!useAuthStore().session) {
      currentId.value = ''
      messages.value = []
      traces.value = []
      artifacts.value = []
      loginRequired.value = false
      return { Id: '', AssistantId: 'public', Title: '临时对话' }
    }
    const selected = assistants.value[0]
    if (!selected) throw new Error('当前没有可用的 AI 助手')
    const reusable = await findReusableEmptyConversation(
      conversations.value,
      currentId.value,
      messages.value,
      (id) => aiApi.messages(id),
    )
    if (reusable) {
      await select(reusable.Id)
      return reusable
    }
    const conversation = await aiApi.createConversation({
      AssistantId: selected.Id,
      Title: '新会话',
      Source: 'ai-web',
      IdempotencyKey: createUuid(),
    })
    conversations.value.unshift(conversation)
    currentId.value = conversation.Id
    messages.value = []
    traces.value = []
    artifacts.value = []
    return conversation
  }

  // 创建入口合并并发点击，避免连续生成多个空白会话。
  const create = createSingleFlight(createInternal)

  /** 服务端删除成功后更新侧栏；删除当前会话时选中剩余第一项。 */
  async function remove(id: string) {
    await aiApi.deleteConversation(id)
    conversations.value = conversations.value.filter((x) => x.Id !== id)
    delete conversationStatuses.value[id]
    if (currentId.value === id) {
      currentId.value = ''
      messages.value = []
      if (conversations.value[0]) await select(conversations.value[0].Id)
    }
  }

  // 协议转换与网络生命周期分离；事件处理器共享当前 store 的响应式状态。
  const applyEvent = createChatEventHandler({ generationId, traces, artifacts, lastError })

  /**
   * 发送流程：校验权限 → 准备消息/占位轨迹 → 消费 SSE → 回读持久化 → 统一收尾。
   * 本地消息先进入响应式数组，再使用其中的代理对象接收增量，保证界面实时更新。
   */
  async function send(text: string, attachments: Attachment[], options: ChatOptions) {
    if (streaming.value || !text.trim()) return
    loginRequired.value = false
    lastOptions.value = { ...options }
    activeGenerationKind.value =
      options.ImageGeneration || options.Mode === 'imageGeneration'
        ? 'image'
        : options.VideoGeneration || options.Mode === 'videoGeneration'
          ? 'video'
          : ''
    const anonymous = !useAuthStore().session
    if (anonymous && attachments.length) {
      loginRequired.value = true
      throw new Error('上传文件需要先登录')
    }
    if (!currentId.value) await create()
    const currentAssistant = assistant.value
    if (!currentAssistant) throw new Error('当前没有可用的 AI 助手')
    const conversationId = anonymous ? 'public' : currentId.value
    const startedAt = Date.now()
    const user: Message = {
      Id: `local-user-${startedAt}`,
      ConversationId: conversationId,
      Role: 'user',
      Content: text.trim(),
      Attachments: attachments,
      Status: 'completed',
      CreateTime: new Date(startedAt).toISOString(),
    }
    let answer: Message = {
      Id: `local-ai-${startedAt}`,
      ConversationId: conversationId,
      Role: 'assistant',
      Content: '',
      Status: 'streaming',
      CreateTime: new Date(startedAt).toISOString(),
    }
    messages.value.push(user, answer)
    const acceptedConversation = current.value
    syncConversationMessageState(
      acceptedConversation,
      Math.max(acceptedConversation?.MessageCount || 0, messages.value.length),
    )
    answer = messages.value.at(-1)!
    const generationPlaceholder = createGenerationPlaceholder()
    generationPlaceholder.StartedAtMs = startedAt
    traces.value = [generationPlaceholder]
    artifacts.value = collectWorkspaceArtifacts(messages.value)
    lastError.value = ''
    streaming.value = true
    generationId.value = ''
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
      if (anonymous)
        await streamPublicChat(
          { Message: text.trim(), InternalModelAlias: options.InternalModelAlias },
          aborter.value.signal,
          onEvent,
        )
      else
        await streamChat(
          {
            ConversationId: currentId.value,
            Message: text.trim(),
            AssistantId: current.value?.AssistantId || currentAssistant.Id,
            PageContext: {
              Path: window.location.pathname,
              Title: document.title,
              Attachments: attachments,
            },
            Options: options,
          },
          aborter.value.signal,
          onEvent,
        )
      answer.Status = resolveTerminalMessageStatus(answer.Status, answer.Content)
      answer.TotalDurationMs ??= Math.max(0, Date.now() - startedAt)
      if (answer.Status === 'error' && !answer.ErrorMessage) {
        answer.ErrorMessage =
          '服务端已结束本次请求，但没有返回可显示的内容。请重试或检查模型健康状态。'
        lastError.value = answer.ErrorMessage
      }
      const conversation = current.value
      if (conversation?.Title === '新会话') conversation.Title = text.trim().slice(0, 30)
      // 回读属于补充同步，失败时保留已收到的流式内容，不覆盖成功回答。
      if (!anonymous) await hydrateActiveConversation().catch(() => undefined)
    } catch (error) {
      if ((error as Error).name === 'AbortError') answer.Status = 'stopped'
      else {
        answer.Status = 'error'
        answer.ErrorMessage = (error as Error).message
        lastError.value = (error as Error).message
      }
      settleRunningTraces(traces.value, answer.Status === 'stopped' ? 'cancelled' : 'failed')
    } finally {
      answer.TotalDurationMs ??= Math.max(0, Date.now() - startedAt)
      settleRunningTraces(
        traces.value,
        answer.Status === 'error'
          ? 'failed'
          : answer.Status === 'stopped'
            ? 'cancelled'
            : 'completed',
      )
      streaming.value = false
      aborter.value = undefined
      activeGenerationKind.value = ''
      if (!anonymous)
        conversationStatuses.value[currentId.value] =
          answer.Status === 'error'
            ? 'failed'
            : answer.Status === 'stopped'
              ? 'stopped'
              : 'succeeded'
    }
  }

  /** 先中止本地接收，再尽力通知服务端；停止请求失败不恢复已停止的界面。 */
  async function stop() {
    const pending = [...messages.value]
      .reverse()
      .find((x) => x.Role === 'assistant' && x.Status === 'streaming')
    if (pending) pending.Status = 'stopped'
    traces.value
      .filter((x) => x.Status === 'running')
      .forEach((x) => {
        x.Status = 'cancelled'
      })
    aborter.value?.abort()
    streaming.value = false
    if (currentId.value) conversationStatuses.value[currentId.value] = 'stopped'
    const activeGenerationId = generationId.value
    if (activeGenerationId) void aiApi.stop(activeGenerationId).catch(() => undefined)
  }

  /** 移除最近一轮本地消息后，使用原附件和选项重新发送。 */
  async function retry() {
    const lastUser = [...messages.value].reverse().find((x) => x.Role === 'user')
    if (!lastUser) return
    if (messages.value.at(-1)?.Role === 'assistant') messages.value.pop()
    messages.value.pop()
    await send(lastUser.Content, lastUser.Attachments || [], { ...lastOptions.value })
  }

  return {
    assistants,
    conversations,
    conversationStatuses,
    conversationsHasMore,
    conversationsLoadingMore,
    currentId,
    messages,
    traces,
    artifacts,
    loading,
    streaming,
    lastError,
    loginRequired,
    activeGenerationKind,
    current,
    assistant,
    bootstrap,
    loadMoreConversations,
    select,
    create,
    remove,
    send,
    stop,
    retry,
  }
})
