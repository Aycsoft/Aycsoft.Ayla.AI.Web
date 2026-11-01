<script setup lang="ts">
import { computed } from 'vue'
import {
  productObservationPresentation,
  type PublicProductObservation,
} from '@/utils/productObservation'

const props = defineProps<{ observation?: PublicProductObservation | null; sourceUrl?: string }>()
const view = computed(() => productObservationPresentation(props.observation, props.sourceUrl))
</script>

<template>
  <span v-if="view" class="product-observation" aria-label="页面商品声明">
    <span class="product-observation__title"
      >页面商品声明<span v-if="view.name"> · {{ view.name }}</span></span
    >
    <span v-for="(offer, index) in view.offers" :key="index" class="product-observation__offer">
      报价 {{ index + 1 }}：<b>{{ offer.price }}</b> {{ offer.currency }}
      <span v-if="!offer.complete"> · 报价不完整</span>
    </span>
    <span v-if="!view.offers.length">未声明完整报价</span>
    <span>{{ view.notice }}</span>
    <span>观察抓取时间：{{ view.observedAt }}</span>
    <span v-if="view.sourceUrl" class="product-observation__source"
      >来源：{{ view.sourceUrl }}</span
    >
  </span>
</template>

<style scoped>
.product-observation {
  display: flex;
  min-width: 0;
  margin-top: 6px;
  gap: 3px;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary, #606266);
  overflow-wrap: anywhere;
}
.product-observation__title,
.product-observation__offer b {
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}
</style>
