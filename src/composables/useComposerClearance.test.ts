import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeComposerClearance } from './useComposerClearance'

afterEach(() => vi.unstubAllGlobals())

/** 使用内存元素控制尺寸/滚动，验证观察生命周期；真实浏览器矩形另由布局夹具验证。 */
function fixture(atBottom = true) {
  let resize!: () => void
  let frame: (() => void) | undefined
  const disconnect = vi.fn()
  const observe = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback
      }
      observe = observe
      disconnect = disconnect
    },
  )
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined
  })
  let composerTop = 600
  const messages = { scrollHeight: 1000, clientHeight: 600, scrollTop: atBottom ? 400 : 100 }
  const style = { setProperty: vi.fn(), removeProperty: vi.fn() }
  const composer = { getBoundingClientRect: () => ({ top: composerTop }) }
  const center = {
    style,
    getBoundingClientRect: () => ({ bottom: 900 }),
    querySelector: (selector: string) => (selector === '.composer' ? composer : messages),
  }
  const dispose = observeComposerClearance(center as unknown as HTMLElement)
  return {
    resize: () => resize(),
    flush: () => {
      const f = frame
      frame = undefined
      f?.()
    },
    grow: () => {
      composerTop = 400
      messages.scrollHeight = 1200
    },
    shrink: () => {
      composerTop = 750
    },
    messages,
    style,
    observe,
    disconnect,
    dispose,
  }
}

describe('浮动输入区的底部留白', () => {
  it('使用实际占用加安全间距，增高后保持底部锚点，缩回也更新尺寸', () => {
    const view = fixture()
    expect(view.observe).toHaveBeenCalledTimes(2)
    expect(view.style.setProperty).toHaveBeenLastCalledWith('--composer-clearance', '316px')
    view.flush()
    view.grow()
    view.resize()
    view.flush()
    expect(view.style.setProperty).toHaveBeenLastCalledWith('--composer-clearance', '516px')
    expect(view.messages.scrollTop).toBe(1200)
    view.shrink()
    view.resize()
    expect(view.style.setProperty).toHaveBeenLastCalledWith('--composer-clearance', '166px')
    view.dispose()
  })
  it('查看历史中部时输入框变高不把用户拉回底部', () => {
    const view = fixture(false)
    view.grow()
    view.resize()
    view.flush()
    expect(view.messages.scrollTop).toBe(100)
    view.dispose()
  })
  it('卸载断开观察并取消待执行滚动，迟到通知不重新写样式', () => {
    const view = fixture()
    view.dispose()
    view.style.setProperty.mockClear()
    view.grow()
    view.resize()
    view.flush()
    expect(view.disconnect).toHaveBeenCalledOnce()
    expect(view.style.removeProperty).toHaveBeenCalledWith('--composer-clearance')
    expect(view.style.setProperty).not.toHaveBeenCalled()
    expect(view.messages.scrollTop).toBe(400)
  })
})
