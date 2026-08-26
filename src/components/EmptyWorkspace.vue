<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import BrandLogo from '@/components/BrandLogo.vue'

const props = withDefaults(defineProps<{ mode?: 'chat' | 'image' | 'video' }>(), { mode: 'chat' })
defineEmits<{ prompt: [value: string]; upload: [] }>()
const settings = useSettingsStore()
const auth = useAuthStore()
const businessActions = [['查询 SKU 库存', 'lucide:package-search'], ['分析采购进度', 'lucide:truck'], ['生成销售报告', 'lucide:chart-no-axes-combined'], ['分析上传文件', 'lucide:file-search']]
const publicActions = [
  ['帮我梳理一个复杂问题', 'lucide:list-tree'], ['润色这段文字', 'lucide:wand-sparkles'], ['解释一个概念', 'lucide:message-circle-question'], ['总结我接下来提供的内容', 'lucide:file-text']
]
const imageActions = [['电商产品白底主图，主体居中，保留真实结构细节', 'lucide:box'], ['生活方式场景图，说明使用环境与光线', 'lucide:armchair'], ['透明背景图标素材，说明对象与视觉风格', 'lucide:shapes']]
const videoActions = [['产品 360° 展示，说明产品与镜头运动', 'lucide:rotate-3d'], ['9:16 社媒短视频，说明脚本、节奏与声音', 'lucide:smartphone'], ['品牌故事横屏短片，说明场景与转场', 'lucide:clapperboard']]
const actions = computed(() => props.mode === 'image' ? imageActions : props.mode === 'video' ? videoActions : (auth.session ? businessActions : publicActions))
</script>

<template>
  <section class="empty-workspace">
    <BrandLogo :size="42" />
    <h1>{{ auth.session?.UserName ? `${auth.session.UserName}，今天想完成什么？` : `${settings.brand}，让工作更简单` }}</h1>
    <p>{{ auth.session ? settings.value.WelcomeMessage : '无需登录即可普通对话；访问 CrossCart 业务资源时再登录。' }}</p>
    <div class="quick-grid">
      <button v-for="action in actions" :key="action[0]" @click="$emit('prompt', action[0])"><Icon :icon="action[1]" /><span>{{ action[0] }}</span></button>
    </div>
    <div v-if="mode !== 'chat'" class="real-case-empty"><Icon icon="lucide:gallery-horizontal-end" /><span><strong>真实案例</strong><small>成功生成的资产将在这里沉淀为案例；当前不展示静态或模拟结果。</small></span></div>
    <button v-if="auth.session" class="upload-entry" @click="$emit('upload')"><Icon icon="lucide:paperclip" /> 上传文件</button>
  </section>
</template>
