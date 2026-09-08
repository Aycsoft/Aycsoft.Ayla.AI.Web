/** HTTP 传输边界：统一 Cookie、变更请求标识及后端业务信封，不负责页面提示。 */
import { buildWorkspaceRouteUrl } from '@/utils/navigation'
import type { ApiEnvelope } from '@/types/ai'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

/** 同时保留 HTTP 状态与可选业务状态，供调用方区分登录失效和业务失败。 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
  ) {
    super(message)
  }
}

/** 跳转登录时保留当前会话，并避免重复导航到相同地址。 */
export const redirectToLogin = () => {
  const currentQuery = new URLSearchParams(window.location.hash.split('?', 2)[1] || '')
  const target = buildWorkspaceRouteUrl('/login', {
    conversationId: currentQuery.get('conversation') || undefined,
  })
  if (target.toString() === window.location.href) return
  window.location.assign(target.toString())
}

/** 将 API 相对路径连接到部署配置；调用方不得传入完整外部 URL。 */
export const apiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`

/**
 * 返回业务数据并将失败转换为 ApiError；兼容裸响应与 Status/Item 信封。
 * T 是调用方声明的协议形状，不代表已完成运行时校验。401 由页面决定如何处理。
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...mutationHeaders(init.method || 'GET'),
      ...init.headers,
    },
  })
  if (response.status === 401) throw new ApiError('该功能需要登录后使用', 401)
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('json')
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => '')
  if (!response.ok)
    throw new ApiError(
      String(body?.Message || body?.message || body || `请求失败（${response.status}）`),
      response.status,
    )
  const envelope = body as ApiEnvelope<T>
  if (
    envelope &&
    typeof envelope === 'object' &&
    typeof envelope.Status === 'number' &&
    ('Item' in envelope || 'Message' in envelope)
  ) {
    if (envelope.Status !== 200 && envelope.Status !== 0 && envelope.Status !== 1)
      throw new ApiError(envelope.Message || '业务请求失败', response.status, envelope.Status)
    return envelope.Item as T
  }
  return body as T
}

/** 配合服务端来源校验标记非 GET 请求；此标识本身不替代鉴权。 */
export function mutationHeaders(method = 'POST'): HeadersInit {
  return method.toUpperCase() === 'GET' ? {} : { 'X-CrossCart-AI-Request': '1' }
}

/** 忽略空值但保留 0/false；数组用重复参数表达，避免逗号拼接改变后端绑定。 */
export const query = (values: Record<string, unknown>) => {
  const result = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((item) => result.append(key, String(item)))
    else result.set(key, String(value))
  })
  return result.toString()
}
