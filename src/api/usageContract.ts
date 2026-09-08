/** 用量查询与展示聚合；只统计后端上报值，不在前端估算 token。 */
import type { AiUsageSummary, AiUsageSummaryRow } from '@/types/ai'

/** 后端接受的日期范围，通常为 YYYY-MM-DD；省略时采用服务端默认范围。 */
export interface UsageSummaryQuery {
  from?: string
  to?: string
}
/** 构建已登录工作区用量接口地址。 */
export const usageSummaryPath = ({ from, to }: UsageSummaryQuery = {}) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const suffix = params.toString()
  return `/workspace/usage/summary${suffix ? `?${suffix}` : ''}`
}

/** 同一模型跨日期/用户的服务商实测合计。 */
export interface UsageModelTotal {
  ModelAlias: string
  PromptTokens: number
  CompletionTokens: number
  TotalTokens: number
  MeasuredInvocations: number
}
/** 按模型合并行并以总 token 降序展示，不改变原始明细。 */
export const summarizeUsageByModel = (summary?: AiUsageSummary): UsageModelTotal[] => {
  const totals = new Map<string, UsageModelTotal>()
  for (const row of summary?.Rows || []) {
    const current = totals.get(row.ModelAlias) || {
      ModelAlias: row.ModelAlias,
      PromptTokens: 0,
      CompletionTokens: 0,
      TotalTokens: 0,
      MeasuredInvocations: 0,
    }
    current.PromptTokens += row.PromptTokens
    current.CompletionTokens += row.CompletionTokens
    current.TotalTokens += row.TotalTokens
    current.MeasuredInvocations += row.MeasuredInvocations
    totals.set(row.ModelAlias, current)
  }
  return [...totals.values()].sort((a, b) => b.TotalTokens - a.TotalTokens)
}

/** 合计当前结果集；TotalTokens 使用服务端值，不假设等于输入与输出之和。 */
export const usageTotals = (rows: AiUsageSummaryRow[]) =>
  rows.reduce(
    (result, row) => ({
      PromptTokens: result.PromptTokens + row.PromptTokens,
      CompletionTokens: result.CompletionTokens + row.CompletionTokens,
      TotalTokens: result.TotalTokens + row.TotalTokens,
      MeasuredInvocations: result.MeasuredInvocations + row.MeasuredInvocations,
    }),
    { PromptTokens: 0, CompletionTokens: 0, TotalTokens: 0, MeasuredInvocations: 0 },
  )
