/** 后台分析轮询回归：网络恢复、关闭后不覆写、终态停止，不触发任务重建。 */
import { afterEach, expect, test, vi } from 'vitest'
import { createSelectionPoller } from './selectionPoller'
afterEach(() => vi.useRealTimers())

test('关闭只中止读取，晚到结果不更新页面', async () => {
  let resolve!: (value: string) => void
  let signal!: AbortSignal
  const receive = vi.fn(() => true)
  const poller = createSelectionPoller({
    read: (value) => {
      signal = value
      return new Promise<string>((done) => {
        resolve = done
      })
    },
    receive,
    failed: vi.fn(),
  })
  poller.stop()
  expect(signal.aborted).toBe(true)
  resolve('late')
  await Promise.resolve()
  expect(receive).not.toHaveBeenCalled()
})

test('读取失败后继续串行查询，成功终态后不再轮询', async () => {
  vi.useFakeTimers()
  const read = vi
    .fn()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce('running')
    .mockResolvedValueOnce('succeeded')
  const failed = vi.fn()
  const receive = vi.fn((value: string) => value !== 'succeeded')
  createSelectionPoller({ read, receive, failed, intervalMs: 20 })
  await vi.advanceTimersByTimeAsync(80)
  expect(failed).toHaveBeenCalledTimes(1)
  expect(read).toHaveBeenCalledTimes(3)
  expect(receive.mock.calls.map(([value]) => value)).toEqual(['running', 'succeeded'])
})
