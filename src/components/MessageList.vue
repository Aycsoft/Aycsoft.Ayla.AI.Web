<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { aiApi } from '@/api/ai'
import { useChatStore } from '@/stores/chat'
import ReasoningTimeline from '@/components/ReasoningTimeline.vue'
import RichMessageContent from '@/components/RichMessageContent.vue'
import MessageAttachmentList from '@/components/MessageAttachmentList.vue'
import ArtifactOutputCard from '@/components/ArtifactOutputCard.vue'
import TokenUsagePanel from '@/components/TokenUsagePanel.vue'
import FeedbackDialog from '@/components/FeedbackDialog.vue'
import GenerationProgressCard from '@/components/GenerationProgressCard.vue'
import type { Artifact, Message } from '@/types/ai'
import { citationHost, citationTitle, citationUrl } from '@/utils/messagePresentation'
import { formatElapsedTime } from '@/utils/elapsedTime'

const chat = useChatStore(); const container = ref<HTMLElement>(); const nearBottom = ref(true); const clock = ref(Date.now()); let clockTimer: number | undefined
const feedbackTarget = ref<{ message: Message; rating: 1 | -1 }>()
const latestAssistantId = computed(() => [...chat.messages].reverse().find(message => message.Role === 'assistant')?.Id)
const updateScrollState = () => { const el = container.value; if (el) nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 120 }
const scrollBottom = () => nextTick(() => { const el = container.value; if (el) el.scrollTop = el.scrollHeight })
onMounted(() => { updateScrollState(); void scrollBottom(); clockTimer = window.setInterval(() => { clock.value = Date.now() }, 1000) })
onBeforeUnmount(() => { if (clockTimer !== undefined) window.clearInterval(clockTimer) })
onUpdated(() => { if (nearBottom.value) void scrollBottom() })
const copy = async (value: string) => { await navigator.clipboard.writeText(value); ElMessage.success('已复制') }
const openFeedback = (message: Message, rating: 1 | -1) => { if (!message.Id.startsWith('local-')) feedbackTarget.value = { message, rating } }
const submitFeedback = async (value: { category: string; detail: string; contact: string; screenshot?: File }) => {
  const target = feedbackTarget.value; if (!target) return
  let screenshotFileId = ''
  if (value.screenshot) {
    if (value.screenshot.size > 5 * 1024 * 1024) { ElMessage.error('反馈截图不能超过 5MB'); return }
    screenshotFileId = (await aiApi.upload(value.screenshot)).FileId
  }
  const usage = messageUsage(target.message)
  await aiApi.feedback(target.message.Id, {
    Rating: target.rating,
    Type: value.category,
    Description: value.detail || undefined,
    ConversationId: target.message.ConversationId,
    ModelAlias: usage.model || undefined,
    ScreenshotFileId: screenshotFileId || undefined,
    Contact: value.contact || undefined
  }); feedbackTarget.value = undefined; ElMessage.success('反馈已提交给 Ayla')
}
const artifacts = (message: Message): Artifact[] => [...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])].filter((item, index, all) => all.findIndex(candidate => candidate.ArtifactId === item.ArtifactId) === index)
const citations = (message: Message) => [...(message.Citations || []), ...(message.WebSources || [])].filter((item, index, all) => { const key = citationUrl(item) || `${citationTitle(item)}:${item.DocumentId || ''}`; return all.findIndex(candidate => (citationUrl(candidate) || `${citationTitle(candidate)}:${candidate.DocumentId || ''}`) === key) === index })
const artifactProgress = (artifact: Artifact) => [...chat.traces].reverse().find(step => `${step.ToolCode || ''} ${step.Title}`.toLowerCase().includes(artifact.Type.toLowerCase().split('.').at(-1) || ''))?.Progress
const activeProgress = computed(() => Math.max(0, ...chat.traces.map(step => step.Progress || 0)))
const activeStage = computed(() => [...chat.traces].reverse().find(step => step.Status === 'running')?.Detail || [...chat.traces].reverse().find(step => step.Status === 'running')?.Title)
const messageUsage = (message: Message) => ({ input: message.InputTokens, output: message.OutputTokens, model: message.Model })
const messageElapsed = (message: Message) => {
  if (message.Status === 'streaming') {
    const started = message.CreateTime ? new Date(message.CreateTime).getTime() : clock.value
    return formatElapsedTime(Math.max(0, clock.value - started))
  }
  return message.TotalDurationMs != null ? formatElapsedTime(message.TotalDurationMs) : ''
}
</script>

