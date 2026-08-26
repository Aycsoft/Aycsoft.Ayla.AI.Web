<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'

export interface PickerOption { value: string; label: string; description?: string }
const props = defineProps<{ modelValue: string; options: PickerOption[]; placeholder: string; ariaLabel?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const current = computed(() => props.options.find(item => item.value === props.modelValue))
const choose = (value: string) => { emit('update:modelValue', value); open.value = false }
</script>

<template>
  <div class="option-picker">
    <button type="button" class="option-picker-trigger" :aria-label="ariaLabel || placeholder" :aria-expanded="open" @click="open = !open"><span>{{ current?.label || placeholder }}</span><Icon icon="lucide:chevron-down" /></button>
    <div v-if="open" class="option-picker-menu" role="listbox">
      <button v-for="option in options" :key="option.value" type="button" role="option" :aria-selected="option.value === modelValue" :class="{ active: option.value === modelValue }" @click="choose(option.value)"><span><strong>{{ option.label }}</strong><small v-if="option.description">{{ option.description }}</small></span><Icon v-if="option.value === modelValue" icon="lucide:check" /></button>
    </div>
    <button v-if="open" type="button" class="option-picker-backdrop" aria-label="关闭选项" @click="open = false" />
  </div>
</template>
