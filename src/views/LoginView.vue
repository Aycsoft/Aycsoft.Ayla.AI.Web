<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { ApiError } from '@/api/http'
import { aiApi } from '@/api/ai'
import { buildErpAuthorizeUrl, buildWorkspaceRouteUrl } from '@/utils/navigation'
import { buildExternalRegistration, externalUserPurposes, isValidEmail, normalizeEmail } from '@/utils/externalAuth'
import { isStrongExternalPassword } from '@/utils/password'
import type { ExternalAuthScene } from '@/types/ai'

type Channel = 'internal' | 'external'
type LoginMethod = 'password' | 'code'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const channel = ref<Channel>('internal')
const scene = ref<ExternalAuthScene>('login')
const loginMethod = ref<LoginMethod>('password')
const resettingPassword = ref(false)
const name = ref('')
const email = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const purposes = ref<string[]>([])
const otherPurpose = ref('')
const sendingCode = ref(false)
const submitting = ref(false)
const error = ref('')
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | undefined

const portalOrigin = String(import.meta.env.VITE_PORTAL_ORIGIN || `${window.location.protocol}//${window.location.hostname}:4000`).replace(/\/$/, '')
const loginUrl = String(import.meta.env.VITE_SSO_LOGIN_URL || `${portalOrigin}/#/ai/sso/authorize`).trim()
const internalConfigured = computed(() => Boolean(loginUrl))
const codeLabel = computed(() => countdown.value > 0 ? `${countdown.value} 秒后重发` : '获取验证码')
const codePurpose = computed<ExternalAuthScene>(() => resettingPassword.value ? 'reset-password' : scene.value)
const passwordStrong = computed(() => isStrongExternalPassword(password.value))
const passwordsMatch = computed(() => Boolean(confirmPassword.value) && password.value === confirmPassword.value)
const submitIssue = computed(() => {
  if (!isValidEmail(email.value)) return '请输入可接收邮件的有效邮箱地址'
  if (resettingPassword.value) {
    if (code.value.trim().length < 4) return '请输入邮箱验证码'
    if (!passwordStrong.value) return '密码至少 10 位，并包含大小写字母、数字、符号中的三类'
    if (!passwordsMatch.value) return '两次输入的密码不一致'
    return ''
  }
  if (scene.value === 'login') {
    if (loginMethod.value === 'password' && !password.value) return '请输入登录密码'
    if (loginMethod.value === 'code' && code.value.trim().length < 4) return '请输入邮箱验证码'
    return ''
  }
  if (!name.value.trim()) return '请输入您的名称'
  if (code.value.trim().length < 4) return '请输入邮箱验证码'
  if (!passwordStrong.value) return '密码至少 10 位，并包含大小写字母、数字、符号中的三类'
  if (!passwordsMatch.value) return '两次输入的密码不一致'
  if (purposes.value.length === 0) return '请至少选择一个使用目的'
  if (purposes.value.includes('other') && !otherPurpose.value.trim()) return '请填写其他使用目的'
  return ''
})
const canSubmit = computed(() => !submitting.value)

watch([channel, scene, loginMethod], () => { error.value = ''; code.value = ''; password.value = ''; confirmPassword.value = ''; resettingPassword.value = false })
onBeforeUnmount(() => { if (countdownTimer) clearInterval(countdownTimer) })

function enterPortal() {
  if (!loginUrl) return
  const callback = buildWorkspaceRouteUrl(
    '/auth/sso/callback',
    { conversationId: String(route.query.conversationId || '').trim() || undefined },
    String(import.meta.env.VITE_WORKSPACE_ORIGIN || window.location.origin)
  )
  window.location.assign(buildErpAuthorizeUrl(loginUrl, callback.toString()).toString())
}

function togglePurpose(value: string) {
  purposes.value = purposes.value.includes(value) ? purposes.value.filter(item => item !== value) : [...purposes.value, value]
}

function beginCountdown(seconds = 60) {
  countdown.value = Math.max(1, seconds)
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) { clearInterval(countdownTimer); countdownTimer = undefined }
  }, 1000)
}

async function sendCode() {
  error.value = ''
  if (!isValidEmail(email.value)) { error.value = '请输入可接收验证码的有效邮箱地址'; return }
  sendingCode.value = true
  try {
    const response = await aiApi.sendExternalAuthCode({ Email: normalizeEmail(email.value), Purpose: codePurpose.value })
    beginCountdown(response.RetryAfterSeconds || 60)
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '验证码发送失败，请稍后重试'
  } finally { sendingCode.value = false }
}

