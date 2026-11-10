<script setup lang="ts">
/**
 * 自然语言输入入口，管理会话草稿和附件上传，具体能力由服务端自动编排。
 * seededPrompt 填入提示词；sent 表示发起发送而非完成。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { ElImage } from 'element-plus'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { aiApi } from '@/api/ai'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import BrandLogo from '@/components/BrandLogo.vue'
import type { Attachment } from '@/types/ai'
import { needsMediaJobReview } from '@/utils/messagePresentation'

const props = defineProps<{ seededPrompt?: string }>()
const emit = defineEmits<{ sent: [] }>()

// 会话、账号与品牌依赖；本组件只维护输入草稿，不复制消息历史。
const chat = useChatStore()
const auth = useAuthStore()
const settings = useSettingsStore()

// 输入区域状态与上传队列。
const text = ref('')
const files = computed<Attachment[]>({
  get: () => chat.draftAttachments,
  set: (value) => {
    chat.draftAttachments = value
  },
})
const uploading = ref(false)
const uploadName = ref('')
const uploadPercent = ref<number>()
const draftPreviews = ref<Record<string, string>>({})
const pendingPreview = ref('')
// 原图预览只存在当前草稿，不把本机 blob 地址传给后端。
const clearPreview = (id: string) => {
  if (draftPreviews.value[id]) URL.revokeObjectURL(draftPreviews.value[id])
  delete draftPreviews.value[id]
}
onBeforeUnmount(() => { Object.keys(draftPreviews.value).forEach(clearPreview); if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value) })
const input = ref<HTMLTextAreaElement>()
const picker = ref<HTMLInputElement>()
const composing = ref(false)
// 草稿按会话隔离，避免切换任务后把上一会话输入带到当前任务。
const draftKey = computed(() => `crosscart-ai-draft:${chat.currentId || 'new'}`)
const shortcutHandler = (event: KeyboardEvent) => {
  // 文本框已处理的 Enter 不得在 window 冒泡时再次发送或停止流式任务。
  if (
    !event.defaultPrevented &&
    !event.isComposing &&
    (event.ctrlKey || event.metaKey) &&
    event.key === 'Enter'
  )
    void submit()
}
watch(
  () => props.seededPrompt,
  (value) => {
    if (value) {
      text.value = value
      void nextTick(() => input.value?.focus())
    }
  },
)
watch(
  () => chat.currentId,
  () => {
    text.value = sessionStorage.getItem(draftKey.value) || ''
  },
  { immediate: true },
)
watch(text, (value) => {
  if (value) sessionStorage.setItem(draftKey.value, value)
  else sessionStorage.removeItem(draftKey.value)
})
onMounted(() => window.addEventListener('keydown', shortcutHandler))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcutHandler))
const resize = () =>
  nextTick(() => {
    if (input.value) {
      input.value.style.height = 'auto'
      input.value.style.height = `${Math.min(input.value.scrollHeight, 180)}px`
    }
  })

const onFiles = async (selected: FileList | File[]) => {
  // 文件选择、拖拽与粘贴共用入口；串行批次期间不接受第二个批次。
  if (uploading.value) return
  if (!auth.session) {
    ElMessage.warning('上传文件需要先登录，请使用页面右上角登录入口')
    return
  }
  const allowed = [
    'pdf',
    'docx',
    'xlsx',
    'xls',
    'txt',
    'md',
    'csv',
    'png',
    'jpg',
    'jpeg',
    'webp',
    'gif',
  ]
  const candidates = [...selected].slice(0, 4 - files.value.length)
  uploading.value = true
  try {
    for (const file of candidates) {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      if (extension === 'doc') {
        ElMessage.info('这是旧版 Word 文件，请用 Word 或 WPS 另存为 .docx 后上传')
        continue
      }
      if (!allowed.includes(extension) || file.size > 20 * 1024 * 1024) {
        ElMessage.error(`${file.name} 不符合格式或 20MB 大小限制`)
        continue
      }
      try {
        uploadName.value = file.name
        pendingPreview.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        uploadPercent.value = undefined
        const uploaded = await aiApi.upload(file, (percent) => { uploadPercent.value = percent })
        if (pendingPreview.value) draftPreviews.value[uploaded.FileId] = pendingPreview.value
        pendingPreview.value = ''
        files.value.push(uploaded)
      } catch (error) {
        if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
        pendingPreview.value = ''
        ElMessage.error((error as Error).message)
      }
    }
  } finally {
    if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
    pendingPreview.value = ''
    uploadName.value = ''
    uploading.value = false
  }
}
/** 提交问题与附件快照；模型和工具由服务端选择，受理失败保留原稿。 */
const submit = async () => {
  if (chat.streaming) {
    await chat.stop()
    return
  }
  if (uploading.value || chat.preparing || (!text.value.trim() && !files.value.length)) return
  const originalText = text.value
  const value = originalText.trim() || '请分析附件并提取与当前业务相关的信息。'
  const attachments = [...files.value]
  text.value = ''
  files.value = []
  sessionStorage.removeItem(draftKey.value)
  void resize()
  emit('sent')
  try {
    await chat.send(value, attachments)
    attachments.forEach((item) => clearPreview(item.FileId))
  } catch (error) {
    // 会话尚未受理（例如创建会话失败）时恢复原稿；流式失败由消息历史提供重试上下文。
    text.value = originalText
    files.value = attachments
    void resize()
    ElMessage.error((error as Error).message || '消息发送失败，请重试')
  }
}
// 与 Store 的重试门禁一致：持久视频任务只核对原任务，不能暗示再次提交收费。
const retryNeedsJobReview = computed(() => {
  const target = [...chat.messages].reverse().find((message) => message.Role === 'assistant')
  return needsMediaJobReview(target)
})
const retryLast = async () => {
  await chat.retry()
}
const keydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !composing.value) {
    event.preventDefault()
    void submit()
  }
}
defineExpose({ focus: () => nextTick(() => input.value?.focus()) })
</script>

