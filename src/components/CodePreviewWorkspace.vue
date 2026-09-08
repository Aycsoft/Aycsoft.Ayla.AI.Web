<script setup lang="ts">
/**
 * 代码侧边预览容器，使用受限 iframe 承载沙箱文档。
 * srcdoc 应由安全预览构建器提供；open 由父级控制，close 请求退出。
 */
import { onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'

defineProps<{ open: boolean; language: string; srcdoc: string }>()
const emit = defineEmits<{ close: [] }>()
const width = ref(
  Math.max(
    400,
    Math.min(
      Number(localStorage.getItem('ayla-code-preview-width')) || 720,
      window.innerWidth * 0.82,
    ),
  ),
)
let startX = 0
let startWidth = 0
const resize = (event: PointerEvent) => {
  width.value = Math.max(
    360,
    Math.min(startWidth + startX - event.clientX, window.innerWidth * 0.9),
  )
}
const stopResize = () => {
  window.removeEventListener('pointermove', resize)
  window.removeEventListener('pointerup', stopResize)
  localStorage.setItem('ayla-code-preview-width', String(Math.round(width.value)))
}
const startResize = (event: PointerEvent) => {
  startX = event.clientX
  startWidth = width.value
  window.addEventListener('pointermove', resize)
  window.addEventListener('pointerup', stopResize)
}
onBeforeUnmount(stopResize)
</script>

<template>
  <aside
    :class="['code-preview-workspace', { open }]"
    :style="{ width: `${width}px` }"
    aria-label="代码运行预览"
  >
    <button
      class="workspace-resize-handle"
      aria-label="拖动调整预览宽度"
      @pointerdown.prevent="startResize"
    />
    <header>
      <span
        ><Icon icon="lucide:monitor-play" /><strong>运行预览</strong
        ><small>{{ language }}</small></span
      ><button aria-label="关闭运行预览" @click="emit('close')"><Icon icon="lucide:x" /></button>
    </header>
    <!-- 只允许脚本，不授予同源权限，防止生成代码读取会话或操作父页面。 -->
    <iframe
      :srcdoc="srcdoc"
      sandbox="allow-scripts"
      referrerpolicy="no-referrer"
      title="隔离代码运行预览"
    />
  </aside>
</template>
