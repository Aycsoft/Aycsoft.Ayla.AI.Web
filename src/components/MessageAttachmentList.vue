<script setup lang="ts">
/**
 * 消息附件列表，兼容字段并提供预览、下载与逐项重试。
 * files 为只读输入；失败状态按 FileId 隔离，不影响其他附件。
 */
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { Attachment } from '@/types/ai'
import { contentUrl, downloadBackendResource, downloadUrl } from '@/utils/backendResource'
import { classifyOutput } from '@/utils/messageContent'
import { normalizeAttachment } from '@/utils/messageAttachments'
import ResourceErrorCard from './ResourceErrorCard.vue'
import ResourcePreviewDialog from './ResourcePreviewDialog.vue'

const props = defineProps<{ files: Attachment[] }>()
const files = computed(() => props.files.map(normalizeAttachment))
const preview = ref<Attachment>()
const failed = ref<Record<string, string>>({})
const retryKeys = ref<Record<string, number>>({})
const markFailed = (file: Attachment, message = '附件加载失败，请重试') => {
  failed.value[file.FileId] = message
}
const retry = (file: Attachment) => {
  // 更新 key 强制重新挂载失败的媒体元素，否则浏览器可能保留旧错误状态。
  delete failed.value[file.FileId]
  retryKeys.value[file.FileId] = (retryKeys.value[file.FileId] || 0) + 1
}
const openPreview = (file: Attachment) => {
  if (!contentUrl(file)) markFailed(file, '文件服务未返回可预览地址')
  else preview.value = file
}
const download = async (file: Attachment) => {
  try {
    const source = downloadUrl(file)
    if (!source) throw new Error('missing download url')
    await downloadBackendResource(source, file.FileName)
    retry(file)
  } catch {
    markFailed(file, '附件下载失败，请重试')
  }
}
</script>
<template>
  <div class="typed-attachment-list">
    <article v-for="file in files" :key="file.FileId" class="typed-attachment-item">
      <ResourceErrorCard
        v-if="failed[file.FileId]"
        :message="failed[file.FileId]"
        @retry="retry(file)"
      />
      <template v-else>
        <button
          class="attachment-preview"
          :disabled="!contentUrl(file)"
          :title="`预览 ${file.FileName}`"
          :aria-label="`预览 ${file.FileName}`"
          @click="openPreview(file)"
        >
          <img
            v-if="
              classifyOutput('', file.FileName, file.ContentType) === 'image' && contentUrl(file)
            "
            :key="retryKeys[file.FileId]"
            :src="contentUrl(file)"
            :alt="file.FileName"
            loading="lazy"
            @error="markFailed(file)"
          />
          <video
            v-else-if="
              classifyOutput('', file.FileName, file.ContentType) === 'video' && contentUrl(file)
            "
            :key="retryKeys[file.FileId]"
            :src="contentUrl(file)"
            muted
            preload="metadata"
            @error="markFailed(file)"
          />
          <span v-else class="file-icon"
            ><Icon
              :icon="
                classifyOutput('', file.FileName, file.ContentType) === 'code'
                  ? 'lucide:file-code-2'
                  : 'lucide:file-text'
              "
          /></span>
          <span class="file-meta"
            ><strong>{{ file.FileName }}</strong
            ><small>{{
              file.FileSize ? `${(file.FileSize / 1024).toFixed(0)} KB` : '真实会话附件'
            }}</small></span
          >
        </button>
        <button
          class="attachment-download"
          :disabled="!downloadUrl(file)"
          :title="`下载 ${file.FileName}`"
          :aria-label="`下载 ${file.FileName}`"
          @click="download(file)"
        >
          <Icon icon="lucide:download" />
        </button>
      </template>
    </article>
  </div>
  <ResourcePreviewDialog
    v-if="preview"
    :open="true"
    :file-name="preview.FileName"
    :content-type="preview.ContentType"
    :content-url="contentUrl(preview) || undefined"
    :download-url="downloadUrl(preview) || undefined"
    @close="preview = undefined"
  />
</template>
