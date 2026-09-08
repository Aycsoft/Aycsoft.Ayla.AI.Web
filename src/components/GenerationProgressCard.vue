<script setup lang="ts">
/**
 * 生成任务占位卡，显示阶段和参考耗时，不据展示进度判断完成。
 * kind 选择文案；任务完成必须依赖外层的真实资产状态。
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{ kind: 'image' | 'video' | 'file'; progress?: number; stage?: string }>()
const label = computed(() =>
  props.kind === 'image' ? '图片' : props.kind === 'video' ? '视频' : '文件',
)
const estimate = computed(() =>
  props.kind === 'image'
    ? '通常约 30–90 秒'
    : props.kind === 'video'
      ? '通常约 2–10 分钟'
      : '通常约 30 秒–3 分钟',
)
// 占位进度保持可见且不达 100%，不能冒充服务端完成通知。
const safeProgress = computed(() => Math.max(6, Math.min(99, props.progress || 12)))
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
      ><small>{{ estimate }}，复杂任务或服务排队时可能更久</small>
    </div>
    <b>{{ safeProgress }}%</b>
    <div class="generation-progress-track"><i :style="{ width: `${safeProgress}%` }" /></div>
  </article>
</template>
