/** 流式生成时间线的原地状态更新；真实步骤到达后移除临时占位。 */
import type { StepStatus, TraceStep } from '@/types/ai'

/** 仅用于本地连接/回答占位的稳定标识，不作为后端步骤 ID 提交。 */
export const generationPlaceholderId = '__generation__'

/** 请求刚发出时建立占位，给用户即时反馈而非伪造执行步骤。 */
export const createGenerationPlaceholder = (): TraceStep => ({
  StepId: generationPlaceholderId,
  Title: '正在连接模型',
  Detail: '请求已发送，请稍候',
  Status: 'running',
})

/** 原地更新已有占位；不存在时不重新插入，以免覆盖真实步骤。 */
export function updateGenerationPlaceholder(traces: TraceStep[], title: string, detail?: string) {
  const placeholder = traces.find((item) => item.StepId === generationPlaceholderId)
  if (placeholder)
    Object.assign(placeholder, { Title: title, Detail: detail, Status: 'running' as const })
}

/** 原地移除占位，保持其他步骤及其顺序。 */
export function removeGenerationPlaceholder(traces: TraceStep[]) {
  const index = traces.findIndex((item) => item.StepId === generationPlaceholderId)
  if (index >= 0) traces.splice(index, 1)
}

/** 流结束时统一收口 queued/running 状态，不覆盖已完成或等待用户的步骤。 */
export function settleRunningTraces(
  traces: TraceStep[],
  status: Extract<StepStatus, 'completed' | 'failed' | 'cancelled'>,
) {
  traces
    .filter((item) => item.Status === 'running' || item.Status === 'queued')
    .forEach((item) => {
      item.Status = status
    })
}
