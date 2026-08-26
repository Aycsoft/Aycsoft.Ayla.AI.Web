<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { Artifact, TraceStep } from '@/types/ai'
import { contentUrl, downloadBackendResource, downloadUrl, loadBackendResource } from '@/utils/backendResource'
import { classifyOutput, isSuccessfulArtifact } from '@/utils/messageContent'
import CodeBlockCard from './CodeBlockCard.vue'
import ResourceErrorCard from './ResourceErrorCard.vue'

const props = defineProps<{ open: boolean; artifacts: Artifact[]; selectedId?: string; traces?: TraceStep[] }>()
const emit = defineEmits<{ close: [] }>()
const tabs = ref<string[]>([]); const activeId = ref(''); const textContent = ref(''); const loadingText = ref(false); const resourceError = ref(''); const previewKey = ref(0); const downloading = ref(false)
const panelWidth = ref(Math.max(420, Math.min(Number(localStorage.getItem('ayla-artifact-width')) || 760, window.innerWidth * .82)))
const active = computed(() => props.artifacts.find(item => item.ArtifactId === activeId.value)); const kind = computed(() => active.value ? classifyOutput(active.value.Type, active.value.FileName) : 'file'); const url = computed(() => contentUrl(active.value)); const progress = computed(() => Math.max(0, ...(props.traces || []).map(item => item.Progress || 0))); const language = computed(() => active.value?.FileName.split('.').pop()?.toLowerCase() || 'text')
const openArtifact = (artifact: Artifact) => { if (!tabs.value.includes(artifact.ArtifactId)) tabs.value.push(artifact.ArtifactId); activeId.value = artifact.ArtifactId }
const closeTab = (id: string) => { const index = tabs.value.indexOf(id); tabs.value = tabs.value.filter(item => item !== id); if (activeId.value === id) activeId.value = tabs.value[Math.max(0, index - 1)] || '' }
watch(() => props.selectedId, id => { const artifact = props.artifacts.find(item => item.ArtifactId === id); if (artifact) openArtifact(artifact) }, { immediate: true })
const loadCode = async (artifact: Artifact) => { loadingText.value = true; try { const source = contentUrl(artifact); if (!source) throw new Error('missing content url'); const blob = await loadBackendResource(source); textContent.value = (await blob.text()).slice(0, 500_000) } catch { resourceError.value = 'Artifact 内容读取失败，请重试' } finally { loadingText.value = false } }
watch(active, async artifact => { textContent.value = ''; resourceError.value = ''; previewKey.value++; if (!artifact || classifyOutput(artifact.Type, artifact.FileName) !== 'code' || !url.value || !isSuccessfulArtifact(artifact.Status)) return; await loadCode(artifact) })
const retryResource = async () => { resourceError.value = ''; previewKey.value++; if (active.value && kind.value === 'code') await loadCode(active.value) }
const download = async () => { if (!active.value || downloading.value) return; downloading.value = true; resourceError.value = ''; try { const source = downloadUrl(active.value) || contentUrl(active.value); if (!source) throw new Error('missing download url'); await downloadBackendResource(source, active.value.FileName) } catch { resourceError.value = 'Artifact 下载失败，请重试' } finally { downloading.value = false } }
let resizeStartX = 0; let resizeStartWidth = 0
const resize = (event: PointerEvent) => { panelWidth.value = Math.max(360, Math.min(resizeStartWidth + resizeStartX - event.clientX, window.innerWidth * .9)) }
const stopResize = () => { window.removeEventListener('pointermove', resize); window.removeEventListener('pointerup', stopResize); localStorage.setItem('ayla-artifact-width', String(Math.round(panelWidth.value))) }
const startResize = (event: PointerEvent) => { resizeStartX = event.clientX; resizeStartWidth = panelWidth.value; window.addEventListener('pointermove', resize); window.addEventListener('pointerup', stopResize) }
onBeforeUnmount(stopResize)
</script>

<template>
  <aside :class="['artifact-workspace', { open }]" :style="{ width: `${panelWidth}px` }" aria-label="Artifact 工作区">
    <button class="workspace-resize-handle" aria-label="拖动调整工作区宽度" @pointerdown.prevent="startResize" />
    <header><span><Icon icon="lucide:panels-top-left" /><strong>Artifact Workspace</strong></span><button aria-label="关闭工作区" @click="emit('close')"><Icon icon="lucide:x" /></button></header>
    <div class="artifact-workspace-body">
      <nav class="artifact-tree"><strong>任务文件</strong><button v-for="item in artifacts" :key="item.ArtifactId" :class="{ active: item.ArtifactId === activeId }" @click="openArtifact(item)"><Icon :icon="classifyOutput(item.Type, item.FileName) === 'image' ? 'lucide:image' : classifyOutput(item.Type, item.FileName) === 'video' ? 'lucide:clapperboard' : classifyOutput(item.Type, item.FileName) === 'code' ? 'lucide:file-code-2' : 'lucide:file'" /><span>{{ item.FileName }}</span><i :class="item.Status">{{ isSuccessfulArtifact(item.Status) ? '完成' : item.Status }}</i></button><div v-if="!artifacts.length" class="artifact-tree-empty">生成中的文件会按真实任务状态显示在这里。</div></nav>
      <section class="artifact-editor">
        <div class="artifact-tabs"><button v-for="id in tabs" :key="id" :class="{ active: id === activeId }" @click="activeId = id"><span>{{ artifacts.find(item => item.ArtifactId === id)?.FileName }}</span><Icon icon="lucide:x" @click.stop="closeTab(id)" /></button></div>
        <div v-if="active" class="artifact-viewer">
          <div v-if="!isSuccessfulArtifact(active.Status)" class="workspace-progress"><Icon icon="lucide:loader-circle" /><strong>{{ active.FileName }}</strong><span>{{ active.Status }} · {{ progress }}%</span><div><i :style="{ width: `${Math.max(4, progress)}%` }" /></div></div>
          <template v-else><ResourceErrorCard v-if="resourceError" :message="resourceError" @retry="retryResource" /><CodeBlockCard v-else-if="kind === 'code'" :code="loadingText ? '// 正在读取真实文件…' : textContent" :language="language" /><img v-else-if="kind === 'image' && url" :key="previewKey" :src="url" :alt="active.FileName" @error="resourceError = '图片预览失败，请重试'" /><video v-else-if="kind === 'video' && url" :key="previewKey" :src="url" controls preload="metadata" @error="resourceError = '视频预览失败，请重试'" /><audio v-else-if="kind === 'audio' && url" :key="previewKey" :src="url" controls @error="resourceError = '音频预览失败，请重试'" /><iframe v-else-if="/\.pdf$/i.test(active.FileName) && url" :key="previewKey" :src="url" title="PDF 预览" sandbox="allow-same-origin" @error="resourceError = 'PDF 预览失败，请重试'" /><div v-else class="document-viewer"><Icon icon="lucide:file-text" /><strong>{{ active.FileName }}</strong><p>{{ url ? '该文档可在工作区内安全下载。' : '文件服务未返回可预览地址。' }}</p></div></template>
          <button v-if="active.DownloadUrl || active.ContentUrl || active.PreviewUrl" class="workspace-download" :disabled="downloading" @click="download"><Icon :icon="downloading ? 'lucide:loader-circle' : 'lucide:download'" />{{ downloading ? '下载中' : '下载' }}</button>
        </div>
        <div v-else class="artifact-workspace-empty"><Icon icon="lucide:panel-right-open" /><strong>选择一个真实任务文件</strong><span>支持代码、图片、视频、音频、PDF 与办公文档。</span></div>
      </section>
    </div>
  </aside>
</template>
