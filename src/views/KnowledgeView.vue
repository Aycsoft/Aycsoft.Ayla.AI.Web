<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElTag } from 'element-plus/es/components/tag/index.mjs'
import 'element-plus/es/components/message/style/css.mjs'
import 'element-plus/es/components/message-box/style/css.mjs'
import 'element-plus/es/components/tag/style/css.mjs'
import { aiApi } from '@/api/ai'
import { useAuthStore } from '@/stores/auth'
import PersonalWorkspaceLayout from '@/components/PersonalWorkspaceLayout.vue'
import type { KnowledgeDocument, PersonalKnowledgeDocument } from '@/types/ai'

const auth = useAuthStore()
const personal = ref<PersonalKnowledgeDocument[]>([])
const enterprise = ref<KnowledgeDocument[]>([])
const loading = ref(true); const uploading = ref(false); const error = ref('')
const tab = ref<'personal' | 'enterprise'>('personal'); const fileInput = ref<HTMLInputElement>(); const keyword = ref('')
const isInternal = computed(() => auth.session?.AccountType !== 'external')
const filteredPersonal = computed(() => personal.value.filter(item => item.FileName.toLowerCase().includes(keyword.value.trim().toLowerCase())))
const filteredEnterprise = computed(() => enterprise.value.filter(item => `${item.Name} ${item.FileName || ''}`.toLowerCase().includes(keyword.value.trim().toLowerCase())))
const load = async () => { loading.value = true; error.value = ''; try { personal.value = await aiApi.personalKnowledge(); enterprise.value = isInternal.value ? await aiApi.documents() : [] } catch (reason) { error.value = (reason as Error).message } finally { loading.value = false } }
const upload = async (event: Event) => { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file || uploading.value) return; uploading.value = true; try { const stored = await aiApi.upload(file); await aiApi.createPersonalKnowledge({ FileId: stored.FileId, FileName: stored.FileName, ContentType: stored.ContentType || file.type }); ElMessage.success('文件已进入个人知识库，正在解析和建立索引'); await load() } catch (reason) { ElMessage.error((reason as Error).message || '知识文件上传失败') } finally { uploading.value = false } }
const remove = async (item: PersonalKnowledgeDocument) => { try { await ElMessageBox.confirm(`删除个人知识文档“${item.FileName}”？删除后会话将无法继续引用。`, '删除知识文档', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }); await aiApi.deletePersonalKnowledge(item.Id); personal.value = personal.value.filter(candidate => candidate.Id !== item.Id); ElMessage.success('知识文档已删除') } catch (reason) { if (reason !== 'cancel' && reason !== 'close') ElMessage.error((reason as Error).message || '删除失败') } }
const statusLabel = (status: string) => ({ pending: '等待解析', processing: '正在解析', indexed: '可供会话引用', retry: '等待重试', failed: '解析失败', disabled: '已停用' }[status] || status)
onMounted(load)
</script>

