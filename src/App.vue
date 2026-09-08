<script setup lang="ts">
/** 应用根节点：恢复用户主题并异步加载品牌设置，路由负责具体页面。 */
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { applyWorkspaceTheme, normalizeTheme } from '@/utils/theme'

// 品牌服务异常不阻塞路由渲染；设置 store 会暴露可用状态并保留默认值。
onMounted(() => {
  applyWorkspaceTheme(normalizeTheme(localStorage.getItem('crosscart-ai-theme')))
  void useSettingsStore().load()
})
</script>

<template>
  <RouterView />
</template>
