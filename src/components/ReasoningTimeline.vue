<script setup lang="ts">
/**
 * 会话执行轨迹摘要，只展示经过安全清洗的用户可见步骤。
 * 数据来自会话 Store；内部推理文本不可直接作为原始详情或 HTML 输出。
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'
import { sanitizeReasoningText } from '@/utils/reasoningSafety'

const chat = useChatStore()
const elapsed = computed(() => Math.max(0, ...chat.traces.map((x) => x.ElapsedMs || 0)))
const seconds = computed(() => (elapsed.value ? Math.max(1, Math.round(elapsed.value / 1000)) : 0))
const thinking = computed(() => chat.traces.length)
const summary = computed(() =>
  chat.streaming ? '执行中' : seconds.value ? `共执行 ${seconds.value} 秒` : '执行完成',
)
const stepIcon = (status: string) =>
  status === 'completed'
    ? 'lucide:check'
    : status === 'failed'
      ? 'lucide:x'
      : status === 'cancelled'
        ? 'lucide:square'
        : 'lucide:loader-circle'
</script>

<template>
  <details class="reasoning-timeline" :open="chat.streaming">
    <summary>{{ summary }}<Icon icon="lucide:chevron-down" /></summary>
    <div class="reasoning-divider" />
    <div class="reasoning-count">思考 {{ thinking }} 次</div>
    <div class="reasoning-title"><Icon icon="lucide:brain" />思考过程</div>
    <div class="reasoning-steps">
      <div v-for="step in chat.traces" :key="step.StepId" :class="['reasoning-step', step.Status]">
        <Icon :icon="stepIcon(step.Status)" /><span
          >{{ sanitizeReasoningText(step.Title)
          }}<small v-if="step.Detail">{{ sanitizeReasoningText(step.Detail) }}</small></span
        >
      </div>
    </div>
  </details>
</template>
