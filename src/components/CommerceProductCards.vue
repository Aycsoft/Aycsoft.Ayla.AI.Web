<script setup lang="ts">
import { computed } from 'vue'
import { ElImage } from 'element-plus'
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
  <section v-if="cards.length" class="commerce-cards" aria-label="本次检索的商品">
    <header>
      <strong>本次找到的商品</strong><small>{{ cards.length }} 款</small>
    </header>
    <div class="commerce-cards__grid">
      <article v-for="item in cards" :key="item.url">
        <a
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="item.product.Name"
          class="commerce-cards__image"
        >
          <ElImage v-if="item.image" :src="item.image" fit="contain" loading="lazy"
            ><template #error><small>图片暂不可用</small></template></ElImage
          ><small v-else>来源未提供图片</small>
        </a>
        <small
          >{{ item.product.Platform || item.host
          }}<template v-if="item.product.ObservationKind === 'catalog_entry'">
            · 站方目录收录</template
          ><template v-else-if="item.product.ObservationKind === 'search_index'">
            · 公开商品索引</template
          ></small
        >
        <span
          v-if="
            item.product.Rank != null &&
            !['catalog_entry', 'search_index'].includes(item.product.ObservationKind || '')
          "
          >榜单 #{{ item.product.Rank }}</span
        >
        <a
          class="commerce-cards__name"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="item.product.Name"
          >{{ item.product.Name }}</a
        >
        <b v-if="item.product.DisplayedPrice">页面显示价 {{ item.product.DisplayedPrice }}</b>
        <span v-if="item.product.Rating != null || item.product.ReviewCount != null"
          ><template v-if="item.product.Rating != null">{{ item.product.Rating }} 分</template
          ><template v-if="item.product.ReviewCount != null">
            · {{ item.product.ReviewCount }} 条评价</template
          ></span
        >
        <small v-if="item.product.PurchaseBadge">{{ item.product.PurchaseBadge }}</small>
        <a :href="item.sourceUrl" target="_blank" rel="noopener noreferrer"
          >来源 {{ item.sourceIndex + 1 }} · {{ item.host }}</a
        >
        <small v-if="observedAt(item.product.ObservedAt)"
          >采集 {{ observedAt(item.product.ObservedAt) }}</small
        >
      </article>
    </div>
  </section>
</template>
<style scoped>
.commerce-cards {
  margin: 16px 0;
  font-size: 13px;
}
.commerce-cards header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.commerce-cards__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr));
  gap: 12px;
}
.commerce-cards article {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.commerce-cards small {
  font-size: 12px;
  color: var(--muted);
}
.commerce-cards a {
  color: var(--text);
  text-decoration: none;
}
.commerce-cards a:hover {
  color: var(--primary);
}
.commerce-cards b {
  font-size: 12px;
  font-weight: 500;
}
.commerce-cards__image {
  height: 135px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
}
.commerce-cards__image .el-image {
  width: 100%;
  height: 100%;
}
.commerce-cards__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
  line-height: 18px;
}
</style>
