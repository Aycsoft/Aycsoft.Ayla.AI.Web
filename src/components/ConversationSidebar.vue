<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { aiApi } from '@/api/ai'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import BrandLogo from '@/components/BrandLogo.vue'
import ExternalPasswordDialog from '@/components/ExternalPasswordDialog.vue'
import ConversationActionDialog from '@/components/ConversationActionDialog.vue'
import ExternalProfileDialog from '@/components/ExternalProfileDialog.vue'
import UsageSummaryDialog from '@/components/UsageSummaryDialog.vue'
import { applyWorkspaceTheme, nextTheme, normalizeTheme } from '@/utils/theme'
import { normalizeBackendResourceUrl } from '@/utils/backendResource'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const chat = useChatStore(); const auth = useAuthStore(); const router = useRouter()
const settings = useSettingsStore()
const isInternal = computed(() => auth.session?.AccountType !== 'external')
const keyword = ref(''); const searchOpen = ref(false); const accountOpen = ref(false)
const passwordDialogOpen = ref(false)
const profileDialogOpen = ref(false)
const usageDialogOpen = ref(false)
const conversationMenu = ref<{ id: string; x: number; y: number }>()
const actionDialog = ref<{ mode: 'rename' | 'delete'; id: string; title: string }>()
const actionBusy = ref(false)
const actionError = ref('')
const collapsed = ref(localStorage.getItem('crosscart-ai-sidebar-collapsed') === '1')
const theme = ref(normalizeTheme(localStorage.getItem('crosscart-ai-theme')))
const filtered = computed(() => chat.conversations.filter(x => x.Title.toLowerCase().includes(keyword.value.trim().toLowerCase())))
const avatarContentUrl = computed(() => normalizeBackendResourceUrl(auth.session?.AvatarContentUrl))
const menuConversation = computed(() => chat.conversations.find(item => item.Id === conversationMenu.value?.id))
const toggleCollapsed = () => { collapsed.value = !collapsed.value; localStorage.setItem('crosscart-ai-sidebar-collapsed', collapsed.value ? '1' : '0') }
const newChat = async () => { await chat.create(); await router.replace({ name: 'chat', query: chat.currentId ? { conversation: chat.currentId } : {} }); emit('close') }
const select = async (id: string) => { await chat.select(id); await router.replace({ name: 'chat', query: { conversation: id } }); emit('close') }
const openConversationMenu = (event: MouseEvent, item: { Id: string; Title: string }) => {
  event.preventDefault(); event.stopPropagation()
  conversationMenu.value = { id: item.Id, x: Math.min(event.clientX, window.innerWidth - 170), y: Math.min(event.clientY, window.innerHeight - 100) }
}
const openConversationMenuKeyboard = (event: KeyboardEvent, item: { Id: string; Title: string }) => {
  event.preventDefault(); event.stopPropagation()
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  conversationMenu.value = { id: item.Id, x: Math.min(rect.right, window.innerWidth - 170), y: Math.min(rect.bottom, window.innerHeight - 100) }
}
const beginAction = (mode: 'rename' | 'delete', item: { Id: string; Title: string }) => { conversationMenu.value = undefined; actionError.value = ''; actionDialog.value = { mode, id: item.Id, title: item.Title || '新会话' } }
const confirmAction = async (value: string) => {
  const action = actionDialog.value; if (!action || actionBusy.value) return
  actionBusy.value = true
  try {
    if (action.mode === 'delete') await chat.remove(action.id)
    else {
      const renamed = await aiApi.renameConversation(action.id, value)
      const target = chat.conversations.find(item => item.Id === action.id)
      if (target) target.Title = renamed.Title || value
    }
    actionDialog.value = undefined
  } catch (error) { actionError.value = (error as Error).message || '会话操作失败，请稍后重试' }
  finally { actionBusy.value = false }
}
const openPortal = () => { const target = new URL(String(import.meta.env.VITE_SSO_LOGIN_URL || '/'), window.location.origin); target.hash = '#/'; window.location.assign(target) }
const toggleTheme = () => { theme.value = nextTheme(theme.value); applyWorkspaceTheme(theme.value) }
</script>