<template>
  <div class="composer" @dragover.prevent @drop.prevent="onFiles($event.dataTransfer?.files || [])">
    <div v-if="chat.lastError && chat.messages.length" class="composer-recovery" role="alert">
      <Icon icon="lucide:circle-alert" /><span
        ><strong>本次生成未完成</strong
        ><small
          >{{ chat.lastError }}
          {{
            retryNeedsJobReview
              ? '请打开“视频任务”核对同一任务，勿重复提交；停止本地等待不代表停止计费。'
              : '可重试本次请求。'
          }}</small
        ></span
      ><button
        v-if="!retryNeedsJobReview"
        :disabled="chat.streaming || chat.preparing"
        @click="retryLast"
      >
        <Icon icon="lucide:rotate-ccw" />重试
      </button>
    </div>
    <div v-if="uploading" class="composer-files" role="status">
      <ElImage v-if="pendingPreview" :src="pendingPreview" style="width:40px;height:40px" fit="contain" />
      <span>{{ uploadName || '准备上传' }} · {{ uploadPercent === 100 ? '等待保存确认' : `正在上传${uploadPercent === undefined ? '' : ` ${uploadPercent}%`}` }} <progress :value="uploadPercent" max="100" aria-label="正在上传附件"></progress></span>
    </div>
    <div v-if="files.length" class="composer-files">
      <span v-for="(file, index) in files" :key="file.FileId">
        <ElImage v-if="draftPreviews[file.FileId]" :src="draftPreviews[file.FileId]" :preview-src-list="[draftPreviews[file.FileId]!]" preview-teleported style="width:40px;height:40px" fit="contain" />
        <Icon v-else icon="lucide:file-check" />{{ file.FileName
        }}<button @click="clearPreview(file.FileId); files.splice(index, 1)">
          <Icon icon="lucide:x" />
        </button>
      </span>
    </div>
    <textarea
      ref="input"
      v-model="text"
      rows="1"
      :disabled="uploading"
      :aria-label="`发送给 ${settings.brand}`"
      placeholder="直接描述需求，或上传图片、文件后提问…"
      @input="resize"
      @compositionstart="composing = true"
      @compositionend="composing = false"
      @keydown="keydown"
      @paste="onFiles([...($event.clipboardData?.files || [])])"
    />
    <div class="composer-toolbar">
      <div class="composer-options">
        <input
          ref="picker"
          type="file"
          hidden
          multiple
          accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif"
          @change="onFiles(($event.target as HTMLInputElement).files || [])"
        />
        <button
          :disabled="files.length >= 4 || uploading"
          aria-label="添加附件"
          title="添加附件"
          @click="auth.session ? picker?.click() : auth.login()"
        >
          <Icon :icon="uploading ? 'lucide:loader-circle' : 'lucide:plus'" />
        </button>
        <span class="agent-chip"> <BrandLogo :size="18" />{{ settings.brand }} </span>
      </div>
      <button
        class="send-button"
        :class="{ stop: chat.streaming }"
        :aria-label="chat.streaming ? '停止生成' : '发送消息'"
        :title="chat.streaming ? '停止生成' : '发送消息'"
        :disabled="
          (!text.trim() && !files.length && !chat.streaming) ||
          uploading ||
          (chat.preparing && !chat.streaming)
        "
        @click="submit"
      >
        <Icon
          :icon="
            chat.streaming
              ? 'lucide:square'
              : chat.preparing
                ? 'lucide:loader-circle'
                : 'lucide:arrow-up'
          "
        />
      </button>
    </div>
    <small class="composer-hint">Create By.Peng Yang</small>
  </div>
</template>
