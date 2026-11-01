import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ChatRequest, Conversation, ParsedSseEvent } from '@/types/ai'
import { useChatStore } from './chat'

const api = vi.hoisted(() => ({
  stream: vi.fn(),
  publicStream: vi.fn(),
  messages: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/api/ai', () => ({
  streamChat: api.stream,
  streamPublicChat: api.publicStream,
  aiApi: { messages: api.messages, createConversation: api.create },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ session: { UserId: 'user' } }) }))
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => ({ load: vi.fn() }) }))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.stubGlobal('window', { location: { pathname: '/ai-workbench/' } })
  vi.stubGlobal('document', { title: '企业助手' })
  api.messages.mockResolvedValue([])
  api.stream.mockImplementation(
    async (
      _request: ChatRequest,
      _signal: AbortSignal,
      onEvent: (event: ParsedSseEvent) => void,
    ) => {
      onEvent({ event: 'delta', data: { Content: '已完成真实查询' } })
      onEvent({ event: 'done', data: {} })
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

function readyStore() {
  const chat = useChatStore()
  chat.assistants = [{ Id: 'assistant', Name: '企业助手' }]
  chat.currentId = 'conversation'
  chat.conversations = [{ Id: 'conversation', AssistantId: 'assistant', Title: '业务分析' }]
  return chat
}

describe('服务端自动编排的聊天合同', () => {
  it('仅发送用户问题、附件和上下文，不提交模型或模式', async () => {
    const chat = readyStore()
    const attachments = [{ FileId: 'file-1', FileName: '吊灯.jpg', ContentType: 'image/jpeg' }]
    await chat.send('找同款，再结合部门销量分析', attachments)
    expect(api.stream).toHaveBeenCalledTimes(1)
    expect(api.stream.mock.calls[0][0]).toEqual({
      ConversationId: 'conversation',
      Message: '找同款，再结合部门销量分析',
      AssistantId: 'assistant',
      PageContext: { Path: '/ai-workbench/', Title: '企业助手', Attachments: attachments },
    })
    expect(chat.preparing).toBe(false)
  })

  it('重试保留附件，旧调用方传入的模式不能重新限制服务端能力', async () => {
    const chat = readyStore()
    const attachments = [{ FileId: 'file-1', FileName: '附件.xlsx' }]
    const legacySend = chat.send as (...args: unknown[]) => Promise<void>
    await legacySend('先查库存，再搜索市场', attachments, { Mode: 'imageGeneration' })
    await chat.retry()
    expect(api.stream).toHaveBeenCalledTimes(2)
    expect(api.stream.mock.calls[1][0]).toEqual(api.stream.mock.calls[0][0])
    expect(api.stream.mock.calls[1][0]).not.toHaveProperty('Options')
    expect(chat.messages).toHaveLength(4)
  })

  it('创建会话期间阻止重复发送和重试，避免产生两次业务任务', async () => {
    const chat = readyStore()
    chat.currentId = ''
    chat.conversations = []
    let release!: (conversation: Conversation) => void
    api.create.mockImplementation(() => new Promise<Conversation>((resolve) => (release = resolve)))
    const first = chat.send('分析库存', [])
    expect(chat.preparing).toBe(true)
    await chat.send('分析库存', [])
    await chat.retry()
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1))
    release({ Id: 'new', AssistantId: 'assistant', Title: '新会话' })
    await first
    expect(api.stream).toHaveBeenCalledTimes(1)
    expect(chat.messages).toHaveLength(2)
    expect(chat.preparing).toBe(false)
  })

  it('创建失败释放提交锁，让原问题可再次提交', async () => {
    const chat = readyStore()
    chat.currentId = ''
    chat.conversations = []
    api.create.mockRejectedValue(new Error('创建失败'))
    await expect(chat.send('查库存', [])).rejects.toThrow('创建失败')
    expect(chat.preparing).toBe(false)
    expect(api.stream).not.toHaveBeenCalled()
  })

  it('只有实际正在运行的媒体工具才显示对应生成进度', () => {
    const chat = readyStore()
    expect(chat.activeGenerationKind).toBe('')
    chat.traces = [{ StepId: 'tool', Title: '生成视频', Status: 'running' }]
    expect(chat.activeGenerationKind).toBe('')
    chat.traces[0].ToolCode = 'video_generate'
    expect(chat.activeGenerationKind).toBe('video')
    chat.traces[0].Status = 'completed'
    expect(chat.activeGenerationKind).toBe('')
  })
})

it('点击旧失败只重发它之前的用户问题，并保留全部旧消息', async () => {
  const chat = readyStore()
  chat.messages = [
    { Id: 'u1', Role: 'user', Content: '第一条合成问题' },
    { Id: 'a1', Role: 'assistant', Content: '原失败', Status: 'error' },
    { Id: 'u2', Role: 'user', Content: '另一条问题' },
    { Id: 'a2', Role: 'assistant', Content: '另一结果', Status: 'completed' },
  ]
  await chat.retry('a1')
  expect(api.stream.mock.calls[0][0].Message).toBe('第一条合成问题')
  expect(chat.messages.slice(0, 4).map((item) => item.Id)).toEqual(['u1', 'a1', 'u2', 'a2'])
  expect(chat.messages).toHaveLength(6)
})

it('已有视频Job的失败不能通过通用重试再次提交', async () => {
  const chat = readyStore()
  chat.messages = [
    { Id: 'u1', Role: 'user', Content: '合成视频' },
    {
      Id: 'a1',
      Role: 'assistant',
      Content: '受理待核对',
      Status: 'error',
      ToolSteps: [{ ToolCode: 'video_generate', JobId: 'a'.repeat(32) }],
    },
  ]
  await chat.retry('a1')
  expect(api.stream).not.toHaveBeenCalled()
  expect(chat.messages).toHaveLength(2)
  expect(chat.lastError).toContain('核对同一任务')
})

it('未知消息ID不能回退成重试最新问题', async () => {
  const chat = readyStore()
  chat.messages = [
    { Id: 'u', Role: 'user', Content: '合成问题' },
    { Id: 'a', Role: 'assistant', Content: '', Status: 'error' },
  ]
  await chat.retry('unknown')
  expect(api.stream).not.toHaveBeenCalled()
})

it.each(['partial', 'incomplete'])(
  '无错误码的%s经流收尾与回读失败仍不标成功',
  async (GenerationStatus) => {
    const chat = readyStore()
    api.messages.mockRejectedValueOnce(new Error('合成回读失败'))
    api.stream.mockImplementationOnce(
      async (
        _request: ChatRequest,
        _signal: AbortSignal,
        onEvent: (event: ParsedSseEvent) => void,
      ) => {
        onEvent({ event: 'delta', data: { Content: '保留的部分结果' } })
        onEvent({ event: 'done', data: { GenerationStatus } })
      },
    )
    await chat.send('合成部分结果请求', [])
    expect(chat.messages.at(-1)?.Content).toBe('保留的部分结果')
    expect(chat.messages.at(-1)?.Status).toBe('partial')
    expect(chat.conversationStatuses.conversation).toBe('partial')
    expect(chat.streaming).toBe(false)
    expect(api.stream).toHaveBeenCalledTimes(1)
  },
)
