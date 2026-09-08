/** 工作台品牌配置：远端优先，配置服务不可用时保留可渲染默认值。 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aiApi } from '@/api/ai'
import type { AISettings } from '@/types/ai'

/** 未配置字段的展示兜底；数组在写入实例状态时复制，避免共享引用。 */
export const defaults: AISettings = {
  Name: 'Ayla',
  CompanyName: 'YangP',
  Subtitle: 'Aycsoft 企业智能助手',
  AuthorChineseName: '杨鹏',
  AuthorEnglishName: 'Peng Yang (Perry Yang)',
  WelcomeMessage: '查询产品、订单、库存和知识文档，回答始终遵循当前账号的数据权限。',
  QuickQuestions: ['查询 SKU 库存', '分析采购进度', '找出缺货风险', '生成销售报告'],
}

export const useSettingsStore = defineStore('settings', () => {
  const value = ref<AISettings>({ ...defaults, QuickQuestions: [...defaults.QuickQuestions] })
  const loading = ref(false)
  const available = ref(true)
  const brand = computed(() => value.value.Name || defaults.Name)
  const author = computed(
    () => value.value.AuthorEnglishName || value.value.AuthorName || defaults.AuthorEnglishName,
  )
  const authorRecord = computed(() => {
    const chinese = value.value.AuthorChineseName?.trim() || defaults.AuthorChineseName
    const english = author.value?.trim()
    return [chinese, english].filter(Boolean).join(' / ')
  })
  // 文件服务使用 ERP origin，工作台静态图标则遵循部署 base 路径。
  const logoUrl = computed(() => {
    const portalOrigin = String(
      import.meta.env.VITE_PORTAL_ORIGIN ||
        (import.meta.env.DEV
          ? `${window.location.protocol}//${window.location.hostname}:4000`
          : window.location.origin),
    ).replace(/\/$/, '')
    const fileId = value.value.LogoFileId?.trim()
    if (!fileId)
      return String(
        import.meta.env.VITE_DEFAULT_AI_LOGO_URL || `${import.meta.env.BASE_URL}ayla-logo.png`,
      )
    return `${portalOrigin}/api/fileapi/FileStorageApi/raw/${encodeURIComponent(fileId)}`
  })
  /** 先探测图片可用性，再替换 favicon，资源失效时回退到本地图标。 */
  function applyFavicon(source: string) {
    const fallback = `${import.meta.env.BASE_URL}ayla-logo.png`
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!favicon) return
    const image = new Image()
    image.onload = () => {
      favicon.href = source
    }
    image.onerror = () => {
      favicon.href = fallback
    }
    image.src = source
  }
  /** 防止并行加载；失败仅标记不可用，不阻断应用启动或清空已有配置。 */
  async function load() {
    if (loading.value) return
    loading.value = true
    try {
      const remote = await aiApi.settings()
      value.value = {
        ...defaults,
        ...remote,
        QuickQuestions: remote.QuickQuestions?.length
          ? [...remote.QuickQuestions]
          : [...defaults.QuickQuestions],
      }
      document.title = `${value.value.Name || defaults.Name} · Aycsoft AI`
      applyFavicon(logoUrl.value)
      available.value = true
    } catch {
      available.value = false
    } finally {
      loading.value = false
    }
  }
  return { value, loading, available, brand, author, authorRecord, logoUrl, load }
})
