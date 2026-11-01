export interface SalesComparisonGroup {
  PlatformSource: number
  CategoryId: string
  CategoryName: string
  Currency: string
  CurrentQuantity: number
  PreviousQuantity: number
  CurrentAmount: number
  PreviousAmount: number
  QuantityChange: number
  AmountChange: number
  AmountChangePercent: number | null
}

export interface SalesComparisonPeriod {
  StartDate: string
  EndDate: string
  Days: number
}

export interface SalesComparisonResult {
  Groups: SalesComparisonGroup[]
  CurrencyTotals: Pick<
    SalesComparisonGroup,
    'Currency' | 'CurrentAmount' | 'PreviousAmount' | 'AmountChange'
  >[]
  CurrentPeriod: SalesComparisonPeriod
  PreviousPeriod: SalesComparisonPeriod
  DataScope: string
  MetricDefinition: string
  CategoryBasis: string
  Interpretation: string
  DataUpdatedAt: string
  QueriedAt: string
}

const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
const field = (row: Record<string, unknown>, key: string) =>
  row[key] ?? row[key.charAt(0).toLowerCase() + key.slice(1)]
const text = (value: unknown) => (typeof value === 'string' ? value : '')
const numeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const period = (raw: unknown): SalesComparisonPeriod | undefined => {
  const row = object(raw)
  if (!row) return
  const StartDate = text(field(row, 'StartDate')).slice(0, 10)
  const EndDate = text(field(row, 'EndDate')).slice(0, 10)
  const Days = field(row, 'Days')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(StartDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(EndDate) ||
    !numeric(Days) ||
    !Number.isInteger(Days) ||
    Days < 1 ||
    Days > 90
  )
    return
  return { StartDate, EndDate, Days }
}

/** 不将不完整列表、缺失数字或零基期变化率转换成正常统计；金额仅展示服务端原币种结果。 */
export function parseSalesComparison(raw: unknown): SalesComparisonResult | undefined {
  const data = object(raw)
  if (!data || ![true, 1].includes(field(data, 'IsComplete') as boolean | number)) return
  const rows = field(data, 'Groups')
  const totals = field(data, 'CurrencyTotals')
  const CurrentPeriod = period(field(data, 'CurrentPeriod'))
  const PreviousPeriod = period(field(data, 'PreviousPeriod'))
  if (
    !Array.isArray(rows) ||
    !Array.isArray(totals) ||
    rows.length > 500 ||
    field(data, 'ReturnedCount') !== rows.length ||
    !CurrentPeriod ||
    !PreviousPeriod
  )
    return
  const Groups: SalesComparisonGroup[] = []
  for (const rawRow of rows) {
    const row = object(rawRow)
    if (!row) return
    const values = [
      'PlatformSource',
      'CurrentQuantity',
      'PreviousQuantity',
      'CurrentAmount',
      'PreviousAmount',
      'QuantityChange',
      'AmountChange',
    ].map((key) => field(row, key))
    if (!values.every(numeric)) return
    const [
      PlatformSource,
      CurrentQuantity,
      PreviousQuantity,
      CurrentAmount,
      PreviousAmount,
      QuantityChange,
      AmountChange,
    ] = values as [number, number, number, number, number, number, number]
    // null是有业务含义的未知变化率，不能通过??丢失并转成0。
    const AmountChangePercent = Object.hasOwn(row, 'AmountChangePercent')
      ? row.AmountChangePercent
      : row.amountChangePercent
    if (PreviousAmount === 0 ? AmountChangePercent !== null : !numeric(AmountChangePercent)) return
    Groups.push({
      PlatformSource,
      CategoryId: text(field(row, 'CategoryId')),
      CategoryName: text(field(row, 'CategoryName')),
      Currency: text(field(row, 'Currency')),
      CurrentQuantity,
      PreviousQuantity,
      CurrentAmount,
      PreviousAmount,
      QuantityChange,
      AmountChange,
      AmountChangePercent: AmountChangePercent as number | null,
    })
  }
  const CurrencyTotals: SalesComparisonResult['CurrencyTotals'] = []
  for (const rawTotal of totals) {
    const row = object(rawTotal)
    if (!row) return
    const CurrentAmount = field(row, 'CurrentAmount')
    const PreviousAmount = field(row, 'PreviousAmount')
    const AmountChange = field(row, 'AmountChange')
    if (![CurrentAmount, PreviousAmount, AmountChange].every(numeric)) return
    CurrencyTotals.push({
      Currency: text(field(row, 'Currency')),
      CurrentAmount: CurrentAmount as number,
      PreviousAmount: PreviousAmount as number,
      AmountChange: AmountChange as number,
    })
  }
  const currencies = new Set(Groups.map((row) => row.Currency))
  if (
    CurrencyTotals.length !== currencies.size ||
    new Set(CurrencyTotals.map((row) => row.Currency)).size !== currencies.size ||
    CurrencyTotals.some((row) => !currencies.has(row.Currency))
  )
    return
  return {
    Groups,
    CurrencyTotals,
    CurrentPeriod,
    PreviousPeriod,
    DataScope: text(field(data, 'DataScope')),
    MetricDefinition: text(field(data, 'MetricDefinition')),
    CategoryBasis: text(field(data, 'CategoryBasis')),
    Interpretation: text(field(data, 'Interpretation')),
    DataUpdatedAt: text(field(data, 'DataUpdatedAt')),
    QueriedAt: text(field(data, 'QueriedAt')),
  }
}

export const comparisonNumber = (value: number) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
export const comparisonChange = (value: number) =>
  `${value > 0 ? '+' : ''}${comparisonNumber(value)}`
export const comparisonPercent = (value: number | null) =>
  value === null ? '基期为 0，不计算' : `${comparisonChange(value)}%`
