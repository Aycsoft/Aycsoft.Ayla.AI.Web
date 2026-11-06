import { expect, test } from 'vitest'
import { businessNarrative } from './businessNarrative'
import type { Message } from '@/types/ai'

const content = `报告结论保留。

| # | SKU | 产品 | 品类 | 销量 | 订单数 | 销售额 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | SKU-1 | 布丁机壁灯 | 壁灯 | 49 | 47 | 2,088.840 USD |
| 2 | SKU-2 | 玻璃灯 | 吊灯 | 0 | 0 | 43.11 GBP / 1618.52 USD |

需要关注后续销量。`
const message = (): Message => ({
  Id: 'm1',
  Role: 'assistant',
  Content: content,
  ToolResults: [
    {
      ToolCode: 'sales_top_skus',
      Data: {
        Products: [
          {
            SKU: 'SKU-1',
            Name: '布丁机壁灯，规格E12',
            CategoryName: '壁灯',
            SalesQuantity: 49,
            OrderCount: 47,
            SalesAmounts: [{ Currency: 'USD', Amount: 2088.84 }],
          },
          {
            SKU: 'SKU-2',
            Name: '玻璃灯',
            CategoryName: '吊灯',
            SalesQuantity: 0,
            OrderCount: 0,
            SalesAmounts: [
              { Currency: 'GBP', Amount: 43.11 },
              { Currency: 'USD', Amount: 1618.52 },
            ],
          },
        ],
      },
    },
  ],
})

test('实际销售合同相同表只展示紧凑图文表，保留结论和原始复制导出内容', () => {
  const value = message()
  const before = JSON.stringify(value)
  const result = businessNarrative(value)
  expect(result).not.toContain('| SKU |')
  expect(result).toContain('报告结论保留。')
  expect(result).toContain('需要关注后续销量。')
  expect(JSON.stringify(value)).toBe(before)
})

test('产品名称HTML实体与正文可见文字相同，不重复展示表格', () => {
  const value = message()
  const name = '24"壁灯 & 玻璃罩'
  ;(value.ToolResults![0]!.Data.Products as Record<string, unknown>[])[0]!.Name = name
  value.Content = content.replace('布丁机壁灯', '24&quot;壁灯 &amp; 玻璃罩')
  expect(businessNarrative(value)).not.toContain('| SKU |')
  expect(value.Content).toContain('&quot;')
  value.Content = value.Content.replace('24&quot;', '25&quot;')
  expect(businessNarrative(value)).toBe(value.Content)
})

test.each([
  ['金额差一分', content.replace('2,088.840', '2088.85')],
  ['细小精度差也保留', content.replace('2,088.840', '2088.84001')],
  ['币种不同', content.replace('2,088.840 USD', '2088.84 GBP')],
  ['币种丢失', content.replace('2,088.840 USD', '2088.84')],
  ['未知列', content.replace('| 品类 |', '| 利润 |')],
  ['类目不同', content.replace('| 壁灯 | 49', '| 吸顶灯 | 49')],
  ['商品不同', content.replace('SKU-1', 'SKU-3')],
  ['未知产品链接保留', content.replace('SKU-1', '[SKU-1](https://other.example/product)')],
  ['漏行', content.replace(/\n\| 2 \|[^\n]+/, '')],
  ['多行', content.replace('\n\n需要', '\n| 3 | SKU-3 | 第三款 | 壁灯 | 1 | 1 | 1 USD |\n\n需要')],
])('%s不能隐藏正文表', (_reason, body) => {
  const value = { ...message(), Content: body }
  expect(businessNarrative(value)).toBe(body)
})

test('无工具、未知工具、流式消息和代码示例原样保留', () => {
  const original = message()
  expect(businessNarrative({ ...original, ToolResults: [] })).toBe(content)
  expect(businessNarrative({ ...original, Role: 'user' })).toBe(content)
  expect(businessNarrative({ ...original, Status: 'streaming' })).toBe(content)
  const fenced = `\`\`\`markdown\n${content}\n\`\`\``
  expect(businessNarrative({ ...original, Content: fenced })).toBe(fenced)
  const unknown = message()
  unknown.ToolResults![0]!.ToolCode = 'unknown'
  expect(businessNarrative(unknown)).toBe(content)
})

test('当前表与其他未匹配表混合，只移除完全匹配表；大小写字段兼容', () => {
  const value = message()
  const extra = '\n| 指标 | 数量 |\n| --- | --- |\n| 访客 | 3 |'
  value.Content += extra
  expect(businessNarrative(value)).toContain(extra)
  const data = value.ToolResults![0]!.Data
  data.products = (data.Products as Record<string, unknown>[]).map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, v]) => [key[0]!.toLowerCase() + key.slice(1), v]),
    ),
  )
  delete data.Products
  expect(businessNarrative(value)).not.toContain('| SKU |')
})
