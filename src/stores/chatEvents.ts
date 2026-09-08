/**
 * 将服务端 SSE 协议映射为会话消息、执行轨迹与产物。
 * 只更新调用方提供的响应式状态，不负责请求、会话选择或持久化。
 */
import type { Ref } from 'vue'
import { unwrapAgentEvent } from '@/api/sse'
import {
  removeGenerationPlaceholder,
  settleRunningTraces,
  updateGenerationPlaceholder,
} from '@/utils/streamLifecycle'
import { createUuid } from '@/utils/uuid'
import type { Artifact, Message, ParsedSseEvent, TraceStep } from '@/types/ai'

/** 兼容历史 SSE 中 PascalCase/camelCase 字段；输入不为对象时按空负载处理。 */
export const record = (data: unknown) =>
  data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
/** 优先读取正式 PascalCase 字段，缺失时兼容历史 camelCase 事件。 */
export const pick = (data: Record<string, unknown>, pascal: string, camel: string) =>
  data[pascal] ?? data[camel]

interface ChatEventState {
  generationId: Ref<string>
  traces: Ref<TraceStep[]>
  artifacts: Ref<Artifact[]>
  lastError: Ref<string>
}

/** 每个 store 实例独立绑定事件状态，避免模块级共享导致会话间串流。 */
export function createChatEventHandler(state: ChatEventState) {
  const { generationId, traces, artifacts, lastError } = state
  return function applyEvent(event: ParsedSseEvent, assistantMessage: Message) {
    // 用户主动停止后的晚到事件不能重新修改内容或恢复完成状态。
    if (assistantMessage.Status === 'stopped') return
    event = unwrapAgentEvent(event)
    const data = record(event.data)
    if (event.event === 'meta')
      generationId.value = String(pick(data, 'GenerationId', 'generationId') || '')
    else if (event.event === 'delta' || event.event === 'message.delta') {
      assistantMessage.Content += String(
        pick(data, 'Content', 'content') || (typeof event.data === 'string' ? event.data : ''),
      )
      updateGenerationPlaceholder(traces.value, '正在生成回答', '内容正在实时返回')
    } else if (event.event === 'citation' || event.event === 'web-source')
      (assistantMessage.Citations ||= []).push(data)
    else if (event.event === 'tool') {
      // 工具第一次出现记录本地开始时间，后续事件只更新同一条轨迹。
      removeGenerationPlaceholder(traces.value)
      const invocation = String(
        pick(data, 'InvocationId', 'invocationId') ||
          pick(data, 'ToolCode', 'toolCode') ||
          createUuid(),
      )
      const stage = String(pick(data, 'Stage', 'stage') || 'started')
      const existing = traces.value.find((x) => x.StepId === invocation)
      const patch: TraceStep = {
        StepId: invocation,
        Title: String(
          pick(data, 'Message', 'message') ||
            pick(data, 'ToolCode', 'toolCode') ||
            '执行只读业务工具',
        ),
        ToolCode: pick(data, 'ToolCode', 'toolCode') as string | undefined,
        Status: stage === 'completed' ? 'completed' : stage === 'failed' ? 'failed' : 'running',
        ElapsedMs: Number(pick(data, 'ElapsedMs', 'elapsedMs') || 0) || undefined,
      }
      if (!existing && patch.Status === 'running') patch.StartedAtMs = Date.now()
      if (existing) Object.assign(existing, patch)
      else traces.value.push(patch)
    } else if (event.event === 'run.started') {
      updateGenerationPlaceholder(traces.value, '正在分析任务', '已接收请求，正在组织执行步骤')
    } else if (event.event === 'plan.proposed') {
      if (!traces.value.some((x) => x.StepId === 'plan'))
        traces.value.push({ StepId: 'plan', Title: '执行计划已生成', Status: 'completed' })
    } else if (event.event.startsWith('step.')) {
      // 通用 Agent 步骤可能包裹于 Data；终态以事件名为准，不依赖展示文案。
      removeGenerationPlaceholder(traces.value)
      const payload = record(pick(data, 'Data', 'data') || data)
      const id = String(pick(payload, 'StepId', 'stepId') || event.id || createUuid())
      const eventStatus = event.event.slice('step.'.length)
      const terminalStatuses = ['completed', 'failed', 'cancelled', 'blocked', 'skipped']
      const status = (
        terminalStatuses.includes(eventStatus) ? eventStatus : 'running'
      ) as TraceStep['Status']
      const step: TraceStep = {
        StepId: id,
        Title: String(pick(payload, 'Title', 'title') || 'Agent 执行步骤'),
        Detail: pick(payload, 'Detail', 'detail') as string | undefined,
        ToolCode: pick(payload, 'ToolCode', 'toolCode') as string | undefined,
        Status: status,
        Progress: Number(pick(payload, 'Progress', 'progress') || 0) || undefined,
        ElapsedMs: Number(pick(payload, 'ElapsedMs', 'elapsedMs') || 0) || undefined,
      }
      const existing = traces.value.find((x) => x.StepId === id)
      if (!existing && step.Status === 'running') step.StartedAtMs = Date.now()
      if (existing) Object.assign(existing, step)
      else traces.value.push(step)
    } else if (event.event === 'artifact.ready') {
      // 同一产物同时进入工作区与所属消息；重复 ready 通知不新增卡片。
      const payload = record(pick(data, 'Data', 'data') || data)
      const item = payload.Artifact || payload.artifact || payload
      const artifact = item as Artifact
      if (artifact.ArtifactId) {
        if (!artifacts.value.some((x) => x.ArtifactId === artifact.ArtifactId))
          artifacts.value.push(artifact)
        const messageArtifacts = (assistantMessage.Artifacts ||= [])
        const existing = messageArtifacts.find((x) => x.ArtifactId === artifact.ArtifactId)
        if (existing) Object.assign(existing, artifact)
        else messageArtifacts.push(artifact)
      }
    } else if (event.event === 'error' || event.event === 'run.failed') {
      const failure = String(
        pick(data, 'Message', 'message') ||
          pick(data, 'ErrorCode', 'errorCode') ||
          pick(record(pick(data, 'Data', 'data')), 'Message', 'message') ||
          'AI 执行失败',
      )
      lastError.value = failure
      assistantMessage.ErrorMessage = failure
      assistantMessage.Status = 'error'
      settleRunningTraces(traces.value, 'failed')
    } else if (
      event.event === 'done' ||
      event.event === 'run.completed' ||
      event.event === 'run.cancelled'
    ) {
      const payload = record(pick(data, 'Data', 'data') || data)
      assistantMessage.Id = String(pick(payload, 'MessageId', 'messageId') || assistantMessage.Id)
      const final = pick(payload, 'Content', 'content')
      // 完整回答仅补齐尚无增量的消息，已标记失败时不能被 done 覆盖。
      if (final && !assistantMessage.Content) assistantMessage.Content = String(final)
      if (assistantMessage.Status !== 'error')
        assistantMessage.Status = event.event.includes('cancel') ? 'stopped' : 'completed'
      settleRunningTraces(traces.value, event.event.includes('cancel') ? 'cancelled' : 'completed')
    }
  }
}
