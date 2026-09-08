/**
 * 创建客户端消息/幂等关联标识，优先原生 UUID，再回退随机字节并设置 v4 位。
 * 最后的 Math.random 兼容分支不具备密码学强度，结果不能用作密钥或访问令牌。
 */
export function createUuid(): string {
  const runtimeCrypto = globalThis.crypto
  if (typeof runtimeCrypto?.randomUUID === 'function') return runtimeCrypto.randomUUID()

  const bytes = new Uint8Array(16)
  if (typeof runtimeCrypto?.getRandomValues === 'function') runtimeCrypto.getRandomValues(bytes)
  else
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256)

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}
