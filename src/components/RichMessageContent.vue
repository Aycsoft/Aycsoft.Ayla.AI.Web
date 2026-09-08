<script setup lang="ts">
/**
 * 富文本渲染入口，拆分代码围栏并交给独立代码卡片。
 * content 为模型原文；普通段落经 renderMarkdownSafe 处理后才能进入 v-html。
 */
import { computed } from 'vue'
import CodeBlockCard from './CodeBlockCard.vue'
import { parseMessageContent } from '@/utils/messageContent'
import { renderMarkdownSafe } from '@/utils/safeMarkdown'
import { stripLegacyAiFooter } from '@/utils/messagePresentation'
import '@/gfm.css'
const props = defineProps<{ content: string }>()
const segments = computed(() => parseMessageContent(stripLegacyAiFooter(props.content)))
</script>
<template>
  <div class="rich-message-content">
    <template v-for="(segment, index) in segments" :key="index">
      <CodeBlockCard
        v-if="segment.type === 'code'"
        :code="segment.content"
        :language="segment.language"
      />
      <!-- 唯一受审 HTML 出口：安全渲染器禁用原始 HTML，并限制链接与图片协议。 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else class="gfm-content" v-html="renderMarkdownSafe(segment.content)" />
    </template>
  </div>
</template>
