import type { Message } from '@/types/ai'
import MarkdownIt from 'markdown-it'
import { collectBusinessToolResults } from './businessResults'
import { compactBusiness, compactProduct } from './compactBusiness'

type DisplayTable = NonNullable<ReturnType<typeof compactBusiness>>
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'))
const markdown = new MarkdownIt({ html: false, linkify: false })
// 与正文渲染一致地还原实体和转义；不移除链接，避免吞掉未核实的来源。
const text = (value: string) =>
  markdown.utils.unescapeAll(value.trim().replace(/^\*\*(.*?)\*\*$/u, '$1'))
// 字符串十进制比较，不用浮点容差掩盖分币、单位或精度差异。
const decimal = (value: string): string | undefined => {
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) return
  const raw = value.replaceAll(',', '').replace(/^\+/, '')
  const [integer, fraction = ''] = raw.split('.')
  const whole = integer!.replace(/^(-?)0+(?=\d)/, '$1')
  const rest = fraction.replace(/0+$/, '')
  const result = `${whole}${rest ? `.${rest}` : ''}`
  return result === '-0' ? '0' : result
}
const same = (actual: string, expected: string) => {
  const a = text(actual)
  const e = text(expected)
  if (a === e) return true
  const number = decimal(a)
  return number !== undefined && number === decimal(e)
}

// 币种可前置或后置，仍逐项同币种同金额比较，不跨币种相加或省略币种。
const sameAmounts = (actual: string, expected: string): boolean => {
  const parse = (value: string) =>
    value.split('/').map((part) => {
      const cell = text(part)
      const match =
        cell.match(/^([A-Z]{3})\s+([+-]?[\d,.]+)$/) || cell.match(/^([+-]?[\d,.]+)\s+([A-Z]{3})$/)
      if (!match) return undefined
      const currency = /^[A-Z]{3}$/.test(match[1]!) ? match[1]! : match[2]!
      const amount = decimal(currency === match[1] ? match[2]! : match[1]!)
      return amount === undefined ? undefined : `${currency}:${amount}`
    })
  const left = parse(actual)
  const right = parse(expected)
  return (
    left.length === right.length &&
    left.every((part, index) => part !== undefined && part === right[index])
  )
}

const aliases: Record<string, string[]> = {
  SalesQuantity: ['销量', '销售数量'],
  OrderCount: ['订单数', '订单数量'],
  SalesAmounts: ['销售额'],
  AvailableQuantity: ['可用库存', '可用数量'],
  TransitQuantity: ['在途', '在途数量'],
  SupplierName: ['供应商', '供应商名称'],
}

function matches(headers: string[], data: string[][], table: DisplayTable): boolean {
  if (!table.rows.length || data.length !== table.rows.length || headers.length < 2) return false
  const mapped = headers.map((header) => {
    if (table.product && ['SKU', '产品编码', '商品编码'].includes(header)) return '$sku'
    if (table.product && ['产品', '产品名称', '商品名称', '名称'].includes(header)) return '$name'
    if (table.product && ['品类', '类目'].includes(header)) return '$category'
    if (['#', '排名', '序号'].includes(header)) return '$rank'
    return table.columns.find(
      (column) => column.label === header || aliases[column.key]?.includes(header),
    )?.key
  })
  // 每行必须能定位具体对象，不能把其他期间或其他商品的相同金额表误删。
  if (
    mapped.some((key) => !key) ||
    new Set(mapped).size !== mapped.length ||
    !mapped.some((key) => ['$sku', 'SupplierName', 'SupplierCode', 'GroupLabel'].includes(key!))
  )
    return false
  return data.every(
    (values, index) =>
      values.length === headers.length &&
      values.every((value, column) => {
        const key = mapped[column]!
        const row = table.rows[index]!
        const product = compactProduct(row, '', table.metrics)
        if (key === '$sku') return text(value) === product.sku && product.sku !== '—'
        if (key === '$name')
          return [product.name, product.shortName].includes(text(value)) && product.name !== '—'
        if (key === '$category') return text(value) === product.category && product.category !== '—'
        if (key === '$rank') return text(value) === String(index + 1)
        const expected = table.cell(row, key)
        return (
          expected !== '—' &&
          (key === 'SalesAmounts' ? sameAmounts(value, expected) : same(value, expected))
        )
      }),
  )
}

/** 仅展示层移除同条消息中逐行逐列完全匹配的重复表；原正文继续用于复制、导出和存储。 */
export function businessNarrative(message: Message): string {
  if (message.Role !== 'assistant' || ['streaming', 'pending'].includes(message.Status || ''))
    return message.Content
  const tables = collectBusinessToolResults(message)
    .map(compactBusiness)
    .filter((table): table is DisplayTable => Boolean(table))
  if (!tables.length) return message.Content
  const lines = message.Content.split('\n')
  const output: string[] = []
  let fence = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const marker = line.trim().match(/^(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1]!
      else if (marker[1]![0] === fence[0] && marker[1]!.length >= fence.length) fence = ''
      output.push(line)
      continue
    }
    const isRow = (value: string | undefined): value is string =>
      Boolean(value?.trim().startsWith('|') && value.trim().endsWith('|'))
    if (!fence && isRow(line) && isRow(lines[i + 1])) {
      const headers = cells(line).map(text)
      const separator = cells(lines[i + 1]!)
      if (
        separator.length === headers.length &&
        separator.every((cell) => /^:?-{3,}:?$/.test(cell))
      ) {
        let end = i + 2
        while (isRow(lines[end])) end++
        const data = lines.slice(i + 2, end).map(cells)
        if (tables.some((table) => matches(headers, data, table))) {
          i = end - 1
          continue
        }
      }
    }
    output.push(line)
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n')
}
