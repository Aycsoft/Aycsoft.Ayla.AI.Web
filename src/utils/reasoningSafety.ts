const sensitivePatterns = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /(?:authorization|api[_ -]?key|signing[_ -]?key)\s*[:=]\s*\S+/gi,
  /(?:system prompt|系统提示词|开发者提示词|隐藏指令)[\s\S]*/gi
]

export function sanitizeReasoningText(value = ''): string {
  let safe = value
  for (const pattern of sensitivePatterns) safe = safe.replace(pattern, '[敏感信息已隐藏]')
  return safe.slice(0, 800)
}
