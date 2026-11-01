/** 浮动输入框增高时同步滚动区留白，保护末条回复；只对本会话容器生效。 */
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export function observeComposerClearance(center: HTMLElement): () => void {
  const composer = center.querySelector<HTMLElement>('.composer')
  const list = () => center.querySelector<HTMLElement>('.message-list')
  if (!composer) return () => undefined
  let frame = 0
  let disposed = false
  const update = () => {
    if (disposed) return
    const messages = list()
    // 仅保持原本接近底部的阅读锚点，不能把正在翻看历史的用户拉回末尾。
    const followsBottom =
      messages && messages.scrollHeight - messages.scrollTop - messages.clientHeight < 120
    const clearance = Math.max(
      0,
      Math.ceil(center.getBoundingClientRect().bottom - composer.getBoundingClientRect().top + 16),
    )
    center.style.setProperty('--composer-clearance', `${clearance}px`)
    if (frame) cancelAnimationFrame(frame)
    if (followsBottom)
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!disposed && list() === messages) messages.scrollTop = messages.scrollHeight
      })
  }
  // 同时观察容器，可覆盖窄屏折行、安全区和窗口大小变化，不依赖固定输入行数。
  const observer = new ResizeObserver(update)
  observer.observe(composer)
  observer.observe(center)
  update()
  return () => {
    disposed = true
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
    center.style.removeProperty('--composer-clearance')
  }
}

export function useComposerClearance(center: Ref<HTMLElement | undefined>) {
  let dispose: (() => void) | undefined
  onMounted(() => {
    if (center.value) dispose = observeComposerClearance(center.value)
  })
  onBeforeUnmount(() => dispose?.())
}
