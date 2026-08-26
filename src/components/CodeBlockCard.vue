<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import { buildSandboxPreview, isRunnableLanguage, runCodeSafely } from '@/utils/safeCodeRunner'

const props = defineProps<{ code: string; language?: string }>()
const draft = ref(props.code); const editing = ref(false); const running = ref(false); const result = ref<{ ok: boolean; output: string }>(); const previewOpen = ref(false); let controller: AbortController | undefined
watch(() => props.code, value => { if (!editing.value) draft.value = value })
const copy = async () => { await navigator.clipboard.writeText(draft.value); ElMessage.success('代码已复制') }
const run = async () => { const language = props.language || 'text'; const preview = buildSandboxPreview(language, draft.value); if (preview) { previewOpen.value = true; result.value = undefined; window.dispatchEvent(new CustomEvent('ayla:code-preview-open', { detail: { language, code: draft.value, srcdoc: preview } })); return } controller = new AbortController(); running.value = true; result.value = await runCodeSafely(language, draft.value, 1800, controller.signal); running.value = false; controller = undefined }
const stop = () => { controller?.abort(); if (previewOpen.value) window.dispatchEvent(new CustomEvent('ayla:code-preview-close')); previewOpen.value = false; running.value = false }
const reset = () => { stop(); draft.value = props.code; result.value = undefined; editing.value = false }
</script>

<template>
  <section class="code-card">
    <header><span><Icon icon="lucide:code-2" />{{ language || 'text' }}</span><div><button @click="editing = !editing"><Icon :icon="editing ? 'lucide:check' : 'lucide:pencil'" />{{ editing ? '完成' : '编辑' }}</button><button @click="copy"><Icon icon="lucide:copy" />复制</button><button v-if="running || previewOpen" class="danger" @click="stop"><Icon icon="lucide:square" />停止</button><button v-else :disabled="!isRunnableLanguage(language || 'text')" :title="isRunnableLanguage(language || 'text') ? '在无网络限时沙箱中运行' : '该语言不允许浏览器运行'" @click="run"><Icon icon="lucide:play" />运行</button><button @click="reset"><Icon icon="lucide:rotate-ccw" />重置</button></div></header>
    <textarea v-if="editing" v-model="draft" spellcheck="false" aria-label="编辑代码" />
    <pre v-else><code>{{ draft }}</code></pre>
    <div v-if="result" :class="['code-result', { error: !result.ok }]"><strong>{{ result.ok ? '运行输出' : '安全终止' }}</strong><pre>{{ result.output }}</pre></div>
    <footer><Icon icon="lucide:shield-check" />HTML/CSS 在 CSP 隔离 iframe 预览；JavaScript 在无网络、限时 Worker 运行；禁止顶层导航、下载与外部请求。</footer>
  </section>
</template>
