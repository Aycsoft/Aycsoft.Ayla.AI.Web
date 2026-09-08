/** 附件预览生命周期回归：旧响应不得在切换、关闭或卸载后重建 Blob URL。 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, h, nextTick, reactive, ssrContextKey, type Component } from 'vue'
import ResourcePreviewDialog from './ResourcePreviewDialog.vue'
import { loadBackendResource } from '@/utils/backendResource'

vi.mock('@/utils/backendResource', () => ({
  loadBackendResource: vi.fn(),
  downloadBackendResource: vi.fn(),
}))

// 使用无 DOM 宿主执行真实 setup / watch / unmount，不将布局渲染混入请求竞态测试。
const renderer = createRenderer<object, object>({
  patchProp: () => undefined,
  insert: () => undefined,
  remove: () => undefined,
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => undefined,
  setElementText: () => undefined,
  parentNode: () => null,
  nextSibling: () => null,
})

function mountPreview() {
  const props = reactive({ open: true, contentUrl: '/first', fileName: 'test.pdf' })
  const component: Component = { ...ResourcePreviewDialog, render: () => null }
  const app = renderer.createApp({ render: () => h(component, props) })
  // Vitest 的 Node 转换保留 SFC 的 SSR 模块登记，因此提供独立测试上下文。
  app.provide(ssrContextKey, { modules: new Set<string>() })
  app.mount({})
  return { props, unmount: () => app.unmount() }
}

/** 可控响应模拟不遵守 abort 的服务端或中间层，验证组件自身的过期检查。 */
function deferredBlob() {
  let resolve!: (value: Blob) => void
  const promise = new Promise<Blob>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => vi.restoreAllMocks())

describe('附件预览请求生命周期', () => {
  it('切换文件后忽略旧响应，只为新文件创建预览地址', async () => {
    const first = deferredBlob()
    const second = deferredBlob()
    vi.mocked(loadBackendResource)
      .mockReset()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:current')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const view = mountPreview()
    const firstSignal = vi.mocked(loadBackendResource).mock.calls[0]?.[1]
    view.props.contentUrl = '/second'
    await nextTick()
    expect(firstSignal?.aborted).toBe(true)
    first.resolve(new Blob(['old']))
    await nextTick()
    expect(createUrl).not.toHaveBeenCalled()
    const latest = new Blob(['new'])
    second.resolve(latest)
    await nextTick()
    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(createUrl).toHaveBeenCalledWith(latest)
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith('blob:current')
  })

  it.each(['close', 'unmount'] as const)('%s 后的响应不会泄漏新预览地址', async (action) => {
    const pending = deferredBlob()
    vi.mocked(loadBackendResource).mockReset().mockReturnValueOnce(pending.promise)
    const createUrl = vi.spyOn(URL, 'createObjectURL')
    const view = mountPreview()
    const signal = vi.mocked(loadBackendResource).mock.calls[0]?.[1]
    if (action === 'close') {
      view.props.open = false
      await nextTick()
    } else view.unmount()
    expect(signal?.aborted).toBe(true)
    pending.resolve(new Blob(['late']))
    await nextTick()
    expect(createUrl).not.toHaveBeenCalled()
    if (action === 'close') view.unmount()
  })
})
