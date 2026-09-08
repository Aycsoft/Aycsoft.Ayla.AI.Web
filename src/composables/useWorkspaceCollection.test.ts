/** 列表加载公共流程回归：合并刷新、成功赋值、错误保留及重试恢复。 */
import { describe, expect, it, vi } from 'vitest'
import { useWorkspaceCollection } from './useWorkspaceCollection'

/** 用可控快照模拟网络延迟，让写入发生在前一次列表读取尚未完成时。 */
function deferredItems() {
  let resolve!: (items: string[]) => void
  const promise = new Promise<string[]>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('工作区列表加载', () => {
  it('写后刷新不复用写前读取，同批刷新只追加一次请求', async () => {
    const old = deferredItems()
    const latest = deferredItems()
    const fetchItems = vi
      .fn<() => Promise<string[]>>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise)
    const collection = useWorkspaceCollection(fetchItems)
    const reading = collection.load()
    await Promise.resolve()
    // 模拟保存已成功，旧查询仍只能返回保存前快照。
    const refreshed = collection.refresh()
    const sameBatch = collection.refresh()
    expect(fetchItems).toHaveBeenCalledTimes(1)
    old.resolve(['旧记录'])
    await reading
    await Promise.resolve()
    expect(fetchItems).toHaveBeenCalledTimes(2)
    expect(collection.loading.value).toBe(true)
    latest.resolve(['旧记录', '新增记录'])
    await Promise.all([refreshed, sameBatch])
    expect(fetchItems).toHaveBeenCalledTimes(2)
    expect(collection.items.value).toEqual(['旧记录', '新增记录'])
    expect(collection.loading.value).toBe(false)
  })

  it('上一轮写后刷新进行中再次写入时，排队读取第二次写入结果', async () => {
    const first = deferredItems()
    const second = deferredItems()
    const fetchItems = vi
      .fn<() => Promise<string[]>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const collection = useWorkspaceCollection(fetchItems)
    const firstRefresh = collection.refresh()
    await Promise.resolve()
    const secondRefresh = collection.refresh()
    first.resolve(['第一次保存'])
    await firstRefresh
    await Promise.resolve()
    expect(fetchItems).toHaveBeenCalledTimes(2)
    second.resolve(['第二次保存'])
    await secondRefresh
    expect(collection.items.value).toEqual(['第二次保存'])
  })

  it('同步抛错也释放请求锁，允许下一次重试', async () => {
    const fetchItems = vi
      .fn<() => Promise<string[]>>()
      .mockImplementationOnce(() => {
        throw new Error('同步校验失败')
      })
      .mockResolvedValueOnce(['重试成功'])
    const collection = useWorkspaceCollection(fetchItems)
    await collection.load()
    expect(collection.error.value).toBe('同步校验失败')
    await collection.load()
    expect(collection.items.value).toEqual(['重试成功'])
    expect(collection.loading.value).toBe(false)
  })

  it('同一批并发刷新复用 Promise，完成后允许再次读取', async () => {
    let resolve!: (items: string[]) => void
    const fetchItems = vi.fn(
      () =>
        new Promise<string[]>((done) => {
          resolve = done
        }),
    )
    const collection = useWorkspaceCollection(fetchItems)
    const first = collection.load()
    expect(collection.load()).toBe(first)
    expect(collection.loading.value).toBe(true)
    await Promise.resolve()
    resolve(['已保存内容'])
    await first
    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(collection.items.value).toEqual(['已保存内容'])
    expect(collection.loading.value).toBe(false)
    const second = collection.load()
    await Promise.resolve()
    resolve([])
    await second
    expect(fetchItems).toHaveBeenCalledTimes(2)
  })

  it('刷新失败保留原数据，并允许重试清除错误', async () => {
    const fetchItems = vi
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(['原数据'])
      .mockRejectedValueOnce(new Error('网络断开'))
      .mockResolvedValueOnce(['新数据'])
    const collection = useWorkspaceCollection(fetchItems)
    await collection.load()
    await collection.load()
    expect(collection.items.value).toEqual(['原数据'])
    expect(collection.error.value).toBe('网络断开')
    expect(collection.loading.value).toBe(false)
    await collection.load()
    expect(collection.items.value).toEqual(['新数据'])
    expect(collection.error.value).toBe('')
  })
})
