import type { Citation, TraceStep } from '@/types/ai'
import { sanitizeReasoningText } from '@/utils/reasoningSafety'

export type ExecutionStepKind = 'thought' | 'search' | 'read' | 'tool'

const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'blocked', 'skipped'])

export function executionStepKind(step: TraceStep): ExecutionStepKind {
  const code = (step.ToolCode || '').toLowerCase()
  if (!code || code.includes('reason') || code.includes('response_generation') || code.includes('response_recovery')) return 'thought'
  if (code.includes('web_search') || code.includes('search_web') || code === 'search') return 'search'
  if (code.includes('attachment-read') || code.includes('web_read') || code.includes('read_page') || code.includes('web_fetch') || code.includes('crawl') || code.includes('fetch_url')) return 'read'
  return 'tool'
}

export function executionStepLabel(step: TraceStep): string {
  const kind = executionStepKind(step)
  const code = (step.ToolCode || '').toLowerCase()
  const publicText = `${step.Title || ''} ${step.Detail || ''}`
  if (kind === 'search') return 'Search'
  if (kind === 'read') return step.ToolCode?.toLowerCase().includes('attachment') ? 'Read File' : 'Read Page'
  if (kind === 'thought') return step.Status === 'running' ? '正在分析' : '分析完成'
  if (code.includes('evidence_verification')) return 'Verify'
  if (code.includes('answer_synthesis')) return 'Answer'
  if (code.includes('research_planning') || code.includes('intent_planning')) return 'Plan'
  if (code.includes('research_followup')) return 'Search'
  if (/权限|访问校验|access/i.test(publicText)) return 'Access'
  if (/话题|意图|分类|classif/i.test(publicText)) return 'Analyze'
  if (/计划|规划|plan/i.test(publicText)) return 'Plan'
  if (/文档|文件|document|artifact/i.test(publicText)) return 'Create File'
  return 'Tool'
}

export function executionStepSummary(step: TraceStep): string {
  const kind = executionStepKind(step)
  if (kind === 'thought') return step.Status === 'running' ? '正在理解问题并组织回答' : '已完成问题分析与回答组织'
  if (kind === 'search' && step.Status === 'running') return '正在检索并核验公开信息'
  if (kind === 'tool' && step.ToolCode && step.Title.trim().toLowerCase() === step.ToolCode.trim().toLowerCase()) return step.Status === 'running' ? '正在执行授权操作' : '授权操作已完成'
  return sanitizeReasoningText(step.Detail || step.Title || (step.Status === 'running' ? '正在执行' : '执行完成'))
}

export function executionResultCount(step: TraceStep, sources: Citation[] = []): number | undefined {
  if (executionStepKind(step) !== 'search') return undefined
  const match = `${step.Title || ''} ${step.Detail || ''}`.match(/(\d+)\s*(?:条|个)\s*(?:互联网|网页|搜索|可核验|证据|结果|来源)?/)
  return match ? Number(match[1]) : sources.length || undefined
}

export function executionElapsedMs(step: TraceStep, now: number): number {
  if (terminalStatuses.has(step.Status) && step.ElapsedMs != null) return Math.max(0, step.ElapsedMs)
  if (step.Status === 'running' && step.StartedAtMs) return Math.max(step.ElapsedMs || 0, now - step.StartedAtMs)
  return Math.max(0, step.ElapsedMs || 0)
}

const value = (source: Record<string, unknown>, pascal: string, camel: string) => source[pascal] ?? source[camel]

export function normalizePersistedTraceSteps(steps?: Array<Record<string, unknown>>): TraceStep[] {
  return (steps || []).map((source, index) => ({
    StepId: String(value(source, 'InvocationId', 'invocationId') || value(source, 'StepId', 'stepId') || `history-step-${index}`),
    ToolCode: String(value(source, 'ToolCode', 'toolCode') || '') || undefined,
    Title: String(value(source, 'Message', 'message') || value(source, 'Title', 'title') || '执行步骤'),
    Detail: String(value(source, 'Detail', 'detail') || '') || undefined,
    Status: normalizeStatus(String(value(source, 'Stage', 'stage') || value(source, 'Status', 'status') || 'completed')),
    Progress: numberValue(value(source, 'Progress', 'progress')),
    ElapsedMs: numberValue(value(source, 'ElapsedMs', 'elapsedMs'))
  }))
}

function normalizeStatus(status: string): TraceStep['Status'] {
  const normalized = status.toLowerCase()
  if (['queued', 'running', 'waiting_user', 'approval_required', 'blocked', 'completed', 'failed', 'cancelled', 'skipped'].includes(normalized)) return normalized as TraceStep['Status']
  return normalized === 'started' || normalized === 'progress' ? 'running' : 'completed'
}

function numberValue(input: unknown): number | undefined {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}
