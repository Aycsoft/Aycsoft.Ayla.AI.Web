<script setup lang="ts">
import { computed } from 'vue'
import ProductObservationSummary from '@/components/ProductObservationSummary.vue'
import {
  attentionProducts,
  attentionStatus,
  attentionTime,
  displayValue,
  marketObservation,
  publicationLabel,
  attentionEvidence,
  type DailyInsightToday,
  type MarketObservationFeed,
} from '@/utils/personalAttention'

const props = defineProps<{
  today?: DailyInsightToday
  market?: MarketObservationFeed
  todayLoading: boolean
  marketLoading: boolean
  todayError: string
  marketError: string
  now: number
}>()
defineEmits<{ refresh: [] }>()
const sections = computed(() =>
  props.today?.Status === 'Ready' && Array.isArray(props.today.Data?.Sections)
    ? props.today.Data.Sections
    : [],
)
const observations = computed(() =>
  ['Ready', 'Partial'].includes(props.market?.Status || '') && Array.isArray(props.market?.Items)
    ? props
        .market!.Items.slice(0, 10)
        .map((item) => ({ item, view: marketObservation(item, props.now) }))
    : [],
)
</script>

<template>
  <section class="personal-attention" aria-label="本人关注">
    <header>
      <h2>本人关注</h2>
      <button type="button" :disabled="todayLoading || marketLoading" @click="$emit('refresh')">
        重新读取
      </button>
    </header>
    <section aria-label="内部今日关注">
      <h3>内部今日关注</h3>
      <p v-if="todayLoading" role="status">正在读取已保存关注…</p>
      <p v-else-if="todayError" role="status">{{ todayError }}</p>
      <template v-else-if="today">
        <p v-if="today.Status !== 'Ready'">{{ attentionStatus(today.Status) }}</p>
        <template v-else>
          <p>
            业务日期：{{ today.BusinessDate }} · {{ today.TimeZoneId }}<br />生成时间：{{
              attentionTime(today.GeneratedAt)
            }}
          </p>
          <p v-if="today.Data?.Coverage">{{ today.Data.Coverage }}</p>
          <article v-for="section in sections" :key="section.Code" class="attention-card">
            <strong>{{ section.Title }}</strong>
            <p v-if="section.Status === 'Unavailable'">
              {{ section.UnavailableReason || '当前范围暂无可用推荐证据' }}
            </p>
            <template v-else>
              <p>{{ section.Recommendation }}</p>
              <p v-for="(line, index) in attentionEvidence(section)" :key="index">{{ line }}</p>
              <ul v-if="attentionProducts(section).length">
                <li v-for="(product, index) in attentionProducts(section)" :key="index">
                  <span
                    >{{ displayValue(product.Name) }} ·
                    {{ displayValue(product.SKU ?? product.ProductCode) }}</span
                  >
                  <small v-if="section.ToolCode === 'sales_top_skus'"
                    >销量：{{ displayValue(product.Quantity ?? product.SalesQuantity) }}</small
                  >
                  <small v-else>开发时间：{{ displayValue(product.DevelopmentTime) }}</small>
                </li>
              </ul>
            </template>
          </article>
          <p v-if="!sections.length">暂无可展示的关注项目</p>
          <p v-if="today.Data?.DataFreshness">{{ today.Data.DataFreshness }}</p>
        </template>
      </template>
    </section>
    <section aria-label="本人已保存公开观察">
      <h3>本人已保存公开观察</h3>
      <p>只读取已有资料，不重新抓取。页面报价不代表成交、平台销量或内部商品关联。</p>
      <p v-if="marketLoading" role="status">正在读取已保存观察…</p>
      <p v-else-if="marketError" role="status">{{ marketError }}</p>
      <template v-else-if="market">
        <p>{{ attentionStatus(market.Status) }} · 本次读取：{{ attentionTime(market.ReadAt) }}</p>
        <article
          v-for="({ item, view }, index) in observations"
          :key="item.SubscriptionId || index"
          class="attention-card"
        >
          <template v-if="view">
            <strong>{{
              view.stale ? '观察已超过24小时，报价可能变化' : '已保存的页面声明'
            }}</strong>
            <ProductObservationSummary
              :observation="view.observation"
              :source-url="view.observation.SourceUrl"
            />
            <p>
              {{ item.PublishedAt ? '发布日期：' : '' }}{{ publicationLabel(item)
              }}<span v-if="item.PublishedAtSource"> · {{ item.PublishedAtSource }}</span>
            </p>
            <a :href="view.observation.SourceUrl" target="_blank" rel="noopener noreferrer"
              >查看公开来源 ↗</a
            >
            <details>
              <summary>来源校验信息</summary>
              <code>{{ item.HtmlSha256 }}</code>
            </details>
          </template>
          <p v-else>
            {{
              attentionStatus(
                item.Status === 'Ready' || item.Status === 'Stale' ? 'Unavailable' : item.Status,
              )
            }}
          </p>
        </article>
        <p v-if="['Ready', 'Partial'].includes(market.Status) && !observations.length">
          暂无可展示的已保存观察
        </p>
      </template>
    </section>
  </section>
</template>

<style scoped>
.personal-attention {
  margin-top: 22px;
  text-align: left;
  font-size: 12px;
  line-height: 1.6;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h2,
h3 {
  margin: 8px 0;
  font-size: 14px;
  font-weight: 550;
}
h3 {
  font-size: 13px;
}
p {
  margin: 5px 0;
  color: var(--mm-secondary);
  overflow-wrap: anywhere;
}
button,
a {
  color: var(--el-color-primary);
  font-size: 12px;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
section > section {
  margin-top: 14px;
  border-top: 1px solid var(--mm-line);
  padding-top: 8px;
}
.attention-card {
  border: 1px solid var(--mm-line);
  border-radius: 6px;
  padding: 10px;
  margin-top: 8px;
  overflow-wrap: anywhere;
}
ul {
  padding-left: 18px;
  margin: 6px 0;
}
li {
  padding: 3px 0;
}
li small {
  display: block;
  color: var(--mm-secondary);
}
details {
  margin-top: 5px;
  color: var(--mm-secondary);
}
code {
  overflow-wrap: anywhere;
}
</style>
