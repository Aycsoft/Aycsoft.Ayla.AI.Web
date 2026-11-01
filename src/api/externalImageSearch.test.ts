import { afterEach, expect, test, vi } from 'vitest'
import { launchExternalImageSearch } from '@/api/externalImageSearch'
import { ApiError } from '@/api/http'
import {
  canLaunchExternalImageSearch,
  normalizeExternalImageSearchLaunch,
} from '@/utils/externalImageSearch'

afterEach(() => vi.unstubAllGlobals())
const payload = {
  Provider: '1688' as const,
  FileId: 'real-file-123',
  Scope: 'chat-attachment' as const,
}
const item = {
  Provider: '1688',
  Label: '1688 搜同款',
  QueryFileId: payload.FileId,
  QueryFileName: '图.png',
  LaunchUrl: 'https://aibuy.1688.com/landingpage/new-home/find-products.html?bizType=cbu',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

test('仅服务端确认的内部SSO可展示，邮箱、匿名及未知身份均拒绝', () => {
  expect(canLaunchExternalImageSearch({ Authenticated: true, AccountType: 'internal' })).toBe(true)
  for (const session of [
    undefined,
    {},
    { Authenticated: false, AccountType: 'internal' },
    { Authenticated: true, AccountType: 'external' },
    { Authenticated: true },
  ])
    expect(canLaunchExternalImageSearch(session)).toBe(false)
})

test('请求复用Cookie和CSRF且不夹带浏览器身份字段', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply({ Status: 1, Item: item }))
  vi.stubGlobal('fetch', fetcher)
  expect(await launchExternalImageSearch(payload)).toEqual(item)
  const [url, init] = fetcher.mock.calls[0]!
  expect(url).toBe('/api/sso/external-image-search/launch')
  expect(init.credentials).toBe('include')
  expect(init.headers['X-CrossCart-AI-Request']).toBe('1')
  expect(JSON.parse(init.body)).toEqual(payload)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('小写网关信封可映射，业务失败不能提供跳转地址', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      reply({
        status: 1,
        item: {
          provider: '1688',
          label: item.Label,
          queryFileId: item.QueryFileId,
          queryFileName: item.QueryFileName,
          launchUrl: item.LaunchUrl,
        },
      }),
    ),
  )
  expect(await launchExternalImageSearch(payload)).toEqual(item)
  expect(normalizeExternalImageSearchLaunch({ status: 0, item })).toBeUndefined()
  expect(normalizeExternalImageSearchLaunch({ Status: -1, Item: item })).toBeUndefined()
})

test('登录失效保留401语义，不降级为匿名或重试借用身份', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply({ Message: 'expired' }, 401))
  vi.stubGlobal('fetch', fetcher)
  await expect(launchExternalImageSearch(payload)).rejects.toMatchObject({ status: 401 })
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('403和服务故障传回调用者，失败不产生跳转结果', async () => {
  for (const status of [403, 502]) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ Message: 'unavailable' }, status)))
    await expect(launchExternalImageSearch(payload)).rejects.toBeInstanceOf(ApiError)
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ Status: 0, Item: null })))
  expect(await launchExternalImageSearch(payload)).toBeUndefined()
})
