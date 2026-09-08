<script setup lang="ts">
/** 管理员模型诊断页；仅展示服务端允许的模型，密钥始终不进入浏览器。 */
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { aiApi } from '@/api/ai'
import { useAuthStore } from '@/stores/auth'
import OptionPicker from '@/components/OptionPicker.vue'
import type { AiModelDefinition } from '@/types/ai'

const auth = useAuthStore()
const models = ref<AiModelDefinition[]>([])
const provider = ref('')
const model = ref('')
const message = ref('请简要说明你的可用能力。')
const freeOnly = ref(false)
const loading = ref(false)
const error = ref('')
const result = ref<Record<string, unknown>>()
// 权限检查控制页面与请求入口，服务端仍必须独立校验操作权限。
const allowed = computed(
  () =>
    auth.session?.Permissions?.some((x) => ['AI.Admin.Model.Test', 'AI.Manage'].includes(x)) ===
    true,
)
const filtered = computed(() =>
  models.value.filter(
    (x) => (!provider.value || x.ProviderId === provider.value) && (!freeOnly.value || x.IsFree),
  ),
)
const providerOptions = computed(() => [
  { value: '', label: '自动路由' },
  ...[...new Set(models.value.map((x) => x.ProviderId))].map((value) => ({ value, label: value })),
])
const modelOptions = computed(() => [
  { value: '', label: '自动选择' },
  ...filtered.value.map((item) => ({
    value: item.UpstreamModelId,
    label: item.DisplayName,
    description: item.UpstreamModelId,
  })),
])
// 无权限不加载真实模型目录，避免界面初始化泄露供应商信息。
onMounted(async () => {
  if (allowed.value) {
    loading.value = true
    try {
      models.value = await aiApi.models()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }
})
/** 单次诊断请求展示脱敏响应；运行中禁重复调用。 */
const run = async () => {
  if (!allowed.value || loading.value || !message.value.trim()) return
  loading.value = true
  error.value = ''
  result.value = undefined
  try {
    result.value = await aiApi.testModel({
      ProviderId: provider.value || undefined,
      ModelId: model.value || undefined,
      Message: message.value.trim(),
    })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <div class="module-page">
    <header class="module-header">
      <div>
        <span class="eyebrow">ADMIN TEST</span>
        <h1>模型测试台</h1>
        <p>真实调用统一模型路由；密钥始终留在服务端。</p>
      </div>
    </header>
    <div v-if="!allowed" class="module-state error">
      <Icon icon="lucide:shield-x" />
      <h2>没有模型测试权限</h2>
      <p>需要 AI.Admin.Model.Test 或 AI.Manage，Provider 和真实模型不会向普通用户显示。</p>
    </div>
    <div v-else class="model-lab">
      <section class="lab-controls">
        <label
          >Provider<OptionPicker
            v-model="provider"
            :options="providerOptions"
            placeholder="自动路由" /></label
        ><label
          >真实模型<OptionPicker
            v-model="model"
            :options="modelOptions"
            placeholder="自动选择" /></label
        ><button
          type="button"
          class="check-label"
          :class="{ selected: freeOnly }"
          :aria-pressed="freeOnly"
          @click="freeOnly = !freeOnly"
        >
          <Icon
            :icon="freeOnly ? 'lucide:square-check-big' : 'lucide:square'"
          />只看已开放模型</button
        ><label>测试 Prompt<textarea v-model="message" rows="6" /></label
        ><button :disabled="loading || !message.trim()" @click="run">
          <Icon :icon="loading ? 'lucide:loader-circle' : 'lucide:play'" />真实运行
        </button>
      </section>
      <section class="lab-result">
        <h2>响应与指标</h2>
        <div v-if="error" class="inline-error">{{ error }}</div>
        <div v-else-if="result">
          <pre>{{ JSON.stringify(result, null, 2) }}</pre>
        </div>
        <div v-else class="panel-empty">
          运行后显示服务端已脱敏的内容、Provider、模型与用量字段。
        </div>
      </section>
    </div>
  </div>
</template>
