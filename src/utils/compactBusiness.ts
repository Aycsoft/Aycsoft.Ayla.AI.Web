import type { BusinessToolResult } from '@/types/ai'

type Row = Record<string, unknown>
export interface CompactColumn {
  key: string
  label: string
}
const row = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {}
export const valueOf = (value: Row, key: string): unknown =>
  value[key] ?? value[key[0]!.toLowerCase() + key.slice(1)]
export const compactValue = (value: unknown): string =>
  typeof value === 'number'
    ? String(value)
    : typeof value === 'string' && value.trim()
      ? value
      : '—'
const present = (value: unknown) => value !== undefined && value !== null && value !== ''
const columns = (items: string[][]): CompactColumn[] =>
  items.map(([key, label]) => ({ key: key!, label: label! }))

/** 只使用已返回的产品字段与系统原文件地址，不用外部商品或另一行填补缺图。 */
export function compactProduct(value: Row, portalOrigin: string, metrics = false) {
  const get = (...keys: string[]) => keys.map((key) => valueOf(value, key)).find(present)
  const sku = compactValue(
    get('SKU', 'Sku', 'ProductSku', 'ProductCode', 'OrderSku', ...(metrics ? ['GroupLabel'] : [])),
  )
  const name = compactValue(get('Name', 'ProductName'))
  const pictureKey = [
    'MainImageUrl',
    'MainPicture',
    'ProductMainPicture',
    'PreviewUrl',
    'MainImageFileId',
  ].find((key) => present(valueOf(value, key)))
  const picture =
    metrics && !get('ProductId')
      ? ''
      : compactValue(pictureKey ? valueOf(value, pictureKey) : undefined)
  let image = ''
  try {
    const origin = new URL(portalOrigin)
    // 产品、库存与报价的主图字段都承载原文件ID；URL字段仍只按地址处理。
    const resourceId =
      /^\d+$/.test(picture) ||
      (pictureKey !== undefined &&
        ['MainPicture', 'ProductMainPicture', 'MainImageFileId'].includes(pictureKey) &&
        /^[A-Za-z0-9_-]+$/.test(picture))
    const raw = resourceId ? `/api/resourceUrlApi/raw/${picture}` : picture
    if (/^(https?:\/\/|\/(?!\/))/.test(raw) && ['https:', 'http:'].includes(origin.protocol)) {
      const parsed = new URL(raw, origin.origin)
      if (!parsed.username && !parsed.password && ['https:', 'http:'].includes(parsed.protocol))
        image = parsed.href
    }
  } catch {
    /* 地址缺失时不猜测资源来源。 */
  }
  return {
    sku,
    name,
    shortName: name.split(/[，；。\n]/)[0] || name,
    image,
    category: compactValue(get('CategoryName')),
  }
}

/** 金额保持每条币种和原始数值；没有币种时明确缺失，不默认人民币或跨币种求和。 */
export function compactAmounts(value: unknown): string {
  if (!Array.isArray(value)) return '—'
  return (
    value
      .map(row)
      .filter((item) => present(valueOf(item, 'Amount')))
      .map(
        (item) =>
          `${compactValue(valueOf(item, 'Currency')) === '—' ? '币种未提供' : compactValue(valueOf(item, 'Currency'))} ${compactValue(valueOf(item, 'Amount'))}`,
      )
      .join(' / ') || '—'
  )
}

