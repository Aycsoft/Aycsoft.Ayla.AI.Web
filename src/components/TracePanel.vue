<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'

defineProps<{ open: boolean }>()
defineEmits<{ toggle: [] }>()
const chat = useChatStore()
const completed = computed(() => chat.traces.filter(x => x.Status === 'completed').length)
const running = computed(() => chat.traces.find(x => x.Status === 'running'))
const summary = computed(() => running.value?.Title || (chat.traces.length ? `已完成 ${completed.value}/${chat.traces.length}` : `${chat.artifacts.length} 个资产`))
const icon = (status: string) => status === 'completed' ? 'lucide:check' : status === 'failed' ? 'lucide:x' : status === 'cancelled' ? 'lucide:square' : 'lucide:loader-circle'
const openArtifact = (id: string) => window.dispatchEvent(new CustomEvent('ayla:artifact-open', { detail: id }))
</script>

<template>
  <aside v-if="chat.traces.length || chat.artifacts.length" :class="['progress-popover', { open }]" aria-label="任务进度">
    <button class="progress-summary" @click="$emit('toggle')">
      <span><strong>进度</strong><small>{{ summary }}</small></span>
      <Icon :icon="open ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
    </button>
    <div v-if="open" class="progress-detail">
      <div v-for="step in chat.traces" :key="step.StepId" :class="['progress-step', step.Status]">
        <Icon :icon="icon(step.Status)" /><span>{{ step.Title }}</span><small v-if="step.ElapsedMs">{{ step.ElapsedMs }}ms</small>
      </div>
      <button v-for="item in chat.artifacts" :key="item.ArtifactId" @click="openArtifact(item.ArtifactId)">
        <Icon icon="lucide:file" /><span>{{ item.FileName }}</span>
      </button>
    </div>
  </aside>
</template>
