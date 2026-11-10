/** 合并逐条商品事件，保留跨来源展示顺序；入选结果替换发现阶段候选。 */
export function mergeCommerceEvent<
  T extends { Url?: string; Engine?: string; Products?: P[] | null },
  P extends { ProductUrl?: string | null; SourceUrl?: string; ClientDisplayIndex?: number },
>(sources: T[], incoming: T): T[] {
  const selected = incoming.Engine === 'selected-commerce'
  if (!selected && sources.some((source) => source.Engine === 'selected-commerce')) return sources
  const result = selected
    ? sources.filter((source) => source.Engine === 'selected-commerce')
    : [...sources]
  let next =
    Math.max(
      -1,
      ...result.flatMap((source) =>
        (source.Products || []).map((product) => product.ClientDisplayIndex ?? -1),
      ),
    ) + 1
  const index = result.findIndex((source) => source.Url === incoming.Url)
  const previous = index >= 0 ? result[index] : undefined
  const products = [...(previous?.Products || [])]
  for (const product of incoming.Products || []) {
    const key = product.ProductUrl || product.SourceUrl
    const existingIndex = products.findIndex((item) => (item.ProductUrl || item.SourceUrl) === key)
    if (existingIndex >= 0)
      products[existingIndex] = {
        ...products[existingIndex],
        ...product,
        ClientDisplayIndex: products[existingIndex].ClientDisplayIndex,
      }
    else products.push({ ...product, ClientDisplayIndex: next++ })
  }
  const source = { ...previous, ...incoming, Products: products } as T
  if (index >= 0) result[index] = source
  else result.push(source)
  return result
}
