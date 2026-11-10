import { expect, test } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SelectionClaims from './SelectionClaims.vue'

test('真实渲染区分事实判断行动，证据默认折叠且技术路径不展示', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(SelectionClaims, {
    claims: [
      { field: 'risks[0]', kind: 'fact', text: '页面记录价格 USD 25', support: [{ sourceUrl: 'https://example.com/product', exactQuote: 'USD 25' }] },
      { field: 'reason', kind: 'inference', text: '可考虑小单验证', basis: '已记录价格范围', limitation: '尚无销量证据', support: [] },
      { field: 'nextActions[0]', kind: 'action', text: '先确认尺寸', support: [{ sourceUrl: 'javascript:alert(1)', exactQuote: '<script>bad</script>' }] },
    ],
  }) }))
  expect(html).toContain('来源事实')
  expect(html).toContain('分析判断')
  expect(html).toContain('下一步')
  expect(html).toContain('尚无销量证据')
  expect(html).toContain('https://example.com/product')
  expect(html).toMatch(/<details[ >]/)
  expect(html).not.toMatch(/<details[^>]*open/)
  expect(html).not.toContain('risks[0]')
  expect(html).not.toContain('javascript:')
  expect(html).not.toContain('<script>bad</script>')
})