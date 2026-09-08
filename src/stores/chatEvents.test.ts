/** SSE 状态映射回归：覆盖增量、步骤合并、产物去重与终态保护。 */
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { Artifact, Message, TraceStep } from '@/types/ai'
import { createChatEventHandler } from './chatEvents'

/** 为每个用例提供独立状态，验证处理器没有共享可变数据。 */
function setup() {
  const state = {
    generationId: ref(''),
    traces: ref<TraceStep[]>([]),
    artifacts: ref<Artifact[]>([]),
    lastError: ref(''),
  }
  const message: Message = {
    Id: 'local-ai',
    ConversationId: 'conversation',
    Role: 'assistant',
    Content: '',
    Status: 'streaming',
  }
  return { state, message, apply: createChatEventHandler(state) }
}

describe('聊天事件转换', () => {
  it('兼容大小写字段和纯文本增量', () => {
    const { state, message, apply } = setup()
    apply({ event: 'meta', data: { generationId: 'generation' } }, message)
    apply({ event: 'delta', data: { Content: '你好' } }, message)
    apply({ event: 'message.delta', data: '，世界' }, message)
    expect(state.generationId.value).toBe('generation')
    expect(message.Content).toBe('你好，世界')
  })

  it('同一步骤按 Id 更新而不重复添加', () => {
    const { state, message, apply } = setup()
    apply({ event: 'step.started', data: { StepId: 'step-1', Title: '查询' } }, message)
    apply({ event: 'step.completed', data: { StepId: 'step-1', Title: '查询完成' } }, message)
    expect(state.traces.value).toHaveLength(1)
    expect(state.traces.value[0]).toMatchObject({ Status: 'completed', Title: '查询完成' })
  })

  it('产物同时关联工作区和消息，并按 ArtifactId 去重', () => {
    const { state, message, apply } = setup()
    const event = { event: 'artifact.ready', data: { ArtifactId: 'artifact-1' } }
    apply(event, message)
    apply(event, message)
    expect(state.artifacts.value).toHaveLength(1)
    expect(message.Artifacts).toHaveLength(1)
  })

  it('后续完成事件不能覆盖失败状态', () => {
    const { state, message, apply } = setup()
    apply({ event: 'error', data: { Message: '服务失败' } }, message)
    apply({ event: 'done', data: {} }, message)
    expect(message.Status).toBe('error')
    expect(state.lastError.value).toBe('服务失败')
  })

  it('用户停止后忽略晚到的增量和完成事件', () => {
    const { message, apply } = setup()
    message.Status = 'stopped'
    apply({ event: 'delta', data: '迟到内容' }, message)
    apply({ event: 'done', data: {} }, message)
    expect(message.Content).toBe('')
    expect(message.Status).toBe('stopped')
  })
})
