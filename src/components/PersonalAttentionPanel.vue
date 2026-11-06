<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { aiApi } from '@/api/ai'
import { usePersonalAttention } from '@/composables/usePersonalAttention'
import PersonalAttentionView from './PersonalAttentionView.vue'

const auth = useAuthStore()
const { session } = storeToRefs(auth)
const state = usePersonalAttention(
  session,
  aiApi.dailyInsightsToday,
  aiApi.marketObservations,
  () => {
    auth.session = undefined
  },
)
const now = ref(Date.now())
// 跨天停留也更新陈旧标识；仅本地时钟，不轮询后端或抓取网页。
const timer = setInterval(() => {
  now.value = Date.now()
}, 60_000)
onScopeDispose(() => clearInterval(timer))
</script>

<template>
  <PersonalAttentionView
    :today="state.today.value"
    :market="state.market.value"
    :today-loading="state.todayLoading.value"
    :market-loading="state.marketLoading.value"
    :today-error="state.todayError.value"
    :market-error="state.marketError.value"
    :now="now"
    @refresh="state.refresh"
  />
</template>
