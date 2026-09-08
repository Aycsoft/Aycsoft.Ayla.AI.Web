<script setup lang="ts">
/**
 * 消息反馈表单，收集分类、说明、联系方式及可选截图。
 * rating 决定默认分类；submit 传递表单值，上传和持久化由消息列表处理。
 */
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import BrandLogo from './BrandLogo.vue'
import OptionPicker from './OptionPicker.vue'

const props = defineProps<{
  open: boolean
  rating: 1 | -1
  messageId: string
  conversationId?: string
  model?: string
  /** 父级上传截图与保存评价的完整请求状态。 */
  busy?: boolean
}>()
const emit = defineEmits<{
  close: []
  submit: [value: { category: string; detail: string; contact: string; screenshot?: File }]
}>()
const category = ref(props.rating === 1 ? 'helpful' : 'incorrect')
const detail = ref('')
const contact = ref('')
const screenshot = ref<File>()
const categories = [
  { value: 'helpful', label: '回答有帮助' },
  { value: 'incorrect', label: '事实或结论错误' },
  { value: 'unsafe', label: '安全或隐私问题' },
  { value: 'format', label: '格式 / 文件问题' },
  { value: 'slow', label: '速度或中断问题' },
  { value: 'other', label: '其他' },
]
watch(
  () => props.open,
  (value) => {
    if (value) {
      category.value = props.rating === 1 ? 'helpful' : 'incorrect'
      detail.value = ''
      contact.value = ''
      screenshot.value = undefined
    }
  },
)
const pick = (event: Event) => {
  screenshot.value = (event.target as HTMLInputElement).files?.[0]
}
</script>
<template>
  <div v-if="open" class="ayla-dialog-backdrop" @click.self="emit('close')">
    <section
      class="feedback-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <header>
        <span><BrandLogo :size="26" /><strong id="feedback-title">向 Ayla 提交反馈</strong></span
        ><button aria-label="关闭" @click="emit('close')"><Icon icon="lucide:x" /></button>
      </header>
      <div class="feedback-context">
        <span>消息 {{ messageId.slice(0, 8) }}</span
        ><span>会话 {{ conversationId?.slice(0, 8) || '未返回' }}</span
        ><span>模型 {{ model || '后端未返回' }}</span>
      </div>
      <label
        ><span>反馈类型</span
        ><OptionPicker
          v-model="category"
          :options="categories"
          placeholder="选择反馈类型"
          aria-label="反馈类型" /></label
      ><label
        ><span>补充说明</span
        ><textarea
          v-model="detail"
          maxlength="700"
          rows="4"
          placeholder="请说明期望结果、实际问题和复现方式…"
        />
      </label>
      <div class="feedback-row">
        <label
          ><span>联系方式（可选）</span
          ><input v-model="contact" maxlength="120" placeholder="邮箱或企业联系方式" /></label
        ><label class="screenshot-picker"
          ><span>截图（可选）</span
          ><input type="file" accept="image/png,image/jpeg,image/webp" @change="pick" /><small>{{
            screenshot?.name || '选择图片，提交后关联文件 ID'
          }}</small></label
        >
      </div>
      <footer>
        <button @click="emit('close')">取消</button
        ><button
          class="primary"
          :disabled="busy || (!detail.trim() && rating === -1)"
          @click="
            emit('submit', { category, detail: detail.trim(), contact: contact.trim(), screenshot })
          "
        >
          <Icon :icon="busy ? 'lucide:loader-circle' : 'lucide:send'" />{{
            busy ? '提交中…' : '提交反馈'
          }}
        </button>
      </footer>
    </section>
  </div>
</template>
