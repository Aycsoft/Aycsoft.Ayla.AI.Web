import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from './chat'
import type { Message } from '@/types/ai'

const api = vi.hoisted(() => ({ messages: vi.fn(), stream: vi.fn() }))
vi.mock('@/api/ai', () => ({
  aiApi: { messages: api.messages },
  streamChat: api.stream,
  streamPublicChat: vi.fn(),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ session: { UserId: 'synthetic-user' } }),
}))
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => ({ load: vi.fn() }) }))
const answer = (Id: string): Message => ({
  Id,
  Role: 'assistant',
  Content: '合成历史',
  Status: 'error',
  ErrorCode: 'SAFE_FAILURE',
})
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

describe('历史加载失败与并发选择', () => {
  it('新会话读取被拒绝后不在新标题下显示旧会话正文或产物', async () => {
    const chat = useChatStore()
    chat.currentId = 'old'
    chat.messages = [answer('old-message')]
    chat.traces = [{ StepId: 'old', Title: '旧步骤', Status: 'completed' }]
    api.messages.mockRejectedValue(new Error('当前会话不可访问'))
    await expect(chat.select('denied')).rejects.toThrow('当前会话不可访问')
    expect(chat.messages).toEqual([])
    expect(chat.traces).toEqual([])
    expect(chat.artifacts).toEqual([])
    expect(chat.lastError).toBe('当前会话不可访问')
    expect(chat.loading).toBe(false)
    expect(api.stream).not.toHaveBeenCalled()
  })
  it('较早请求晚到不得覆盖当前选中会话', async () => {
    const chat = useChatStore()
    let first!: (items: Message[]) => void
    api.messages.mockImplementationOnce(() => new Promise((resolve) => (first = resolve)))
    api.messages.mockResolvedValueOnce([answer('second-message')])
    const old = chat.select('first')
    await chat.select('second')
    first([answer('first-message')])
    await old
    expect(chat.currentId).toBe('second')
    expect(chat.messages.map((m) => m.Id)).toEqual(['second-message'])
  })
  it('提交前准备期间也禁止切换会话，防止首次创建与发送归属改变', async () => {
    const chat = useChatStore()
    chat.currentId = 'first'
    chat.preparing = true
    await chat.select('second')
    expect(chat.currentId).toBe('first')
    expect(api.messages).not.toHaveBeenCalled()
  })
  it('读取历史失败状态不触发重新生成，错误与全部产物保留', async () => {
    const chat = useChatStore()
    const saved = {
      ...answer('saved'),
      Artifacts: [
        { ArtifactId: 'a', Type: 'image/png', Status: 'completed' },
        { ArtifactId: 'b', Type: 'docx', Status: 'completed' },
      ],
    }
    api.messages.mockResolvedValue([saved])
    await chat.select('known')
    expect(chat.messages[0]).toEqual(saved)
    expect(chat.artifacts.map((a) => a.ArtifactId)).toEqual(['a', 'b'])
    expect(api.stream).not.toHaveBeenCalled()
  })
})