/** 按真实工具合同挑选用户所需列，不把任意原始字段、枚举和导航对象摊进表格。 */
export function compactBusiness(result: BusinessToolResult) {
  const code = result.ToolCode.toLowerCase().replaceAll('-', '_')
  const data = result.Data
  let title: string
  let fields: CompactColumn[]
  let product = true
  const keys = ['Products', 'Inventories', 'Quotations', 'Suppliers', 'Records', 'Items']
  let records = keys.map((key) => valueOf(data, key)).find(Array.isArray) as unknown[] | undefined
  if (code === 'sales_top_skus') {
    title = '销售排行'
    fields = columns([
      ['SalesQuantity', '销量'],
      ['OrderCount', '订单数'],
      ['SalesAmounts', '销售额'],
    ])
  } else if (code === 'inventory_search' || code === 'inventory_risk_analysis') {
    title = code === 'inventory_search' ? '库存明细' : '补货关注'
    fields = columns([
      ['WarehouseName', '仓库'],
      ['AvailableQuantity', '可用库存'],
      ['TransitQuantity', '在途'],
      ['PendingReviewQuantity', '待审核需求'],
      ['PendingShipQuantity', '待发货需求'],
      ['CoverageGap', '待补缺口'],
      ['Sales7Days', '近 7 天销量'],
      ['PurchaseOutstanding', '采购未收'],
    ])
  } else if (code === 'supplier_lookup') {
    title = '供应商'
    product = false
    fields = columns([
      ['SupplierName', '供应商'],
      ['SupplierCode', '编号'],
      ['MainCategory', '主营品类'],
      ['RecentPurchaseOrderNo', '最近采购单'],
      ['RecentPurchasePlanNo', '采购计划号'],
      ['RecentPurchaseDate', '采购日期'],
      ['RecentPurchaseProducts', '该次采购商品'],
    ])
    if (!records && valueOf(data, 'Found') !== false) {
      const supplier = row(valueOf(data, 'Supplier') ?? valueOf(data, 'Record'))
      if (present(valueOf(supplier, 'SupplierName'))) records = [supplier]
    }
  } else if (['product_quotation_lookup', 'supplier_quotation_lookup'].includes(code)) {
    title = '供应商报价'
    fields = columns([
      ['SupplierName', '供应商'],
      ['TaxInclusivePrice', '含税报价'],
      ['MinOrderQuantity', '起订量'],
      ['LeadTimeDays', '交期（天）'],
      ['UpdateTime', '更新时间'],
    ])
  } else if (code === 'business_metrics_query') {
    title = '产品统计'
    const metrics: Record<string, string[][]> = {
      available: [
        ['Available', '现货'],
        ['Transit', '在途'],
      ],
      transit: [
        ['Transit', '在途'],
        ['Available', '现货'],
      ],
      sold: [
        ['Sold', '销量'],
        ['Orders', '订单数'],
      ],
      orders: [
        ['Orders', '订单数'],
        ['Sold', '销量'],
      ],
      purchased: [
        ['Purchased', '采购数量'],
        ['PurchaseOrders', '采购单数'],
      ],
      purchaseOrders: [
        ['PurchaseOrders', '采购单数'],
        ['Purchased', '采购数量'],
      ],
    }
    fields = columns(metrics[String(valueOf(data, 'Metric'))] || [])
    if (String(valueOf(data, 'GroupBy')) !== 'sku') {
      product = false
      fields.unshift({ key: 'GroupLabel', label: '分组' })
    }
  } else return null
  const rows = (records || []).map(row)
  // 供应商品类数字 ID 未附字典时留空，不能擅自解释名称。
  const cell = (item: Row, key: string) => {
    const value = valueOf(item, key)
    if (key === 'SalesAmounts') return compactAmounts(value)
    if (key === 'MainCategory' && /^\d+$/.test(compactValue(value))) return '—'
    if (key === 'TaxInclusivePrice' && present(value))
      return `${present(valueOf(item, 'Currency')) ? compactValue(valueOf(item, 'Currency')) : '币种未提供'} ${compactValue(value)}`
    return compactValue(value)
  }
  return {
    title,
    product,
    rows,
    metrics: code === 'business_metrics_query',
    columns: fields.filter((column) => rows.some((item) => present(valueOf(item, column.key)))),
    cell,
  }
}

/** 同一供应商只展示该行最近采购中的产品，不拼接无关销量榜。 */
export const recentPurchaseProducts = (item: Row) => {
  const value = valueOf(item, 'RecentPurchaseProducts')
  return Array.isArray(value) ? value.map(row) : []
}
