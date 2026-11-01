type SuggestedMessage = {
  SuggestedQuestions?: string[]
  Status?: string
  GenerationStatus?: string
}

// 建议内容由服务端生成；前端只限制展示格式，不补造默认业务问题。
export const normalizeSuggestedQuestions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .filter((item): item is string => {
      if (typeof item !== 'string' || !item.trim() || item.trim().length > 80) return false
      const key = item
        .trim()
        .replace(/[\s?？。.!！]/g, '')
        .toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((item) => item.trim())
    .slice(0, 3)
}

export const getSuggestedQuestions = (message: SuggestedMessage) => {
  if (
    [message.Status, message.GenerationStatus].some((status) =>
      [
        'streaming',
        'error',
        'failed',
        'stopped',
        'cancelled',
        'awaiting_clarification',
        'awaiting_approval',
      ].includes(status?.toLowerCase() || ''),
    )
  )
    return []
  return normalizeSuggestedQuestions(message.SuggestedQuestions)
}

// 缺失字段保持历史兼容；显式空数组清除旧建议，失败/停止绝不能保留可执行暗示。
export const applySuggestedQuestions = (
  message: SuggestedMessage,
  payload: Record<string, unknown>,
) => {
  if (
    [message.Status, message.GenerationStatus].some((status) =>
      ['error', 'failed', 'stopped', 'cancelled'].includes(status?.toLowerCase() || ''),
    )
  ) {
    message.SuggestedQuestions = []
    return
  }
  if ('SuggestedQuestions' in payload || 'suggestedQuestions' in payload)
    message.SuggestedQuestions = normalizeSuggestedQuestions(
      payload.SuggestedQuestions ?? payload.suggestedQuestions,
    )
}
