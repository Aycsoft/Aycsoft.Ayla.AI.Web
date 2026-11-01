import assert from 'node:assert/strict'
import { test } from 'vitest'
import { comparisonPercent, parseSalesComparison } from './salesComparison'

const fixture = () => ({
  IsComplete: true,
  ReturnedCount: 2,
  CurrentPeriod: { StartDate: '2026-10-24T00:00:00', EndDate: '2026-10-30T00:00:00', Days: 7 },
  PreviousPeriod: { StartDate: '2026-10-10T00:00:00', EndDate: '2026-10-16T00:00:00', Days: 7 },
  Groups: [
    {
      PlatformSource: 0,
      CategoryId: '',
      CategoryName: '',
      Currency: 'USD',
      CurrentQuantity: 0,
      PreviousQuantity: 2,
      CurrentAmount: 0,
      PreviousAmount: 5,
      QuantityChange: -2,
      AmountChange: -5,
      AmountChangePercent: -100,
    },
    {
      PlatformSource: 1,
      CategoryId: 'x',
      CategoryName: '当前类目',
      Currency: 'EUR',
      CurrentQuantity: 1,
      PreviousQuantity: 0,
      CurrentAmount: 7,
      PreviousAmount: 0,
      QuantityChange: 1,
      AmountChange: 7,
      AmountChangePercent: null,
    },
  ],
  CurrencyTotals: [
    { Currency: 'USD', CurrentAmount: 0, PreviousAmount: 5, AmountChange: -5 },
    { Currency: 'EUR', CurrentAmount: 7, PreviousAmount: 0, AmountChange: 7 },
  ],
})

test('原样保留平台0、零金额、负变化、零基期和分别计价，不产生跨币种合计', () => {
  const result = parseSalesComparison(fixture())!
  assert.equal(result.Groups[0].PlatformSource, 0)
  assert.equal(result.Groups[0].CurrentAmount, 0)
  assert.equal(result.Groups[0].AmountChangePercent, -100)
  assert.equal(result.Groups[1].AmountChangePercent, null)
  assert.deepEqual(
    result.CurrencyTotals.map((row) => row.Currency),
    ['USD', 'EUR'],
  )
  assert.equal(comparisonPercent(null), '基期为 0，不计算')
  assert.equal(comparisonPercent(0), '0%')
  assert.equal(comparisonPercent(-100), '-100%')
})

test('不完整标记、错误总数、非法数字及缺失币种桶不能显示为完整统计', () => {
  for (const changed of [
    { IsComplete: false },
    { ReturnedCount: 3 },
    { CurrencyTotals: [] },
    { Groups: [{ ...fixture().Groups[0], CurrentAmount: null }, fixture().Groups[1]] },
    { Groups: [{ ...fixture().Groups[0], AmountChangePercent: null }, fixture().Groups[1]] },
    { Groups: [fixture().Groups[0], { ...fixture().Groups[1], AmountChangePercent: 0 }] },
  ])
    assert.equal(parseSalesComparison({ ...fixture(), ...changed }), undefined)
})

test('支持已验证数值1完整标记、空结果和camelCase历史，不把null变化率变成0', () => {
  const camel = JSON.parse(
    JSON.stringify(fixture()).replace(
      /"([A-Z])([^"\\]*)":/g,
      (_, first: string, rest: string) => `"${first.toLowerCase()}${rest}":`,
    ),
  )
  assert.equal(parseSalesComparison(camel)?.Groups[1].AmountChangePercent, null)
  assert.equal(parseSalesComparison({ ...fixture(), IsComplete: 1 })?.Groups.length, 2)
  assert.deepEqual(
    parseSalesComparison({ ...fixture(), ReturnedCount: 0, Groups: [], CurrencyTotals: [] })
      ?.Groups,
    [],
  )
})

test('完整500组全部保留供UI分页，501组拒绝而非截断', () => {
  const row = fixture().Groups[0]
  const result = {
    ...fixture(),
    ReturnedCount: 500,
    Groups: Array.from({ length: 500 }, (_, index) => ({ ...row, CategoryId: String(index) })),
    CurrencyTotals: [fixture().CurrencyTotals[0]],
  }
  assert.equal(parseSalesComparison(result)?.Groups.length, 500)
  assert.equal(
    parseSalesComparison({ ...result, ReturnedCount: 501, Groups: [...result.Groups, row] }),
    undefined,
  )
})
