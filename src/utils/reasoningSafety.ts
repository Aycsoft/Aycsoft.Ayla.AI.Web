/** 公开进度文本的防御性脱敏；有限模式匹配不替代服务端敏感数据隔离。 */
const sensitivePatterns = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /(?:authorization|api[_ -]?key|signing[_ -]?key)\s*[:=]\s*\S+/gi,
  /(?:system prompt|系统提示词|开发者提示词|隐藏指令)[\s\S]*/gi,
]

/** 隐去已知密钥/提示词模式并限制到 800 字符；不得用于批准显示内部推理原文。 */
export function sanitizeReasoningText(value = ''): string {
  let safe = value
  for (const pattern of sensitivePatterns) safe = safe.replace(pattern, '[敏感信息已隐藏]')
  return safe.slice(0, 800)
}
