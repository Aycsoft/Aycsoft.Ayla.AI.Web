<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElButton, ElDrawer, ElImage, ElInput } from 'element-plus'
import MarkdownRenderer from './RichMessageContent.vue'
const props = defineProps<{
  busy: boolean
  submit: (prompt: string, files: File[]) => Promise<void>
  results: { id: string; content: string }[]
}>()
const visible = ref(false),
  running = ref(false),
  notice = ref(''),
  request = ref('')
const file = ref<File>(),
  url = ref(''),
  baseline = ref<string[]>([]),
  submitted = ref(false)
const rows = computed(() =>
  submitted.value ? props.results.filter((item) => !baseline.value.includes(item.id)) : [],
)
function open() {
  visible.value = true
}
function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.files?.[0]
  input.value = ''
  if (!value) return
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(value.type) ||
    value.size > 20 * 1024 * 1024
  ) {
    notice.value = '请选择20MB以内PNG、JPG或WebP单据图片。'
    return
  }
  if (url.value) URL.revokeObjectURL(url.value)
  file.value = value
  url.value = URL.createObjectURL(value)
  submitted.value = false
  notice.value = ''
}
async function recognize() {
  if (running.value || props.busy) return
  if (!file.value) {
    notice.value = '先选择一张单据照片。'
    return
  }
  baseline.value = props.results.map((item) => item.id)
  submitted.value = true
  running.value = true
  notice.value = '正在识别原图与修改痕迹…'
  try {
    await props.submit(
      '识别这张单据图片，按原始行整理表格：字段、印刷原值、手写候选、确认值、待确认原因。手写覆盖、删改或模糊内容必须保留原值并标记待确认，不能自动确定，不把型号等同SKU。只识别，不生成图片、不写入业务单据。\n' +
        request.value,
      [file.value],
    )
    notice.value = '请对照原图核对识别结果，待确认项不会自动写入业务单据。'
  } catch {
    notice.value = '本次未能提交，原图已保留，可以重试。'
  } finally {
    running.value = false
  }
}
onBeforeUnmount(() => {
  if (url.value) URL.revokeObjectURL(url.value)
})
defineExpose({ open })
</script>
<template>
  <ElDrawer v-model="visible" append-to-body title="单据识别" size="min(1120px,96vw)"
    ><div class="document-workbench">
      <div class="document-workbench__source">
        <label
          >选择单据照片<input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="running || busy"
            @change="pick" /></label
        ><ElImage v-if="url" :src="url" fit="contain" :preview-src-list="[url]" /><ElInput
          v-model="request"
          type="textarea"
          :rows="2"
          placeholder="补充说明（可选），例如重点核对手写数量"
        />
      </div>
      <div class="document-workbench__result">
        <p v-if="notice" role="status">{{ notice }}</p>
        <MarkdownRenderer v-for="item in rows" :key="item.id" :content="item.content" />
        <p v-if="!rows.length && !running">识别后在这里对照原图查看逐行结果。</p>
      </div>
    </div>
    <template #footer
      ><ElButton @click="visible = false">回到对话</ElButton
      ><ElButton type="primary" :loading="running" :disabled="running || busy" @click="recognize"
        >识别单据</ElButton
      ></template
    ></ElDrawer
  >
</template>
<style scoped>
.document-workbench {
  display: grid;
  grid-template-columns: minmax(220px, 32%) minmax(0, 1fr);
  gap: 20px;
}
.document-workbench__source {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.document-workbench__source label {
  font-size: 13px;
}
.document-workbench__source input {
  max-width: 100%;
  margin-top: 8px;
}
.document-workbench__source .el-image {
  width: 100%;
  max-height: 460px;
}
.document-workbench__result {
  min-width: 0;
  font-size: 13px;
}
.document-workbench__result > p {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.document-workbench__result :deep(table) {
  font-size: 12px;
}
.document-workbench__result :deep(th),
.document-workbench__result :deep(td) {
  padding: 6px 8px;
}
@media (max-width: 720px) {
  .document-workbench {
    grid-template-columns: 1fr;
  }
}
</style>
