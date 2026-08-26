import { describe, expect, it } from 'vitest'
import { isStrongExternalPassword, passwordCategoryCount } from './password'

describe('external password policy hint', () => {
  it('counts lowercase, uppercase, number and symbol categories', () => {
    expect(passwordCategoryCount('Aycsoft-2026')).toBe(4)
  })

  it('requires ten characters and at least three categories', () => {
    expect(isStrongExternalPassword('Aycsoft-2026')).toBe(true)
    expect(isStrongExternalPassword('onlylowercase')).toBe(false)
    expect(isStrongExternalPassword('Aa1!short')).toBe(false)
  })
})
