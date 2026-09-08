/** 密码提示策略回归：验证字符分类与当前长度要求，不代替服务端认证测试。 */
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
