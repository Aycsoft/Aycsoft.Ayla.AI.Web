<script setup lang="ts">
/**
 * 引用来源图标，URL 变化重新加载，失败时显示通用图标。
 * url 为引用地址，图标地址解析委托共享引用展示工具。
 */
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { citationIconUrl } from '@/utils/messagePresentation'

const props = defineProps<{ url: string }>()
const failed = ref(false)
watch(
  () => props.url,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <span class="source-favicon" aria-hidden="true">
    <img
      v-if="!failed && citationIconUrl(url)"
      :src="citationIconUrl(url)"
      alt=""
      loading="lazy"
      @error="failed = true"
    />
    <Icon v-else icon="lucide:globe-2" />
  </span>
</template>
