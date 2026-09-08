<script setup lang="ts">
/**
 * 生成媒体延迟就绪预览，短时退避重试并回收 Blob URL。
 * src / kind 变化重新加载；版本号防止旧请求覆盖新媒体。
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ResourceErrorCard from './ResourceErrorCard.vue'

const props = withDefaults(
  defineProps<{ src?: string; kind: 'image' | 'video'; alt?: string; controls?: boolean }>(),
  { alt: '生成内容', controls: false },
)
const loading = ref(false)
const error = ref('')
const objectUrl = ref('')
let requestVersion = 0

const clearObjectUrl = () => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

const load = async () => {
  const version = ++requestVersion
  clearObjectUrl()
  error.value = ''
  loading.value = false
  if (!props.src) {
    error.value = '服务端尚未返回可用的预览地址'
    return
  }
  loading.value = true
  const delays = [0, 500, 1200, 2400]
  // 新生成文件可能尚未同步到读取节点；仅在本次请求仍有效时继续退避。
  for (const delay of delays) {
    if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay))
    if (version !== requestVersion) return
    try {
      const response = await fetch(props.src, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) throw new Error(String(response.status))
      const blob = await response.blob()
      if (!blob.size) throw new Error('empty')
      if (version !== requestVersion) return
      objectUrl.value = URL.createObjectURL(blob)
      loading.value = false
      return
    } catch {
      /* 文件服务落盘与副本同步期间自动退避重试 */
    }
  }
  if (version === requestVersion) {
    loading.value = false
    error.value = `${props.kind === 'image' ? '图片' : '视频'}预览暂未就绪，请重试`
  }
}

watch(() => [props.src, props.kind], load, { immediate: true })
onBeforeUnmount(() => {
  requestVersion++
  clearObjectUrl()
})
</script>

<template>
  <div v-if="loading" class="resilient-media-loading">
    <Icon icon="lucide:loader-circle" /><span>正在同步生成结果…</span>
  </div>
  <ResourceErrorCard v-else-if="error" :message="error" @retry="load" />
  <img v-else-if="kind === 'image' && objectUrl" :src="objectUrl" :alt="alt" />
  <video
    v-else-if="kind === 'video' && objectUrl"
    :src="objectUrl"
    :controls="controls"
    :muted="!controls"
    preload="metadata"
    @click.stop
  />
</template>
