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
import { applySuggestedQuestions } from '@/utils/suggestedQuestions'
import { appendBusinessToolResult, normalizeClarification } from '@/utils/businessResults'
import { mergeCommerceEvent } from '@/utils/commerceStream'
import type { Artifact, Citation, Message, ParsedSseEvent, TraceStep } from '@/types/ai'

/** 兼容历史 SSE 中 PascalCase/camelCase 字段；输入不为对象时按空负载处理。 */
export const record = (data: unknown) =>
  data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
/** 优先读取正式 PascalCase 字段，缺失时兼容历史 camelCase 事件。 */
export const pick = (data: Record<string, unknown>, pascal: string, camel: string) =>
  data[pascal] ?? data[camel]

/** 未知进度保持缺失，供应商真实0%不能被truthy判断抹除。 */
const optionalProgress = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : undefined

interface ChatEventState {
  generationId: Ref<string>
  traces: Ref<TraceStep[]>
  artifacts: Ref<Artifact[]>
  lastError: Ref<string>
}

/** 每个 store 实例独立绑定事件状态，避免模块级共享导致会话间串流。 */
export function createChatEventHandler(state: ChatEventState) {
  const { generationId, traces, artifacts, lastError } = state
  // 宿主 done 与原生 artifact.ready 共用同一合并点，工作区和消息不会重复展示文件。
  const retainArtifact = (assistantMessage: Message, item: unknown) => {
    const artifact = record(item) as unknown as Artifact
    if (!artifact.ArtifactId) return
    const workspaceArtifact = artifacts.value.find((x) => x.ArtifactId === artifact.ArtifactId)
    if (workspaceArtifact) Object.assign(workspaceArtifact, artifact)
    else artifacts.value.push(artifact)
    const messageArtifacts = (assistantMessage.Artifacts ||= [])
    const existing = messageArtifacts.find((x) => x.ArtifactId === artifact.ArtifactId)
    if (existing) Object.assign(existing, artifact)
    else messageArtifacts.push(artifact)
  }
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
    } else if (event.event === 'web-source')
      assistantMessage.Citations = mergeCommerceEvent(
        assistantMessage.Citations || [],
        data as Citation,
      )
    else if (event.event === 'citation') (assistantMessage.Citations ||= []).push(data)
    else if (event.event === 'tool') {
      // 工具第一次出现记录本地开始时间，后续事件只更新同一条轨迹。
      removeGenerationPlaceholder(traces.value)
      const invocation = String(
        pick(data, 'InvocationId', 'invocationId') ||
          pick(data, 'ToolCode', 'toolCode') ||
          createUuid(),
      )
      const stage = String(pick(data, 'Stage', 'stage') || 'started')
      const resultData = pick(data, 'Data', 'data')
      if (stage === 'completed' && resultData && typeof resultData === 'object')
        appendBusinessToolResult(assistantMessage, {
          InvocationId: String(pick(data, 'InvocationId', 'invocationId') || '') || undefined,
          ToolCode: String(pick(data, 'ToolCode', 'toolCode') || ''),
          Data: resultData as Record<string, unknown>,
          NavigationActions: pick(data, 'NavigationActions', 'navigationActions') as
            import('@/types/ai').BusinessNavigation[] | undefined,
        })
      const existing = traces.value.find((x) => x.StepId === invocation)
      const patch: TraceStep = {
        StepId: invocation,
        JobId: String(pick(data, 'JobId', 'jobId') || existing?.JobId || '') || undefined,
        Title: String(
          pick(data, 'Message', 'message') ||
            pick(data, 'ToolCode', 'toolCode') ||
            '执行只读业务工具',
        ),
        ToolCode: pick(data, 'ToolCode', 'toolCode') as string | undefined,
        Status: stage === 'completed' ? 'completed' : stage === 'failed' ? 'failed' : 'running',
        Progress: optionalProgress(pick(data, 'Progress', 'progress')),
        ElapsedMs: Number(pick(data, 'ElapsedMs', 'elapsedMs') || 0) || undefined,
      }
      if (!existing && patch.Status === 'running') patch.StartedAtMs = Date.now()
      if (existing) Object.assign(existing, patch)
      else traces.value.push(patch)
    } else if (event.event === 'clarification.required') {
      assistantMessage.Clarification = normalizeClarification(
        record(pick(data, 'Data', 'data') || data),
      )
      assistantMessage.Status = 'awaiting_clarification'
      // 等待补充信息不是工具执行成功，不把正在等待的步骤改成完成。
      traces.value
        .filter((step) => ['running', 'queued'].includes(step.Status))
        .forEach((step) => {
          step.Status = 'waiting_user'
        })
    } else if (event.event === 'approval.required') {
      const payload = record(pick(data, 'Data', 'data') || data)
      assistantMessage.Approval = {
        Title: String(pick(payload, 'Title', 'title') || '执行前需要确认'),
        Description: String(pick(payload, 'Description', 'description') || ''),
      }
      assistantMessage.Status = 'awaiting_approval'
      traces.value
        .filter((step) => ['running', 'queued'].includes(step.Status))
        .forEach((step) => {
          step.Status = 'approval_required'
        })
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
        Progress: optionalProgress(pick(payload, 'Progress', 'progress')),
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
      retainArtifact(assistantMessage, item)
    } else if (event.event === 'error' || event.event === 'run.failed') {
      const failure = String(
        pick(data, 'Message', 'message') ||
          pick(data, 'ErrorCode', 'errorCode') ||
          pick(record(pick(data, 'Data', 'data')), 'Message', 'message') ||
          'AI 执行失败',
      )
      lastError.value = failure
      assistantMessage.ErrorMessage = failure
      assistantMessage.ErrorCode =
        String(
          pick(data, 'Code', 'code') ||
            pick(data, 'ErrorCode', 'errorCode') ||
            assistantMessage.ErrorCode ||
            '',
        ) || undefined
      assistantMessage.GenerationStatus = 'failed'
      assistantMessage.Status = 'error'
      assistantMessage.SuggestedQuestions = []
      settleRunningTraces(traces.value, 'failed')
    } else if (
      event.event === 'done' ||
      event.event === 'message.completed' ||
      event.event === 'run.completed' ||
      event.event === 'run.cancelled'
    ) {
      const payload = record(pick(data, 'Data', 'data') || data)
      const terminalArtifacts = pick(payload, 'Artifacts', 'artifacts')
      if (Array.isArray(terminalArtifacts))
        terminalArtifacts.forEach((item) => retainArtifact(assistantMessage, item))
      assistantMessage.Id = String(pick(payload, 'MessageId', 'messageId') || assistantMessage.Id)
      const final = pick(payload, 'Content', 'content')
      // 完整回答仅补齐尚无增量的消息，已标记失败时不能被 done 覆盖。
      if (final && !assistantMessage.Content) assistantMessage.Content = String(final)
      const terminalStatus = String(
        pick(payload, 'GenerationStatus', 'generationStatus') ||
          assistantMessage.GenerationStatus ||
          '',
      ).toLowerCase()
      // error仅标记失败，不终止SSE；done仍需接收持久ID和服务端真实耗时。
      for (const key of ['TotalDurationMs', 'FirstTokenDurationMs', 'ToolDurationMs'] as const) {
        const elapsed = pick(payload, key, key[0].toLowerCase() + key.slice(1))
        if (typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed >= 0)
          assistantMessage[key] = elapsed
      }
      assistantMessage.ErrorCode =
        String(pick(payload, 'ErrorCode', 'errorCode') || assistantMessage.ErrorCode || '') ||
        undefined
      assistantMessage.GenerationStatus =
        assistantMessage.Status === 'error'
          ? 'failed'
          : terminalStatus || assistantMessage.GenerationStatus
      const cancelled =
        event.event.includes('cancel') ||
        pick(payload, 'Cancelled', 'cancelled') === true ||
        terminalStatus === 'cancelled'
      // 部分完成是明确终态；不能因已收到正文就标为整轮完成。
      const partial = ['partial', 'incomplete'].includes(terminalStatus)
      const failed =
        Boolean(pick(payload, 'ErrorCode', 'errorCode')) ||
        ['failed', 'error'].includes(terminalStatus)
      if (
        assistantMessage.Status !== 'error' &&
        (failed ||
          cancelled ||
          !['awaiting_clarification', 'awaiting_approval'].includes(assistantMessage.Status || ''))
      )
        assistantMessage.Status = cancelled
          ? 'stopped'
          : partial
            ? 'partial'
            : failed
              ? 'error'
              : 'completed'
      applySuggestedQuestions(assistantMessage, payload)
      settleRunningTraces(
        traces.value,
        assistantMessage.Status === 'error' ? 'failed' : cancelled ? 'cancelled' : 'completed',
      )
    }
  }
}
