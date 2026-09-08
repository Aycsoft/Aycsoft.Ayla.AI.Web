<script setup lang="ts">
/** 企业 SSO 回调：验证一次性码，兑换会话并续接服务端绑定的对话。 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const error = ref('')
// 只在进入回调页时兑换一次；缺失授权码时留在错误页，不继续认证请求。
onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) {
    error.value = 'SSO 回调缺少一次性授权码'
    return
  }
  try {
    const exchanged = await auth.exchange(code)
    // query conversationId 来自浏览器，只作对照；续接只信服务端兑换响应的绑定值。
    await router.replace({
      path: '/chat',
      query: exchanged.ConversationId ? { conversation: exchanged.ConversationId } : {},
    })
  } catch (e) {
    error.value = (e as Error).message
  }
})
// 手动重试由服务端裁定一次性码是否仍有效，客户端不缓存或重新生成授权码。
const retry = () => window.location.reload()
/** 返回登录重新授权，保留会话提示但不将其作为已验证的绑定值。 */
const back = () =>
  router.replace({
    name: 'login',
    query: route.query.conversationId ? { conversationId: String(route.query.conversationId) } : {},
  })
</script>
<template>
  <main class="sso-page">
    <section class="sso-card" role="status">
      <BrandLogo :size="46" />
      <div :class="['sso-status-icon', { error }]">
        <Icon :icon="error ? 'lucide:shield-x' : 'lucide:loader-circle'" />
      </div>
      <h2>{{ error ? '企业登录未完成' : `正在进入 ${settings.brand}` }}</h2>
      <p>{{ error || '正在确认企业账号并返回 AI 工作台，请稍候…' }}</p>
      <div v-if="error" class="sso-actions">
        <button type="button" class="auth-primary" @click="retry">重新确认</button
        ><button type="button" class="sso-secondary" @click="back">返回登录</button>
      </div>
    </section>
  </main>
</template>
