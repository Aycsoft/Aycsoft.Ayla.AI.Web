/** UUID 兼容回归：替换并恢复 crypto，验证原生调用与 RFC 4122 v4 位设置。 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUuid } from './uuid'

const originalCrypto = globalThis.crypto
afterEach(() => vi.stubGlobal('crypto', originalCrypto))

describe('browser-compatible UUID generation', () => {
  it('uses the native UUID API when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-id' })
    expect(createUuid()).toBe('native-id')
  })

  it('creates an RFC 4122 v4 UUID when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab)
        return bytes
      },
    })
    expect(createUuid()).toBe('abababab-abab-4bab-abab-abababababab')
  })
})
