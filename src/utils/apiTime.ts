/** API 时间统一解析：历史 MySQL UTC 值可能没有时区，显式偏移和 Z 保持原义。 */
export function parseApiTime(value: string): Date {
  const normalized = value.trim().replace(' ', 'T')
  const utcValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)
    ? `${normalized}Z`
    : normalized
  return new Date(utcValue)
}

/** 以浏览器本地时区显示消息时间，无效值不泄漏 Invalid Date 到页面。 */
export function formatMessageTime(value?: string): string {
  if (!value) return ''
  const time = parseApiTime(value)
  return Number.isFinite(time.getTime())
    ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
}
