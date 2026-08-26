<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'

withDefaults(defineProps<{ size?: number }>(), { size: 20 })
const settings = useSettingsStore()
const failed = ref(false)
</script>

<template>
  <span class="brand-logo" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="!failed" :src="settings.logoUrl" :alt="`${settings.brand} Logo`" @error="failed = true" />
    <span v-else>{{ settings.brand.slice(0, 1).toUpperCase() }}</span>
  </span>
</template>
