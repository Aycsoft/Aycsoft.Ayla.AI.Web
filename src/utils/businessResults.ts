import type {
  AgentClarification,
  BusinessNavigation,
  BusinessToolResult,
  Message,
} from '@/types/ai'

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const field = (value: Record<string, unknown>, name: string) =>
  value[name] ?? value[name[0]!.toLowerCase() + name.slice(1)]
const rows = (value: unknown) => (Array.isArray(value) ? value.map(object) : [])
export const businessText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

/** 优先按调用标识更新；无标识的历史记录才按完整负载兼容去重。 */
export const collectBusinessToolResults = (
  message: Pick<Message, 'ToolResult' | 'ToolResults'>,
) => {
  const results = new Map<string, BusinessToolResult>()
  for (const result of [
    ...(message.ToolResults || []),
    ...(message.ToolResult ? [message.ToolResult] : []),
  ]) {
    const key =
      result.InvocationId ||
      JSON.stringify([result.ToolCode, result.Data, result.NavigationActions])
    results.set(key, result)
  }
  return [...results.values()]
}

export const appendBusinessToolResult = (message: Message, result: BusinessToolResult) => {
  message.ToolResults = collectBusinessToolResults({
    ToolResults: [...collectBusinessToolResults(message), result],
  })
  message.ToolResult = result
}

/** 历史回读缺少旧版未存储字段时保留已收到的同消息证据，不跨消息猜测匹配。 */
export const mergePersistedBusinessMessage = (persisted: Message, live?: Message): Message => {
  if (!live || live.Id !== persisted.Id) return persisted
  return {
    ...persisted,
    ToolResults: collectBusinessToolResults({
      ToolResults: [...collectBusinessToolResults(live), ...collectBusinessToolResults(persisted)],
    }),
    Clarification: persisted.Clarification ?? live.Clarification,
    Approval: persisted.Approval ?? live.Approval,
  }
}

/** 商品卡保留所属调用与自身导航，不拿最后一次工具结果替代前面商品的链接。 */
export const collectBusinessProducts = (message: Message) =>
  collectBusinessToolResults(message).flatMap((result, index) => {
    const source =
      field(result.Data, 'Products') ??
      (field(result.Data, 'Product') ? [field(result.Data, 'Product')] : [])
    return rows(source).map((product, position) => ({
      key: `${result.InvocationId || index}:${position}`,
      product,
      navigation: (product.Route
        ? {
            Route: String(product.Route),
            Query: product.Query as Record<string, string> | undefined,
          }
        : result.NavigationActions?.[0]) as BusinessNavigation | undefined,
    }))
  })

/** 多图终态替代逐图事件，不跨图库/查询比较分数，也不合并不同图片命中的同商品。 */
export const collectBusinessImages = (message: Message) => {
  const all = collectBusinessToolResults(message).filter(
    (result) => result.ToolCode === 'image_similarity_search',
  )
  const aggregate = [...all].reverse().find((result) => field(result.Data, 'Queries'))
  const images = new Map<string, Record<string, unknown>>()
  for (const result of aggregate ? [aggregate] : all)
    for (const image of rows(field(result.Data, 'Results'))) {
      const key = [
        image.QueryFileId,
        image.Scope,
        image.FileId || image.PreviewUrl || image.ProductId || image.ProductCode,
      ].join(':')
      images.set(key, image)
    }
  return [...images].map(([key, image]) => ({ key, image }))
}

/** 只将服务端已有业务路由定位到配置的ERP来源，不猜测商品路由或查询参数。 */
export const businessNavigationUrl = (
  navigation: BusinessNavigation | undefined,
  portalOrigin: string,
): string => {
  if (
    !navigation?.Route.startsWith('/') ||
    navigation.Route.startsWith('//') ||
    navigation.Route.includes('\\')
  )
    return ''
  try {
    const origin = new URL(portalOrigin)
    if (!['http:', 'https:'].includes(origin.protocol)) return ''
    const query = new URLSearchParams(navigation.Query || {}).toString()
    return `${origin.origin}/#${navigation.Route}${query ? `?${query}` : ''}`
  } catch {
    return ''
  }
}

/** 兼容信封大小写，只展示真实澄清字段；未知输入类型降级为普通文字。 */
export const normalizeClarification = (payload: Record<string, unknown>): AgentClarification => ({
  ClarificationId: businessText(field(payload, 'ClarificationId')),
  Title: businessText(field(payload, 'Title')),
  Questions: rows(field(payload, 'Questions')).map((item, index) => ({
    Id: businessText(field(item, 'Id')) || String(index),
    Label: businessText(field(item, 'Label')),
    Type: businessText(field(item, 'Type')) as AgentClarification['Questions'][number]['Type'],
    Required: field(item, 'Required') === true,
    Placeholder: businessText(field(item, 'Placeholder')),
    Options: rows(field(item, 'Options')).map((option) => ({
      Label: businessText(field(option, 'Label')),
      Value: businessText(field(option, 'Value')),
      Recommended: field(option, 'Recommended') === true,
    })),
  })),
})

/** 生成可编辑补充说明，不携带恢复或审批令牌，不发送任何请求。 */
export const clarificationDraft = (
  clarification: AgentClarification,
  answers: Record<string, string | string[]>,
) =>
  clarification.Questions.map((question) => {
    const answer = answers[question.Id]
    const values = Array.isArray(answer) ? answer : [answer || '']
    const display = values
      .map((value) => question.Options?.find((option) => option.Value === value)?.Label || value)
      .join('、')
    return display.trim() ? `${question.Label}：${display}` : ''
  })
    .filter(Boolean)
    .join('\n')
