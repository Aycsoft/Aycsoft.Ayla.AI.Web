import { mergeCommerceEvent } from './commerceStream'
import { expect, test } from 'vitest'
import { commerceCards, publicCommerceUrl, mergeCommerceSources } from './commerceCards'
import type { PublicCommerceProductCard } from '@/types/ai'
const first: PublicCommerceProductCard = {
  Name: '合成吊灯',
  SourceUrl: 'https://shop.example/list',
  ProductUrl: 'https://shop.example/p1',
  ImageUrl: 'https://img.example/p1.jpg',
  ObservationKind: 'catalog_entry',
  DisplayedPrice: 'USD 0.00',
  Rating: 0,
  ReviewCount: 0,
}
test('保留商品图片和独立来源，目录无排名，按正文顺序支持第二款追问', () => {
  const cards = commerceCards(
    [
      { Products: [first, { ...first, ProductUrl: 'https://shop.example/p2', Name: '第二款' }] },
      { Products: [first] },
    ],
    '先看 https://shop.example/p2 再看 https://shop.example/p1',
  )
  expect(cards).toHaveLength(2)
  expect(cards[0]!.product.Name).toBe('第二款')
  expect(cards[1]!.product.Rank).toBeUndefined()
  expect(cards[1]!.product.DisplayedPrice).toBe('USD 0.00')
  expect(cards[1]!.product.ReviewCount).toBe(0)
  expect(cards[1]!.image).toBe('https://img.example/p1.jpg')
})
test('无来源卡不展示，危险地址不通过，没有图片不伪造', () => {
  expect(commerceCards([{ Products: [{ ...first, SourceUrl: 'javascript:alert(1)' }] }])).toEqual(
    [],
  )
  expect(publicCommerceUrl('https://user:secret@example.com/a')).toBe('')
  expect(
    commerceCards([{ Products: [{ Name: '无图', SourceUrl: 'https://shop.example/p' }] }])[0]!
      .image,
  ).toBe('')
})

test('薄引用与完整联网来源同URL时保留商品且来源只显示一行', () => {
  const sources = mergeCommerceSources([
    { Url: first.SourceUrl, Title: '榜单来源' },
    { Url: first.SourceUrl, Products: [first] },
  ])
  expect(sources).toHaveLength(1)
  expect(commerceCards(sources)).toHaveLength(1)
})

test('同榜单五次入选事件保留五款，重复事件更新不改变顺序', () => {
  let sources: import('@/types/ai').Citation[] = []
  for (let i = 1; i <= 5; i++)
    sources = mergeCommerceEvent(sources, {
      Url: first.SourceUrl,
      Engine: 'selected-commerce',
      Products: [{ ...first, ProductUrl: `https://shop.example/p${i}` }],
    })
  sources = mergeCommerceEvent(sources, {
    Url: first.SourceUrl,
    Engine: 'selected-commerce',
    Products: [{ ...first, ProductUrl: 'https://shop.example/p2', DisplayedPrice: 'USD 12' }],
  })
  expect(sources).toHaveLength(1)
  expect(commerceCards(sources).map((card) => card.url)).toEqual(
    [1, 2, 3, 4, 5].map((i) => `https://shop.example/p${i}`),
  )
  expect(commerceCards(sources)[1]!.product.DisplayedPrice).toBe('USD 12')
})

test('跨平台交错入选保持全局次序，并剔除发现阶段和晚到候选', () => {
  let sources: import('@/types/ai').Citation[] = [{ Url: first.SourceUrl, Products: [first] }]
  for (const [site, id] of [
    ['a', 1],
    ['b', 2],
    ['a', 3],
    ['c', 4],
    ['b', 5],
  ] as const) {
    const url = `https://${site}.example/list`
    sources = mergeCommerceEvent(sources, {
      Url: url,
      Engine: 'selected-commerce',
      Products: [
        { Name: String(id), SourceUrl: url, ProductUrl: `https://${site}.example/p${id}` },
      ],
    })
  }
  sources = mergeCommerceEvent(sources, { Url: first.SourceUrl, Products: [first] })
  expect(commerceCards(sources).map((card) => card.product.Name)).toEqual(['1', '2', '3', '4', '5'])
})
