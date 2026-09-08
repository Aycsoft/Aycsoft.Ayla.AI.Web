/** 个人工作区列表的读取状态；写入操作仍由业务页面负责。 */
import { ref, type Ref } from 'vue'

/**
 * 统一列表读取的 loading/error 生命周期；load 合并普通读取，refresh 保证写后新读取。
 * 失败时保留原列表，页面可显示错误并重试，不伪造空数据或吞掉状态。
 */
export function useWorkspaceCollection<T>(fetchItems: () => Promise<T[]>) {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(true)
  const error = ref('')
  let pending: Promise<void> | undefined

  function load(): Promise<void> {
    if (pending) return pending
    loading.value = true
    error.value = ''
    pending = (async () => {
      try {
        // 将同步异常也纳入同一个异步生命周期，确保 pending 总在赋值后释放。
        items.value = await Promise.resolve().then(fetchItems)
      } catch (reason) {
        error.value = reason instanceof Error ? reason.message : '读取失败，请稍后重试'
      } finally {
        loading.value = false
        pending = undefined
      }
    })()
    return pending
  }

  /**
   * 写操作完成后使用：当前请求可能读取了写入前的快照，因此不能直接复用。
   * 先等待旧读取释放请求锁，再发起一次新读取；同批排队的刷新会由 load 合并。
   * 新读取期间再次发生写入时，会排到下一轮，保证每次调用都等待写后的结果。
   */
  function refresh(): Promise<void> {
    return pending ? pending.then(() => load()) : load()
  }

  return { items, loading, error, load, refresh }
}
