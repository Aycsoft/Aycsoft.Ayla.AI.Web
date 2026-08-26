import { describe, expect, it } from 'vitest'
import { createGenerationPlaceholder, generationPlaceholderId, removeGenerationPlaceholder, settleRunningTraces, updateGenerationPlaceholder } from './streamLifecycle'

describe('stream lifecycle', () => {
  it('uses one stable placeholder while connecting and answering', () => {
    const traces = [createGenerationPlaceholder()]
    updateGenerationPlaceholder(traces, '正在生成回答')
    expect(traces).toHaveLength(1)
    expect(traces[0]).toMatchObject({ StepId: generationPlaceholderId, Title: '正在生成回答', Status: 'running' })
  })

  it('replaces the placeholder when real agent steps arrive', () => {
    const traces = [createGenerationPlaceholder(), { StepId: 'plan', Title: '计划', Status: 'completed' as const }]
    removeGenerationPlaceholder(traces)
    expect(traces.map(item => item.StepId)).toEqual(['plan'])
  })

  it('settles every pending spinner at terminal state', () => {
    const traces = [createGenerationPlaceholder(), { StepId: 'tool', Title: '工具', Status: 'running' as const }, { StepId: 'done', Title: '完成', Status: 'completed' as const }]
    settleRunningTraces(traces, 'failed')
    expect(traces.map(item => item.Status)).toEqual(['failed', 'failed', 'completed'])
  })
})
