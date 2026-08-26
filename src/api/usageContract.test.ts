import { describe, expect, it } from 'vitest'
import { summarizeUsageByModel, usageSummaryPath, usageTotals } from './usageContract'

describe('usage summary contract', () => {
  it('uses the authenticated workspace summary route and ISO date query', () => {
    expect(usageSummaryPath()).toBe('/workspace/usage/summary')
    expect(usageSummaryPath({ from: '2026-08-01', to: '2026-08-25' })).toBe('/workspace/usage/summary?from=2026-08-01&to=2026-08-25')
  })
  it('aggregates only provider-reported row values by model', () => {
    const Rows = [
      { UserId: 'u', UsageDate: '2026-08-24', ModelAlias: 'aycsoft-pro-2.1', PromptTokens: 10, CompletionTokens: 3, TotalTokens: 13, MeasuredInvocations: 1 },
      { UserId: 'u', UsageDate: '2026-08-25', ModelAlias: 'aycsoft-pro-2.1', PromptTokens: 7, CompletionTokens: 2, TotalTokens: 9, MeasuredInvocations: 1 }
    ]
    expect(summarizeUsageByModel({ From: '2026-08-01', To: '2026-08-25', Measurement: 'provider-reported', Rows })[0]).toMatchObject({ TotalTokens: 22, MeasuredInvocations: 2 })
    expect(usageTotals(Rows)).toEqual({ PromptTokens: 17, CompletionTokens: 5, TotalTokens: 22, MeasuredInvocations: 2 })
  })
})
