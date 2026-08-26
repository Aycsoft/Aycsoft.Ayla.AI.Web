import { describe, expect, it } from 'vitest'
import { formatElapsedTime } from './elapsedTime'

describe('formatElapsedTime', () => {
  it.each([
    [0, '0s'],
    [Number.NaN, '0s'],
    [24_999, '24s'],
    [204_000, '3m 24s'],
    [3_723_000, '1h 2m 3s']
  ])('formats %i milliseconds', (milliseconds, expected) => {
    expect(formatElapsedTime(milliseconds)).toBe(expected)
  })
})
