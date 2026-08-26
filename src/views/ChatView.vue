<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import ConversationSidebar from '@/components/ConversationSidebar.vue'
import EmptyWorkspace from '@/components/EmptyWorkspace.vue'
import MessageList from '@/components/MessageList.vue'
import ChatComposer from '@/components/ChatComposer.vue'
import TracePanel from '@/components/TracePanel.vue'
import ArtifactWorkspace from '@/components/ArtifactWorkspace.vue'
import CodePreviewWorkspace from '@/components/CodePreviewWorkspace.vue'

const chat = useChatStore(); const route = useRoute()
const auth = useAuthStore()
const leftOpen = ref(false); const progressOpen = ref(false); const prompt = ref('')
const artifactOpen = ref(false); const selectedArtifactId = ref('')
const codePreview = ref({ open: false, language: 'html', srcdoc: '' })
const creationMode = ref<'chat' | 'image' | 'video'>('chat')
onMounted(async () => {
  window.addEventListener('ayla:artifact-open', openArtifact as EventListener)
  window.addEventListener('ayla:code-preview-open', openCodePreview as EventListener)
  window.addEventListener('ayla:code-preview-close', closeCodePreview)
  await chat.bootstrap(typeof route.query.conversation === 'string' ? route.query.conversation : undefined)
  if (route.query.login === 'required') chat.loginRequired = true
})
onBeforeUnmount(() => { window.removeEventListener('ayla:artifact-open', openArtifact as EventListener); window.removeEventListener('ayla:code-preview-open', openCodePreview as EventListener); window.removeEventListener('ayla:code-preview-close', closeCodePreview) })
function openArtifact(event: CustomEvent<string>) { selectedArtifactId.value = event.detail; artifactOpen.value = true }
function openCodePreview(event: CustomEvent<{ language: string; srcdoc: string }>) { artifactOpen.value = false; codePreview.value = { open: true, language: event.detail.language, srcdoc: event.detail.srcdoc } }
function closeCodePreview() { codePreview.value.open = false }
const seed = (value: string) => { prompt.value = ''; requestAnimationFrame(() => prompt.value = value) }
</script>

<template>
  <div class="chat-page">
    <ConversationSidebar :open="leftOpen" @close="leftOpen = false" />
    <section :class="['chat-center', { empty: !chat.loading && !chat.messages.length }]">
      <header class="chat-header">
        <button class="icon-button sidebar-toggle" aria-label="打开导航" @click="leftOpen = true"><Icon icon="lucide:panel-left" /></button>
        <div class="chat-title"><strong>{{ chat.current?.Title || '新任务' }}</strong></div>
        <button v-if="chat.traces.length || chat.artifacts.length" class="icon-button progress-trigger" aria-label="查看任务进度" @click="progressOpen = !progressOpen"><Icon icon="lucide:panel-right" /></button>
      </header>
      <div v-if="chat.loginRequired && !auth.session" class="login-notice"><span>该请求需要访问 CrossCart 业务资源，请登录后继续。</span><button @click="auth.login()">立即登录</button></div>
      <div v-if="chat.loading" class="page-loading"><Icon icon="lucide:loader-circle" /> 正在载入授权会话…</div>
      <div v-else-if="chat.lastError && !chat.messages.length" class="service-error"><Icon icon="lucide:cloud-off" /><h2>AI 服务暂时不可用</h2><p>{{ chat.lastError }}</p><button @click="chat.bootstrap()">重新连接</button></div>
      <EmptyWorkspace v-else-if="!chat.messages.length" :mode="creationMode" @prompt="seed" @upload="seed('请分析我接下来上传的文件')" />
      <template v-else><MessageList /></template>
      <ChatComposer :seeded-prompt="prompt" @mode-changed="creationMode = $event" />
    </section>
    <TracePanel :open="progressOpen" @toggle="progressOpen = !progressOpen" />
    <ArtifactWorkspace :open="artifactOpen" :artifacts="chat.artifacts" :traces="chat.traces" :selected-id="selectedArtifactId" @close="artifactOpen = false" />
    <CodePreviewWorkspace :open="codePreview.open" :language="codePreview.language" :srcdoc="codePreview.srcdoc" @close="closeCodePreview" />
  </div>
</template>