<template>
  <div ref="container" class="message-list" aria-live="polite" @scroll="updateScrollState">
    <article v-for="message in chat.messages" :key="message.Id" :class="['message', message.Role]">
      <div class="message-body">
        <div v-if="message.Role === 'user'" class="user-message"><RichMessageContent :content="message.Content" /><MessageAttachmentList v-if="message.Attachments?.length" :files="message.Attachments" /></div>
        <template v-else>
          <div v-if="message.Id === latestAssistantId && chat.traces.length"><ReasoningTimeline /></div>
          <div v-else-if="message.Status === 'streaming' && !message.Content" class="message-progress"><Icon icon="lucide:loader-circle" /> 正在连接…</div>
          <div v-else-if="message.Status === 'stopped'" class="message-progress stopped"><Icon icon="lucide:square" /> 已停止生成</div>
          <div v-if="messageElapsed(message)" class="message-elapsed" role="status"><Icon v-if="message.Status === 'streaming'" icon="lucide:timer" />已处理 {{ messageElapsed(message) }}</div>
          <div v-if="message.Content" class="message-content"><RichMessageContent :content="message.Content" /></div>
          <GenerationProgressCard v-if="message.Id === latestAssistantId && message.Status === 'streaming' && chat.activeGenerationKind" :kind="chat.activeGenerationKind" :progress="activeProgress" :stage="activeStage" />
          <MessageAttachmentList v-if="message.Attachments?.length" :files="message.Attachments" />
          <div v-if="artifacts(message).length" class="artifact-output-list"><ArtifactOutputCard v-for="artifact in artifacts(message)" :key="artifact.ArtifactId" :artifact="artifact" :progress="artifactProgress(artifact)" /></div>
          <div v-if="citations(message).length" class="citations"><details open><summary>参考来源 · {{ citations(message).length }}</summary><ol><li v-for="(source, index) in citations(message)" :key="`${citationUrl(source)}-${index}`"><a v-if="citationUrl(source)" :href="citationUrl(source)" target="_blank" rel="noopener noreferrer nofollow"><span>{{ citationTitle(source) }}</span><small>{{ citationHost(source) || '打开来源' }}</small><Icon icon="lucide:external-link" /></a><span v-else><span>{{ citationTitle(source) }}</span><small>{{ source.Section || (source.Page ? `第 ${source.Page} 页` : '授权业务来源') }}</small></span></li></ol></details></div>
          <div v-if="message.ErrorMessage" class="inline-error"><Icon icon="lucide:circle-alert" />{{ message.ErrorMessage }}</div>
          <footer v-if="message.Content || message.Status === 'error' || message.Status === 'stopped'" class="message-actions">
            <button @click="copy(message.Content)" aria-label="复制" title="复制"><Icon icon="lucide:copy" /></button>
            <template v-if="!message.Id.startsWith('local-')">
              <button @click="openFeedback(message, 1)" aria-label="有帮助" title="有帮助"><Icon icon="lucide:thumbs-up" /></button>
              <button @click="openFeedback(message, -1)" aria-label="需改进" title="需改进"><Icon icon="lucide:thumbs-down" /></button>
            </template>
            <time>{{ message.CreateTime ? new Date(message.CreateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }}</time>
            <button v-if="message.Status === 'error' || message.Status === 'stopped'" @click="chat.retry()" aria-label="重试" title="重试"><Icon icon="lucide:rotate-ccw" /></button>
          </footer>
          <TokenUsagePanel v-if="message.Status !== 'streaming'" :input-tokens="messageUsage(message).input" :output-tokens="messageUsage(message).output" :model="messageUsage(message).model" />
        </template>
      </div>
    </article>
    <button v-if="!nearBottom" class="back-to-bottom" @click="scrollBottom"><Icon icon="lucide:arrow-down" />回到底部</button>
    <FeedbackDialog v-if="feedbackTarget" :open="true" :rating="feedbackTarget.rating" :message-id="feedbackTarget.message.Id" :conversation-id="feedbackTarget.message.ConversationId" :model="messageUsage(feedbackTarget.message).model || undefined" @close="feedbackTarget = undefined" @submit="submitFeedback" />
  </div>
</template>
