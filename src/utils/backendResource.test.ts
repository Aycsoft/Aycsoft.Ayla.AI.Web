import { describe, expect, it } from 'vitest'
import { contentUrl, downloadUrl, normalizeBackendResourceUrl } from './backendResource'

describe('backend resource URL contract', () => {
  it('normalizes legacy numeric download flags to boolean text', () => {
    expect(normalizeBackendResourceUrl('/api/files/f-1?download=1')).toBe('/api/files/f-1?download=true')
    expect(normalizeBackendResourceUrl('https://files.example.com/f-1?x=1&download=1#view')).toBe('https://files.example.com/f-1?x=1&download=true#view')
  })

  it('uses backend content, preview and download contracts', () => {
    expect(contentUrl({ ContentUrl: '/api/content/f-1', DownloadUrl: '/api/download/f-1' })).toBe('/api/content/f-1')
    expect(contentUrl({ PreviewUrl: '/api/workspace/artifacts/f-1' })).toBe('/api/workspace/artifacts/f-1')
    expect(downloadUrl({ ContentUrl: '/api/content/f-1', DownloadUrl: '/api/download/f-1?download=1' })).toBe('/api/download/f-1?download=true')
    expect(contentUrl({})).toBe('')
  })

  it('rejects unsafe and physical-path-like values', () => {
    expect(normalizeBackendResourceUrl('javascript:alert(1)')).toBe('')
    expect(normalizeBackendResourceUrl('C:\\uploads\\secret.pdf')).toBe('')
    expect(normalizeBackendResourceUrl('relative/file.pdf')).toBe('')
  })
})
