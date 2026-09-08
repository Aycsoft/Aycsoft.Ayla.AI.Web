<script setup lang="ts">
/**
 * 统一品牌标识，加载失败依次回退到随包图片和文字。
 * size 为像素尺寸；品牌设置变化后重新尝试配置的 Logo。
 */
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

withDefaults(defineProps<{ size?: number }>(), { size: 20 })
const settings = useSettingsStore()
const failed = ref(false)
const bundledLogo = `${import.meta.env.BASE_URL}ayla-logo.png`
const source = ref(settings.logoUrl)

watch(
  () => settings.logoUrl,
  (value) => {
    source.value = value
    failed.value = false
  },
)

const recoverLogo = () => {
  // 随包图片也失败后停止切换，避免 error 事件不断触发同一路径重试。
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
