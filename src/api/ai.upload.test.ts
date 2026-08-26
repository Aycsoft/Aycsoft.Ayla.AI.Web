import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiApi } from './ai'

describe('external attachment upload', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the external session cookie and browser mutation header with multipart content', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({
        FileId: 'extfile_0123456789abcdef0123456789abcdef0123456789abcdef',
        FileName: 'acceptance.txt',
        ContentType: 'text/plain',
        Size: 10
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await aiApi.upload(new File(['acceptance'], 'acceptance.txt', { type: 'text/plain' }))

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/sso/attachments')
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('include')
    expect(init?.headers).toEqual({ 'X-CrossCart-AI-Request': '1' })
    expect(init?.body).toBeInstanceOf(FormData)
  })
})
