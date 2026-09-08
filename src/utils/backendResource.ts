/** 后端资源链接适配及带会话下载；不接受本地文件系统路径。 */
export interface BackendResourceLinks {
  ContentUrl?: string
  PreviewUrl?: string
  DownloadUrl?: string
}

/** 只接收 HTTP(S)/根路径，兼容 download=1；无效地址返回空串，不发请求。 */
export function normalizeBackendResourceUrl(raw?: string): string {
  const value = raw?.trim()
  if (!value || /^(?:javascript|data|file):/i.test(value)) return ''
  if (!/^(?:https?:\/\/|\/)/i.test(value)) return ''
  try {
    const absolute = /^https?:\/\//i.test(value)
    const parsed = new URL(value, 'http://crosscart.local')
    if (parsed.searchParams.get('download') === '1') parsed.searchParams.set('download', 'true')
    return absolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return ''
  }
}

/** 优先内容地址，缺失时使用预览地址。 */
export const contentUrl = (resource?: BackendResourceLinks) =>
  normalizeBackendResourceUrl(resource?.ContentUrl || resource?.PreviewUrl)
/** 下载仅使用后端提供的下载地址，不自行猜测文件路径。 */
export const downloadUrl = (resource?: BackendResourceLinks) =>
  normalizeBackendResourceUrl(resource?.DownloadUrl)

/** 带 Cookie 读取后端资源，不缓存敏感文件；调用方可中止预览请求。 */
export async function loadBackendResource(rawUrl?: string, signal?: AbortSignal): Promise<Blob> {
  const url = normalizeBackendResourceUrl(rawUrl)
  if (!url) throw new Error('服务端未返回有效的文件地址')
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', signal })
  if (!response.ok) throw new Error(`文件服务暂时不可用（${response.status}）`)
  return await response.blob()
}

/** 通过临时 Blob URL 触发浏览器下载，延迟释放避免下载尚未接管即失效。 */
export async function downloadBackendResource(
  rawUrl: string | undefined,
  fileName: string,
): Promise<void> {
  const blob = await loadBackendResource(rawUrl)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
