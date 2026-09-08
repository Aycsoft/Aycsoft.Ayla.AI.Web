<script setup lang="ts">
/**
 * 消息输入与创作入口，管理会话草稿、附件上传和模型能力。
 * seededPrompt 填入提示词；sent 表示发起发送而非完成，modeChanged 同步展示模式。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { aiApi } from '@/api/ai'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import ModelPicker from '@/components/ModelPicker.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { preferredModelForCapability } from '@/utils/modelCatalog'
import type { Attachment, ChatOptions, WorkspaceModel } from '@/types/ai'

const props = defineProps<{ seededPrompt?: string }>()
const emit = defineEmits<{ sent: []; modeChanged: [value: 'chat' | 'image' | 'video'] }>()

// 会话、账号与品牌依赖；本组件只维护输入草稿，不复制消息历史。
const chat = useChatStore()
const auth = useAuthStore()
const settings = useSettingsStore()

// 输入区域状态与上传队列。
const text = ref('')
const files = ref<Attachment[]>([])
const uploading = ref(false)
const input = ref<HTMLTextAreaElement>()
const picker = ref<HTMLInputElement>()
const composing = ref(false)
const deep = ref(false)
const web = ref(false)
const mode = ref<ChatOptions['Mode']>('auto')
const channel = computed(() =>
  mode.value === 'imageGeneration' ? 'image' : mode.value === 'videoGeneration' ? 'video' : 'chat',
)
// 模型目录与媒体参数，每次切换通道重新核对能力。
const workspaceModels = ref<WorkspaceModel[]>([])
const internalAlias = ref('')
const modelError = ref('')
const modelPickerHost = ref<HTMLElement>()
const currentModel = computed(() =>
  workspaceModels.value.find((item) => item.SelectionAlias === internalAlias.value),
)
const videoDuration = ref(5)
const videoAspectRatio = ref('16:9')
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
watch(currentModel, (value) => {
  if (deep.value && !value?.SupportsReasoning) {
    deep.value = false
    if (mode.value === 'deepThinking') mode.value = 'auto'
  }
})
const loadModels = async () => {
  modelError.value = ''
  try {
    workspaceModels.value = await aiApi.publicModels()
    if (
      !workspaceModels.value.some(
        (item) => item.SelectionAlias === internalAlias.value && item.Available,
      )
    )
      internalAlias.value =
        preferredModelForCapability(workspaceModels.value, 'chat')?.SelectionAlias || ''
  } catch (error) {
    modelError.value = (error as Error).message
  }
}
onMounted(async () => {
  window.addEventListener('keydown', shortcutHandler)
  await loadModels()
})
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
  const allowed = ['pdf', 'docx', 'xlsx', 'txt', 'md', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif']
  const candidates = [...selected].slice(0, 4 - files.value.length)
  uploading.value = true
  try {
    for (const file of candidates) {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      if (!allowed.includes(extension) || file.size > 20 * 1024 * 1024) {
        ElMessage.error(`${file.name} 不符合格式或 20MB 大小限制`)
        continue
      }
      try {
        files.value.push(await aiApi.upload(file))
      } catch (error) {
        ElMessage.error((error as Error).message)
      }
    }
  } finally {
    uploading.value = false
  }
}
/** 校验能力与登录态后提交快照；失败时恢复尚未被会话受理的草稿。 */
const submit = async () => {
  if (chat.streaming) {
    await chat.stop()
    return
  }
  if (!text.value.trim() || uploading.value) return
  if (channel.value !== 'chat' && !auth.session) {
    ElMessage.warning('图片和视频生成需要登录，请先登录后继续')
    auth.login()
    return
  }
  if (!currentModel.value?.IsFree || !currentModel.value.Available) {
    ElMessage.warning(
      channel.value === 'image'
        ? '当前没有可用的图片生成模型，请稍后重试'
        : channel.value === 'video'
          ? '当前没有可用的视频生成模型，请稍后重试'
          : '当前没有可用的对话模型，请稍后重试',
    )
    return
  }
  const value = text.value
  const attachments = [...files.value]
  const options: ChatOptions = {
    Mode: mode.value,
    DeepThinking: deep.value,
    WebSearch: web.value,
    ImageRecognition: mode.value === 'imageRecognition',
    ImageGeneration: mode.value === 'imageGeneration',
    VideoGeneration: mode.value === 'videoGeneration',
    VideoDurationSeconds: mode.value === 'videoGeneration' ? videoDuration.value : undefined,
    VideoAspectRatio: mode.value === 'videoGeneration' ? videoAspectRatio.value : undefined,
    InternalModelAlias: internalAlias.value || undefined,
  }
  text.value = ''
  files.value = []
  sessionStorage.removeItem(draftKey.value)
  void resize()
  emit('sent')
  try {
    await chat.send(value, attachments, options)
  } catch (error) {
    // 会话尚未受理（例如创建会话失败）时恢复原稿；流式失败由消息历史提供重试上下文。
    text.value = value
    files.value = attachments
    void resize()
    ElMessage.error((error as Error).message || '消息发送失败，请重试')
  }
}
const retryLast = async () => {
  await chat.retry()
}
const openModelPicker = () => {
  ;(
    modelPickerHost.value?.querySelector('.model-picker-trigger') as HTMLButtonElement | null
  )?.click()
}
const setMode = (value: ChatOptions['Mode']) => {
  mode.value = mode.value === value ? 'auto' : value
  deep.value = mode.value === 'deepThinking'
  web.value = mode.value === 'webSearch'
}
const setChannel = (value: 'chat' | 'image' | 'video') => {
  // 创作通道改变时重选兼容模型，不能把对话模型别名用于媒体生成。
  mode.value =
    value === 'image' ? 'imageGeneration' : value === 'video' ? 'videoGeneration' : 'auto'
  deep.value = false
  web.value = false
  const compatible = preferredModelForCapability(workspaceModels.value, value)
  internalAlias.value = compatible?.SelectionAlias || ''
  emit('modeChanged', value)
}
const keydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !composing.value) {
    event.preventDefault()
    void submit()
  }
}
</script>

