/** 耗时文案回归：覆盖零值、非法数值、秒截断以及分钟/小时边界。 */
import { describe, expect, it } from 'vitest'
import { formatElapsedTime } from './elapsedTime'

describe('formatElapsedTime', () => {
  it.each([
    [0, '0 秒'],
    [Number.NaN, '0 秒'],
    [999, '不足 1 秒'],
    [24_999, '24 秒'],
    [204_000, '3 分钟 24 秒'],
    [3_723_000, '1 小时 2 分钟 3 秒'],
  ])('formats %i milliseconds', (milliseconds, expected) => {
    expect(formatElapsedTime(milliseconds)).toBe(expected)
  })
})