<template>
  <aside :class="['minimax-sidebar', { open, collapsed }]" :aria-label="`${settings.brand} 工作区导航`">
    <div class="sidebar-brand">
      <button class="brand-home" :aria-label="`${settings.brand} 首页`" @click="newChat"><BrandLogo /><strong>{{ settings.brand }}</strong></button>
      <button class="sidebar-collapse" :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleCollapsed"><Icon :icon="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" /></button>
      <button class="sidebar-mobile-close" aria-label="关闭导航" @click="emit('close')"><Icon icon="lucide:x" /></button>
    </div>

    <nav class="sidebar-primary">
      <button title="新建任务" @click="newChat"><Icon icon="lucide:square-pen" /><span>新建任务</span></button>
      <button title="搜索真实会话" @click="searchOpen = !searchOpen"><Icon icon="lucide:search" /><span>搜索</span></button>
      <label v-if="searchOpen && !collapsed" class="sidebar-search"><Icon icon="lucide:search" /><input v-model="keyword" autofocus aria-label="搜索最近任务" placeholder="搜索最近任务" /></label>
      <button v-if="auth.session" title="管理个人与授权知识库" @click="router.push('/knowledge')"><Icon icon="lucide:library-big" /><span>知识库</span></button>
      <button v-if="auth.session" title="管理 AI 输出规范" @click="router.push('/skills')"><Icon icon="lucide:wand-sparkles" /><span>Skill</span></button>
      <button v-if="auth.session" title="管理 Markdown 笔记" @click="router.push('/notes')"><Icon icon="lucide:notebook-pen" /><span>笔记</span></button>
      <button v-if="!auth.session || isInternal" title="打开 CrossCart Portal" @click="openPortal"><Icon icon="lucide:external-link" /><span>打开 Portal</span></button>
    </nav>

    <section v-if="auth.session && isInternal && !collapsed" class="sidebar-group">
      <div class="sidebar-group-title">ERP AGENT</div>
      <button disabled title="需要后端返回真实 Agent 清单"><Icon icon="lucide:boxes" /><span>业务 Agent 由服务端配置</span></button>
    </section>

    <section v-if="!collapsed" class="sidebar-group recent-group">
      <div class="sidebar-group-title">最近任务</div>
      <div v-if="!auth.session" class="sidebar-empty">登录后同步真实会话</div>
      <div v-else-if="!filtered.length" class="sidebar-empty">暂无匹配会话</div>
      <div v-for="item in filtered" v-else :key="item.Id" :class="['recent-task', { active: item.Id === chat.currentId }]" role="button" tabindex="0" @click="select(item.Id)" @keydown.enter="select(item.Id)" @dblclick.prevent.stop="beginAction('rename', item)" @contextmenu="openConversationMenu($event, item)">
        <span v-if="chat.conversationStatuses[item.Id] === 'running'" class="conversation-run-status running" title="正在生成"><Icon icon="lucide:loader-circle" /></span><Icon v-else icon="lucide:message-square" /><span>{{ item.Title || '新会话' }}</span>
        <button class="task-menu-trigger" title="会话操作" aria-label="会话操作" @click.stop="openConversationMenu($event, item)" @keydown.enter="openConversationMenuKeyboard($event, item)"><Icon icon="lucide:ellipsis" /></button>
      </div>
    </section>

    <div class="sidebar-account">
      <button :title="auth.session?.UserName || '登录'" @click="auth.session ? accountOpen = !accountOpen : auth.login()">
        <span class="account-avatar"><Icon :icon="auth.session ? 'lucide:user-round' : 'lucide:log-in'" /><img v-if="avatarContentUrl" :src="avatarContentUrl" alt="个人头像" @error="($event.currentTarget as HTMLImageElement).remove()" /></span>
        <span class="account-copy"><strong>{{ auth.session?.UserName || '登录' }}</strong><small>{{ auth.session ? (isInternal ? '企业内部账号' : '外部 AI 账号') : '内部 / 外部用户登录' }}</small></span>
        <Icon v-if="!collapsed" icon="lucide:chevrons-up-down" />
      </button>
      <div v-if="accountOpen && auth.session && !collapsed" class="account-popover">
        <strong>{{ auth.session.UserName }}</strong><small>{{ isInternal ? `${auth.session.Permissions.length} 项企业权限` : '会话、文件与媒体能力已开放' }}</small>
        <button v-if="isInternal" @click="openPortal"><Icon icon="lucide:external-link" />进入 Portal</button>
        <button v-if="!isInternal" @click="profileDialogOpen = true; accountOpen = false"><Icon icon="lucide:user-round-cog" />个人中心</button>
        <button @click="usageDialogOpen = true; accountOpen = false"><Icon icon="lucide:gauge" />AI 用量</button>
        <button @click="toggleTheme"><Icon :icon="theme === 'dark' ? 'lucide:sun' : 'lucide:moon'" />{{ theme === 'dark' ? '切换浅色主题' : '切换深色主题' }}</button>
        <button @click="auth.logout()"><Icon icon="lucide:log-out" />退出登录</button>
      </div>
    </div>
  </aside>
  <div v-if="open" class="mobile-overlay" @click="emit('close')" />
  <ExternalPasswordDialog v-if="auth.session?.AccountType === 'external'" :open="passwordDialogOpen" :has-password="auth.session.HasPassword" @close="passwordDialogOpen = false" @saved="auth.refreshSession()" />
  <ExternalProfileDialog v-if="auth.session?.AccountType === 'external'" :open="profileDialogOpen" :session="auth.session" @close="profileDialogOpen = false" @saved="auth.refreshSession()" @password="profileDialogOpen = false; passwordDialogOpen = true" />
  <UsageSummaryDialog :open="usageDialogOpen" @close="usageDialogOpen = false" />
  <Teleport to="body"><div v-if="conversationMenu" class="conversation-menu-backdrop" @click="conversationMenu = undefined" @contextmenu.prevent="conversationMenu = undefined" /><div v-if="conversationMenu && menuConversation" class="conversation-context-menu" :style="{ left: `${conversationMenu.x}px`, top: `${conversationMenu.y}px` }"><button @click="beginAction('rename', menuConversation)"><Icon icon="lucide:pencil-line" />重命名</button><button class="danger" @click="beginAction('delete', menuConversation)"><Icon icon="lucide:trash-2" />删除</button></div></Teleport>
  <ConversationActionDialog v-if="actionDialog" :open="true" :mode="actionDialog.mode" :title="actionDialog.title" :busy="actionBusy" :error="actionError" @close="actionDialog = undefined" @confirm="confirmAction" />
</template>
