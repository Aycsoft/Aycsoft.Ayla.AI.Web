<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  comparisonChange,
  comparisonNumber,
  comparisonPercent,
  parseSalesComparison,
} from './salesComparison'

const props = defineProps<{ data: unknown }>()
const result = computed(() => parseSalesComparison(props.data))
const page = ref(1)
const pageSize = 20
const pages = computed(() => Math.max(1, Math.ceil((result.value?.Groups.length ?? 0) / pageSize)))
const visibleGroups = computed(
  () => result.value?.Groups.slice((page.value - 1) * pageSize, page.value * pageSize) ?? [],
)
watch(result, () => {
  page.value = 1
})
</script>

<template>
  <section class="sales-comparison" aria-label="两期销售对比">
    <template v-if="result">
      <header>
        <h3>两期销售对比</h3>
        <p>{{ result.DataScope }}</p>
      </header>
      <dl class="comparison-periods">
        <div>
          <dt>当前期 · {{ result.CurrentPeriod.Days }} 天</dt>
          <dd>{{ result.CurrentPeriod.StartDate }} — {{ result.CurrentPeriod.EndDate }}</dd>
        </div>
        <div>
          <dt>比较期 · {{ result.PreviousPeriod.Days }} 天</dt>
          <dd>{{ result.PreviousPeriod.StartDate }} — {{ result.PreviousPeriod.EndDate }}</dd>
        </div>
      </dl>
      <template v-if="result.Groups.length">
        <div class="comparison-scroll" tabindex="0" aria-label="各币种销售额汇总，可横向滚动">
          <table class="comparison-totals">
            <caption>
              按币种汇总
            </caption>
            <thead>
              <tr>
                <th>币种</th>
                <th>比较期销售额</th>
                <th>当前期销售额</th>
                <th>金额变化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in result.CurrencyTotals" :key="row.Currency">
                <th scope="row">{{ row.Currency || '未标识币种' }}</th>
                <td>{{ comparisonNumber(row.PreviousAmount) }}</td>
                <td>{{ comparisonNumber(row.CurrentAmount) }}</td>
                <td>{{ comparisonChange(row.AmountChange) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="comparison-scroll" tabindex="0" aria-label="平台类目销售对比明细，可横向滚动">
          <table class="comparison-groups">
            <caption>
              平台与当前类目明细 · 完整返回
              {{
                result.Groups.length
              }}
              组
            </caption>
            <thead>
              <tr>
                <th>平台代码 / 当前类目</th>
                <th>币种</th>
                <th>比较期数量</th>
                <th>当前期数量</th>
                <th>数量变化</th>
                <th>比较期金额</th>
                <th>当前期金额</th>
                <th>金额变化</th>
                <th>金额变化率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in visibleGroups" :key="`${page}:${index}`">
                <th scope="row">
                  <span>平台 {{ row.PlatformSource }}</span
                  ><small>{{ row.CategoryName || '未分类' }}</small>
                </th>
                <td>{{ row.Currency || '未标识币种' }}</td>
                <td>{{ comparisonNumber(row.PreviousQuantity) }}</td>
                <td>{{ comparisonNumber(row.CurrentQuantity) }}</td>
                <td>{{ comparisonChange(row.QuantityChange) }}</td>
                <td>{{ comparisonNumber(row.PreviousAmount) }}</td>
                <td>{{ comparisonNumber(row.CurrentAmount) }}</td>
                <td>{{ comparisonChange(row.AmountChange) }}</td>
                <td>{{ comparisonPercent(row.AmountChangePercent) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <nav v-if="pages > 1" class="comparison-pages" aria-label="销售对比明细分页">
          <span>第 {{ page }} / {{ pages }} 页 · 每页 {{ pageSize }} 组</span>
          <button type="button" :disabled="page === 1" @click="page--">上一页</button>
          <button type="button" :disabled="page === pages" @click="page++">下一页</button>
        </nav>
      </template>
      <p v-else class="comparison-empty">两个期间内均没有符合本次授权范围的已映射商品销售记录。</p>
      <details class="comparison-definition">
        <summary>统计口径与数据时间</summary>
        <p>{{ result.MetricDefinition }}</p>
        <p>{{ result.CategoryBasis }}</p>
        <p>{{ result.Interpretation }}</p>
        <p v-if="result.DataUpdatedAt">数据更新时间：{{ result.DataUpdatedAt }}</p>
        <p v-if="result.QueriedAt">查询时间：{{ result.QueriedAt }}</p>
      </details>
      <p class="comparison-note">
        不同币种分别比较；变化分布不代表因果。不等长期间展示原始数据，未折算日均。
      </p>
    </template>
    <p v-else class="comparison-empty" role="status">
      销售对比结果不完整，暂不能展示统计表。请查看本轮查询说明。
    </p>
  </section>
</template>

<style scoped>
.sales-comparison {
  max-width: 100%;
  min-width: 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--el-text-color-primary, #242424);
}

.sales-comparison h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sales-comparison p {
  margin: 6px 0;
  overflow-wrap: anywhere;
}

.sales-comparison header p,
.comparison-note,
.comparison-definition,
.comparison-periods dt {
  color: var(--el-text-color-secondary, #737373);
}

.comparison-periods {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  margin: 12px 0;
}

.comparison-periods dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.comparison-scroll {
  max-width: 100%;
  max-height: 480px;
  margin: 12px 0;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter, #e8e8e8);
  border-radius: 6px;
}

.sales-comparison table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.comparison-groups {
  min-width: 940px;
}

.comparison-totals {
  min-width: 430px;
}

.sales-comparison caption {
  padding: 9px 12px;
  font-weight: 600;
  text-align: left;
}

.sales-comparison th,
.sales-comparison td {
  padding: 8px 12px;
  text-align: right;
  white-space: nowrap;
  border-top: 1px solid var(--el-border-color-lighter, #e8e8e8);
}

.sales-comparison thead th {
  font-weight: 400;
  color: var(--el-text-color-secondary, #737373);
  background: var(--el-fill-color-lighter, #fafafa);
}

.sales-comparison th:first-child {
  font-weight: 500;
  text-align: left;
}

.sales-comparison th small {
  display: block;
  max-width: 210px;
  color: var(--el-text-color-secondary, #737373);
  white-space: normal;
  overflow-wrap: anywhere;
}

.comparison-pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}

.comparison-pages span {
  margin-right: auto;
  color: var(--el-text-color-secondary, #737373);
}

.comparison-pages button {
  padding: 3px 8px;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color, #dedede);
  border-radius: 4px;
}

.comparison-pages button:disabled {
  cursor: default;
  opacity: 0.45;
}

.comparison-pages button:focus-visible,
.comparison-scroll:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: 2px;
}

.comparison-definition summary {
  width: fit-content;
  cursor: pointer;
}

.comparison-empty {
  padding: 12px 0;
}
</style>
