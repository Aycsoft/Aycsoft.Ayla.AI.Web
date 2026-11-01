import { describe, expect, it } from 'vitest'
import type { BusinessToolResult, Message } from '@/types/ai'
import {
  appendBusinessToolResult,
  businessNavigationUrl,
  clarificationDraft,
  collectBusinessImages,
  collectBusinessProducts,
  collectBusinessToolResults,
  mergePersistedBusinessMessage,
  normalizeClarification,
} from './businessResults'

const message = (): Message => ({ Id: 'm', Role: 'assistant', Content: '' })
describe('真实业务结果合同', () => {
  it('同工具同结果不同调用独立保留，相同调用重复事件更新', () => {
    const target = message()
    const result: BusinessToolResult = {
      InvocationId: 'one',
      ToolCode: 'product_lookup',
      Data: { Products: [{ SKU: 'sku' }] },
    }
    appendBusinessToolResult(target, result)
    appendBusinessToolResult(target, { ...result, InvocationId: 'two' })
    appendBusinessToolResult(target, result)
    expect(collectBusinessToolResults(target)).toHaveLength(2)
    expect(collectBusinessToolResults({ ToolResults: [result], ToolResult: result })).toHaveLength(
      1,
    )
  })
  it('旧版无调用标识按完整负载兼容，历史缺失字段不覆盖同消息流式证据', () => {
    const result = { ToolCode: 'product_lookup', Data: { Product: { SKU: 'sku' } } }
    const live = { ...message(), ToolResult: result, ToolResults: [result] }
    expect(collectBusinessToolResults(live)).toHaveLength(1)
    expect(mergePersistedBusinessMessage(message(), live).ToolResults).toHaveLength(1)
    expect(
      mergePersistedBusinessMessage({ ...message(), Id: 'other' }, live).ToolResults,
    ).toBeUndefined()
  })
  it('每个商品使用自身调用导航，不被后续查询覆盖', () => {
    const target = message()
    for (const id of ['a', 'b'])
      appendBusinessToolResult(target, {
        InvocationId: id,
        ToolCode: 'product_lookup',
        Data: { Product: { SKU: id } },
        NavigationActions: [{ Route: '/product', Query: { sku: id } }],
      })
    expect(collectBusinessProducts(target).map((item) => item.navigation?.Query?.sku)).toEqual([
      'a',
      'b',
    ])
  })
  it('聚合取代逐图事件，同候选不同查询独立保留而不按分数混排', () => {
    const target = message()
    appendBusinessToolResult(target, {
      InvocationId: 'part',
      ToolCode: 'image_similarity_search',
      Data: { Results: [{ Scope: 'file-library', FileId: 'same' }] },
    })
    appendBusinessToolResult(target, {
      InvocationId: 'all',
      ToolCode: 'image_similarity_search',
      Data: {
        Queries: [{ QueryFileId: 'q1' }, { QueryFileId: 'q2' }],
        Results: [
          { QueryFileId: 'q1', Scope: 'file-library', FileId: 'same', Score: 0.1 },
          { QueryFileId: 'q2', Scope: 'file-library', FileId: 'same', Score: 0.9 },
        ],
      },
    })
    expect(collectBusinessImages(target).map((item) => item.image.QueryFileId)).toEqual([
      'q1',
      'q2',
    ])
  })
  it('业务链接只使用提供的相对路由与配置来源', () => {
    expect(
      businessNavigationUrl({ Route: '/product', Query: { sku: 'A B' } }, 'https://erp.example'),
    ).toBe('https://erp.example/#/product?sku=A+B')
    expect(businessNavigationUrl({ Route: '//evil.example' }, 'https://erp.example')).toBe('')
    expect(businessNavigationUrl({ Route: 'javascript:alert(1)' }, 'https://erp.example')).toBe('')
  })
  it('澄清选项转为用户可读草稿，不附带令牌或执行动作', () => {
    const clarification = normalizeClarification({
      title: '补充范围',
      resumeToken: 'not-in-draft',
      questions: [
        {
          id: 'warehouse',
          label: '仓库',
          type: 'single',
          required: true,
          options: [{ label: '一号仓', value: 'w1' }],
        },
      ],
    })
    expect(clarificationDraft(clarification, { warehouse: 'w1' })).toBe('仓库：一号仓')
  })
})
