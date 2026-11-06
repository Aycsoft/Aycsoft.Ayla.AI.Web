import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import type { WorkspaceSession } from '@/types/ai'
import { ApiError } from '@/api/http'
import {
  attentionIdentity,
  type DailyInsightToday,
  type MarketObservationFeed,
} from '@/utils/personalAttention'

export function usePersonalAttention(
  session: Ref<WorkspaceSession | undefined>,
  loadToday: (signal: AbortSignal) => Promise<DailyInsightToday>,
  loadMarket: (signal: AbortSignal) => Promise<MarketObservationFeed>,
  expired: () => void,
) {
  const today = shallowRef<DailyInsightToday>()
  const market = shallowRef<MarketObservationFeed>()
  const todayLoading = ref(false),
    marketLoading = ref(false)
  const todayError = ref(''),
    marketError = ref('')
  let generation = 0,
    controller: AbortController | undefined,
    pending: Promise<void> | undefined
  function clear() {
    today.value = undefined
    market.value = undefined
    todayError.value = ''
    marketError.value = ''
  }
  function refresh(): Promise<void> {
    if (pending) return pending
    if (!attentionIdentity(session.value)) return Promise.resolve()
    const revision = generation
    controller = new AbortController()
    const signal = controller.signal
    todayLoading.value = marketLoading.value = true
    clear()
    const valid = () => revision === generation && !signal.aborted
    const load = async <T>(
      fetcher: (signal: AbortSignal) => Promise<T>,
      assign: (data: T) => void,
      error: Ref<string>,
      loading: Ref<boolean>,
    ) => {
      try {
        const data = await fetcher(signal)
        if (valid()) assign(data)
      } catch (reason) {
        if (!valid()) return
        if (reason instanceof ApiError && reason.status === 401) {
          invalidate()
          expired()
          return
        }
        error.value = '读取失败，请稍后重试'
      } finally {
        if (valid()) loading.value = false
      }
    }
    pending = Promise.all([
      load(
        loadToday,
        (data) => {
          today.value = data
        },
        todayError,
        todayLoading,
      ),
      load(
        loadMarket,
        (data) => {
          market.value = data
        },
        marketError,
        marketLoading,
      ),
    ])
      .then(() => undefined)
      .finally(() => {
        if (revision === generation) pending = undefined
      })
    return pending
  }
  // 同账号权限/租户变化、注销及卸载立即作废旧响应，服务端忽略abort时仍不能回填。
  function invalidate() {
    generation++
    controller?.abort()
    pending = undefined
    clear()
    todayLoading.value = marketLoading.value = false
  }
  watch(
    () => attentionIdentity(session.value),
    () => {
      invalidate()
      void refresh()
    },
    { immediate: true, flush: 'sync' },
  )
  onScopeDispose(invalidate)
  return { today, market, todayLoading, marketLoading, todayError, marketError, refresh }
}
