<script setup lang="ts">
import { computed } from 'vue'
import CodeBlockCard from './CodeBlockCard.vue'
import { parseMessageContent } from '@/utils/messageContent'
import { renderMarkdownSafe } from '@/utils/safeMarkdown'
import { stripLegacyAiFooter } from '@/utils/messagePresentation'
import '@/gfm.css'
const props = defineProps<{ content: string }>()
const segments = computed(() => parseMessageContent(stripLegacyAiFooter(props.content)))
</script>
<template><div class="rich-message-content"><template v-for="(segment, index) in segments" :key="index"><CodeBlockCard v-if="segment.type === 'code'" :code="segment.content" :language="segment.language" /><div v-else class="gfm-content" v-html="renderMarkdownSafe(segment.content)" /></template></div></template>
