<script setup lang="ts">
/**
 * 账号用量弹窗壳，复用 UsageSummaryPanel 读取和展示统计。
 * open 控制挂载，close 请求关闭；本层不重复请求用量接口。
 */
import { Icon } from '@iconify/vue'
import UsageSummaryPanel from './UsageSummaryPanel.vue'
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <Teleport to="body"
    ><div v-if="open" class="ayla-dialog-backdrop" @click.self="emit('close')">
      <section
        class="usage-summary-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-summary-title"
      >
        <header>
          <span
            ><Icon icon="lucide:gauge" /><strong id="usage-summary-title">AI 用量明细</strong></span
          ><button aria-label="关闭" @click="emit('close')"><Icon icon="lucide:x" /></button>
        </header>
        <UsageSummaryPanel />
        <footer><button class="password-cancel" @click="emit('close')">关闭</button></footer>
      </section>
    </div></Teleport
  >
</template>
