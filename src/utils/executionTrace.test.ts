import { describe, expect, it } from 'vitest'
import { executionElapsedMs, executionResultCount, executionStepKind, executionStepLabel, executionStepSummary, normalizePersistedTraceSteps } from './executionTrace'

describe('execution trace presentation', () => {
  it('classifies only real tool codes and never exposes private reasoning detail', () => {
    expect(executionStepKind({ StepId: '1', ToolCode: 'web_search', Title: '检索', Status: 'running' })).toBe('search')
    expect(executionStepKind({ StepId: '2', ToolCode: 'attachment-read', Title: '读取', Status: 'completed' })).toBe('read')
    expect(executionStepKind({ StepId: '2b', ToolCode: 'web_read', Title: '读取网页', Status: 'completed' })).toBe('read')
    expect(executionStepSummary({ StepId: '3', ToolCode: 'deep_reasoning', Title: '系统提示词: secret', Detail: 'private chain', Status: 'completed' })).toBe('已完成问题分析与回答组织')
    expect(executionStepSummary({ StepId: '4', ToolCode: 'private_tool_code', Title: 'private_tool_code', Status: 'running' })).toBe('正在执行授权操作')
    expect(executionStepLabel({ StepId: '5', ToolCode: 'opaque', Title: '已制定执行计划', Status: 'completed' })).toBe('Plan')
    expect(executionStepLabel({ StepId: '6', ToolCode: 'evidence_verification', Title: '已核对官方文档', Status: 'completed' })).toBe('Verify')
    expect(executionStepLabel({ StepId: '7', ToolCode: 'answer_synthesis', Title: '已组织回答', Status: 'completed' })).toBe('Answer')
  })

  it('uses the per-search result count before the final merged source count', () => {
    const step = { StepId: '1', ToolCode: 'web_search', Title: '已获得 9 条互联网证据', Status: 'completed' as const }
    expect(executionResultCount(step, [{ Title: 'A' }, { Title: 'B' }])).toBe(9)
    expect(executionResultCount(step)).toBe(9)
  })

  it('keeps elapsed time moving only for a running event', () => {
    expect(executionElapsedMs({ StepId: '1', Title: 'run', Status: 'running', StartedAtMs: 1_000 }, 3_500)).toBe(2_500)
    expect(executionElapsedMs({ StepId: '2', Title: 'done', Status: 'completed', StartedAtMs: 1_000, ElapsedMs: 800 }, 3_500)).toBe(800)
  })

  it('normalizes persisted ToolSteps without inventing steps', () => {
    const result = normalizePersistedTraceSteps([{ InvocationId: 'tool-1', ToolCode: 'web_search', Stage: 'completed', Message: '已获得 3 条互联网证据', ElapsedMs: 1200 }])
    expect(result).toEqual([{ StepId: 'tool-1', ToolCode: 'web_search', Title: '已获得 3 条互联网证据', Detail: undefined, Status: 'completed', Progress: undefined, ElapsedMs: 1200 }])
    expect(normalizePersistedTraceSteps()).toEqual([])
  })
})
