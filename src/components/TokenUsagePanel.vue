<script setup lang="ts">
/**
 * 单条消息 Token 用量和模型标识，不推算缺失统计。
 * null / undefined 表示服务端未返回，与合法的零用量区别展示。
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
const props = defineProps<{
  inputTokens?: number | null
  outputTokens?: number | null
  model?: string | null
}>()
const hasUsage = computed(
  () => Number.isFinite(props.inputTokens) || Number.isFinite(props.outputTokens),
)
const total = computed(() =>
  hasUsage.value ? (props.inputTokens || 0) + (props.outputTokens || 0) : null,
)
</script>
<template>
  <details class="token-usage-panel">
    <summary>
      <Icon icon="lucide:gauge" />Token 用量
      <span>{{ total === null ? '暂无计费数据' : `${total.toLocaleString()} tokens` }}</span>
    </summary>
    <div v-if="hasUsage">
      <span
        >输入<strong>{{ inputTokens?.toLocaleString() ?? '—' }}</strong></span
      ><span
        >输出<strong>{{ outputTokens?.toLocaleString() ?? '—' }}</strong></span
      ><span
        >模型<strong>{{ model || '后端未返回' }}</strong></span
      >
    </div>
    <p v-else>当前后端没有返回可核验的 token usage，因此不做估算，也不展示虚构费用。</p>
  </details>
</template>
