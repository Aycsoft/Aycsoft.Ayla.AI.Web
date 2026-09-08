<script setup lang="ts">
/**
 * 外部账号密码表单，前端强度提示不能替代服务端身份校验。
 * hasPassword 影响提示文案；saved 请求刷新账号，close 请求关闭。
 */
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { aiApi } from '@/api/ai'
import { ApiError } from '@/api/http'
import { isStrongExternalPassword, passwordCategoryCount } from '@/utils/password'

const props = defineProps<{ open: boolean; hasPassword?: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPasswords = ref(false)
const saving = ref(false)
const error = ref('')
const strength = computed(() => passwordCategoryCount(newPassword.value))
const valid = computed(
  () => isStrongExternalPassword(newPassword.value) && newPassword.value === confirmPassword.value,
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    error.value = ''
    showPasswords.value = false
  },
)

async function save() {
  if (saving.value) return
  error.value = ''
  if (!valid.value) {
    error.value = '新密码至少 10 位、包含四类字符中的三类，且两次输入必须一致'
    return
  }
  saving.value = true
  try {
    await aiApi.setExternalPassword({
      CurrentPassword: currentPassword.value || undefined,
      NewPassword: newPassword.value,
    })
    ElMessage.success(props.hasPassword ? '密码已更新' : '登录密码已设置')
    emit('saved')
    emit('close')
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : '密码设置失败，请稍后重试'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="password-dialog-backdrop"
      role="presentation"
      @click.self="emit('close')"
    >
      <section
        class="password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
      >
        <header>
          <span
            ><Icon icon="lucide:key-round" /><strong id="password-dialog-title">{{
              hasPassword ? '修改登录密码' : '设置登录密码'
            }}</strong></span
          ><button aria-label="关闭" @click="emit('close')"><Icon icon="lucide:x" /></button>
        </header>
        <p>首次设置可不填当前密码；修改已有密码时必须填写。服务端会执行最终强度与身份校验。</p>
        <label class="auth-field"
          ><span>当前密码（首次设置可留空）</span>
          <div>
            <Icon icon="lucide:lock" /><input
              v-model="currentPassword"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="已有密码时请输入"
            /></div
        ></label>
        <label class="auth-field"
          ><span>新密码</span>
          <div>
            <Icon icon="lucide:shield-keyhole" /><input
              v-model="newPassword"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="128"
              placeholder="至少 10 位，包含三类字符"
            /></div
        ></label>
        <div class="password-strength" :aria-label="`密码强度 ${strength}/4`">
          <i v-for="index in 4" :key="index" :class="{ active: strength >= index }" />
        </div>
        <label class="auth-field"
          ><span>确认新密码</span>
          <div>
            <Icon icon="lucide:shield-check" /><input
              v-model="confirmPassword"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="128"
              placeholder="再次输入新密码"
            /></div
        ></label>
        <button class="password-visibility" type="button" @click="showPasswords = !showPasswords">
          <Icon :icon="showPasswords ? 'lucide:eye-off' : 'lucide:eye'" />{{
            showPasswords ? '隐藏密码' : '显示密码'
          }}
        </button>
        <p v-if="error" class="auth-error" role="alert">
          <Icon icon="lucide:circle-alert" />{{ error }}
        </p>
        <footer>
          <button class="password-cancel" @click="emit('close')">取消</button
          ><button class="auth-primary" :disabled="saving || !valid" @click="save">
            <Icon :icon="saving ? 'lucide:loader-circle' : 'lucide:check'" />{{
              saving ? '正在保存…' : '保存密码'
            }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
