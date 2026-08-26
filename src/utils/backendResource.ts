export interface BackendResourceLinks { ContentUrl?: string; PreviewUrl?: string; DownloadUrl?: string }

export function normalizeBackendResourceUrl(raw?: string): string {
  const value = raw?.trim()
  if (!value || /^(?:javascript|data|file):/i.test(value)) return ''
  if (!/^(?:https?:\/\/|\/)/i.test(value)) return ''
  try {
    const absolute = /^https?:\/\//i.test(value)
    const parsed = new URL(value, 'http://crosscart.local')
    if (parsed.searchParams.get('download') === '1') parsed.searchParams.set('download', 'true')
    return absolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch { return '' }
}

export const contentUrl = (resource?: BackendResourceLinks) => normalizeBackendResourceUrl(resource?.ContentUrl || resource?.PreviewUrl)
export const downloadUrl = (resource?: BackendResourceLinks) => normalizeBackendResourceUrl(resource?.DownloadUrl)

export async function loadBackendResource(rawUrl?: string, signal?: AbortSignal): Promise<Blob> {
  const url = normalizeBackendResourceUrl(rawUrl)
  if (!url) throw new Error('服务端未返回有效的文件地址')
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', signal })
  if (!response.ok) throw new Error(`文件服务暂时不可用（${response.status}）`)
  return await response.blob()
}

export async function downloadBackendResource(rawUrl: string | undefined, fileName: string): Promise<void> {
  const blob = await loadBackendResource(rawUrl)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl; anchor.download = fileName; anchor.rel = 'noopener'; anchor.style.display = 'none'
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
