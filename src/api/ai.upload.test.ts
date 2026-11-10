import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiApi } from './ai'
class UploadRequest {
  static last: UploadRequest
  withCredentials = false
  status = 200
  responseText = '{"FileId":"file-1","FileName":"photo.png"}'
  headers: Record<string,string> = {}
  upload = { onprogress: undefined as undefined | ((event: {lengthComputable:boolean;loaded:number;total:number}) => void) }
  onload?: () => void
  onerror?: () => void
  onabort?: () => void
  open = vi.fn()
  send = vi.fn()
  constructor() { UploadRequest.last = this }
  setRequestHeader(key:string, value:string) { this.headers[key] = value }
}
afterEach(() => vi.unstubAllGlobals())
describe('attachment byte upload', () => {
  it('preserves authentication and does not accept a file at 100 percent before server confirmation', async () => {
    vi.stubGlobal('XMLHttpRequest', UploadRequest)
    const progress = vi.fn()
    const promise = aiApi.upload(new File(['photo'], 'photo.png'), progress)
    const xhr = UploadRequest.last
    let accepted = false
    void promise.then(() => { accepted = true })
    xhr.upload.onprogress?.({lengthComputable:true,loaded:5,total:10})
    xhr.upload.onprogress?.({lengthComputable:true,loaded:10,total:10})
    await Promise.resolve()
    expect(progress.mock.calls).toEqual([[50],[100]])
    expect(accepted).toBe(false)
    expect(xhr.open).toHaveBeenCalledWith('POST','/api/sso/attachments')
    expect(xhr.withCredentials).toBe(true)
    expect(xhr.headers).toEqual({'X-CrossCart-AI-Request':'1'})
    expect(xhr.send.mock.calls[0][0]).toBeInstanceOf(FormData)
    xhr.onload?.()
    expect((await promise).FileId).toBe('file-1')
  })
  it('rejects transport success lacking the saved file id', async () => {
    vi.stubGlobal('XMLHttpRequest', UploadRequest)
    const promise = aiApi.upload(new File(['photo'],'photo.png'))
    const rejection = expect(promise).rejects.toThrow('文件服务未返回文件标识')
    UploadRequest.last.responseText = '{}'
    UploadRequest.last.onload?.()
    await rejection
  })
})
