<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { citationIconUrl } from '@/utils/messagePresentation'

const props = defineProps<{ url: string }>()
const failed = ref(false)
watch(() => props.url, () => { failed.value = false })
</script>

<template>
  <span class="source-favicon" aria-hidden="true">
    <img v-if="!failed && citationIconUrl(url)" :src="citationIconUrl(url)" alt="" loading="lazy" @error="failed = true" />
    <Icon v-else icon="lucide:globe-2" />
  </span>
</template>
