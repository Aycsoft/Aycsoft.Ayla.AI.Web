import { request } from './http'
import type { AIExternalImageSearchRequest } from '@/types/ai'
import { normalizeExternalImageSearchLaunch } from '@/utils/externalImageSearch'

/** 复用Cookie与CSRF传输；只传业务字段，真实ERP身份由服务端SSO会话解析。 */
export const launchExternalImageSearch = async (data: AIExternalImageSearchRequest) => {
  const result = await request<unknown>('/sso/external-image-search/launch', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return normalizeExternalImageSearchLaunch(result)
}
