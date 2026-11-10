import { afterEach, expect, test, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { readFileSync } from 'node:fs'
import CompactBusinessTable from './CompactBusinessTable.vue'
import CommerceProductCards from './CommerceProductCards.vue'
// SSR 不触发图片懒加载；保留接收的 src 校验真实组件传参，不发网络请求。
vi.mock('element-plus', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    ElImage: defineComponent({
      props: { src: String },
      setup: (props) => () => h('img', { src: props.src }),
    }),
  }
})
afterEach(() => vi.unstubAllGlobals())
test('紧凑供应商表实际渲染采购关联与原图，技术字段不入表', async () => {
  vi.stubGlobal('window', { location: { origin: 'https://erp.example' } })
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(CompactBusinessTable, {
          result: {
            ToolCode: 'supplier_lookup',
            Data: {
              Suppliers: [
                {
                  SupplierName: '合成供应商',
                  RecentPurchasePlanNo: 'PLAN-1',
                  RecentPurchaseProducts: [
                    {
                      Sku: 'SKU-1',
                      Name: '壁灯，长规格',
                      MainPicture: 'https://img.example/p.png',
                    },
                  ],
                  StreetAddress: 'NO_TECHNICAL_FIELD',
                },
              ],
            },
          },
        }),
    }),
  )
  expect(html).toMatch(/<table[ >]/)
  expect(html).toContain('采购计划号')
  expect(html).toContain('PLAN-1')
  expect(html).toContain('SKU-1')
  expect(html).toContain('https://img.example/p.png')
  expect(html).not.toContain('NO_TECHNICAL_FIELD')
})
test('公开目录卡实际显示图片、原价格和零评价，不能把夹带Rank当销量榜', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(CommerceProductCards, {
          sources: [
            {
              Products: [
                {
                  Name: '合成吊灯',
                  SourceUrl: 'https://shop.example/list',
                  ProductUrl: 'https://shop.example/p1',
                  ImageUrl: 'https://img.example/p.png',
                  ObservationKind: 'catalog_entry',
                  Rank: 1,
                  DisplayedPrice: 'USD 0.00',
                  Rating: 0,
                  ReviewCount: 0,
                },
              ],
            },
          ],
        }),
    }),
  )
  expect(html).toContain('站方目录收录')
  expect(html).toContain('USD 0.00')
  expect(html).toContain('0 条评价')
  expect(html).toContain('https://img.example/p.png')
  expect(html).not.toContain('榜单 #')
})
test('消息灰提示直接显示detail，来源默认折叠且不使用红色错误class', () => {
  const source = readFileSync(new URL('./MessageList.vue', import.meta.url), 'utf8')
  expect(source).toContain('class="message-response-notice"')
  expect(source).toContain('<span>{{ messageResponseNotice(message)?.detail }}</span>')
  expect(source).not.toContain('inline-error message-response-notice')
  expect(source).not.toContain('messageResponseNotice(message)?.title')
  expect(source).toMatch(/class="citations">\s*<details\b[^>]*>/)
})
