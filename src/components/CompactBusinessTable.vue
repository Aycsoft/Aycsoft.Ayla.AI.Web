<script setup lang="ts">
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import type { BusinessToolResult } from '@/types/ai'
import { compactBusiness, compactProduct, recentPurchaseProducts } from '@/utils/compactBusiness'
import { businessNavigationUrl } from '@/utils/businessResults'
const props = defineProps<{ result: BusinessToolResult }>()
const table = computed(() => compactBusiness(props.result))
const origin = String(import.meta.env.VITE_PORTAL_ORIGIN || window.location.origin)
const product = (row: Record<string, unknown>) => compactProduct(row, origin, table.value?.metrics)
</script>

<template>
  <section v-if="table" class="compact-business">
    <header>
      <strong>{{ table.title }}</strong
      ><span>{{ table.rows.length }} 项</span>
    </header>
    <div v-if="table.rows.length" class="compact-business__scroll">
      <table>
        <thead>
          <tr>
            <th v-if="table.product">产品</th>
            <th v-for="column in table.columns" :key="column.key">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in table.rows" :key="index">
            <td v-if="table.product">
              <div class="compact-business__product">
                <ElImage
                  v-if="product(row).image"
                  :src="product(row).image"
                  fit="contain"
                  loading="lazy"
                  :preview-src-list="[product(row).image]"
                  preview-teleported
                  ><template #error><span>暂无图</span></template></ElImage
                >
                <span
                  ><b>{{ product(row).sku }}</b
                  ><small :title="product(row).name">{{ product(row).shortName }}</small>
                  <small v-if="product(row).category !== '—'">{{
                    product(row).category
                  }}</small></span
                >
              </div>
            </td>
            <td v-for="column in table.columns" :key="column.key">
              <template v-if="column.key === 'RecentPurchaseProducts'">
                <div
                  v-for="(item, i) in recentPurchaseProducts(row)"
                  :key="i"
                  class="compact-business__product"
                >
                  <ElImage
                    v-if="product(item).image"
                    :src="product(item).image"
                    fit="contain"
                    loading="lazy"
                    :preview-src-list="[product(item).image]"
                    preview-teleported
                  />
                  <span
                    ><b>{{ product(item).sku }}</b
                    ><small :title="product(item).name">{{ product(item).shortName }}</small></span
                  >
                </div>
              </template>
              <template v-else>{{ table.cell(row, column.key) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else>没有找到符合条件的记录</p>
    <template v-for="(action, index) in result.NavigationActions || []" :key="index"
      ><a
        v-if="businessNavigationUrl(action, origin)"
        :href="businessNavigationUrl(action, origin)"
        target="_blank"
        rel="noopener noreferrer"
        >{{ action.Label || action.Title || '在系统中查看' }}</a
      ></template
    >
  </section>
</template>

<style scoped>
.compact-business {
  margin: 14px 0;
  font-size: 13px;
}
.compact-business header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.compact-business header span,
.compact-business p,
.compact-business small {
  color: var(--muted);
  font-size: 12px;
}
.compact-business__scroll {
  max-height: 440px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.compact-business table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
}
.compact-business th {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
  font-size: 12px;
}
.compact-business th,
.compact-business td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  white-space: nowrap;
}
.compact-business__product {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  max-width: 340px;
  margin: 3px 0;
}
.compact-business__product .el-image {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
}
.compact-business__product > span {
  min-width: 0;
}
.compact-business b {
  font-size: 12px;
  font-weight: 500;
}
.compact-business small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 270px;
}
.compact-business a {
  display: inline-block;
  margin: 8px 12px 0 0;
  color: var(--primary);
  font-size: 12px;
}
</style>
