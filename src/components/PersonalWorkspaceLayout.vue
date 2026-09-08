<script setup lang="ts">
/**
 * 知识库、Skill 和笔记共享布局，统一标题、导航和移动侧栏。
 * title / description / icon 提供元信息，默认插槽承载业务内容。
 */
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import ConversationSidebar from '@/components/ConversationSidebar.vue'

defineProps<{
  title: string
  description: string
  icon: string
}>()

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const sections = [
  { name: 'knowledge', label: '知识库', icon: 'lucide:library-big' },
  { name: 'skills', label: 'Skill', icon: 'lucide:wand-sparkles' },
  { name: 'notes', label: '笔记', icon: 'lucide:notebook-pen' },
]
</script>

<template>
  <div class="chat-page personal-workspace-shell">
    <ConversationSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <main class="personal-workspace-main">
      <header class="personal-workspace-topbar">
        <button
          class="icon-button workspace-sidebar-toggle"
          aria-label="打开导航"
          @click="sidebarOpen = true"
        >
          <Icon icon="lucide:panel-left" />
        </button>
        <button class="workspace-back" @click="router.push('/chat')">
          <Icon icon="lucide:arrow-left" />返回对话
        </button>
        <span class="workspace-divider" />
        <strong>个人工作区</strong>
        <nav aria-label="个人工作区模块">
          <button
            v-for="section in sections"
            :key="section.name"
            :class="{ active: route.name === section.name }"
            @click="router.push({ name: section.name })"
          >
            <Icon :icon="section.icon" />{{ section.label }}
          </button>
        </nav>
      </header>
      <section class="personal-workspace-scroll">
        <div class="personal-workspace-content">
          <header class="personal-page-heading">
            <div class="personal-page-title">
              <span><Icon :icon="icon" /></span>
              <div>
                <h1>{{ title }}</h1>
                <p>{{ description }}</p>
              </div>
            </div>
            <div class="personal-page-actions"><slot name="actions" /></div>
          </header>
          <div class="personal-page-body"><slot /></div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.personal-workspace-main {
  min-width: 0;
  flex: 1;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.personal-workspace-topbar {
  height: 47px;
  flex: 0 0 47px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 9px;
}
.personal-workspace-topbar strong {
  font-size: 12px;
  font-weight: 600;
}
.workspace-sidebar-toggle {
  display: none;
}
.workspace-back {
  height: 29px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}
.workspace-back:hover {
  background: var(--surface-subtle);
  color: var(--text);
}
.workspace-divider {
  width: 1px;
  height: 15px;
  background: var(--border);
}
.personal-workspace-topbar nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 3px;
}
.personal-workspace-topbar nav button {
  height: 29px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}
.personal-workspace-topbar nav button:hover {
  background: var(--surface-subtle);
  color: var(--text);
}
.personal-workspace-topbar nav button.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}
.personal-workspace-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.personal-workspace-scroll:hover {
  scrollbar-color: color-mix(in srgb, var(--muted) 35%, transparent) transparent;
}
.personal-workspace-content {
  width: min(1180px, 100%);
  min-height: 100%;
  margin: 0 auto;
  padding: 22px 24px 26px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.personal-page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.personal-page-title {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 11px;
}
.personal-page-title > span {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  display: grid;
  place-items: center;
  font-size: 17px;
}
.personal-page-title h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  font-weight: 650;
  letter-spacing: -0.015em;
}
.personal-page-title p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}
.personal-page-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}
.personal-page-body {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
:deep(.tool-button) {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  white-space: nowrap;
}
:deep(.tool-button:hover) {
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  background: var(--surface-subtle);
}
:deep(.tool-button.primary) {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}
:deep(.tool-button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
:deep(.workspace-panel) {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}
:deep(.workspace-empty) {
  min-height: 260px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--muted);
}
:deep(.workspace-empty > svg) {
  font-size: 28px;
  color: var(--primary);
}
:deep(.workspace-empty h2) {
  margin: 9px 0 2px;
  color: var(--text);
  font-size: 14px;
}
:deep(.workspace-empty p) {
  max-width: 500px;
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
}
@media (max-width: 959px) {
  .workspace-sidebar-toggle {
    display: grid;
  }
  .personal-workspace-content {
    padding-inline: 18px;
  }
}
@media (max-width: 680px) {
  .personal-workspace-topbar {
    padding-inline: 8px;
  }
  .personal-workspace-topbar strong,
  .workspace-divider {
    display: none;
  }
  .workspace-back {
    font-size: 0;
    padding-inline: 6px;
  }
  .workspace-back svg {
    font-size: 15px;
  }
  .personal-workspace-topbar nav {
    gap: 1px;
  }
  .personal-workspace-topbar nav button {
    padding: 0 7px;
    font-size: 10px;
  }
  .personal-workspace-topbar nav button svg {
    display: none;
  }
  .personal-workspace-content {
    padding: 15px 12px 18px;
    gap: 12px;
  }
  .personal-page-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .personal-page-actions {
    justify-content: flex-start;
  }
  .personal-page-title p {
    font-size: 10px;
  }
}
</style>
