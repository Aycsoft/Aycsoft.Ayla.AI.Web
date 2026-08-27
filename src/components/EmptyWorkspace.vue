<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import BrandLogo from '@/components/BrandLogo.vue'
import MediaWorkspacePanel from '@/components/MediaWorkspacePanel.vue'
import { shouldShowMediaInspiration, type MediaCreationMode } from '@/utils/mediaInspiration'

const props = withDefaults(defineProps<{ mode?: 'chat' | 'image' | 'video'; messageCount?: number }>(), { mode: 'chat', messageCount: 0 })
defineEmits<{ prompt: [value: string]; upload: [] }>()
const settings = useSettingsStore()
const auth = useAuthStore()
const businessActions = [['查询 SKU 库存', 'lucide:package-search'], ['分析采购进度', 'lucide:truck'], ['生成销售报告', 'lucide:chart-no-axes-combined'], ['分析上传文件', 'lucide:file-search']]
const publicActions = [
  ['帮我梳理一个复杂问题', 'lucide:list-tree'], ['润色这段文字', 'lucide:wand-sparkles'], ['解释一个概念', 'lucide:message-circle-question'], ['总结我接下来提供的内容', 'lucide:file-text']
]
const actions = computed(() => auth.session ? businessActions : publicActions)
const showMediaInspiration = computed(() => shouldShowMediaInspiration(props.mode, props.messageCount))
const mediaMode = computed<MediaCreationMode>(() => props.mode === 'video' ? 'video' : 'image')
</script>

<template>
  <section class="empty-workspace">
    <BrandLogo :size="42" />
    <h1>{{ auth.session?.UserName ? `${auth.session.UserName}，今天想完成什么？` : `${settings.brand}，让工作更简单` }}</h1>
    <p>{{ auth.session ? settings.value.WelcomeMessage : '无需登录即可普通对话；访问 CrossCart 业务资源时再登录。' }}</p>
    <div v-if="mode === 'chat'" class="quick-grid">
      <button v-for="action in actions" :key="action[0]" @click="$emit('prompt', action[0])"><Icon :icon="action[1]" /><span>{{ action[0] }}</span></button>
    </div>
    <MediaWorkspacePanel v-else-if="showMediaInspiration" :mode="mediaMode" @prompt="$emit('prompt', $event)" />
    <button v-if="auth.session" class="upload-entry" @click="$emit('upload')"><Icon icon="lucide:paperclip" /> 上传文件</button>
  </section>
</template>
