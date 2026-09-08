<script setup lang="ts">
/**
 * 资源失败的共享展示卡，统一错误信息与重试入口。
 * retrying 由调用方维护；retry 只发出操作意图，不自行请求网络。
 */
import { Icon } from '@iconify/vue'
defineProps<{ title?: string; message: string; retrying?: boolean }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div class="resource-error-card" role="alert">
    <Icon icon="lucide:file-warning" /><span
      ><strong>{{ title || '文件暂时无法打开' }}</strong
      ><small>{{ message }}</small></span
    ><button :disabled="retrying" @click="$emit('retry')">
      <Icon :icon="retrying ? 'lucide:loader-circle' : 'lucide:rotate-ccw'" />{{
        retrying ? '重试中…' : '重试'
      }}
    </button>
  </div>
</template>
