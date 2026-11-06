import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { WorkspaceSession } from '@/types/ai'
import { ApiError } from '@/api/http'
import { usePersonalAttention } from '@/composables/usePersonalAttention'
import {
  attentionIdentity,
  marketObservation,
  publicationLabel,
  attentionProducts,
  displayValue,
  type MarketObservationItem,
  type DailyInsightToday,
  type MarketObservationFeed,
} from './personalAttention'

const user = (): WorkspaceSession => ({
  Authenticated: true,
  AccountType: 'internal',
  UserId: 'one',
  TenantId: 'tenant',
  Permissions: ['AI.Use'],
})
const item = (): MarketObservationItem => ({
  SubscriptionId: 'one',
  Status: 'Ready',
  ObservedAt: '2026-11-01T00:00:00Z',
  SourceUrl: 'https://example.org/product',
  HtmlSha256: 'a'.repeat(64),
  Product: {
    Fields: [{ Name: 'name', Value: 'Synthetic' }],
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
})
const today = (label = 'current'): DailyInsightToday => ({
  Status: 'Ready',
  BusinessDate: label,
  TimeZoneId: 'Asia/Shanghai',
  Data: { Sections: [] },
})
const market = (): MarketObservationFeed => ({
  Status: 'Ready',
  ReadAt: '2026-11-01T00:00:00Z',
  Items: [],
  Notice: '',
})
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}

describe('关注身份与资料合同', () => {
  it('外部/匿名不可取关注，权限与租户变化改变身份key', () => {
    expect(attentionIdentity({ ...user(), AccountType: 'external' })).toBe('')
    expect(attentionIdentity()).toBe('')
    expect(attentionIdentity({ ...user(), TenantId: 'other' })).not.toBe(attentionIdentity(user()))
    expect(attentionIdentity({ ...user(), Permissions: [] })).not.toBe(attentionIdentity(user()))
  })
  it('报价0与未知币种原样保留，日期精度不冒充UTC瞬时', () => {
    const view = marketObservation(item(), Date.parse('2026-11-02T01:00:00Z'))!
    expect(view.stale).toBe(true)
    expect(view.observation.Product?.Offers[0].Fields[0].Value).toBe('0')
    expect(view.observation.Product?.Offers[0].Fields[1].Value).toBe('ZZZ')
    expect(
      publicationLabel({
        ...item(),
        PublishedAt: '2026-10-01T00:00:00Z',
        PublishedAtPrecision: 'date',
      }),
    ).toBe('2026-10-01（仅日期）')
    expect(publicationLabel(item())).toBe('发布日期未知')
  })
  it.each([
    'javascript:alert(1)',
    'http://example.org',
    'https://user:password@example.org',
    'https://example.org/#secret',
  ])('拒绝unsafe来源%s', (SourceUrl) => {
    expect(marketObservation({ ...item(), SourceUrl })).toBeNull()
  })
  it('不显示失败状态残留Product或无hash/时间的声明', () => {
    expect(marketObservation({ ...item(), Status: 'Unavailable' })).toBeNull()
    expect(marketObservation({ ...item(), HtmlSha256: undefined })).toBeNull()
    expect(marketObservation({ ...item(), ObservedAt: '2026-11-01 08:00:00' })).toBeNull()
    expect(displayValue(0)).toBe('0')
    expect(displayValue(null)).toBe('未知')
    expect(
      attentionProducts({
        Code: 'x',
        Title: '',
        Recommendation: '',
        HasAttention: false,
        ToolCode: 'sales_top_skus',
        Status: 'Unavailable',
        Evidence: { Products: [{ Name: 'old' }] },
      }),
    ).toEqual([])
  })
})

describe('真实Vue作用域的读取隔离', () => {
  it('切换tenant立即清空/abort，忽略不遵守abort的晚到响应', async () => {
    const session = ref<WorkspaceSession | undefined>(user()),
      first = deferred<DailyInsightToday>(),
      second = deferred<DailyInsightToday>()
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const scope = effectScope()
    const state = scope.run(() =>
      usePersonalAttention(
        session,
        load,
        async () => market(),
        () => {
          session.value = undefined
        },
      ),
    )!
    const signal = load.mock.calls[0]![0] as AbortSignal
    session.value = { ...user(), TenantId: 'other' }
    expect(signal.aborted).toBe(true)
    expect(state.today.value).toBeUndefined()
    second.resolve(today('new'))
    await vi.waitFor(() => expect(state.today.value?.BusinessDate).toBe('new'))
    first.resolve(today('old'))
    await nextTick()
    expect(state.today.value?.BusinessDate).toBe('new')
    scope.stop()
  })
  it('401清全部私人结果且不自动重试，外部账号不发请求', async () => {
    const session = ref<WorkspaceSession | undefined>({ ...user(), AccountType: 'external' }),
      delayed = deferred<DailyInsightToday>()
    const load = vi.fn(() => delayed.promise),
      loadMarket = vi.fn(async () => market())
    const scope = effectScope()
    const state = scope.run(() =>
      usePersonalAttention(session, load, loadMarket, () => {
        session.value = undefined
      }),
    )!
    expect(load).not.toHaveBeenCalled()
    session.value = user()
    await nextTick()
    delayed.reject(new ApiError('expired', 401))
    await vi.waitFor(() => expect(session.value).toBeUndefined())
    expect(state.market.value).toBeUndefined()
    expect(state.today.value).toBeUndefined()
    expect(load).toHaveBeenCalledTimes(1)
    scope.stop()
  })
  it.each(['today', 'market'])('%s 401先作废并行晚到响应，不依赖父层同步注销', async (failed) => {
    const session = ref<WorkspaceSession | undefined>(user()),
      a = deferred<DailyInsightToday>(),
      b = deferred<MarketObservationFeed>()
    const expired = vi.fn(),
      scope = effectScope()
    const state = scope.run(() =>
      usePersonalAttention(
        session,
        () => a.promise,
        () => b.promise,
        expired,
      ),
    )!
    if (failed === 'today') a.reject(new ApiError('expired', 401))
    else b.reject(new ApiError('expired', 401))
    await vi.waitFor(() => expect(expired).toHaveBeenCalledTimes(1))
    if (failed === 'today') b.resolve(market())
    else a.resolve(today('late'))
    await nextTick()
    await nextTick()
    expect(state.today.value).toBeUndefined()
    expect(state.market.value).toBeUndefined()
    expect(state.todayLoading.value).toBe(false)
    expect(state.marketLoading.value).toBe(false)
    expect(session.value?.UserId).toBe('one')
    scope.stop()
  })
  it('刷新合并在途请求、独立失败保留另一来源，不调用生成或写接口', async () => {
    const session = ref<WorkspaceSession | undefined>(user()),
      delayed = deferred<DailyInsightToday>()
    const load = vi.fn(() => delayed.promise),
      loadMarket = vi.fn(async () => market())
    const scope = effectScope()
    const state = scope.run(() => usePersonalAttention(session, load, loadMarket, () => {}))!
    const pending = state.refresh()
    expect(state.refresh()).toBe(pending)
    delayed.reject(new Error('private upstream detail'))
    await pending
    expect(state.todayError.value).toBe('读取失败，请稍后重试')
    expect(state.market.value?.Status).toBe('Ready')
    expect(load).toHaveBeenCalledTimes(1)
    expect(loadMarket).toHaveBeenCalledTimes(1)
    scope.stop()
  })
})
