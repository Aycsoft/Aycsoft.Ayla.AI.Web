<script setup lang="ts">
/**
 * 附件预览弹窗，通过统一资源访问器加载内容并管理 Blob URL。
 * 预览与下载地址用途分离；open 为受控状态，close 请求宿主关闭。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { classifyOutput } from '@/utils/messageContent'
import { downloadBackendResource, loadBackendResource } from '@/utils/backendResource'
import ResourceErrorCard from './ResourceErrorCard.vue'

const props = defineProps<{
  open: boolean
  contentUrl?: string
  downloadUrl?: string
  fileName: string
  contentType?: string
}>()
const emit = defineEmits<{ close: [] }>()
const objectUrl = ref('')
const loading = ref(false)
const downloading = ref(false)
const error = ref('')
const kind = computed(() => classifyOutput('', props.fileName, props.contentType))
let controller: AbortController | undefined
const clearObjectUrl = () => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}
async function load() {
  controller?.abort()
  clearObjectUrl()
  error.value = ''
  loading.value = false
  if (!props.contentUrl) {
    error.value = '服务端没有返回 ContentUrl，无法安全预览该文件。'
    return
  }
  const currentController = new AbortController()
  controller = currentController
  loading.value = true
  try {
    const blob = await loadBackendResource(props.contentUrl, currentController.signal)
    // 关闭弹窗或切换文件后，旧请求不得重建已释放的 Blob URL。
    if (controller === currentController && !currentController.signal.aborted)
      objectUrl.value = URL.createObjectURL(blob)
  } catch (reason) {
    if (controller === currentController && !currentController.signal.aborted)
      error.value = (reason as Error).message
  } finally {
    if (controller === currentController) loading.value = false
  }
}
async function download() {
  if (downloading.value) return
  downloading.value = true
  error.value = ''
  try {
    if (!props.downloadUrl) throw new Error('服务端没有返回 DownloadUrl，无法下载该文件。')
    await downloadBackendResource(props.downloadUrl, props.fileName)
  } catch (reason) {
    error.value = (reason as Error).message
  } finally {
    downloading.value = false
  }
}
watch(
  () => [props.open, props.contentUrl],
  () => {
    if (props.open) void load()
    else {
      controller?.abort()
      clearObjectUrl()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  controller?.abort()
  clearObjectUrl()
})
</script>
<template>
  <Teleport to="body"
    ><div
      v-if="open"
      class="ayla-dialog-backdrop resource-preview-backdrop"
      @click.self="emit('close')"
    >
      <section
        class="resource-preview-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="`预览 ${fileName}`"
      >
        <header>
          <span
            ><Icon icon="lucide:file-search" /><strong>{{ fileName }}</strong></span
          ><button aria-label="关闭" @click="emit('close')"><Icon icon="lucide:x" /></button>
        </header>
        <div class="resource-preview-body">
          <div v-if="loading" class="resource-loading">
            <Icon icon="lucide:loader-circle" />正在从授权文件服务读取…
          </div>
          <ResourceErrorCard
            v-else-if="error"
            :message="error"
            :retrying="loading"
            @retry="load"
          /><template v-else-if="objectUrl"
            ><img v-if="kind === 'image'" :src="objectUrl" :alt="fileName" /><video
              v-else-if="kind === 'video'"
              :src="objectUrl"
              controls /><audio v-else-if="kind === 'audio'" :src="objectUrl" controls /><iframe
              v-else
              :src="objectUrl"
              :title="fileName"
              sandbox="allow-same-origin"
          /></template>
        </div>
        <footer>
          <button class="password-cancel" @click="emit('close')">关闭</button
          ><button
            class="ayla-dialog-confirm"
            :disabled="downloading || !downloadUrl"
            @click="download"
          >
            <Icon :icon="downloading ? 'lucide:loader-circle' : 'lucide:download'" />{{
              downloading ? '下载中…' : '下载原文件'
            }}
          </button>
        </footer>
      </section>
    </div></Teleport
  >
</template>
