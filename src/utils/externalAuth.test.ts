import { describe, expect, it } from 'vitest'
import { buildExternalRegistration, isValidEmail, normalizeEmail } from './externalAuth'

describe('external auth helpers', () => {
  it('normalizes and validates email addresses', () => {
    expect(normalizeEmail(' Customer@Example.COM ')).toBe('customer@example.com')
    expect(isValidEmail('customer@example.com')).toBe(true)
    expect(isValidEmail('customer@invalid')).toBe(false)
  })

  it('builds a trimmed, de-duplicated registration contract', () => {
    expect(buildExternalRegistration({ name: ' 客户 ', email: ' A@B.COM ', code: ' 123456 ', purposes: ['work-efficiency', 'other', 'other'], otherPurpose: ' 团队评估 ' })).toEqual({
      DisplayName: '客户', Email: 'a@b.com', Code: '123456', Purposes: ['work-efficiency', 'other'], OtherPurpose: '团队评估'
    })
  })

  it('does not submit other-purpose text unless other is selected', () => {
    expect(buildExternalRegistration({ name: '客户', email: 'a@b.com', code: '123456', purposes: ['learning-research'], otherPurpose: '忽略' })).not.toHaveProperty('OtherPurpose')
  })
})
