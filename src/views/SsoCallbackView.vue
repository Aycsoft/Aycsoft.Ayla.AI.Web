<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const error = ref('')
onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) { error.value = 'SSO 回调缺少一次性授权码'; return }
  try {
    const exchanged = await auth.exchange(code)
    // query conversationId 来自浏览器，只作对照；续接只信服务端兑换响应的绑定值。
    await router.replace({ path: '/chat', query: exchanged.ConversationId ? { conversation: exchanged.ConversationId } : {} })
  } catch (e) { error.value = (e as Error).message }
})
</script>
<template><div class="module-state sso-state"><Icon :icon="error ? 'lucide:shield-x' : 'lucide:loader-circle'" /><h2>{{ error ? '统一登录失败' : '正在建立安全会话' }}</h2><p>{{ error || '正在使用一次性票据兑换 HttpOnly Cookie，不会在浏览器保存 JWT 或 SessionId。' }}</p></div></template>
