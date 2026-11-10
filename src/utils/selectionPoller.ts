/** 串行只读轮询；关闭页面只停止客户端读取，不取消后台任务。 */
export function createSelectionPoller<T>(options: {
  read: (signal: AbortSignal) => Promise<T>
  receive: (value: T, signal: AbortSignal) => Promise<boolean> | boolean
  failed: (error: unknown) => void
  intervalMs?: number
}) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  const stop = () => {
    stopped = true
    controller.abort()
    if (timer) clearTimeout(timer)
  }
  const tick = async () => {
    if (stopped) return
    try {
      const value = await options.read(controller.signal)
      if (stopped) return
      const again = await options.receive(value, controller.signal)
      if (!again) {
        stop()
        return
      }
    } catch (error) {
      if (stopped) return
      options.failed(error)
    }
    if (!stopped) timer = setTimeout(() => void tick(), options.intervalMs ?? 2000)
  }
  void tick()
  return { stop }
}
