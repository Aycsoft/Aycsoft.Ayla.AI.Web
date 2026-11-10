<script setup lang="ts">
import type { SelectionProject } from '@/api/selection'
import { publicCommerceUrl as safePublicUrl } from '@/utils/commerceCards'

// 展示经服务端逐项核验的断言；无引文时不由前端补造事实来源。
defineProps<{
  claims: NonNullable<NonNullable<SelectionProject['analysis']>['analyses'][number]['claims']>
}>()
const labels = { fact: '来源事实', inference: '分析判断', action: '下一步' }
</script>

<template>
  <div class="selection-claims">
    <div v-for="(claim, index) in claims" :key="index" class="selection-claim">
      <span class="selection-claim-kind">{{ labels[claim.kind] }}</span>
      <div>
        <p>{{ claim.text }}</p>
        <small v-if="claim.basis">判断依据：{{ claim.basis }}</small>
        <small v-if="claim.limitation">仍需确认：{{ claim.limitation }}</small>
        <details v-if="claim.support?.length">
          <summary>查看原文依据（{{ claim.support.length }}）</summary>
          <div v-for="(source, sourceIndex) in claim.support" :key="sourceIndex">
            <a
              v-if="safePublicUrl(source.sourceUrl)"
              :href="safePublicUrl(source.sourceUrl)"
              target="_blank"
              rel="noopener noreferrer"
              >打开来源 {{ sourceIndex + 1 }}</a
            >
            <blockquote>{{ source.exactQuote }}</blockquote>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-claim {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  line-height: 1.6;
}
.selection-claim p {
  margin: 0;
}
.selection-claim-kind,
.selection-claim small,
.selection-claim summary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.selection-claim small {
  display: block;
}
.selection-claim summary {
  cursor: pointer;
}
.selection-claim blockquote {
  margin: 6px 0;
  padding-left: 10px;
  border-left: 2px solid var(--el-border-color);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
