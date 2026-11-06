import type { WorkspaceSession } from '@/types/ai'
import type { PublicProductObservation } from '@/utils/productObservation'

export interface DailyInsightSection {
  Code: string
  Title: string
  Recommendation: string
  HasAttention: boolean
  ToolCode?: string
  Status?: string
  UnavailableReason?: string
  Evidence?: Record<string, unknown> | null
}
export interface DailyInsightToday {
  Status: string
  BusinessDate: string
  GeneratedAt?: string | null
  TimeZoneId: string
  Data?: {
    Sections: DailyInsightSection[]
    Coverage?: string
    MarketRecommendation?: string
    DataFreshness?: string
  } | null
}
export interface MarketObservationItem {
  SubscriptionId: string
  Status: string
  ObservedAt?: string | null
  PublishedAt?: string | null
  PublishedAtSource?: string | null
  PublishedAtPrecision?: string | null
  SourceUrl?: string | null
  Product?: PublicProductObservation['Product'] | null
  HtmlSha256?: string | null
}
export interface MarketObservationFeed {
  Status: string
  ReadAt: string
  Items: MarketObservationItem[]
  Notice: string
}

// 身份及公开权限数组变化都清空视图，不保存Cookie或读取浏览器凭据。
export function attentionIdentity(session?: WorkspaceSession): string {
  if (
    !session?.Authenticated ||
    session.AccountType !== 'internal' ||
    !session.UserId ||
    !session.TenantId
  )
    return ''
  return JSON.stringify([
    session.AccountType,
    session.UserId,
    session.TenantId,
    session.UserName,
    session.ExpiresAt,
    [...session.Permissions].sort(),
  ])
}

export const attentionStatus = (status?: string): string =>
  ({
    Disabled: '此项尚未启用',
    NotConfigured: '本人尚未配置此项',
    NoAccess: '当前无权读取',
    NotGenerated: '尚无已保存资料',
    ScopeChanged: '权限范围已变化，原资料不可用',
    Generating: '资料正在生成',
    Failed: '资料暂不可用',
    Unavailable: '资料暂不可用',
    ConfigurationInvalid: '此项配置尚未就绪',
    TimedOut: '读取超时，请稍后重试',
    Changed: '资料版本已变化，请重新读取',
    Partial: '部分资料暂不可用或已陈旧',
    Ready: '已保存资料',
    Stale: '观察已超过24小时',
  })[status || ''] || '资料状态待确认'

export function attentionTime(value?: string | null): string {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return '未知'
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）'
    : '未知'
}

export function publicationLabel(item: MarketObservationItem): string {
  if (!item.PublishedAt) return '发布日期未知'
  if (item.PublishedAtPrecision === 'date' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(item.PublishedAt))
    return item.PublishedAt.slice(0, 10) + '（仅日期）'
  return attentionTime(item.PublishedAt)
}

export function marketObservation(
  item: MarketObservationItem,
  now = Date.now(),
): { observation: PublicProductObservation; stale: boolean } | null {
  if (
    !['Ready', 'Stale'].includes(item.Status) ||
    !item.Product ||
    !Array.isArray(item.Product.Fields) ||
    !Array.isArray(item.Product.Offers) ||
    !/^[a-f0-9]{64}$/.test(item.HtmlSha256 || '') ||
    attentionTime(item.ObservedAt) === '未知'
  )
    return null
  try {
    const url = new URL(item.SourceUrl || '')
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null
    return {
      observation: {
        Status: 'declared',
        SourceUrl: url.href,
        RetrievedAt: item.ObservedAt!,
        HtmlSha256: item.HtmlSha256!,
        Product: item.Product,
      },
      stale: item.Status === 'Stale' || now - Date.parse(item.ObservedAt!) > 24 * 60 * 60 * 1000,
    }
  } catch {
    return null
  }
}

// 内部推荐只展示结构化产品字段，不采用上游URL或把页面标题解释成内部SKU。
export function attentionProducts(section: DailyInsightSection): Record<string, unknown>[] {
  if (
    section.Status === 'Unavailable' ||
    !['sales_top_skus', 'recent_products'].includes(section.ToolCode || '')
  )
    return []
  const products = section.Evidence?.Products
  return Array.isArray(products)
    ? products
        .filter(
          (value): value is Record<string, unknown> =>
            !!value && typeof value === 'object' && !Array.isArray(value),
        )
        .slice(0, 20)
    : []
}
export function displayValue(value: unknown): string {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    ? String(value)
    : '未知'
}

// 日期边界/范围/水位均来自该节保存的实际证据，不从当前日期补算窗口。
export function attentionEvidence(section: DailyInsightSection): string[] {
  const evidence = section.Evidence
  if (!evidence || section.Status === 'Unavailable') return []
  const rows: string[] = []
  const period = evidence.Period
  if (period && typeof period === 'object' && !Array.isArray(period)) {
    const range = period as Record<string, unknown>
    rows.push(`资料区间：${displayValue(range.StartDate)} 至 ${displayValue(range.EndDate)}`)
  }
  if (typeof evidence.DataScope === 'string') rows.push(`权限范围：${evidence.DataScope}`)
  if (typeof evidence.ReturnedCount === 'number')
    rows.push(`已返回：${displayValue(evidence.ReturnedCount)}条`)
  if (typeof evidence.HasMore === 'boolean')
    rows.push(evidence.HasMore ? '还有更多符合条件的记录' : '本次条件下没有更多记录')
  if (evidence.DataUpdatedAt != null) rows.push(`数据水位：${displayValue(evidence.DataUpdatedAt)}`)
  if (typeof evidence.DateBasis === 'string') rows.push(evidence.DateBasis)
  return rows
}
