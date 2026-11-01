export interface PublicProductField {
  Name: string
  Value: string
  JsonPointer?: string
}

export interface PublicProductObservation {
  Status: string
  SourceUrl?: string
  RetrievedAt?: string
  HtmlSha256?: string
  Product?: {
    JsonLdScriptIndex?: number
    JsonPointer?: string
    Fields: PublicProductField[]
    Offers: Array<{ JsonPointer?: string; QuoteComplete: boolean; Fields: PublicProductField[] }>
  }
  DiagnosticCode?: string
  DiagnosticField?: string
}

const field = (fields: PublicProductField[] | undefined, name: string) =>
  fields?.find((item) => item.Name === name && typeof item.Value === 'string')?.Value

// 这里只展示页面声明；不将报价、外部SKU或抓取时间升级为成交/ERP事实。
export const productObservationPresentation = (
  observation?: PublicProductObservation | null,
  sourceUrl?: string,
) => {
  if (!observation) return null
  const labels: Record<string, string> = {
    not_declared: '页面未声明可核验的商品信息',
    ambiguous_primary: '页面主要商品不明确',
    invalid_metadata: '页面商品声明无法核验',
    incomplete_primary: '页面商品声明不完整',
    limit_exceeded: '页面商品声明超出核验范围',
  }
  const declared = observation.Status === 'declared' && observation.Product
  const offers = declared
    ? (observation.Product?.Offers || []).map((offer) => {
        const price = field(offer.Fields, 'price')
        const currency = field(offer.Fields, 'priceCurrency')
        return {
          price: price?.trim() ? price : '价格未声明',
          currency: currency?.trim() ? currency : '币种未声明',
          complete: Boolean(offer.QuoteComplete && price?.trim() && currency?.trim()),
        }
      })
    : []
  const rawTime = observation.RetrievedAt || ''
  const time = /(?:Z|[+-]\d{2}:\d{2})$/i.test(rawTime) ? new Date(rawTime) : undefined
  let url = ''
  try {
    // 来源只取现有来源卡地址；忽略 offer.url 和声明中的任意跳转。
    const parsed = new URL(sourceUrl || '')
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password)
      url = parsed.href
  } catch {
    // 无有效来源时不伪造链接。
  }
  return {
    name: declared ? field(observation.Product?.Fields, 'name') || '商品名称未声明' : '',
    notice: declared
      ? '页面声明，不代表成交、可购买或有效期'
      : labels[observation.Status] || '页面商品声明状态待确认',
    offers,
    observedAt:
      time && Number.isFinite(time.getTime())
        ? `${time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）`
        : '未知',
    sourceUrl: url,
  }
}
