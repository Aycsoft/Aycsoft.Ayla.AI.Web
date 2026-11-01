<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Message } from '@/types/ai'
import { clarificationDraft } from '@/utils/businessResults'

const props = defineProps<{ message: Message; busy?: boolean }>()
const emit = defineEmits<{ suggest: [value: string] }>()
const answers = reactive<Record<string, string | string[]>>({})
const questions = computed(() => props.message.Clarification?.Questions || [])
const canPrepare = computed(
  () =>
    questions.value.every((question) => {
      const value = answers[question.Id]
      return (
        !question.Required || (Array.isArray(value) ? value.length > 0 : Boolean(value?.trim()))
      )
    }) && questions.value.some((question) => Boolean(answers[question.Id]?.length)),
)
watch(
  () => props.message.Clarification,
  () => {
    Object.keys(answers).forEach((key) => delete answers[key])
  },
  { immediate: true },
)
/** 当前服务只提供下一轮对话，不能把填入草稿宣称为恢复原执行或批准变更。 */
const prepare = () => {
  if (props.message.Clarification && canPrepare.value)
    emit('suggest', clarificationDraft(props.message.Clarification, answers))
}
</script>

<template>
  <section v-if="message.Clarification || message.Approval" class="pending-agent-input">
    <template v-if="message.Clarification">
      <strong>{{ message.Clarification.Title || '需要补充信息' }}</strong>
      <label v-for="question in questions" :key="question.Id">
        <span>{{ question.Label }}<small v-if="question.Required">（必填）</small></span>
        <select
          v-if="question.Type === 'single' || question.Type === 'multiple'"
          v-model="answers[question.Id]"
          :multiple="question.Type === 'multiple'"
        >
          <option v-if="question.Type === 'single'" value="">请选择</option>
          <option
            v-for="option in question.Options || []"
            :key="option.Value"
            :value="option.Value"
          >
            {{ option.Label }}
          </option>
        </select>
        <input
          v-else
          v-model="answers[question.Id]"
          :type="question.Type === 'number' ? 'number' : question.Type === 'date' ? 'date' : 'text'"
          :placeholder="question.Placeholder"
        />
      </label>
      <small>补充内容会填入输入框，由你发送下一条消息。</small>
      <button type="button" :disabled="busy || !canPrepare" @click="prepare">填入补充信息</button>
    </template>
    <template v-if="message.Approval">
      <strong>{{ message.Approval.Title || '执行前需要确认' }}</strong>
      <p>{{ message.Approval.Description }}</p>
      <small>当前工作台尚不支持继续审批执行，请通过已有业务审批入口处理。</small>
    </template>
  </section>
</template>

<style scoped>
.pending-agent-input {
  margin-top: 14px;
  padding: 12px 0;
  border-top: 1px solid var(--mm-line);
}
.pending-agent-input strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
}
.pending-agent-input label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
  font-size: 13px;
}
.pending-agent-input input,
.pending-agent-input select {
  width: 100%;
  max-width: 420px;
  min-width: 0;
  padding: 8px;
  color: var(--mm-text);
  background: var(--surface);
  border: 1px solid var(--mm-line);
  border-radius: 6px;
  box-sizing: border-box;
}
.pending-agent-input small {
  display: block;
  color: var(--mm-secondary);
  font-size: 12px;
}
.pending-agent-input button {
  margin-top: 10px;
  padding: 6px 10px;
  cursor: pointer;
  color: var(--mm-text);
  background: var(--surface-subtle);
  border: 1px solid var(--mm-line);
  border-radius: 6px;
}
.pending-agent-input button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
