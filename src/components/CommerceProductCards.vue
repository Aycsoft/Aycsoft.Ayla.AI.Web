<script setup lang="ts">
import { computed } from 'vue'
import { ElImage, ElTable, ElTableColumn } from 'element-plus'
import type { Citation, SelectionSnapshot } from '@/types/ai'
import { commerceCards } from '@/utils/commerceCards'
const props = defineProps<{
  sources: Citation[]
  answer?: string
  snapshot?: SelectionSnapshot | null
}>()
// 新消息使用已保存候选顺序，旧会话保持现有展示规则。
const cards = computed(() =>
  props.snapshot?.Candidates.length
    ? [...props.snapshot.Candidates]
        .sort((a, b) => a.DisplayIndex - b.DisplayIndex)
        .flatMap((candidate) =>
          commerceCards([{ ...candidate.Source, Products: [candidate.Product] }]),
        )
    : commerceCards(props.sources, props.answer),
)
/** 采集时间保持来源字段含义，不当成新品日期。 */
const observedAt = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
    : ''
}
</script>
<template>
  <section v-if="cards.length" class="product-rows" aria-label="本次检索的商品">
    <header>
      <strong>本次找到的商品</strong><span>{{ cards.length }} 款</span>
    </header>
    <ElTable :data="cards" size="small" table-layout="fixed">
      <ElTableColumn label="图片" width="72"
        ><template #default="{ row: item }"
          ><ElImage
            :src="item.image"
            fit="contain"
            :preview-src-list="item.image ? [item.image] : []"
            preview-teleported
            loading="lazy"
            ><template #error><span class="product-rows__empty">暂无图</span></template></ElImage
          ></template
        ></ElTableColumn
      >
      <ElTableColumn label="商品" min-width="210"
        ><template #default="{ row: item }"
          ><a
            class="product-rows__name"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="item.product.Name"
            >{{ item.product.Name }}</a
          ><small v-if="item.product.PurchaseBadge">{{
            item.product.PurchaseBadge
          }}</small></template
        ></ElTableColumn
      >
      <ElTableColumn label="平台 / 排名" width="115"
        ><template #default="{ row: item }"
          ><span>{{ item.product.Platform || item.host }}</span
          ><small
            v-if="
              item.product.Rank != null &&
              !['catalog_entry', 'search_index'].includes(item.product.ObservationKind || '')
            "
            >榜单 #{{ item.product.Rank }}</small
          ><small v-else-if="item.product.ObservationKind === 'catalog_entry'"
            >目录商品</small
          ></template
        ></ElTableColumn
      >
      <ElTableColumn label="页面价格" width="120"
        ><template #default="{ row: item }">{{
          item.product.DisplayedPrice || '—'
        }}</template></ElTableColumn
      >
      <ElTableColumn label="评分 / 评价" width="105"
        ><template #default="{ row: item }"
          ><span v-if="item.product.Rating != null">{{ item.product.Rating }} 分</span
          ><small v-if="item.product.ReviewCount != null"
            >{{ item.product.ReviewCount }} 条评价</small
          ></template
        ></ElTableColumn
      >
      <ElTableColumn label="来源" width="140"
        ><template #default="{ row: item }"
          ><a :href="item.sourceUrl" target="_blank" rel="noopener noreferrer">{{ item.host }}</a
          ><small v-if="item.product.ObservedAt">{{
            observedAt(item.product.ObservedAt)
          }}</small></template
        ></ElTableColumn
      >
    </ElTable>
  </section>
</template>
<style scoped>
.product-rows {
  margin: 14px 0;
  font-size: 13px;
  min-width: 0;
}
.product-rows header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.product-rows header span,
.product-rows small {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.product-rows small {
  display: block;
  line-height: 1.5;
}
.product-rows .el-image {
  width: 52px;
  height: 52px;
  vertical-align: middle;
}
.product-rows a {
  color: var(--el-color-primary);
  text-decoration: none;
}
.product-rows__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.product-rows__empty {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}
</style>
