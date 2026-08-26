<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'
import { isSuccessfulArtifact } from '@/utils/messageContent'
import { contentUrl } from '@/utils/backendResource'
import ResilientMediaPreview from './ResilientMediaPreview.vue'

const props = defineProps<{ mode: 'image' | 'video' }>()
const emit = defineEmits<{ prompt: [value: string] }>()
const chat = useChatStore()
const prompts = computed(() => props.mode === 'image'
  ? [
      { icon: 'lucide:package-open', title: '商品白底主图', meta: '1:1 · 电商', prompt: '商品白底主图：主体居中、柔和棚拍光、保留材质与结构细节' },
      { icon: 'lucide:sun-medium', title: '生活方式场景', meta: '4:3 · 氛围', prompt: '生活方式场景图：说明人物、环境、光线、构图与画幅' },
      { icon: 'lucide:layout-template', title: '品牌视觉海报', meta: '3:4 · 营销', prompt: '品牌海报：说明主题、文案留白、配色、风格与比例' }
    ]
  : [
      { icon: 'lucide:scan-line', title: '产品展示镜头', meta: '5 秒 · 16:9', prompt: '产品展示视频：说明主体动作、镜头运动、时长、比例与声音' },
      { icon: 'lucide:smartphone', title: '社媒竖屏短片', meta: '5 秒 · 9:16', prompt: '9:16 社媒短片：说明分镜、节奏、字幕与结尾行动点' },
      { icon: 'lucide:clapperboard', title: '品牌故事短片', meta: '10 秒 · 16:9', prompt: '品牌故事横屏短片：说明场景、转场、运镜和声音氛围' }
    ])
const assets = computed(() => chat.artifacts.filter(item => {
  const marker = `${item.Type} ${item.FileName}`.toLowerCase()
  return isSuccessfulArtifact(item.Status) && Boolean(contentUrl(item)) && (props.mode === 'image' ? /image|png|jpe?g|webp|gif/.test(marker) : /video|mp4|webm|mov/.test(marker))
}))
const url = (item: (typeof chat.artifacts)[number]) => contentUrl(item)
const openArtifact = (id: string) => window.dispatchEvent(new CustomEvent('ayla:artifact-open', { detail: id }))
</script>

<template>
  <section class="media-workspace-panel" :aria-label="mode === 'image' ? '图片生成面板' : '视频生成面板'">
    <div class="media-recommendations"><header><span><Icon :icon="mode === 'image' ? 'lucide:image' : 'lucide:clapperboard'" /><strong>{{ mode === 'image' ? '图片灵感' : '视频灵感' }}</strong></span><small>受控提示模板 · 不代表已生成案例</small></header><div><button v-for="item in prompts" :key="item.title" @click="emit('prompt', item.prompt)"><Icon :icon="item.icon" /><span><strong>{{ item.title }}</strong><small>{{ item.meta }}</small></span><Icon icon="lucide:arrow-up-right" /></button></div></div>
    <div class="media-cases"><header><span><Icon icon="lucide:gallery-horizontal-end" /><strong>真实生成案例</strong></span><small>当前会话已完成作品</small></header><div v-if="assets.length" class="media-case-grid"><article v-for="asset in assets" :key="asset.ArtifactId"><button @click="openArtifact(asset.ArtifactId)"><ResilientMediaPreview :src="url(asset)" :kind="mode" :alt="asset.FileName" /><span><strong>{{ asset.FileName }}</strong><small><Icon icon="lucide:badge-check" />已保存到文件中心</small></span></button></article></div><div v-else class="media-case-empty"><Icon icon="lucide:images" /><span><strong>完成首个作品后将在这里展示</strong><small>只展示真实成功并已保存到文件中心的生成结果。</small></span></div></div>
  </section>
</template>
