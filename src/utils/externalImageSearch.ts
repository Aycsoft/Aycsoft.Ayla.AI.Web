import type {
  AIExternalImageSearchLaunch,
  AIExternalImageSearchRequest,
  AIExternalImageSearchScope,
} from '@/types/ai'

/** 只提交真实文件主键；图片预览链接和Blob URL不能冒充FileId。 */
export const buildExternalImageSearchRequest = (
  fileId: string | undefined,
  scope: AIExternalImageSearchScope,
  conversationId?: string,
): AIExternalImageSearchRequest | undefined => {
  const id = fileId?.trim()
  if (!id || !/^[a-zA-Z0-9_-]{2,128}$/.test(id)) return undefined
  if (!['chat-attachment', 'product', 'developer'].includes(scope)) return undefined
  return {
    Provider: '1688',
    FileId: id,
    Scope: scope,
    ...(conversationId ? { ConversationId: conversationId } : {}),
  }
}

/** 仅接受服务端为本图返回的1688 HTTPS地址；不记录、持久化或自行构造授权参数。 */
export const validatedExternalImageSearchUrl = (
  launch: AIExternalImageSearchLaunch | undefined,
  request: AIExternalImageSearchRequest,
): string => {
  if (!launch || launch.Provider !== '1688' || launch.QueryFileId !== request.FileId) return ''
  try {
    const url = new URL(launch.LaunchUrl)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'aibuy.1688.com' ||
      url.port ||
      url.username ||
      url.password
    )
      return ''
    return url.href
  } catch {
    return ''
  }
}

/** 展示门槛只能来自服务端确认的内部SSO会话，不能用用户ID或本地标记代替。 */
export const canLaunchExternalImageSearch = (session?: {
  Authenticated?: boolean
  AccountType?: string
}) => session?.Authenticated === true && session.AccountType === 'internal'

/** 兼容网关大小写信封；失败或空结果不能被解释为可跳转地址。 */
export const normalizeExternalImageSearchLaunch = (
  value: unknown,
): AIExternalImageSearchLaunch | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const root = value as Record<string, unknown>
  const status = root.Status ?? root.status
  if (status !== undefined && status !== 1) return undefined
  const candidate = status === undefined ? root : (root.Item ?? root.item)
  if (!candidate || typeof candidate !== 'object') return undefined
  const item = candidate as Record<string, unknown>
  const read = (upper: string, lower: string) => String(item[upper] ?? item[lower] ?? '')
  if (read('Provider', 'provider') !== '1688') return undefined
  return {
    Provider: '1688',
    Label: read('Label', 'label'),
    LaunchUrl: read('LaunchUrl', 'launchUrl'),
    QueryFileId: read('QueryFileId', 'queryFileId'),
    QueryFileName: read('QueryFileName', 'queryFileName'),
  }
}
