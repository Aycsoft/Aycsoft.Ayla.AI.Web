<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  ElButton,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElOption,
  ElSelect,
  ElImage,
} from 'element-plus'
import { getImageStudioOptions, type ImageStudioOption } from '@/api/imageStudio'
import DocumentRecognitionWorkbench from './DocumentRecognitionWorkbench.vue'
import SelectionWorkbench from './SelectionWorkbench.vue'
import { commerceImagePrompt, type CommerceImageMode } from './commerceImagePrompt'
const props = defineProps<{
  busy: boolean
  submitDocument: (prompt: string, files: File[]) => Promise<void>
  documentResults: { id: string; content: string }[]
  submitImage: (prompt: string, files: File[]) => Promise<void>
  results?: { id: string; name: string; url: string }[]
}>()
const platformOptions = ref<string[]>([]),
  categoryOptions = ref<string[]>([]),
  optionsLoading = ref(false),
  optionsNotice = ref('')
function labels(items: ImageStudioOption[]): string[] {
  return items
    .flatMap((item) => [
      [item.name, item.englishName].filter(Boolean).join(' / '),
      ...labels(item.children || []),
    ])
    .filter(Boolean)
}
async function loadOptions() {
  optionsLoading.value = true
  optionsNotice.value = ''
  try {
    const result = await getImageStudioOptions()
    if (!Array.isArray(result.platforms) || !Array.isArray(result.categories))
      throw new Error('invalid options')
    platformOptions.value = [...new Set(labels(result.platforms))]
    categoryOptions.value = [...new Set(labels(result.categories))]
  } catch {
    optionsNotice.value = '系统选项暂不可用，仍可直接输入平台和类目。'
  } finally {
    optionsLoading.value = false
  }
}
const emit = defineEmits<{ conversation: [] }>()
const documentWorkbench = ref<InstanceType<typeof DocumentRecognitionWorkbench>>()
const selection = ref<InstanceType<typeof SelectionWorkbench>>()
const imageOpen = ref(false)
const mode = ref<CommerceImageMode>('white')
const instruction = ref('')
const ratio = ref('1:1')
const platform = ref('')
const category = ref('')
const previousResultIds = ref<string[]>([])
const submitted = ref(false)
const source = ref<File>()
const sourceUrl = ref('')
const running = ref(false)
const notice = ref('')
const imageResults = computed(() =>
  submitted.value
    ? (props.results || []).filter((item) => !previousResultIds.value.includes(item.id))
    : [],
)
function choose(command: string) {
  if (command === 'selection') selection.value?.open()
  else if (command === 'image') {
    imageOpen.value = true
    void loadOptions()
  } else if (command === 'document') documentWorkbench.value?.open()
  else emit('conversation')
}
/** 预览只使用当前选择的原图，关闭组件释放本机临时URL。 */
function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    notice.value = '请选择 PNG、JPG 或 WebP 产品图片。'
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    notice.value = '当前上传接口支持20MB以内图片。'
    return
  }
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  submitted.value = false
  source.value = file
  sourceUrl.value = URL.createObjectURL(file)
  notice.value = ''
}
/** 使用本轮真实生成文件继续编辑，不覆盖ERP产品图片。 */
async function useResult(item: { name: string; url: string }) {
  if (running.value || props.busy) return
  running.value = true
  try {
    const response = await fetch(item.url, { credentials: 'same-origin' })
    if (!response.ok) throw new Error('图片读取失败')
    const blob = await response.blob()
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type))
      throw new Error('图片格式不支持')
    if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
    source.value = new File([blob], item.name || '生成图片.png', { type: blob.type })
    sourceUrl.value = URL.createObjectURL(blob)
    submitted.value = false
    mode.value = 'custom'
    notice.value = '已将这张结果作为原图，修改美工要求后可继续生成。'
  } catch {
    notice.value = '结果图片暂时无法读取，可以保存图片后重新选择。'
  } finally {
    running.value = false
  }
}
async function generate() {
  if (props.busy || running.value) return
  if (!source.value) {
    notice.value = '先选一张产品原图，便于保留真实款式。'
    return
  }
  previousResultIds.value = (props.results || []).map((item) => item.id)
  submitted.value = true
  running.value = true
  notice.value = '正在上传原图并生成；进度与结果同时保存在当前对话。'
  try {
    await props.submitImage(
      commerceImagePrompt(
        mode.value,
        [
          platform.value && `目标平台：${platform.value}`,
          category.value && `产品类目：${category.value}`,
          instruction.value,
        ]
          .filter(Boolean)
          .join('；'),
        ratio.value,
      ),
      [source.value],
    )
    notice.value = '本轮处理已返回，请核对下方结果或当前对话中的说明。'
  } catch {
    notice.value = '本次未能提交，原图和美工要求已保留，可以重试。'
  } finally {
    running.value = false
  }
}
onBeforeUnmount(() => {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
})
</script>
<template>
  <ElDropdown trigger="click" @command="choose"
    ><ElButton size="small">工具</ElButton
    ><template #dropdown
      ><ElDropdownMenu
        ><ElDropdownItem command="conversation">对话</ElDropdownItem
        ><ElDropdownItem command="selection">选品方案</ElDropdownItem
        ><ElDropdownItem command="document">单据识别</ElDropdownItem
        ><ElDropdownItem command="image">电商出图</ElDropdownItem></ElDropdownMenu
      ></template
    ></ElDropdown
  >
  <SelectionWorkbench ref="selection" hide-entry /><DocumentRecognitionWorkbench
    ref="documentWorkbench"
    :busy="busy"
    :submit="submitDocument"
    :results="documentResults"
  />
  <ElDrawer v-model="imageOpen" title="电商出图" size="min(820px,96vw)">
    <div class="image-workbench">
      <div class="image-workbench__controls">
        <ElSelect v-model="mode" aria-label="出图用途"
          ><ElOption label="白底主图" value="white" /><ElOption
            label="家居场景"
            value="scene" /><ElOption label="自定义美工" value="custom" /></ElSelect
        ><ElSelect v-model="ratio" aria-label="图片比例"
          ><ElOption
            v-for="value in ['1:1', '4:5', '16:9']"
            :key="value"
            :label="value"
            :value="value"
        /></ElSelect>
      </div>
      <div class="image-workbench__controls">
        <ElSelect
          v-model="platform"
          filterable
          allow-create
          default-first-option
          clearable
          :loading="optionsLoading"
          placeholder="选择或输入平台"
          ><ElOption
            v-for="value in platformOptions"
            :key="value"
            :label="value"
            :value="value" /></ElSelect
        ><ElSelect
          v-model="category"
          filterable
          allow-create
          default-first-option
          clearable
          :loading="optionsLoading"
          placeholder="选择或输入产品类目"
          ><ElOption v-for="value in categoryOptions" :key="value" :label="value" :value="value"
        /></ElSelect>
      </div>
      <p v-if="optionsNotice" class="image-workbench__notice">{{ optionsNotice }}</p>
      <label class="image-workbench__upload"
        >选择产品原图<input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          :disabled="running || busy"
          @change="pick"
      /></label>
      <ElInput
        v-model="instruction"
        type="textarea"
        :rows="3"
        placeholder="例如：保留灯具结构，放入浅色客厅；不要添加文字。可直接写你的美工要求。"
      />
      <p class="image-workbench__notice">保留原商品结构与颜色，生成结果不会自动覆盖产品主图。</p>
      <div class="image-workbench__results">
        <figure v-if="sourceUrl">
          <ElImage :src="sourceUrl" fit="contain" :preview-src-list="[sourceUrl]" />
          <figcaption>产品原图 · {{ source?.name }}</figcaption>
        </figure>
        <figure v-for="item in imageResults" :key="item.id">
          <ElImage :src="item.url" fit="contain" :preview-src-list="[item.url]" />
          <figcaption>{{ item.name }}</figcaption>
          <a :href="item.url" target="_blank" rel="noopener noreferrer" download>打开 / 保存图片</a
          ><ElButton size="small" :disabled="running || busy" @click="useResult(item)"
            >基于此图再编辑</ElButton
          >
        </figure>
      </div>
      <p v-if="notice" class="image-workbench__notice" role="status">{{ notice }}</p>
    </div>
    <template #footer
      ><ElButton @click="imageOpen = false">回到对话</ElButton
      ><ElButton type="primary" :loading="running" :disabled="busy || running" @click="generate">{{
        imageResults.length ? '按当前要求再生成' : '开始生成'
      }}</ElButton></template
    >
  </ElDrawer>
</template>
<style scoped>
.image-workbench {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.image-workbench__controls {
  display: flex;
  gap: 12px;
}
.image-workbench__controls .el-select {
  width: 160px;
}
.image-workbench__upload {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.image-workbench__notice {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.image-workbench__results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.image-workbench__results figure {
  margin: 0;
  min-width: 0;
}
.image-workbench__results .el-image {
  width: 100%;
  height: 220px;
  background: var(--el-fill-color-extra-light);
}
.image-workbench__results figcaption {
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.image-workbench__results a {
  font-size: 12px;
  color: var(--el-color-primary);
}
</style>
