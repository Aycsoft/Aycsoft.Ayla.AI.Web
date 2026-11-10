import type { Citation } from '@/types/ai'
import { citationTitle, citationUrl } from './messagePresentation'

/** 同一来源的引用与联网结果合并商品，避免较薄的引用先出现后吞掉完整商品卡。 */
export function mergeCommerceSources(sources: Citation[]) {
  const merged = new Map<string, Citation>()
  for (const source of sources) {
    const key = citationUrl(source) || `${citationTitle(source)}:${source.DocumentId || ''}`
    const previous = merged.get(key)
    if (!previous) merged.set(key, source)
    else
      merged.set(key, {
        ...previous,
        Products: [...(previous.Products || []), ...(source.Products || [])],
        ProductObservation: previous.ProductObservation ?? source.ProductObservation,
      })
  }
  return [...merged.values()]
}

/** 外部商品链接只接收无凭据的 HTTP(S)，图片和来源不执行脚本或本地路径。 */
export function publicCommerceUrl(value?: string | null) {
  try {
    const url = new URL(value || '')
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : ''
  } catch {
    return ''
  }
}

/** 同一商品去重，正文引用顺序优先，使“第二款”与卡片顺序一致。 */
export function commerceCards(sources: Citation[], answer = '') {
  const seen = new Set<string>()
  const result = sources.flatMap((source, sourceIndex) =>
    (source.Products || []).flatMap((product) => {
      const url = publicCommerceUrl(product.ProductUrl) || publicCommerceUrl(product.SourceUrl)
      const sourceUrl = publicCommerceUrl(product.SourceUrl)
      if (!url || !sourceUrl || seen.has(url)) return []
      seen.add(url)
      return [
        {
          product,
          url,
          sourceUrl,
          image: publicCommerceUrl(product.ImageUrl),
          sourceIndex,
          host: new URL(sourceUrl).hostname.replace(/^www\./, ''),
        },
      ]
    }),
  )
  const order = (url: string) =>
    answer.indexOf(url) < 0 ? Number.MAX_SAFE_INTEGER : answer.indexOf(url)
  return result.sort(
    (a, b) =>
      order(a.url) - order(b.url) ||
      (a.product.ClientDisplayIndex ?? Number.MAX_SAFE_INTEGER) -
        (b.product.ClientDisplayIndex ?? Number.MAX_SAFE_INTEGER),
  )
}
