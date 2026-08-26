import { buildWorkspaceRouteUrl } from '@/utils/navigation'
import type { ApiEnvelope } from '@/types/ai'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: number) { super(message) }
}

export const redirectToLogin = () => {
  const currentQuery = new URLSearchParams(window.location.hash.split('?', 2)[1] || '')
  const target = buildWorkspaceRouteUrl('/login', {
    conversationId: currentQuery.get('conversation') || undefined
  })
  if (target.toString() === window.location.href) return
  window.location.assign(target.toString())
}

export const apiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...mutationHeaders(init.method || 'GET'), ...init.headers }
  })
  if (response.status === 401) throw new ApiError('该功能需要登录后使用', 401)
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('json') ? await response.json().catch(() => undefined) : await response.text().catch(() => '')
  if (!response.ok) throw new ApiError(String(body?.Message || body?.message || body || `请求失败（${response.status}）`), response.status)
  const envelope = body as ApiEnvelope<T>
  if (envelope && typeof envelope === 'object' && typeof envelope.Status === 'number' && ('Item' in envelope || 'Message' in envelope)) {
    if (envelope.Status !== 200 && envelope.Status !== 0 && envelope.Status !== 1) throw new ApiError(envelope.Message || '业务请求失败', response.status, envelope.Status)
    return envelope.Item as T
  }
  return body as T
}

export function mutationHeaders(method = 'POST'): HeadersInit {
  return method.toUpperCase() === 'GET' ? {} : { 'X-CrossCart-AI-Request': '1' }
}

export const query = (values: Record<string, unknown>) => {
  const result = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((item) => result.append(key, String(item)))
    else result.set(key, String(value))
  })
  return result.toString()
}