<template>
  <div class="composer" @dragover.prevent @drop.prevent="onFiles($event.dataTransfer?.files || [])">
    <div v-if="chat.lastError && chat.messages.length" class="composer-recovery" role="alert">
      <Icon icon="lucide:circle-alert" /><span
        ><strong>本次生成未完成</strong
        ><small>{{ chat.lastError }} 输入内容已保留，可切换模型后重试。</small></span
      ><button :disabled="chat.streaming" @click="openModelPicker">
        <Icon icon="lucide:shuffle" />切换模型</button
      ><button :disabled="chat.streaming" @click="retryLast">
        <Icon icon="lucide:rotate-ccw" />重试
      </button>
    </div>
    <div class="creation-tabs" role="tablist" aria-label="创作模式">
      <button
        role="tab"
        :aria-selected="channel === 'chat'"
        :class="{ active: channel === 'chat' }"
        @click="setChannel('chat')"
      >
        <Icon icon="lucide:message-circle" />对话
      </button>
      <button
        role="tab"
        :aria-selected="channel === 'image'"
        :class="{ active: channel === 'image' }"
        @click="setChannel('image')"
      >
        <Icon icon="lucide:image" />图片生成
      </button>
      <button
        role="tab"
        :aria-selected="channel === 'video'"
        :class="{ active: channel === 'video' }"
        @click="setChannel('video')"
      >
        <Icon icon="lucide:clapperboard" />视频生成
      </button>
    </div>
    <div v-if="channel !== 'chat'" class="generation-guidance">
      <Icon :icon="channel === 'image' ? 'lucide:scan' : 'lucide:film'" /><span
        ><strong>{{
          channel === 'image'
            ? '描述主体、场景、构图、风格与画幅'
            : '描述主体动作、镜头运动、时长、比例与声音要求'
        }}</strong
        ><small>只调用已配置的真实生成服务；结果会进入资产与案例区。</small
        ><span v-if="channel === 'video'" class="generation-options"
          ><button
            v-for="seconds in [5, 10]"
            :key="seconds"
            :class="{ active: videoDuration === seconds }"
            @click="videoDuration = seconds"
          >
            {{ seconds }} 秒</button
          ><button
            v-for="ratio in ['16:9', '9:16', '1:1']"
            :key="ratio"
            :class="{ active: videoAspectRatio === ratio }"
            @click="videoAspectRatio = ratio"
          >
            {{ ratio }}
          </button></span
        ></span
      >
    </div>
    <div v-if="files.length" class="composer-files">
      <span v-for="(file, index) in files" :key="file.FileId">
        <Icon icon="lucide:file-check" />{{ file.FileName
        }}<button @click="files.splice(index, 1)">
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
      :placeholder="
        channel === 'image'
          ? '描述要生成的图片…'
          : channel === 'video'
            ? '描述要生成的视频…'
            : '输入消息…（输入 / 唤起命令）'
      "
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
          accept=".pdf,.docx,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif"
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
        <button
          v-if="auth.session && channel === 'chat'"
          :class="{ selected: deep }"
          :disabled="!currentModel?.SupportsReasoning"
          aria-label="深度思考"
          :title="currentModel?.SupportsReasoning ? '深度思考' : '当前模型不支持深度思考'"
          @click="setMode('deepThinking')"
        >
          <Icon icon="lucide:brain" />
        </button>
        <button
          v-if="auth.session && channel === 'chat'"
          :class="{ selected: web }"
          aria-label="联网搜索"
          title="联网搜索"
          @click="setMode('webSearch')"
        >
          <Icon icon="lucide:globe" />
        </button>
        <span v-if="workspaceModels.length" ref="modelPickerHost">
          <ModelPicker v-model="internalAlias" :models="workspaceModels" :capability="channel" />
        </span>
        <span v-else class="model-unavailable"
          >{{ modelError || '模型目录不可用' }}
          <button v-if="modelError" @click="loadModels">重新加载</button></span
        >
      </div>
      <button
        class="send-button"
        :class="{ stop: chat.streaming }"
        :aria-label="chat.streaming ? '停止生成' : '发送消息'"
        :title="chat.streaming ? '停止生成' : '发送消息'"
        :disabled="(!text.trim() && !chat.streaming) || uploading"
        @click="submit"
      >
        <Icon :icon="chat.streaming ? 'lucide:square' : 'lucide:arrow-up'" />
      </button>
    </div>
    <small class="composer-hint">Create By.Peng Yang</small>
  </div>
</template>