<template>
  <PersonalWorkspaceLayout title="知识库" description="管理当前账号可供会话引用的真实文件与授权资料。" icon="lucide:library-big">
    <template #actions><button class="tool-button" @click="load"><Icon icon="lucide:refresh-cw" />刷新</button><button class="tool-button primary" :disabled="uploading" @click="fileInput?.click()"><Icon :icon="uploading ? 'lucide:loader-circle' : 'lucide:upload'" />{{ uploading ? '正在上传' : '上传文件' }}</button><input ref="fileInput" class="sr-only" type="file" accept=".pdf,.docx,.xlsx,.txt,.md" @change="upload" /></template>
    <section class="knowledge-panel workspace-panel">
      <header class="knowledge-toolbar"><div v-if="isInternal" class="workspace-tabs"><button :class="{ active: tab === 'personal' }" @click="tab = 'personal'">我的知识 <span>{{ personal.length }}</span></button><button :class="{ active: tab === 'enterprise' }" @click="tab = 'enterprise'">企业授权 <span>{{ enterprise.length }}</span></button></div><strong v-else>我的知识 <span>{{ personal.length }}</span></strong><label class="workspace-search"><Icon icon="lucide:search" /><input v-model="keyword" placeholder="搜索知识文件" /></label></header>
      <div class="knowledge-hint"><Icon icon="lucide:message-circle-question" /><span>在对话中输入“查询我的个人知识库”，即可让 AI 按当前账号权限检索引用。</span><small>PDF · Word · Excel · Markdown · TXT</small></div>
      <div v-if="loading" class="workspace-empty"><Icon icon="lucide:loader-circle" class="spin" /><h2>正在读取知识文档</h2></div>
      <div v-else-if="error" class="workspace-empty error"><Icon icon="lucide:shield-alert" /><h2>无法读取知识库</h2><p>{{ error }}</p><button class="tool-button" @click="load">重新加载</button></div>
    <template v-else-if="tab === 'personal'">
      <div v-if="!filteredPersonal.length" class="workspace-empty"><Icon icon="lucide:file-up" /><h2>{{ keyword ? '没有匹配的知识文件' : '上传第一份知识文件' }}</h2><p>{{ keyword ? '尝试更换搜索关键词。' : '文件会真实上传、按账号隔离解析并建立索引，不使用示例数据。' }}</p></div>
      <div v-else class="knowledge-list"><article v-for="item in filteredPersonal" :key="item.Id"><span class="file-icon"><Icon icon="lucide:file-text" /></span><div class="file-copy"><strong>{{ item.FileName }}</strong><small>{{ item.ContentType }} · {{ item.ChunkCount || 0 }} 个知识分块</small><em v-if="item.ErrorMessage">{{ item.ErrorMessage }}</em></div><ElTag effect="dark" :type="item.Status === 'indexed' ? 'success' : item.Status === 'failed' ? 'danger' : 'warning'">{{ statusLabel(item.Status) }}</ElTag><button class="row-action danger" title="删除" @click="remove(item)"><Icon icon="lucide:trash-2" /></button></article></div>
    </template>
    <template v-else><div v-if="!filteredEnterprise.length" class="workspace-empty"><Icon icon="lucide:building-2" /><h2>当前权限范围内暂无企业文档</h2><p>这里只展示 ERP 按部门、角色和岗位授权返回的真实文档。</p></div><div v-else class="knowledge-list"><article v-for="item in filteredEnterprise" :key="item.Id"><span class="file-icon enterprise"><Icon icon="lucide:file-lock-2" /></span><div class="file-copy"><strong>{{ item.Name }}</strong><small>{{ item.FileName || item.DocumentType || '企业文档' }} · {{ item.ChunkCount || 0 }} 个知识分块</small><em>{{ item.ParseStatus || '未知解析状态' }} · {{ item.IndexStatus || '未知索引状态' }}</em></div><ElTag effect="dark" :type="item.IsEnabled === 0 ? 'info' : 'success'">{{ item.IsEnabled === 0 ? '已停用' : '已授权' }}</ElTag></article></div></template>
    </section>
  </PersonalWorkspaceLayout>
</template>

<style scoped>
.knowledge-panel{min-height:520px;overflow:hidden;display:flex;flex-direction:column}.knowledge-toolbar{min-height:48px;padding:7px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}.knowledge-toolbar>strong{font-size:11px}.knowledge-toolbar>strong span,.workspace-tabs span{color:var(--muted);font-weight:400}.workspace-tabs{padding:3px;border-radius:8px;background:var(--surface-subtle);display:flex;gap:2px}.workspace-tabs button{height:28px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--muted);font-size:11px}.workspace-tabs button.active{background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(15,23,42,.08)}.workspace-search{width:min(260px,42vw);height:31px;margin-left:auto;padding:0 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--muted);display:flex;align-items:center;gap:6px}.workspace-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--text);font-size:11px}.knowledge-hint{min-height:38px;padding:7px 12px;border-bottom:1px solid var(--border);background:var(--surface-subtle);display:flex;align-items:center;gap:7px;color:var(--muted);font-size:10px}.knowledge-hint>svg{color:var(--primary)}.knowledge-hint small{margin-left:auto;color:var(--tertiary)}.knowledge-list{display:flex;flex-direction:column}.knowledge-list article{min-height:58px;padding:8px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}.knowledge-list article:last-child{border-bottom:0}.knowledge-list article:hover{background:var(--surface-subtle)}.file-icon{width:32px;height:32px;flex:0 0 32px;border-radius:8px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;font-size:15px}.file-icon.enterprise{background:color-mix(in srgb,var(--success) 10%,transparent);color:var(--success)}.file-copy{min-width:0;flex:1;display:flex;flex-direction:column}.file-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.file-copy small,.file-copy em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:9px;font-style:normal}.file-copy em{color:var(--danger)}.row-action{width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:var(--muted);display:grid;place-items:center}.row-action:hover{background:var(--surface)}.row-action.danger:hover{color:var(--danger)}.workspace-empty.error>svg{color:var(--danger)}.workspace-empty .tool-button{margin-top:10px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:600px){.knowledge-toolbar{align-items:stretch;flex-direction:column}.workspace-tabs{width:100%}.workspace-tabs button{flex:1}.workspace-search{width:100%;margin-left:0}.knowledge-hint small{display:none}.knowledge-list article{align-items:flex-start}.knowledge-list .el-tag{margin-left:auto}.row-action{display:none}}
</style>
