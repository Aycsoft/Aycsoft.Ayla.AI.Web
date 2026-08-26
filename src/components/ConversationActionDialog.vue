<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{ open: boolean; mode: 'rename' | 'delete'; title: string; busy?: boolean; error?: string }>()
const emit = defineEmits<{ close: []; confirm: [value: string] }>()
const value = ref('')
watch(() => [props.open, props.title], () => { if (props.open) value.value = props.title }, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ayla-dialog-backdrop" @click.self="emit('close')">
      <section class="ayla-dialog" role="dialog" aria-modal="true" :aria-labelledby="`conversation-${mode}-title`">
        <header><span :class="{ danger: mode === 'delete' }"><Icon :icon="mode === 'delete' ? 'lucide:trash-2' : 'lucide:pencil-line'" /></span><div><strong :id="`conversation-${mode}-title`">{{ mode === 'delete' ? '删除会话' : '重命名会话' }}</strong><small>{{ mode === 'delete' ? '此操作会从服务端删除真实会话记录' : '使用清晰的标题更容易找到历史任务' }}</small></div><button aria-label="关闭" @click="emit('close')"><Icon icon="lucide:x" /></button></header>
        <label v-if="mode === 'rename'" class="auth-field"><span>会话名称</span><div><Icon icon="lucide:message-square-text" /><input v-model="value" maxlength="100" autofocus @keydown.enter.prevent="value.trim() && emit('confirm', value.trim())" /></div></label>
        <div v-else class="ayla-delete-copy"><strong>{{ title }}</strong><p>删除后无法从 AI 工作台恢复，请确认该会话不再需要。</p></div>
        <p v-if="error" class="auth-error" role="alert"><Icon icon="lucide:circle-alert" />{{ error }}</p>
        <footer><button class="password-cancel" :disabled="busy" @click="emit('close')">取消</button><button :class="['ayla-dialog-confirm', { danger: mode === 'delete' }]" :disabled="busy || (mode === 'rename' && !value.trim())" @click="emit('confirm', value.trim())"><Icon :icon="busy ? 'lucide:loader-circle' : mode === 'delete' ? 'lucide:trash-2' : 'lucide:check'" />{{ busy ? '处理中…' : mode === 'delete' ? '确认删除' : '保存名称' }}</button></footer>
      </section>
    </div>
  </Teleport>
</template>
