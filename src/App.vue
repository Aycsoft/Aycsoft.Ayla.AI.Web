<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { applyWorkspaceTheme, normalizeTheme } from '@/utils/theme'

onMounted(() => {
  applyWorkspaceTheme(normalizeTheme(localStorage.getItem('crosscart-ai-theme')))
  void useSettingsStore().load()
})
</script>

<template>
  <RouterView />
</template>
