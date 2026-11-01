<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/http'
import { launchExternalImageSearch } from '@/api/externalImageSearch'
import type { AIExternalImageSearchScope } from '@/types/ai'
import {
  buildExternalImageSearchRequest,
  canLaunchExternalImageSearch,
  validatedExternalImageSearchUrl,
} from '@/utils/externalImageSearch'

const props = defineProps<{
  fileId?: string
  scope: AIExternalImageSearchScope
  conversationId?: string
  imageLabel: '原图' | '结果图' | '商品主图'
}>()
const auth = useAuthStore()
const busy = ref(false)
const error = ref('')
const payload = computed(() =>
  buildExternalImageSearchRequest(props.fileId, props.scope, props.conversationId),
)
const available = computed(
  () => canLaunchExternalImageSearch(auth.session) && Boolean(payload.value),
)
let pendingWindow: Window | null = null
let disposed = false

/** 显式点击才请求外链，立即锁定并预留窗口；失败和卸载均释放未接管的空白页。 */
const launch = async () => {
  if (busy.value || !available.value || !payload.value) return
  const data = payload.value
  busy.value = true
  error.value = ''
  try {
    pendingWindow = window.open('about:blank', '_blank')
    if (!pendingWindow) {
      error.value = '请允许打开新窗口后重试'
      return
    }
    pendingWindow.opener = null
    const result = await launchExternalImageSearch(data)
    if (disposed) return
    const url = validatedExternalImageSearchUrl(result, data)
    if (!url) throw new Error('invalid-launch')
    pendingWindow.location.replace(url)
    pendingWindow = null
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ApiError && cause.status === 401) {
      // 清除失效身份，不借用邮箱会话或服务身份重试。
      auth.session = undefined
      error.value = '登录已失效，请从ERP系统重新打开工作台'
    } else if (cause instanceof ApiError && cause.status === 403) {
      error.value = '当前账号无权使用此图片搜货'
    } else {
      // 不回显可能含授权参数的上游异常或完整跳转地址。
      error.value = '暂时无法打开1688搜货，请稍后重试'
    }
  } finally {
    pendingWindow?.close()
    pendingWindow = null
    busy.value = false
  }
}
onBeforeUnmount(() => {
  disposed = true
  pendingWindow?.close()
})
</script>

<template>
  <div v-if="available || error" class="external-image-search">
    <button v-if="available" type="button" :disabled="busy" :aria-busy="busy" @click="launch">
      {{ busy ? '正在打开1688…' : `用${imageLabel}在1688搜同款 ↗` }}
    </button>
    <span v-if="error" class="inline-error" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.external-image-search {
  min-width: 0;
  margin-top: 5px;
  font-size: 12px;
}
button {
  padding: 3px 0;
  color: var(--text);
  background: transparent;
  border: 0;
  cursor: pointer;
}
button:hover {
  text-decoration: underline;
}
button:disabled {
  cursor: wait;
  opacity: 0.6;
}
.inline-error {
  display: block;
  margin-top: 3px;
  overflow-wrap: anywhere;
}
</style>
