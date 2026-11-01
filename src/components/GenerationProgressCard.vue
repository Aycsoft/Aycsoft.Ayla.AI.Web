<script setup lang="ts">
/**
 * 生成任务占位卡，显示阶段和参考耗时，不据展示进度判断完成。
 * kind 选择文案；任务完成必须依赖外层的真实资产状态。
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { artifactProgress } from '@/utils/artifactState'

const props = defineProps<{ kind: 'image' | 'video' | 'file'; progress?: number; stage?: string }>()
const label = computed(() =>
  props.kind === 'image' ? '图片' : props.kind === 'video' ? '视频' : '文件',
)
// 无进度时只呈现真实阶段，等待服务端事件。
const safeProgress = computed(() => artifactProgress(props.progress))
</script>

<template>
  <article class="generation-progress-card" role="status" aria-live="polite">
    <div class="generation-orbit">
      <Icon
        :icon="
          kind === 'image'
            ? 'lucide:image'
            : kind === 'video'
              ? 'lucide:clapperboard'
              : 'lucide:file-cog'
        "
      />
    </div>
    <div class="generation-progress-copy">
      <strong>正在生成{{ label }}</strong
      ><span>{{ stage || '正在准备生成参数与计算资源' }}</span
      ><small>以实际执行状态为准</small>
    </div>
    <b v-if="safeProgress !== undefined">{{ safeProgress }}%</b>
    <div v-if="safeProgress !== undefined" class="generation-progress-track">
      <i :style="{ width: `${safeProgress}%` }" />
    </div>
  </article>
</template>
