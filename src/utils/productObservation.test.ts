import assert from 'node:assert/strict'
import { test } from 'vitest'
import { productObservationPresentation, type PublicProductObservation } from './productObservation'

const observation = (): PublicProductObservation => ({
  Status: 'declared',
  RetrievedAt: '2026-11-01T04:00:00Z',
  SourceUrl: 'https://wrong.example/ignored',
  Product: {
    Fields: [
      { Name: 'name', Value: '合成商品' },
      { Name: 'sku', Value: 'EXTERNAL-ONLY' },
    ],
    Offers: [
      {
        QuoteComplete: true,
        Fields: [
          { Name: 'price', Value: '0' },
          { Name: 'priceCurrency', Value: 'USD' },
          { Name: 'url', Value: 'javascript:unsafe()' },
        ],
      },
      {
        QuoteComplete: true,
        Fields: [
          { Name: 'price', Value: '12.00' },
          { Name: 'priceCurrency', Value: 'EUR' },
        ],
      },
      { QuoteComplete: false, Fields: [{ Name: 'price', Value: '19' }] },
    ],
  },
})

test('每项页面报价保留原值0与各自币种，不推断外部SKU/销量', () => {
  const result = productObservationPresentation(observation(), 'https://source.example/product')!
  assert.deepEqual(result.offers, [
    { price: '0', currency: 'USD', complete: true },
    { price: '12.00', currency: 'EUR', complete: true },
    { price: '19', currency: '币种未声明', complete: false },
  ])
  assert.equal(result.name, '合成商品')
  assert.equal(result.sourceUrl, 'https://source.example/product')
  assert.doesNotMatch(JSON.stringify(result), /EXTERNAL-ONLY|javascript|wrong\.example/)
})

test('抓取日期独立显示北京时区，缺失不推断发布日期', () => {
  const source = observation()
  assert.match(productObservationPresentation(source)?.observedAt || '', /12:00:00.*北京时间/)
  source.RetrievedAt = '2026-11-01 04:00:00'
  assert.equal(productObservationPresentation(source)?.observedAt, '未知')
})

test('不完整或未知声明不展示其夹带的报价', () => {
  for (const Status of [
    'not_declared',
    'ambiguous_primary',
    'invalid_metadata',
    'incomplete_primary',
    'limit_exceeded',
    'unknown',
  ]) {
    const result = productObservationPresentation({ ...observation(), Status })!
    assert.equal(result.offers.length, 0)
    assert.equal(result.name, '')
  }
  assert.equal(productObservationPresentation(undefined), null)
})

test('报价齐全标记不补币种，不使用offer地址或有凭据的来源链接', () => {
  const source = observation()
  source.Product!.Offers = [{ QuoteComplete: true, Fields: [{ Name: 'price', Value: '0' }] }]
  const result = productObservationPresentation(source, 'https://user:secret@source.example/')!
  assert.equal(result.offers[0].complete, false)
  assert.equal(result.sourceUrl, '')
})
