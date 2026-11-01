/** SSE 状态映射回归：覆盖增量、步骤合并、产物去重与终态保护。 */
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { Artifact, Message, TraceStep } from '@/types/ai'
import { messageResponseNotice } from '@/utils/messagePresentation'
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
  it('持久媒体JobId在进度和未带ID的完成事件之间保留', () => {
    const { message, apply, state } = setup()
    const JobId = 'a'.repeat(32)
    apply({ event: 'tool', data: { InvocationId: 'video', Stage: 'progress', JobId } }, message)
    apply({ event: 'tool', data: { InvocationId: 'video', Stage: 'completed' } }, message)
    expect(state.traces.value[0]?.JobId).toBe(JobId)
  })

  it('工具完成事件保存每个真实调用的数据，后续工具不覆盖前面的结果', () => {
    const { message, apply } = setup()
    for (const id of ['one', 'two'])
      apply(
        {
          event: 'tool',
          data: {
            Stage: 'completed',
            InvocationId: id,
            ToolCode: 'product_lookup',
            Data: { Product: { SKU: id } },
          },
        },
        message,
      )
    expect(message.ToolResults?.map((result) => result.InvocationId)).toEqual(['one', 'two'])
  })

  it('澄清与审批事件保持真实等待状态，晚到完成事件不冒充执行完成', () => {
    const { message, apply, state } = setup()
    apply(
      { event: 'tool', data: { Stage: 'started', InvocationId: 'waiting', ToolCode: 'query' } },
      message,
    )
    apply(
      {
        event: 'clarification.required',
        data: { Title: '请选择仓库', Questions: [{ Id: 'w', Label: '仓库' }] },
      },
      message,
    )
    apply({ event: 'done', data: {} }, message)
    expect(message.Status).toBe('awaiting_clarification')
    expect(state.traces.value[0]?.Status).toBe('waiting_user')
    expect(message.Clarification?.Questions[0]?.Label).toBe('仓库')
    apply({ event: 'approval.required', data: { Title: '确认范围' } }, message)
    expect(message.Status).toBe('awaiting_approval')
    apply({ event: 'done', data: { Cancelled: true } }, message)
    expect(message.Status).toBe('stopped')
  })
  it('终态追问兼容两种字段，缺省保留而显式空数组清除', () => {
    const { message, apply } = setup()
    apply(
      { event: 'message.completed', data: { SuggestedQuestions: ['查看详情？', '查看详情?'] } },
      message,
    )
    expect(message.SuggestedQuestions).toEqual(['查看详情？'])
    apply({ event: 'done', data: {} }, message)
    expect(message.SuggestedQuestions).toEqual(['查看详情？'])
    apply({ event: 'done', data: { suggestedQuestions: [] } }, message)
    expect(message.SuggestedQuestions).toEqual([])
  })

  it.each([{ GenerationStatus: 'failed' }, { Cancelled: true }, { ErrorCode: 'provider_error' }])(
    '失败和取消终态不展示追问 %o',
    (terminal) => {
      const { message, apply } = setup()
      apply({ event: 'done', data: { ...terminal, SuggestedQuestions: ['查看详情？'] } }, message)
      expect(message.SuggestedQuestions).toEqual([])
    },
  )
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

  it('legacy和native进度均保留真实0%，未知null清除旧百分比', () => {
    for (const event of ['tool', 'step.started']) {
      const { state, message, apply } = setup()
      apply({ event, data: { StepId: 'progress', InvocationId: 'progress', Progress: 0 } }, message)
      expect(state.traces.value.at(-1)?.Progress).toBe(0)
      apply(
        { event, data: { StepId: 'progress', InvocationId: 'progress', Progress: null } },
        message,
      )
      expect(state.traces.value.at(-1)?.Progress).toBeUndefined()
    }
  })

  it('产物同时关联工作区和消息，并按 ArtifactId 去重', () => {
    const { state, message, apply } = setup()
    state.artifacts.value.push({
      ArtifactId: 'artifact-1',
      FileName: 'result.png',
      Type: 'image',
      Status: 'pending',
    })
    const event = { event: 'artifact.ready', data: { ArtifactId: 'artifact-1', Status: 'ready' } }
    apply(event, message)
    apply(event, message)
    expect(state.artifacts.value).toHaveLength(1)
    expect(state.artifacts.value[0].Status).toBe('ready')
    expect(message.Artifacts).toHaveLength(1)
  })

  it('宿主文档done保留产物，partial及原生重复事件不会删掉或复制文件', () => {
    const { state, message, apply } = setup()
    const artifact = {
      ArtifactId: 'document_generate:file-one',
      FileId: 'file-one',
      FileName: '说明.docx',
      Type: 'docx',
      Status: 'ready',
      DownloadUrl: '/api/workspace/artifacts/file-one?download=1',
    }
    apply({ event: 'artifact.ready', data: artifact }, message)
    apply(
      {
        event: 'done',
        data: { Artifacts: [artifact], GenerationStatus: 'partial', ErrorCode: 'MISSING_SOURCE' },
      },
      message,
    )
    apply({ event: 'done', data: { artifacts: [artifact] } }, message)
    expect(state.artifacts.value).toHaveLength(1)
    expect(message.Artifacts).toHaveLength(1)
    expect(message.Artifacts?.[0].FileId).toBe('file-one')
    expect(message.Status).toBe('partial')
    expect(message.ErrorCode).toBe('MISSING_SOURCE')
  })

  it('后续完成事件不能覆盖失败状态', () => {
    const { state, message, apply } = setup()
    apply({ event: 'error', data: { Message: '服务失败' } }, message)
    apply({ event: 'done', data: {} }, message)
    expect(message.Status).toBe('error')
    expect(state.lastError.value).toBe('服务失败')
  })

  it('error后done保留失败并落持久ID和服务端总耗时', () => {
    const { message, apply } = setup()
    apply({ event: 'error', data: { Code: 'AGENT_REQUEST_UNSUPPORTED', Message: '失败' } }, message)
    apply(
      {
        event: 'done',
        data: {
          MessageId: 'saved',
          TotalDurationMs: 29823,
          FirstTokenDurationMs: null,
          ToolDurationMs: 309,
          GenerationStatus: 'failed',
        },
      },
      message,
    )
    expect(message.Id).toBe('saved')
    expect(message.Status).toBe('error')
    expect(message.GenerationStatus).toBe('failed')
    expect(message.TotalDurationMs).toBe(29823)
    expect(message.ToolDurationMs).toBe(309)
    expect(message.FirstTokenDurationMs).toBeUndefined()
    expect(message.ErrorCode).toBe('AGENT_REQUEST_UNSUPPORTED')
  })

  it('只有error没有done时已是失败且不生成持久ID', () => {
    const { message, apply, state } = setup()
    apply({ event: 'tool', data: { InvocationId: 'query', Stage: 'started' } }, message)
    apply({ event: 'error', data: { Code: 'FAILED', Message: '失败' } }, message)
    expect(message.Status).toBe('error')
    expect(message.GenerationStatus).toBe('failed')
    expect(message.Id).toBe('local-ai')
    expect(state.traces.value[0]?.Status).toBe('failed')
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

describe('消息终态提示与实际事件映射', () => {
  it.each(['partial', 'incomplete'])(
    '有正文且done=%s无需刷新即可提示未完成',
    (GenerationStatus) => {
      const { message, apply } = setup()
      apply({ event: 'delta', data: '已收到的正文' }, message)
      apply({ event: 'done', data: { GenerationStatus, MessageId: 'saved' } }, message)
      expect(message.Content).toBe('已收到的正文')
      expect(message.Status).toBe('partial')
      expect(messageResponseNotice(message)?.title).toBe('回答尚未完成')
      expect(message.Id).toBe('saved')
    },
  )
  it('失败正文和实际错误同时保留，正常完成和主动停止不显示失败提示', () => {
    const { message, apply } = setup()
    apply({ event: 'delta', data: '部分内容' }, message)
    apply({ event: 'error', data: { Message: '连接已结束' } }, message)
    expect(messageResponseNotice(message)).toEqual({
      title: '本次请求未完成',
      detail: '连接已结束',
    })
    expect(message.Content).toBe('部分内容')
    expect(messageResponseNotice({ ...message, GenerationStatus: 'completed' })?.title).toBe(
      '本次请求未完成',
    )
    expect(messageResponseNotice({ ...message, Status: 'stopped' })).toBeNull()
    expect(
      messageResponseNotice({ ...message, Status: 'completed', GenerationStatus: 'completed' }),
    ).toBeNull()
  })
  it('受理未知视频仅提示核对已有任务，不把已有正文视为生成成功', () => {
    const { message, apply } = setup()
    apply({ event: 'delta', data: '保留的任务说明' }, message)
    apply(
      { event: 'error', data: { Code: 'MEDIA_SUBMISSION_UNKNOWN', Message: '受理状态未知' } },
      message,
    )
    expect(messageResponseNotice(message)?.title).toBe('视频任务状态待核对')
    expect(messageResponseNotice(message)?.detail).toContain('勿重复提交')
    expect(message.Content).toBe('保留的任务说明')
  })
})
