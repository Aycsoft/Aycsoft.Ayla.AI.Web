<script setup lang="ts">
// 按已保存候选读取独立观察，不从评价变化推断销量。
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { ElDatePicker, ElLink, ElTabs, ElTabPane, ElTable, ElTableColumn } from 'element-plus'
import { ElButton as BaseButton } from 'element-plus'
import { getSelectionProductHistory, type SelectionProductHistory } from '@/api/selection'
import { publicCommerceUrl as safePublicUrl } from '@/utils/commerceCards'

const props = defineProps<{ projectId: string; candidateId: string }>()
const end = new Date()
const start = new Date(end)
start.setDate(start.getDate() - 89)
const range = ref<[Date, Date] | null>([start, end])
const loading = ref(false)
const error = ref('')
const history = ref<SelectionProductHistory>()
const metric = ref<'price' | 'rating' | 'reviewCount'>('price')
const series = computed(() => history.value?.[metric.value])
const labels = { price: '页面价格', rating: '评分', reviewCount: '评价数量' }
let requestVersion = 0

// 日期按用户本地自然日覆盖，采集时间仍使用原始时间，不把读取时间当新观察。
async function load() {
  if (loading.value || !props.projectId || !props.candidateId) return
  const version = ++requestVersion
  loading.value = true
  error.value = ''
  history.value = undefined
  const from = range.value ? new Date(range.value[0]) : undefined
  const to = range.value ? new Date(range.value[1]) : undefined
  from?.setHours(0, 0, 0, 0)
  to?.setHours(23, 59, 59, 999)
  try {
    const response = await getSelectionProductHistory(
      props.projectId,
      props.candidateId,
      from?.toISOString(),
      to?.toISOString(),
    )
    if (version !== requestVersion) return
    if (response.Status !== 1 || !response.Item)
      throw new Error(response.Message || '历史观察暂时无法读取。')
    history.value = response.Item
  } catch (reason) {
    if (version === requestVersion)
      error.value = reason instanceof Error ? reason.message : '历史观察暂时无法读取。'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(
  () => [props.projectId, props.candidateId],
  () => {
    requestVersion++
    loading.value = false
    void load()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  requestVersion++
})
</script>

<template>
  <section class="selection-history" aria-label="商品历史观察">
    <div class="selection-history__toolbar">
      <ElDatePicker
        v-model="range"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :disabled="loading"
        aria-label="观察日期范围"
      />
      <BaseButton size="small" :loading="loading" @click="load">查询</BaseButton>
    </div>
    <p class="selection-history__notice">
      默认查看近 90 天已保存的观察。价格、评分和评价变化不能换算销量。
    </p>
    <p v-if="loading" role="status" class="selection-history__notice">正在读取该商品的历史观察…</p>
    <p v-if="error" role="status" class="selection-history__notice">
      ⓘ {{ error }} <ElLink :disabled="loading" @click="load">重试</ElLink>
    </p>
    <template v-if="history">
      <p v-if="history.status === 'partial'" class="selection-history__notice">
        部分历史记录暂时无法读取，以下仅包含已取得的记录。
      </p>
      <ElTabs v-model="metric"
        ><ElTabPane v-for="(label, key) in labels" :key="key" :name="key" :label="label"
      /></ElTabs>
      <template v-if="series">
        <p class="selection-history__notice">{{ series.explanation }}</p>
        <p
          v-if="
            series.canDescribeChange &&
            series.change != null &&
            series.points.length >= 2 &&
            history.status === 'complete'
          "
          class="selection-history__change"
        >
          首末观察变化：{{ series.change > 0 ? '+' : '' }}{{ series.change
          }}<template v-if="metric === 'price'"> {{ series.points[0]?.currency || '' }}</template
          ><template v-else-if="metric === 'rating'"> 分</template
          ><template v-else> 条评价</template>
        </p>
        <ElTable
          :data="series.points"
          size="small"
          max-height="400"
          empty-text="所选日期内暂无该项观察，不代表数值为零"
        >
          <ElTableColumn label="采集时间" min-width="155"
            ><template #default="{ row }">{{
              new Date(row.observedAt).toLocaleString('zh-CN')
            }}</template></ElTableColumn
          >
          <ElTableColumn :label="labels[metric]" min-width="140"
            ><template #default="{ row }"
              >{{ row.displayValue
              }}<small v-if="row.currency"> · {{ row.currency }}</small></template
            ></ElTableColumn
          >
          <ElTableColumn label="来源" min-width="115"
            ><template #default="{ row }"
              ><a :href="safePublicUrl(row.sourceUrl)" target="_blank" rel="noopener noreferrer"
                >查看观察来源</a
              ></template
            ></ElTableColumn
          >
        </ElTable>
      </template>
    </template>
  </section>
</template>

<style scoped>
.selection-history__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.selection-history__toolbar :deep(.el-date-editor) {
  max-width: 100%;
}
.selection-history__notice {
  margin: 8px 0;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}
.selection-history__change {
  margin: 8px 0;
  font-size: 13px;
  line-height: 22px;
}
.selection-history a {
  color: var(--el-color-primary);
  text-decoration: none;
}
</style>
