<script setup lang="ts">
/**
 * 媒体灵感列表，从共享配置读取图片、视频示例与提示词。
 * mode 选择素材集合；prompt 通知父级填入文本，预览不触发生成。
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { mediaInspirationFor, type MediaCreationMode } from '@/utils/mediaInspiration'

const props = defineProps<{ mode: MediaCreationMode }>()
const emit = defineEmits<{ prompt: [value: string] }>()
const items = computed(() => mediaInspirationFor(props.mode))
const assetUrl = (asset: string) => `${import.meta.env.BASE_URL}${asset}`

const playPreview = (event: Event) => {
  // 自动播放策略可能拒绝播放；静态封面仍是正常可用的回退。
  const video = (event.currentTarget as HTMLElement).querySelector('video')
  void video?.play().catch(() => undefined)
}

const pausePreview = (event: Event) => {
  const video = (event.currentTarget as HTMLElement).querySelector('video')
  video?.pause()
}
</script>

<template>
  <section
    class="empty-media-inspiration"
    :aria-label="mode === 'image' ? '图片案例展示' : '视频案例展示'"
  >
    <header>
      <span><Icon icon="lucide:gallery-horizontal-end" />案例展示</span>
      <small>固定示例 · 点击套用提示词</small>
    </header>
    <div class="empty-media-inspiration-grid">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :aria-label="`套用${item.title}案例`"
        @click="emit('prompt', item.prompt)"
        @mouseenter="playPreview"
        @mouseleave="pausePreview"
        @focus="playPreview"
        @blur="pausePreview"
      >
        <span class="media-case-preview">
          <img
            v-if="item.assetKind === 'image'"
            :src="assetUrl(item.asset)"
            :alt="item.title"
            loading="lazy"
          />
          <video
            v-else
            :src="assetUrl(item.asset)"
            muted
            loop
            playsinline
            preload="metadata"
            :aria-label="`${item.title}视频预览`"
          />
          <span class="media-case-badge">{{ item.meta }}</span>
          <span v-if="item.assetKind === 'video'" class="media-case-play"
            ><Icon icon="lucide:play"
          /></span>
        </span>
        <span class="media-prompt-copy">
          <strong>{{ item.title }}</strong>
          <small>{{ item.summary }}</small>
        </span>
      </button>
    </div>
  </section>
</template>
