<script setup lang="ts">
/**
 * 消息中的生成资产卡片，依据真实状态展示进度、失败提示或预览。
 * artifact 是服务端资产；点击通过工作台事件传递资产 ID，不直接下载。
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { Artifact } from '@/types/ai'
import { contentUrl } from '@/utils/backendResource'
import { classifyOutput, isSuccessfulArtifact } from '@/utils/messageContent'
import ResilientMediaPreview from './ResilientMediaPreview.vue'
const props = defineProps<{ artifact: Artifact; progress?: number }>()
const kind = computed(() => classifyOutput(props.artifact.Type, props.artifact.FileName))
const url = computed(() => contentUrl(props.artifact))
const finished = computed(() => isSuccessfulArtifact(props.artifact.Status))
const failed = computed(() =>
  ['failed', 'error', 'cancelled'].includes(props.artifact.Status.toLowerCase()),
)
const openWorkspace = () =>
  window.dispatchEvent(new CustomEvent('ayla:artifact-open', { detail: props.artifact.ArtifactId }))
</script>
<template>
  <article class="artifact-output-card" @click="openWorkspace">
    <div v-if="failed" class="artifact-progress failed">
      <span><Icon icon="lucide:circle-alert" />生成未完成</span
      ><strong>{{ artifact.Status }}</strong>
    </div>
    <div v-else-if="!finished" class="artifact-progress">
      <span
        ><Icon icon="lucide:loader-circle" />正在生成
        {{ kind === 'image' ? '图片' : kind === 'video' ? '视频' : '文件' }}</span
      ><strong>{{ progress ?? 0 }}%</strong>
      <div><i :style="{ width: `${Math.max(4, progress ?? 0)}%` }" /></div>
    </div>
    <template v-else
      ><ResilientMediaPreview
        v-if="kind === 'image' || kind === 'video'"
        :src="url"
        :kind="kind"
        :alt="artifact.FileName"
        :controls="kind === 'video'"
        @click.stop
      /><audio
        v-else-if="kind === 'audio' && url"
        :src="url"
        controls
        preload="metadata"
        @click.stop
      />
      <div v-else class="artifact-file">
        <Icon :icon="kind === 'code' ? 'lucide:file-code-2' : 'lucide:file-down'" />
      </div>
      <footer>
        <span
          ><strong>{{ artifact.FileName }}</strong
          ><small>真实任务输出 · {{ artifact.Status }}</small></span
        ><button @click.stop="openWorkspace"><Icon icon="lucide:panel-right-open" />工作区</button>
      </footer></template
    >
  </article>
</template>
