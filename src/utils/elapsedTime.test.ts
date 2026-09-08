/** 耗时文案回归：覆盖零值、非法数值、秒截断以及分钟/小时边界。 */
import { describe, expect, it } from 'vitest'
import { formatElapsedTime } from './elapsedTime'

describe('formatElapsedTime', () => {
  it.each([
    [0, '0s'],
    [Number.NaN, '0s'],
    [24_999, '24s'],
    [204_000, '3m 24s'],
    [3_723_000, '1h 2m 3s'],
  ])('formats %i milliseconds', (milliseconds, expected) => {
    expect(formatElapsedTime(milliseconds)).toBe(expected)
  })
})
