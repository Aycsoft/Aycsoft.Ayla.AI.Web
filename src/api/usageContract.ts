import type { AiUsageSummary, AiUsageSummaryRow } from '@/types/ai'

export interface UsageSummaryQuery { from?: string; to?: string }
export const usageSummaryPath = ({ from, to }: UsageSummaryQuery = {}) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const suffix = params.toString()
  return `/workspace/usage/summary${suffix ? `?${suffix}` : ''}`
}

export interface UsageModelTotal { ModelAlias: string; PromptTokens: number; CompletionTokens: number; TotalTokens: number; MeasuredInvocations: number }
export const summarizeUsageByModel = (summary?: AiUsageSummary): UsageModelTotal[] => {
  const totals = new Map<string, UsageModelTotal>()
  for (const row of summary?.Rows || []) {
    const current = totals.get(row.ModelAlias) || { ModelAlias: row.ModelAlias, PromptTokens: 0, CompletionTokens: 0, TotalTokens: 0, MeasuredInvocations: 0 }
    current.PromptTokens += row.PromptTokens
    current.CompletionTokens += row.CompletionTokens
    current.TotalTokens += row.TotalTokens
    current.MeasuredInvocations += row.MeasuredInvocations
    totals.set(row.ModelAlias, current)
  }
  return [...totals.values()].sort((a, b) => b.TotalTokens - a.TotalTokens)
}

export const usageTotals = (rows: AiUsageSummaryRow[]) => rows.reduce((result, row) => ({
  PromptTokens: result.PromptTokens + row.PromptTokens,
  CompletionTokens: result.CompletionTokens + row.CompletionTokens,
  TotalTokens: result.TotalTokens + row.TotalTokens,
  MeasuredInvocations: result.MeasuredInvocations + row.MeasuredInvocations
}), { PromptTokens: 0, CompletionTokens: 0, TotalTokens: 0, MeasuredInvocations: 0 })