async function submitExternal() {
  error.value = ''
  if (submitIssue.value) { error.value = submitIssue.value; return }
  submitting.value = true
  try {
    if (resettingPassword.value) {
      await aiApi.resetExternalPassword({ Email: normalizeEmail(email.value), Code: code.value.trim(), NewPassword: password.value })
      resettingPassword.value = false; loginMethod.value = 'password'; code.value = ''; confirmPassword.value = ''
      ElMessage.success('密码已重置，请使用新密码登录')
      return
    }
    if (scene.value === 'register') await auth.registerExternal(buildExternalRegistration({ name: name.value, email: email.value, code: code.value, purposes: purposes.value, otherPurpose: otherPurpose.value, password: password.value }))
    else if (loginMethod.value === 'password') await auth.loginExternalPassword({ Email: normalizeEmail(email.value), Password: password.value })
    else await auth.loginExternal({ Email: normalizeEmail(email.value), Code: code.value.trim() })
    await router.replace({ name: 'chat', query: route.query.conversationId ? { conversation: String(route.query.conversationId) } : {} })
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '账号验证失败，请检查验证码后重试'
  } finally { submitting.value = false }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-visual" aria-label="AI 工作台能力说明">
      <div class="auth-brand"><BrandLogo :size="34" /><strong>{{ settings.brand }}</strong></div>
      <div class="auth-visual-copy">
        <span class="auth-kicker">AYCSOFT AI WORKSPACE</span>
        <h1>一个账号，连接完整的 AI 创作与协作能力</h1>
        <p>企业成员安全访问 ERP 业务；外部用户也可使用对话、会话记忆、文件处理、图片与视频生成。</p>
        <div class="auth-capabilities">
          <span><Icon icon="lucide:message-square-more" /> 长期会话</span>
          <span><Icon icon="lucide:paperclip" /> 文件处理</span>
          <span><Icon icon="lucide:image" /> 图片生成</span>
          <span><Icon icon="lucide:video" /> 视频生成</span>
        </div>
        <div class="auth-boundary"><Icon icon="lucide:shield-check" /><span><strong>数据边界清晰</strong><small>外部账号无法访问 CrossCart ERP 业务数据，其他 AI 能力完整开放。</small></span></div>
      </div>
      <small>© Aycsoft · {{ settings.author }}</small>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <header><BrandLogo :size="42" /><div><h2>登录 {{ settings.brand }}</h2><p>请选择与你身份匹配的登录方式</p></div></header>

        <div class="auth-channel-tabs" role="tablist" aria-label="账号类型">
          <button :class="{ active: channel === 'internal' }" role="tab" :aria-selected="channel === 'internal'" @click="channel = 'internal'"><Icon icon="lucide:building-2" /><span><strong>企业内部用户</strong><small>使用 CrossCart ERP 账号</small></span></button>
          <button :class="{ active: channel === 'external' }" role="tab" :aria-selected="channel === 'external'" @click="channel = 'external'"><Icon icon="lucide:users-round" /><span><strong>外部用户</strong><small>使用邮箱或密码</small></span></button>
        </div>

        <div v-if="channel === 'internal'" class="internal-auth">
          <div class="internal-provider">
            <div class="internal-provider-brand"><span><Icon icon="lucide:building-2" /></span><div><strong>CrossCart 企业账号</strong><small>统一身份认证 · 组织权限自动同步</small></div><Icon icon="lucide:badge-check" /></div>
            <ol class="internal-auth-flow"><li><span>1</span>前往 ERP 登录</li><li><span>2</span>确认企业身份</li><li><span>3</span>返回当前工作台</li></ol>
            <p><Icon icon="lucide:shield-check" />登录完成后将按当前账号权限访问企业资源。</p>
          </div>
          <button class="auth-primary" type="button" :disabled="!internalConfigured" @click="enterPortal"><span>使用企业账号继续</span><Icon icon="lucide:arrow-right" /></button>
          <p v-if="!internalConfigured" class="auth-error"><Icon icon="lucide:triangle-alert" /> 当前环境尚未配置 ERP 统一登录地址。</p>
        </div>

        <form v-else class="external-auth" @submit.prevent="submitExternal">
          <div class="auth-mode-tabs" role="tablist" aria-label="外部账号操作">
            <button type="button" :class="{ active: scene === 'login' }" @click="scene = 'login'; resettingPassword = false">账号登录</button>
            <button type="button" :class="{ active: scene === 'register' }" @click="scene = 'register'; resettingPassword = false">创建账号</button>
          </div>
          <div v-if="scene === 'login' && !resettingPassword" class="auth-login-methods" role="tablist" aria-label="登录凭证">
            <button type="button" :class="{ active: loginMethod === 'password' }" @click="loginMethod = 'password'"><Icon icon="lucide:key-round" />密码登录</button>
            <button type="button" :class="{ active: loginMethod === 'code' }" @click="loginMethod = 'code'"><Icon icon="lucide:mail-check" />验证码登录</button>
          </div>
          <div v-if="resettingPassword" class="auth-reset-heading"><button type="button" aria-label="返回登录" @click="resettingPassword = false"><Icon icon="lucide:arrow-left" /></button><span><strong>重置登录密码</strong><small>验证码将发送至您的注册邮箱</small></span></div>
          <label v-if="scene === 'register'" class="auth-field"><span>您的名称</span><div><Icon icon="lucide:user-round" /><input v-model="name" maxlength="50" autocomplete="name" placeholder="请输入您的名称" /></div></label>
          <label class="auth-field"><span>邮箱地址</span><div><Icon icon="lucide:mail" /><input v-model="email" type="email" maxlength="160" autocomplete="email" placeholder="name@example.com" /></div></label>
          <label v-if="scene === 'register' || resettingPassword || loginMethod === 'code'" class="auth-field"><span>邮箱验证码</span><div class="auth-code-field"><Icon icon="lucide:badge-check" /><input v-model="code" inputmode="numeric" maxlength="8" autocomplete="one-time-code" placeholder="请输入验证码" /><button type="button" :disabled="sendingCode || countdown > 0" @click="sendCode">{{ sendingCode ? '发送中…' : codeLabel }}</button></div></label>
          <label v-if="scene === 'register' || resettingPassword || loginMethod === 'password'" class="auth-field"><span>{{ scene === 'register' ? '设置登录密码' : resettingPassword ? '新密码' : '登录密码' }}</span><div class="auth-password-field"><Icon icon="lucide:key-round" /><input v-model="password" :type="showPassword ? 'text' : 'password'" maxlength="128" :autocomplete="scene === 'login' && !resettingPassword ? 'current-password' : 'new-password'" :placeholder="scene === 'login' && !resettingPassword ? '请输入登录密码' : '至少 10 位，包含三类字符'" /><button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword"><Icon :icon="showPassword ? 'lucide:eye-off' : 'lucide:eye'" /></button></div></label>
          <label v-if="scene === 'register' || resettingPassword" class="auth-field"><span>确认密码</span><div><Icon icon="lucide:shield-check" /><input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" maxlength="128" autocomplete="new-password" placeholder="再次输入密码" /></div></label>
          <div v-if="scene === 'register' || resettingPassword" class="auth-password-status" aria-live="polite">
            <span :class="{ valid: passwordStrong, invalid: password.length > 0 && !passwordStrong }"><Icon :icon="passwordStrong ? 'lucide:circle-check' : 'lucide:circle'" />至少 10 位，包含四类字符中的三类</span>
            <span :class="{ valid: passwordsMatch, invalid: confirmPassword.length > 0 && !passwordsMatch }"><Icon :icon="passwordsMatch ? 'lucide:circle-check' : 'lucide:circle'" />两次密码一致</span>
          </div>
          <button v-if="scene === 'login' && loginMethod === 'password' && !resettingPassword" class="auth-forgot" type="button" @click="resettingPassword = true; code = ''; password = ''; confirmPassword = ''">忘记密码？</button>
          <fieldset v-if="scene === 'register'" class="purpose-fieldset">
            <legend>您希望用 AI 完成什么？<small>可多选</small></legend>
            <div class="purpose-grid">
              <button v-for="item in externalUserPurposes" :key="item.value" type="button" :class="{ selected: purposes.includes(item.value) }" :aria-pressed="purposes.includes(item.value)" @click="togglePurpose(item.value)"><Icon :icon="item.icon" /><span>{{ item.label }}</span><Icon :icon="purposes.includes(item.value) ? 'lucide:circle-check-big' : 'lucide:circle'" /></button>
            </div>
            <label v-if="purposes.includes('other')" class="auth-field other-purpose"><span>其他使用目的</span><div><Icon icon="lucide:message-square-text" /><input v-model="otherPurpose" maxlength="120" placeholder="请简单说明" /></div></label>
          </fieldset>
          <p v-if="error" class="auth-error" role="alert"><Icon icon="lucide:circle-alert" /> {{ error }}</p>
          <button class="auth-primary" type="submit" :disabled="submitting || !canSubmit"><span>{{ submitting ? '正在验证…' : resettingPassword ? '重置密码' : scene === 'register' ? '创建账号并进入' : '登录并进入' }}</span><Icon :icon="submitting ? 'lucide:loader-circle' : 'lucide:arrow-right'" /></button>
        </form>
      </div>
    </section>
  </main>
</template>
