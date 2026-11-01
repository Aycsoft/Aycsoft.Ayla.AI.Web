<script setup lang="ts">
/**
 * 消息时间线，组合正文、附件、引用、资产、耗时和反馈入口。
 * 直接订阅会话 Store；仅在用户接近底部时跟随流式内容滚动。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { aiApi } from '@/api/ai'
import { formatMessageTime, parseApiTime } from '@/utils/apiTime'
import { useChatStore } from '@/stores/chat'
import ReasoningTimeline from '@/components/ReasoningTimeline.vue'
import RichMessageContent from '@/components/RichMessageContent.vue'
import MessageAttachmentList from '@/components/MessageAttachmentList.vue'
import ArtifactOutputCard from '@/components/ArtifactOutputCard.vue'
import TokenUsagePanel from '@/components/TokenUsagePanel.vue'
import FeedbackDialog from '@/components/FeedbackDialog.vue'
import GenerationProgressCard from '@/components/GenerationProgressCard.vue'
import SourceFavicon from '@/components/SourceFavicon.vue'
import ProductObservationSummary from '@/components/ProductObservationSummary.vue'
import BusinessResults from '@/components/BusinessResults.vue'
import PendingAgentInput from '@/components/PendingAgentInput.vue'
import type { Artifact, Message } from '@/types/ai'
import {
  citationDateLabel,
  citationHost,
  citationTitle,
  citationUrl,
  messageResponseNotice,
  needsMediaJobReview,
} from '@/utils/messagePresentation'
import { formatElapsedTime } from '@/utils/elapsedTime'
import { getSuggestedQuestions } from '@/utils/suggestedQuestions'
import { mergeArtifacts } from '@/utils/messageAttachments'

// 仅向父级发出填入草稿事件，不在消息组件内发送请求或审批。
const emit = defineEmits<{ suggest: [question: string] }>()

const chat = useChatStore()
const container = ref<HTMLElement>()
const nearBottom = ref(true)
const clock = ref(Date.now())
let clockTimer: number | undefined
const feedbackTarget = ref<{ message: Message; rating: 1 | -1 }>()
const feedbackSubmitting = ref(false)
const latestAssistantId = computed(
  () => [...chat.messages].reverse().find((message) => message.Role === 'assistant')?.Id,
)
const updateScrollState = () => {
  const el = container.value
  if (el) nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 120
}
const scrollBottom = () =>
  nextTick(() => {
    const el = container.value
    if (el) el.scrollTop = el.scrollHeight
  })
onMounted(() => {
  updateScrollState()
  void scrollBottom()
  clockTimer = window.setInterval(() => {
    clock.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
})
onUpdated(() => {
  if (nearBottom.value) void scrollBottom()
})
const copy = async (value: string) => {
  await navigator.clipboard.writeText(value)
  ElMessage.success('已复制')
}
const openFeedback = (message: Message, rating: 1 | -1) => {
  if (!message.Id.startsWith('local-')) feedbackTarget.value = { message, rating }
}
const submitFeedback = async (value: {
  category: string
  detail: string
  contact: string
  screenshot?: File
}) => {
  const target = feedbackTarget.value
  if (!target || feedbackSubmitting.value) return
  feedbackSubmitting.value = true
  try {
    // 截图先上传取得服务端文件 ID，再与消息评价关联，不能发送本地 File 对象。
    let screenshotFileId = ''
    if (value.screenshot) {
      if (value.screenshot.size > 5 * 1024 * 1024) {
        ElMessage.error('反馈截图不能超过 5MB')
        return
      }
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
      Contact: value.contact || undefined,
    })
    if (feedbackTarget.value === target) feedbackTarget.value = undefined
    ElMessage.success('反馈已提交给 Ayla')
  } catch (error) {
    ElMessage.error((error as Error).message || '反馈提交失败，请重试')
  } finally {
    feedbackSubmitting.value = false
  }
}
// 历史消息和 AgentRun 可能重复返回同一资产，按服务端 ID 合并显示。
const artifacts = (message: Message): Artifact[] =>
  mergeArtifacts([...(message.Artifacts || []), ...(message.AgentRun?.Artifacts || [])])
const citations = (message: Message) =>
  [...(message.Citations || []), ...(message.WebSources || [])].filter((item, index, all) => {
    const key = citationUrl(item) || `${citationTitle(item)}:${item.DocumentId || ''}`
    return (
      all.findIndex(
        (candidate) =>
          (citationUrl(candidate) ||
            `${citationTitle(candidate)}:${candidate.DocumentId || ''}`) === key,
      ) === index
    )
  })
const artifactProgress = (artifact: Artifact) =>
  [...chat.traces]
    .reverse()
    .find((step) =>
      `${step.ToolCode || ''} ${step.Title}`
        .toLowerCase()
        .includes(artifact.Type.toLowerCase().split('.').at(-1) || ''),
    )?.Progress
// 仅展示当前运行步骤返回的进度，不继承前一步已完成的100%。
const activeProgress = computed(
  () => [...chat.traces].reverse().find((step) => step.Status === 'running')?.Progress,
)
const activeStage = computed(() => {
  const step = [...chat.traces].reverse().find((item) => item.Status === 'running')
  return step?.Detail || step?.Title
})
const messageUsage = (message: Message) => ({
  input: message.InputTokens,
  output: message.OutputTokens,
  model: message.Model,
})
const messageElapsed = (message: Message) => {
  if (message.Status === 'streaming') {
    const started = message.CreateTime ? parseApiTime(message.CreateTime).getTime() : clock.value
    return formatElapsedTime(Math.max(0, clock.value - started))
  }
  return message.TotalDurationMs != null ? formatElapsedTime(message.TotalDurationMs) : ''
}
</script>

<template>
  <div ref="container" class="message-list" aria-live="polite" @scroll="updateScrollState">
    <article v-for="message in chat.messages" :key="message.Id" :class="['message', message.Role]">
      <div class="message-body">
        <div v-if="message.Role === 'user'" class="user-message">
          <div v-if="message.Content" class="user-message-bubble">
            <RichMessageContent :content="message.Content" />
          </div>
          <MessageAttachmentList
            v-if="message.Attachments?.length"
            :reusable="message.Role === 'user'"
            :files="message.Attachments"
            :conversation-id="message.ConversationId || chat.currentId"
          />
        </div>
        <template v-else>
          <div v-if="message.Id === latestAssistantId && chat.traces.length">
            <ReasoningTimeline />
          </div>
          <div
            v-else-if="message.Status === 'streaming' && !message.Content"
            class="message-progress"
          >
            <Icon icon="lucide:loader-circle" /> 正在连接…
          </div>
          <div v-else-if="message.Status === 'stopped'" class="message-progress stopped">
            <Icon icon="lucide:square" /> 已停止生成
          </div>
          <div v-if="messageElapsed(message)" class="message-elapsed" role="status">
            <Icon v-if="message.Status === 'streaming'" icon="lucide:timer" />已处理
            {{ messageElapsed(message) }}
          </div>
          <div v-if="message.Content" class="message-content">
            <RichMessageContent :content="message.Content" />
          </div>
          <BusinessResults :message="message" />
          <PendingAgentInput
            :message="message"
            :busy="chat.streaming"
            @suggest="emit('suggest', $event)"
          />
          <div
            v-if="
              (message.Id === latestAssistantId &&
                message.Status === 'streaming' &&
                chat.activeGenerationKind) ||
              artifacts(message).length
            "
            class="generation-output-stack"
          >
            <GenerationProgressCard
              v-if="
                message.Id === latestAssistantId &&
                message.Status === 'streaming' &&
                chat.activeGenerationKind
              "
              :kind="chat.activeGenerationKind"
              :progress="activeProgress"
              :stage="activeStage"
            />
            <div v-if="artifacts(message).length" class="artifact-output-list">
              <ArtifactOutputCard
                v-for="artifact in artifacts(message)"
                :key="artifact.ArtifactId"
                :artifact="artifact"
                :progress="artifactProgress(artifact)"
              />
            </div>
          </div>
          <MessageAttachmentList
            v-if="message.Attachments?.length"
            :files="message.Attachments"
            :conversation-id="message.ConversationId || chat.currentId"
          />
          <div v-if="citations(message).length" class="citations">
            <details>
              <summary>
                <Icon icon="lucide:book-open-text" />参考来源 · {{ citations(message).length }}
              </summary>
              <ol>
                <li
                  v-for="(source, index) in citations(message)"
                  :key="`${citationUrl(source)}-${index}`"
                >
                  <a
                    v-if="citationUrl(source)"
                    :href="citationUrl(source)"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    ><span class="citation-primary"
                      ><SourceFavicon :url="citationUrl(source)" /><span>{{
                        citationTitle(source)
                      }}</span></span
                    ><small>{{ citationHost(source) || '打开来源' }}</small
                    ><Icon class="citation-external" icon="lucide:arrow-up-right" /><small
                      v-if="citationDateLabel(source)"
                      class="citation-date"
                      >{{ citationDateLabel(source) }}</small
                    ></a
                  ><span v-else
                    ><span class="citation-primary"
                      ><span class="source-favicon"><Icon icon="lucide:file-text" /></span
                      ><span>{{ citationTitle(source) }}</span></span
                    ><small>{{
                      source.Section || (source.Page ? `第 ${source.Page} 页` : '授权业务来源')
                    }}</small></span
                  >
                  <ProductObservationSummary
                    :observation="source.ProductObservation"
                    :source-url="citationUrl(source)"
                  />
                </li>
              </ol>
            </details>
          </div>
          <div
            v-if="messageResponseNotice(message)"
            class="inline-error message-response-notice"
            role="alert"
          >
            <Icon icon="lucide:circle-alert" />
            <div>
              <strong>{{ messageResponseNotice(message)?.title }}</strong>
              <p>{{ messageResponseNotice(message)?.detail }}</p>
            </div>
          </div>
          <div
            v-if="getSuggestedQuestions(message).length"
            class="suggested-questions"
            aria-label="继续了解"
          >
            <button
              v-for="question in getSuggestedQuestions(message)"
              :key="question"
              type="button"
              :disabled="chat.streaming"
              @click="emit('suggest', question)"
            >
              {{ question }} <span aria-hidden="true">↗</span>
            </button>
          </div>
          <footer
            v-if="message.Content || message.Status === 'error' || message.Status === 'stopped'"
            class="message-actions"
          >
            <button aria-label="复制" title="复制" @click="copy(message.Content)">
              <Icon icon="lucide:copy" />
            </button>
            <template v-if="!message.Id.startsWith('local-')">
              <button aria-label="有帮助" title="有帮助" @click="openFeedback(message, 1)">
                <Icon icon="lucide:thumbs-up" />
              </button>
              <button aria-label="需改进" title="需改进" @click="openFeedback(message, -1)">
                <Icon icon="lucide:thumbs-down" />
              </button>
            </template>
            <time>{{ formatMessageTime(message.CreateTime) }}</time>
            <button
              v-if="
                (message.Status === 'error' || message.Status === 'stopped') &&
                !needsMediaJobReview(message)
              "
              :disabled="chat.preparing || chat.streaming"
              aria-label="重试"
              title="重试"
              @click="chat.retry(message.Id)"
            >
              <Icon icon="lucide:rotate-ccw" />
            </button>
          </footer>
          <TokenUsagePanel
            v-if="message.Status !== 'streaming'"
            :input-tokens="messageUsage(message).input"
            :output-tokens="messageUsage(message).output"
            :model="messageUsage(message).model"
          />
        </template>
      </div>
    </article>
    <button v-if="!nearBottom" class="back-to-bottom" @click="scrollBottom">
      <Icon icon="lucide:arrow-down" />回到底部
    </button>
    <FeedbackDialog
      v-if="feedbackTarget"
      :open="true"
      :rating="feedbackTarget.rating"
      :busy="feedbackSubmitting"
      :message-id="feedbackTarget.message.Id"
      :conversation-id="feedbackTarget.message.ConversationId"
      :model="messageUsage(feedbackTarget.message).model || undefined"
      @close="feedbackTarget = undefined"
      @submit="submitFeedback"
    />
  </div>
</template>

<style scoped>
.suggested-questions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-top: 14px;
}
.suggested-questions button {
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 4px 0;
  color: var(--mm-secondary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}
.suggested-questions button:hover,
.suggested-questions button:focus-visible {
  color: var(--mm-text);
}
.suggested-questions button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
