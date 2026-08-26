<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { WorkspaceModel } from '@/types/ai'
import { matchesModelSearch } from '@/utils/modelCatalog'

const props = withDefaults(defineProps<{ models: WorkspaceModel[]; modelValue: string; capability?: 'chat' | 'image' | 'video' }>(), { capability: 'chat' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const keyword = ref('')
const current = computed(() => props.models.find(item => item.SelectionAlias === props.modelValue))
const filtered = computed(() => props.models.filter(item => {
  const capable = props.capability === 'image' ? item.SupportsImageGeneration : props.capability === 'video' ? item.SupportsVideoGeneration : item.SupportsStreaming
  return capable && matchesModelSearch(item, keyword.value)
}))
const choose = (model: WorkspaceModel) => {
  if (!model.Available || !model.SelectionAlias) return
  emit('update:modelValue', model.SelectionAlias)
  open.value = false
}
</script>

<template>
  <div class="model-picker">
    <button class="model-picker-trigger" aria-label="切换模型" :aria-expanded="open" @click="open = !open"><Icon icon="lucide:cpu" /><span>{{ current?.SelectionAlias || '自动选择模型' }}</span><Icon icon="lucide:chevrons-up-down" /></button>
    <div v-if="open" class="model-picker-popover">
      <div class="model-picker-title"><strong>选择模型</strong><small>统一使用 Aycsoft 产品别名</small></div>
      <label class="model-picker-search"><Icon icon="lucide:search" /><input v-model="keyword" autofocus placeholder="搜索模型" /></label>
      <div class="model-picker-list">
        <button v-for="model in filtered" :key="model.InternalAlias" :disabled="!model.Available || !model.SelectionAlias" :class="{ active: model.SelectionAlias === modelValue }" :title="model.Available ? model.DisplayName : '该模型尚未通过生产可用性验证'" @click="choose(model)">
          <span class="model-picker-name"><strong>{{ model.SelectionAlias || model.DisplayName }}</strong><small>{{ model.DisplayName }} · {{ model.Health }}</small><em><Icon icon="lucide:sparkles" />适合：{{ model.BestFor }}</em></span>
          <span class="model-capabilities"><i v-if="model.SupportsReasoning">深度思考</i><i v-if="model.SupportsFiles">文件</i><i v-if="model.SupportsImageGeneration">图片</i><i v-if="model.SupportsVideoGeneration">视频</i></span>
          <Icon v-if="model.SelectionAlias === modelValue" icon="lucide:check" /><Icon v-else-if="!model.Available" icon="lucide:lock-keyhole" />
        </button>
      </div>
    </div>
    <button v-if="open" class="model-picker-backdrop" aria-label="关闭模型列表" @click="open = false" />
  </div>
</template>
