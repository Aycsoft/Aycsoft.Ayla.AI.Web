<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { aiApi } from '@/api/ai'
import { summarizeUsageByModel, usageTotals } from '@/api/usageContract'
import type { AiUsageSummary } from '@/types/ai'

const summary = ref<AiUsageSummary>()
const loading = ref(false)
const error = ref('')
const models = computed(() => summarizeUsageByModel(summary.value))
const totals = computed(() => usageTotals(summary.value?.Rows || []))
const rows = computed(() => [...(summary.value?.Rows || [])].sort((a, b) => b.UsageDate.localeCompare(a.UsageDate)))
const number = (value: number) => value.toLocaleString()

async function load() {
  loading.value = true; error.value = ''
  try { summary.value = await aiApi.usageSummary() }
  catch (reason) { error.value = (reason as Error).message || '用量数据加载失败' }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <details class="usage-summary-panel" open>
    <summary><span><Icon icon="lucide:chart-no-axes-combined" /><strong>AI 用量</strong><small v-if="summary">{{ summary.From }} 至 {{ summary.To }}</small></span><Icon icon="lucide:chevron-down" /></summary>
    <div v-if="loading" class="usage-summary-state"><Icon icon="lucide:loader-circle" />正在读取真实计量数据…</div>
    <div v-else-if="error" class="usage-summary-state error"><Icon icon="lucide:circle-alert" /><span>{{ error }}</span><button @click.prevent="load"><Icon icon="lucide:rotate-ccw" />重试</button></div>
    <div v-else-if="summary && rows.length" class="usage-summary-content">
      <div class="usage-total-grid"><span><small>总 Token</small><strong>{{ number(totals.TotalTokens) }}</strong></span><span><small>输入 / 输出</small><strong>{{ number(totals.PromptTokens) }} / {{ number(totals.CompletionTokens) }}</strong></span><span><small>已计量调用</small><strong>{{ number(totals.MeasuredInvocations) }}</strong></span></div>
      <section><header>按模型累计</header><div v-for="item in models" :key="item.ModelAlias" class="usage-row"><strong>{{ item.ModelAlias }}</strong><span>{{ number(item.TotalTokens) }} tokens</span><small>{{ number(item.MeasuredInvocations) }} 次</small></div></section>
      <section><header>按日期与模型</header><div v-for="item in rows" :key="`${item.UsageDate}-${item.ModelAlias}`" class="usage-row"><strong>{{ item.UsageDate }}</strong><span>{{ item.ModelAlias }}</span><small>{{ number(item.TotalTokens) }} tokens</small></div></section>
      <p><Icon icon="lucide:badge-check" />仅统计模型供应商真实返回的 token usage，不估算缺失调用。</p>
    </div>
    <div v-else class="usage-summary-state"><Icon icon="lucide:gauge" />当前周期暂无供应商可核验的用量数据。</div>
  </details>
</template>
