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
const thinking = computed(() => chat.traces.length)
const summary = computed(() => (chat.streaming ? '执行中' : `执行记录 · ${thinking.value} 个步骤`))
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
    <div class="reasoning-count">{{ thinking }} 个执行步骤</div>
    <div class="reasoning-title"><Icon icon="lucide:brain" />执行过程</div>
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
