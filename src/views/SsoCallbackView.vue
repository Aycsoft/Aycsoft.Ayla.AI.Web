<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const settings = useSettingsStore(); const error = ref('')
onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) { error.value = 'SSO 回调缺少一次性授权码'; return }
  try {
    const exchanged = await auth.exchange(code)
    // query conversationId 来自浏览器，只作对照；续接只信服务端兑换响应的绑定值。
    await router.replace({ path: '/chat', query: exchanged.ConversationId ? { conversation: exchanged.ConversationId } : {} })
  } catch (e) { error.value = (e as Error).message }
})
const retry = () => window.location.reload()
const back = () => router.replace({ name: 'login', query: route.query.conversationId ? { conversationId: String(route.query.conversationId) } : {} })
</script>
<template>
  <main class="sso-page">
    <section class="sso-card" role="status">
      <BrandLogo :size="46" />
      <div :class="['sso-status-icon', { error }]"><Icon :icon="error ? 'lucide:shield-x' : 'lucide:loader-circle'" /></div>
      <h2>{{ error ? '企业登录未完成' : `正在进入 ${settings.brand}` }}</h2>
      <p>{{ error || '正在确认企业账号并返回 AI 工作台，请稍候…' }}</p>
      <div v-if="error" class="sso-actions"><button type="button" class="auth-primary" @click="retry">重新确认</button><button type="button" class="sso-secondary" @click="back">返回登录</button></div>
    </section>
  </main>
</template>
