<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { aiApi } from '@/api/ai'
import { ApiError } from '@/api/http'
import type { WorkspaceSession } from '@/types/ai'
import { normalizeBackendResourceUrl } from '@/utils/backendResource'
import UsageSummaryPanel from './UsageSummaryPanel.vue'

const props = defineProps<{ open: boolean; session: WorkspaceSession }>()
const emit = defineEmits<{ close: []; saved: []; password: [] }>()
const name = ref('')
const avatarFileId = ref<string>()
const avatarPreview = ref<string>()
const uploading = ref(false)
const saving = ref(false)
const error = ref('')
const picker = ref<HTMLInputElement>()

watch(() => props.open, open => {
  if (!open) return
  name.value = props.session.UserName || ''
  avatarFileId.value = props.session.AvatarFileId
  avatarPreview.value = normalizeBackendResourceUrl(props.session.AvatarContentUrl)
  error.value = ''
}, { immediate: true })

async function uploadAvatar(files: FileList | null) {
  const file = files?.[0]; if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { error.value = '头像仅支持 PNG、JPG、WebP，大小不超过 5MB'; return }
  uploading.value = true; error.value = ''
  try {
    const uploaded = await aiApi.upload(file)
    avatarFileId.value = uploaded.FileId
    avatarPreview.value = normalizeBackendResourceUrl(uploaded.ContentUrl)
    if (!avatarPreview.value) error.value = '头像已上传，但文件服务未返回可预览地址'
  } catch (reason) { error.value = reason instanceof ApiError ? reason.message : '头像上传失败' }
  finally { uploading.value = false }
}

async function save() {
  if (!name.value.trim()) { error.value = '昵称不能为空'; return }
  saving.value = true; error.value = ''
  try {
    await aiApi.updateExternalProfile({ DisplayName: name.value.trim(), AvatarFileId: avatarFileId.value })
    ElMessage.success('个人资料已更新'); emit('saved'); emit('close')
  } catch (reason) { error.value = reason instanceof ApiError ? reason.message : '个人资料保存失败' }
  finally { saving.value = false }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="password-dialog-backdrop" @click.self="emit('close')">
      <section class="password-dialog profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
        <header><span><Icon icon="lucide:user-round-cog" /><strong id="profile-dialog-title">个人中心</strong></span><button aria-label="关闭" @click="emit('close')"><Icon icon="lucide:x" /></button></header>
        <div class="profile-avatar-editor"><button :disabled="uploading" @click="picker?.click()"><img v-if="avatarPreview" :src="avatarPreview" alt="当前头像" /><span v-else>{{ (name || 'A').slice(0, 1).toUpperCase() }}</span><i><Icon :icon="uploading ? 'lucide:loader-circle' : 'lucide:camera'" /></i></button><div><strong>个人头像</strong><small>PNG、JPG、WebP · 最大 5MB</small><button @click="picker?.click()">{{ uploading ? '上传中…' : '更换头像' }}</button></div><input ref="picker" type="file" hidden accept="image/png,image/jpeg,image/webp" @change="uploadAvatar(($event.target as HTMLInputElement).files)" /></div>
        <label class="auth-field"><span>昵称</span><div><Icon icon="lucide:user-round" /><input v-model="name" maxlength="50" autocomplete="name" placeholder="请输入昵称" /></div></label>
        <label class="auth-field"><span>登录邮箱</span><div class="profile-readonly"><Icon icon="lucide:mail" /><input :value="session.Email || ''" readonly /></div></label>
        <button class="profile-password-entry" @click="emit('password')"><Icon icon="lucide:key-round" /><span><strong>{{ session.HasPassword ? '修改登录密码' : '设置登录密码' }}</strong><small>管理外部账号的密码登录凭证</small></span><Icon icon="lucide:chevron-right" /></button>
        <UsageSummaryPanel />
        <p v-if="error" class="auth-error" role="alert"><Icon icon="lucide:circle-alert" />{{ error }}</p>
        <footer><button class="password-cancel" :disabled="saving" @click="emit('close')">取消</button><button class="auth-primary" :disabled="saving || !name.trim()" @click="save"><Icon :icon="saving ? 'lucide:loader-circle' : 'lucide:check'" />{{ saving ? '保存中…' : '保存资料' }}</button></footer>
      </section>
    </div>
  </Teleport>
</template>
