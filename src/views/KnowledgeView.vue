<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElTag } from 'element-plus/es/components/tag/index.mjs'
import 'element-plus/es/components/tag/style/css.mjs'
import { aiApi } from '@/api/ai'
import type { KnowledgeDocument } from '@/types/ai'

const items = ref<KnowledgeDocument[]>([]); const loading = ref(true); const error = ref('')
const load = async () => { loading.value = true; error.value = ''; try { items.value = await aiApi.documents() } catch (e) { error.value = (e as Error).message } finally { loading.value = false } }
onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-header"><div><span class="eyebrow">KNOWLEDGE</span><h1>企业知识库</h1><p>仅显示 ERP 网关根据当前用户、部门、角色和岗位授权返回的真实文档。</p></div><button class="secondary-button" @click="load"><Icon icon="lucide:refresh-cw" />刷新</button></header>
    <div v-if="loading" class="module-state"><Icon icon="lucide:loader-circle" />正在读取授权知识文档…</div>
    <div v-else-if="error" class="module-state error"><Icon icon="lucide:shield-alert" /><h2>无法读取知识库</h2><p>{{ error }}</p></div>
    <div v-else-if="!items.length" class="module-state"><Icon icon="lucide:library-big" /><h2>当前权限范围内暂无文档</h2><p>这里不会用示例数据填充。请在 ERP 知识库管理中上传并完成解析、索引和授权。</p></div>
    <div v-else class="document-grid">
      <article v-for="item in items" :key="item.Id"><Icon icon="lucide:file-text" /><div><h3>{{ item.Name }}</h3><p>{{ item.FileName || item.DocumentType || '企业文档' }}</p><span>{{ item.ParseStatus || '未知解析状态' }} · {{ item.IndexStatus || '未知索引状态' }} · {{ item.ChunkCount || 0 }} 分块</span></div><ElTag effect="dark" :type="item.IsEnabled === 0 ? 'info' : 'success'">{{ item.IsEnabled === 0 ? '已停用' : '已启用' }}</ElTag></article>
    </div>
  </div>
</template>
