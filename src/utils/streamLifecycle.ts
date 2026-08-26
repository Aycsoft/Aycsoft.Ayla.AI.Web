import type { StepStatus, TraceStep } from '@/types/ai'

export const generationPlaceholderId = '__generation__'

export const createGenerationPlaceholder = (): TraceStep => ({
  StepId: generationPlaceholderId,
  Title: '正在连接模型',
  Detail: '请求已发送，请稍候',
  Status: 'running'
})

export function updateGenerationPlaceholder(traces: TraceStep[], title: string, detail?: string) {
  const placeholder = traces.find(item => item.StepId === generationPlaceholderId)
  if (placeholder) Object.assign(placeholder, { Title: title, Detail: detail, Status: 'running' as const })
}

export function removeGenerationPlaceholder(traces: TraceStep[]) {
  const index = traces.findIndex(item => item.StepId === generationPlaceholderId)
  if (index >= 0) traces.splice(index, 1)
}

export function settleRunningTraces(traces: TraceStep[], status: Extract<StepStatus, 'completed' | 'failed' | 'cancelled'>) {
  traces.filter(item => item.Status === 'running' || item.Status === 'queued').forEach(item => { item.Status = status })
}
