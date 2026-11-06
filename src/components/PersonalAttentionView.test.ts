import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import PersonalAttentionView from './PersonalAttentionView.vue'

describe('实际关注组件合成渲染', () => {
  it('内部0销量与公开0未知币种、陈旧观察/日期/来源分开，不渲染unsafe链接', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(PersonalAttentionView, {
            todayLoading: false,
            marketLoading: false,
            todayError: '',
            marketError: '',
            now: Date.parse('2026-11-04T00:00:00Z'),
            today: {
              Status: 'Ready',
              BusinessDate: '2026-11-01',
              GeneratedAt: '2026-11-01T00:00:00Z',
              TimeZoneId: 'Asia/Shanghai',
              Data: {
                Sections: [
                  {
                    Code: 'sales',
                    Title: '内部热销商品',
                    HasAttention: false,
                    Recommendation: '内部实际范围',
                    ToolCode: 'sales_top_skus',
                    Evidence: { Products: [{ Name: '内部样品', SKU: 'SKU', SalesQuantity: 0 }] },
                  },
                ],
              },
            },
            market: {
              Status: 'Partial',
              ReadAt: '2026-11-04T00:00:00Z',
              Notice: '',
              Items: [
                {
                  SubscriptionId: 'a',
                  Status: 'Stale',
                  ObservedAt: '2026-11-01T00:00:00Z',
                  SourceUrl: 'https://example.org/p',
                  HtmlSha256: 'a'.repeat(64),
                  Product: {
                    Fields: [{ Name: 'name', Value: '<script>external</script>' }],
                    Offers: [
                      {
                        QuoteComplete: false,
                        Fields: [
                          { Name: 'price', Value: '0' },
                          { Name: 'priceCurrency', Value: 'ZZZ' },
                        ],
                      },
                    ],
                  },
                },
                {
                  SubscriptionId: 'b',
                  Status: 'Ready',
                  ObservedAt: '2026-11-01T00:00:00Z',
                  SourceUrl: 'javascript:bad',
                  HtmlSha256: 'b'.repeat(64),
                  Product: { Fields: [], Offers: [] },
                },
              ],
            },
          }),
      }),
    )
    expect(html).toContain('销量：0')
    expect(html).toMatch(/<b[^>]*>0<\/b> ZZZ/)
    expect(html).toContain('超过24小时')
    expect(html).toContain('发布日期未知')
    expect(html).toContain('本次读取')
    expect(html).toContain('https://example.org/p')
    expect(html).not.toContain('javascript:bad')
    expect(html).not.toContain('<script>external')
    expect(html).toContain('页面报价不代表成交、平台销量或内部商品关联')
  })
  it('禁用状态即使残留数据也不显示旧个人内容，加载/错误明确可见', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(PersonalAttentionView, {
            todayLoading: false,
            marketLoading: false,
            todayError: '',
            marketError: '读取失败，请稍后重试',
            now: 0,
            today: {
              Status: 'Disabled',
              BusinessDate: '',
              TimeZoneId: 'Asia/Shanghai',
              Data: {
                Sections: [
                  {
                    Code: 'old',
                    Title: 'SHOULD_NOT_SHOW',
                    Recommendation: '',
                    HasAttention: false,
                  },
                ],
              },
            },
          }),
      }),
    )
    expect(html).toContain('此项尚未启用')
    expect(html).not.toContain('SHOULD_NOT_SHOW')
    expect(html).toContain('读取失败')
  })
})
