<script setup lang="ts">
// 分别展示原工具返回的同类经营事实，不推定同款或跨范围合计。
import { computed } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'
import type { SelectionBusinessAssociation } from '@/api/selection'

const props = defineProps<{ associations?: SelectionBusinessAssociation[]; candidateId: string }>()
const toolLabels: Record<string, string> = {
  product_sku_lookup: '产品资料',
  sales_top_skus: '商品销量',
  sku_sales_history: '销售历史',
  business_metrics_query: '经营指标',
  inventory_risk_analysis: '库存',
  product_quotation_lookup: '报价',
  replenishment_scenario: '补货分析',
}

// 各工具事实保持独立，不把不同时间范围的销量或不同仓库存量相加。
function field(value: Record<string, unknown> | null | undefined, ...names: string[]) {
  if (!value) return undefined
  for (const name of names) {
    const entry = Object.entries(value).find(([key]) => key.toLowerCase() === name.toLowerCase())
    if (entry && entry[1] !== null && entry[1] !== undefined && entry[1] !== '') return entry[1]
  }
  return undefined
}

function numeric(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !/^-?\d+(\.\d+)?$/.test(value.trim())) return undefined
  const number = Number(value)
  return Number.isFinite(number)
    ? number.toLocaleString('zh-CN', { maximumFractionDigits: 6 })
    : undefined
}

function signals(values: Record<string, unknown>) {
  const fields = [
    ['销量', ['SalesQuantity', 'Sold']],
    ['订单', ['OrderCount', 'Orders']],
    ['可用库存', ['AvailableQuantity', 'Available']],
    ['在途', ['TransitQuantity', 'Transit']],
    ['采购量', ['Purchased']],
  ] as const
  const result = fields.flatMap(([label, names]) => {
    const text = numeric(field(values, ...names))
    return text === undefined ? [] : [`${label} ${text}`]
  })
  const sales = numeric(field(values, 'SalesAmount'))
  if (sales !== undefined)
    result.push(`销售额 ${sales} ${String(field(values, 'Currency') || '币种待核实')}`)
  const canView = field(values, 'CanViewPurchasePrice')
  const purchase = numeric(field(values, 'PurchasePrice'))
  if (purchase !== undefined && canView !== false && canView !== 'false' && canView !== 0) {
    result.push(`采购价 ${purchase} ${String(field(values, 'PurchaseCurrency') || '币种待核实')}`)
  }
  return result
}

function timeRange(period: Record<string, unknown> | null | undefined) {
  const start = field(period, 'StartDate')
  const end = field(period, 'EndDate')
  return start || end ? `${String(start || '未提供')} 至 ${String(end || '未提供')}` : ''
}

const rows = computed(() =>
  (props.associations || [])
    .filter(
      (item) =>
        item.candidateId === props.candidateId && item.relation === 'same_category_reference',
    )
    .flatMap((item) =>
      item.facts.flatMap((fact, index) => {
        const metrics = signals(fact.values)
        if (!metrics.length) return []
        return [
          {
            key: `${item.productId}:${fact.invocationId || fact.toolCode}:${index}`,
            sku: item.sku,
            name: item.productName,
            warnings: item.warnings,
            metrics,
            tool: toolLabels[fact.toolCode] || '业务查询',
            toolCode: fact.toolCode,
            period: timeRange(fact.period),
            observedAt: field(fact.values, 'QueriedAt', 'DataUpdatedAt'),
            warehouse: field(fact.values, 'WarehouseName'),
            supplier: field(fact.values, 'SupplierName'),
          },
        ]
      }),
    ),
)
</script>

<template>
  <section v-if="rows.length" class="selection-business-references">
    <strong>内部同类商品参照</strong>
    <p>仅用于比较经营表现，尚未确认与外部商品同款或图片相似。各行是独立查询结果。</p>
    <ElTable :data="rows" row-key="key" size="small" max-height="320">
      <ElTableColumn label="内部商品" min-width="185"
        ><template #default="{ row }"
          ><strong>{{ row.sku }}</strong>
          <div class="selection-business-references__name" :title="row.name">
            {{ row.name }}
          </div></template
        ></ElTableColumn
      >
      <ElTableColumn label="已取得的经营数据" min-width="250"
        ><template #default="{ row }"
          ><div>{{ row.metrics.join(' · ') }}</div>
          <small v-if="row.period">{{ row.period }}</small
          ><small v-if="row.supplier">供应商：{{ row.supplier }}</small
          ><small v-if="row.warehouse">仓库：{{ row.warehouse }}</small></template
        ></ElTableColumn
      >
      <ElTableColumn label="依据与限制" min-width="165"
        ><template #default="{ row }"
          ><div>{{ row.tool }}</div>
          <details>
            <summary>查看依据</summary>
            <small>{{ row.toolCode }}</small
            ><small v-if="row.observedAt">数据时间：{{ row.observedAt }}</small
            ><small v-else>原结果未提供数据时间</small
            ><small v-for="warning in row.warnings" :key="warning">{{ warning }}</small>
          </details></template
        ></ElTableColumn
      >
    </ElTable>
  </section>
</template>

<style scoped>
.selection-business-references {
  margin: 12px 0;
  font-size: 12px;
}
.selection-business-references p,
.selection-business-references small {
  margin: 6px 0;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}
.selection-business-references small {
  display: block;
}
.selection-business-references__name {
  display: -webkit-box;
  overflow: hidden;
  line-height: 20px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.selection-business-references summary {
  cursor: pointer;
  color: var(--el-color-primary);
}
</style>
