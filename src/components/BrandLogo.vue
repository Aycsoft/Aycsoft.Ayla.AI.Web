<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

withDefaults(defineProps<{ size?: number }>(), { size: 20 })
const settings = useSettingsStore()
const failed = ref(false)
const bundledLogo = `${import.meta.env.BASE_URL}ayla-logo.png`
const source = ref(settings.logoUrl)

watch(
  () => settings.logoUrl,
  value => {
    source.value = value
    failed.value = false
  }
)

const recoverLogo = () => {
  if (source.value !== bundledLogo) {
    source.value = bundledLogo
    return
  }
  failed.value = true
}
</script>

<template>
  <span class="brand-logo" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="!failed" :src="source" :alt="`${settings.brand} Logo`" @error="recoverLogo" />
    <span v-else>{{ settings.brand.slice(0, 1).toUpperCase() }}</span>
  </span>
</template>
