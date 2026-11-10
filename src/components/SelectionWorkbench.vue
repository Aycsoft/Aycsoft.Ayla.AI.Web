<script setup lang="ts">
// 选品工作台复用既有会话与下载能力，不创建业务单据。
import 'element-plus/es/components/drawer/style/css.mjs'
import 'element-plus/es/components/tabs/style/css.mjs'
import 'element-plus/es/components/table/style/css.mjs'
import 'element-plus/es/components/image/style/css.mjs'
import 'element-plus/es/components/input/style/css.mjs'
import 'element-plus/es/components/input-number/style/css.mjs'
import 'element-plus/es/components/select/style/css.mjs'
import 'element-plus/es/components/date-picker/style/css.mjs'
import 'element-plus/es/components/link/style/css.mjs'
import 'element-plus/es/components/button/style/css.mjs'
import 'element-plus/es/components/form/style/css.mjs'
import 'element-plus/es/components/message-box/style/css.mjs'
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  ElDrawer,
  ElForm,
  ElTabs,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElImage,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElLink,
  ElMessageBox,
} from 'element-plus'
import { ElButton as BaseButton } from 'element-plus'
import {
  createSelectionProject,
  isSelectionProject,
  getSelectionProject,
  saveSelectionProject,
  analyzeSelectionProject,
  getActiveSelectionAnalysis,
  getSelectionAnalysisOperation,
  cancelSelectionAnalysisOperation,
  type SelectionAnalysisOperation,
  listSelectionProjects,
  type SelectionProject,
  type SelectionCostScenario,
  type SelectionSpecificationBrief,
  type SelectionTrialPlan,
  type SelectionTrialReview,
} from '@/api/selection'
import { publicCommerceUrl as safePublicUrl } from '@/utils/commerceCards'
import { downloadBackendResource } from '@/utils/backendResource'
import { selectionOperationNotice, selectionOperationTitle } from '@/utils/selectionOperation'
import { createSelectionPoller } from '@/utils/selectionPoller'
import { createUuid } from '@/utils/uuid'
import SelectionProductHistory from './SelectionProductHistory.vue'
import SelectionClaims from './SelectionClaims.vue'
import SelectionBusinessReferences from './SelectionBusinessReferences.vue'

const props = defineProps<{ conversationId?: string; messageId?: string }>()
const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const analyzing = ref(false)
const cancelling = ref(false)
const operation = ref<SelectionAnalysisOperation>()
const operationNotice = ref('')
let operationPoller: { stop: () => void } | undefined
let operationGeneration = 0
const operationStage = computed(() => selectionOperationTitle(operation.value))
let pendingStartKey: { projectId: string; version: number; key: string } | undefined
const exporting = ref(false)
const history = ref<SelectionProject[]>([])
const error = ref('')
const project = ref<SelectionProject>()
const updatedLabel = computed(() => {
  const value = project.value?.updatedAt
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : `更新于 ${date.toLocaleString('zh-CN')}`
})
const activeTab = ref('candidates')
const selectedId = ref('')
const savedJson = ref('')
let requestVersion = 0
const dirty = computed(() => !!project.value && JSON.stringify(project.value) !== savedJson.value)
const selected = computed(() =>
  project.value?.candidates.find((item) => item.id === selectedId.value),
)
const briefs = computed(
  () => project.value?.specificationBriefs.filter((x) => x.candidateId === selectedId.value) || [],
)
const costs = computed(
  () => project.value?.costs.filter((x) => x.candidateId === selectedId.value) || [],
)
const trials = computed(
  () => project.value?.trials.filter((x) => x.candidateId === selectedId.value) || [],
)
const reviews = computed(
  () => project.value?.reviews.filter((x) => x.candidateId === selectedId.value) || [],
)

// 缺失费用保持空值；只有用户明确填写的零才参与服务端测算。
const costFields = [
  ['sellingPrice', '每件售价'],
  ['discountPerUnit', '每件折扣'],
  ['refundPerUnit', '每件退款'],
  ['purchaseCost', '采购成本'],
  ['inboundCost', '头程及税费'],
  ['channelCost', '渠道费用'],
  ['fulfillmentCost', '履约成本'],
  ['advertisingCost', '广告成本'],
  ['returnHandlingCost', '退货处理成本'],
] as const
const briefFields = [
  ['targetCustomer', '目标客户'],
  ['room', '使用空间'],
  ['designChanges', '改款与差异'],
  ['specifications', '规格要求'],
  ['packaging', '包装要求'],
  ['validation', '打样验证'],
  ['risks', '风险与待确认'],
] as const
const trialFields = [
  ['quantity', '试卖数量'],
  ['minimumOrderQuantity', '起订量'],
  ['packSize', '每箱数量'],
  ['unitBudget', '每件预算'],
  ['budget', '总预算'],
  ['leadDays', '交期（天）'],
] as const
const statusOptions = [
  ['draft', '待验证'],
  ['sampling', '打样中'],
  ['testing', '试卖中'],
  ['scale', '准备扩大'],
  ['stop', '停止'],
] as const
const decisions = [
  ['continue', '继续观察'],
  ['revise', '调整方案'],
  ['scale', '扩大试卖'],
  ['stop', '停止'],
] as const

function applyProject(value: SelectionProject) {
  // 验证成功前不替换当前方案，首次失败保持空状态，重读失败保留已有编辑。
  if (!isSelectionProject(value)) throw new Error('方案暂时未能读取，请重新读取。')
  const nextProject = {
    ...value,
    specificationBriefs: value.specificationBriefs || [],
    costs: value.costs || [],
    trials: value.trials || [],
    reviews: value.reviews || [],
    costResults: value.costResults || [],
  }
  project.value = nextProject
  if (!value.candidates.some((item) => item.id === selectedId.value))
    selectedId.value = value.candidates[0]?.id || ''
  savedJson.value = JSON.stringify(project.value)
  // 保存/分析后同步历史选择项，避免仍显示旧标题或旧版本。
  const historyIndex = history.value.findIndex((item) => item.id === value.id)
  if (historyIndex >= 0) history.value[historyIndex] = { ...nextProject }
}

async function load() {
  if (loading.value || saving.value) return
  if (dirty.value) {
    try {
      await ElMessageBox.confirm('重新读取会放弃尚未保存的编辑。继续吗？', '重新读取', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  const version = ++requestVersion
  loading.value = true
  error.value = ''
  try {
    if (!project.value && (!props.conversationId || !props.messageId)) {
      const response = await listSelectionProjects()
      if (response.Status !== 1) throw new Error(response.Message || '历史方案暂时无法读取。')
      history.value = response.Item || []
      return
    }
    const result = project.value
      ? await getSelectionProject(project.value.id)
      : await createSelectionProject(props.conversationId!, props.messageId!)
    if (version !== requestVersion) return
    if (result.Status !== 1 || !result.Item)
      throw new Error(result.Message || '方案暂时无法读取，请重试。')
    applyProject(result.Item)
    void restoreAnalysis()
  } catch (reason) {
    if (version === requestVersion)
      error.value = reason instanceof Error ? reason.message : '方案暂时无法读取，请重试。'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

async function open() {
  visible.value = true
  if (!project.value) await load()
  if (!project.value) return
  void restoreAnalysis()
  try {
    const response = await listSelectionProjects()
    if (response.Status !== 1) throw new Error(response.Message || '历史方案暂时无法读取。')
    history.value = response.Item || []
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '历史方案暂时无法读取。'
  }
}

async function chooseProject(id: string) {
  if (loading.value || saving.value || id === project.value?.id) return
  if (dirty.value) {
    try {
      await ElMessageBox.confirm('切换方案会放弃尚未保存的编辑。继续吗？', '切换方案')
    } catch {
      return
    }
  }
  loading.value = true
  error.value = ''
  try {
    const response = await getSelectionProject(id)
    if (response.Status !== 1 || !response.Item)
      throw new Error(response.Message || '方案暂时无法读取。')
    applyProject(response.Item)
    void restoreAnalysis()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '方案暂时无法读取。'
  } finally {
    loading.value = false
  }
}

async function openAuthorizedPreviewInNewTab(url: string) {
  const format = url.endsWith('xlsx') ? 'xlsx' : 'docx'
  const name = (project.value?.title || '选品方案').replace(/[<>:"/\\|?*]/g, '_')
  await downloadBackendResource(url, `${name}.${format}`)
  return true
}
async function exportFile(format: 'xlsx' | 'docx') {
  if (!project.value || loading.value || saving.value) return
  if (dirty.value) {
    await save()
    if (dirty.value || error.value) return
  }
  saving.value = true
  exporting.value = true
  error.value = ''
  try {
    const downloaded = await openAuthorizedPreviewInNewTab(
      `/api/workspace/selection-projects/${encodeURIComponent(project.value.id)}/export?format=${format}`,
    )
    if (!downloaded) throw new Error('文件暂时无法下载，方案已保存，可以重试。')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '文件暂时无法下载。'
  } finally {
    saving.value = false
    exporting.value = false
  }
}

async function save() {
  if (!project.value || loading.value || saving.value || analyzing.value) return
  saving.value = true
  error.value = ''
  const value = project.value
  try {
    const result = await saveSelectionProject(value.id, {
      expectedVersion: value.version,
      title: value.title,
      brief: value.brief,
      costs: value.costs,
      specificationBriefs: value.specificationBriefs,
      trials: value.trials,
      reviews: value.reviews,
    })
    if (result.Status !== 1 || !result.Item)
      throw new Error(result.Message || '保存未完成，编辑已保留。请重试。')
    applyProject(result.Item)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '保存未完成，编辑已保留。请重试。'
  } finally {
    saving.value = false
  }
}

async function close(done: () => void) {
  if (saving.value) return
  if (dirty.value) {
    try {
      await ElMessageBox.confirm('有未保存的编辑，关闭后仍保留在当前页面。确认关闭？', '选品方案')
    } catch {
      return
    }
  }
  stopOperationPolling()
  done()
}

function selectCandidate(id: string, tab: 'brief' | 'history') {
  selectedId.value = id
  activeTab.value = tab
}

function addBrief() {
  if (loading.value || saving.value) return
  if (!project.value || !selectedId.value || briefs.value.length) return
  const row: SelectionSpecificationBrief = {
    candidateId: selectedId.value,
    targetCustomer: '',
    room: '',
    designChanges: '',
    specifications: '',
    packaging: '',
    validation: '',
    risks: '',
  }
  project.value.specificationBriefs.push(row)
}

function addCost() {
  if (loading.value || saving.value) return
  if (!project.value || !selectedId.value) return
  const row: SelectionCostScenario = {
    candidateId: selectedId.value,
    label: '',
    currency: '',
    assumptions: '',
    sellingPrice: null,
    discountPerUnit: null,
    refundPerUnit: null,
    purchaseCost: null,
    inboundCost: null,
    channelCost: null,
    fulfillmentCost: null,
    advertisingCost: null,
    returnHandlingCost: null,
  }
  project.value.costs.push(row)
}

/** 只停止页面观察；后台任务继续，重新打开时按方案恢复。 */
function stopOperationPolling() {
  operationGeneration++
  operationPoller?.stop()
  operationPoller = undefined
}

function operationIsActive(value: SelectionAnalysisOperation) {
  return value.status === 'queued' || value.status === 'running'
}

function observeOperation(value: SelectionAnalysisOperation) {
  stopOperationPolling()
  operation.value = value
  analyzing.value = operationIsActive(value)
  const generation = operationGeneration
  const projectId = value.projectId
  operationPoller = createSelectionPoller({
    read: async (signal) => {
      const response = await getSelectionAnalysisOperation(projectId, value.id, signal)
      if (response.Status !== 1 || !response.Item?.id) throw new Error('暂时无法读取分析进度')
      return response.Item
    },
    receive: async (result, signal) => {
      if (generation !== operationGeneration || project.value?.id !== projectId || signal.aborted)
        return false
      operation.value = result
      operationNotice.value = ''
      analyzing.value = operationIsActive(result)
      if (analyzing.value) return true
      if (result.status === 'succeeded') {
        // 后台确认保存成功后再取项目，不能把阶段结束当作结果已拿到。
        const response = await getSelectionProject(projectId)
        if (generation !== operationGeneration || signal.aborted) return false
        if (response.Status !== 1 || !response.Item) throw new Error('分析已保存，正在重新读取结果')
        if (dirty.value)
          operationNotice.value = '分析结果已保存。当前编辑仍保留，请保存或重新读取后查看。'
        else applyProject(response.Item)
      } else operationNotice.value = selectionOperationNotice(result.status, result.errorCode)
      pendingStartKey = undefined
      return false
    },
    failed: () => {
      operationNotice.value = '暂时无法读取分析进度，正在自动恢复连接；后台任务不会重复启动。'
    },
  })
}

async function restoreAnalysis() {
  if (!project.value || !visible.value) return
  const projectId = project.value.id
  const generation = ++operationGeneration
  operationPoller?.stop()
  try {
    const response = await getActiveSelectionAnalysis(projectId)
    if (generation !== operationGeneration || project.value?.id !== projectId || !visible.value)
      return
    if (response.Status !== 1 || !response.Item) throw new Error('暂时无法读取分析进度')
    const active = response.Item.operation || response.Item.latest
    if (active) observeOperation(active)
    else {
      analyzing.value = false
      operation.value = undefined
      if (!dirty.value) {
        const latest = await getSelectionProject(projectId)
        if (
          generation === operationGeneration &&
          project.value?.id === projectId &&
          !dirty.value &&
          visible.value &&
          latest.Status === 1 &&
          latest.Item
        )
          applyProject(latest.Item)
      }
    }
  } catch {
    operationNotice.value = '暂时无法恢复分析进度，可点击“查看进度”重试；已有方案保持不变。'
  }
}

async function analyze() {
  if (!project.value || loading.value || saving.value || analyzing.value) return
  if (dirty.value) {
    await save()
    if (dirty.value || error.value) return
  }
  saving.value = true
  error.value = ''
  operationNotice.value = ''
  activeTab.value = 'analysis'
  try {
    const current = project.value
    // 受理响应丢失后复用幂等键；先检查活动任务，不重复启动收费分析。
    const active = await getActiveSelectionAnalysis(current.id)
    if (active.Status !== 1 || !active.Item)
      throw new Error('暂时无法确认后台任务，请查看进度后重试。')
    if (active.Item.operation) {
      observeOperation(active.Item.operation)
      return
    }
    if (
      !pendingStartKey ||
      pendingStartKey.projectId !== current.id ||
      pendingStartKey.version !== current.version
    )
      pendingStartKey = { projectId: current.id, version: current.version, key: createUuid() }
    const response = await analyzeSelectionProject(current.id, current.version, pendingStartKey.key)
    if (response.Status !== 1 || !response.Item?.id)
      throw new Error(response.Message || '暂时未取得受理状态，请查看进度确认。')
    observeOperation(response.Item)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '暂时未取得受理状态，已有方案已保留。'
  } finally {
    saving.value = false
  }
}

async function cancelAnalysis() {
  if (!project.value || !operation.value || cancelling.value || !analyzing.value) return
  cancelling.value = true
  try {
    const response = await cancelSelectionAnalysisOperation(project.value.id, operation.value.id)
    if (response.Status !== 1 || !response.Item?.id) throw new Error('取消请求暂未确认')
    observeOperation(response.Item)
  } catch {
    operationNotice.value = '取消请求暂未确认，任务可能仍在运行。可以再次取消或查看进度。'
  } finally {
    cancelling.value = false
  }
}

function addTrial() {
  if (loading.value || saving.value) return
  if (!project.value || !selectedId.value) return
  const row: SelectionTrialPlan = {
    candidateId: selectedId.value,
    currency: 'USD',
    channel: '',
    quantity: null,
    minimumOrderQuantity: null,
    packSize: null,
    unitBudget: null,
    budget: null,
    leadDays: null,
    launchDate: null,
    hypothesis: '',
    successCriteria: '',
    stopCriteria: '',
    status: 'draft',
  }
  project.value.trials.push(row)
}

function addReview() {
  if (loading.value || saving.value) return
  if (!project.value || !selectedId.value) return
  const row: SelectionTrialReview = {
    candidateId: selectedId.value,
    reviewDate: '',
    soldUnits: null,
    returnedUnits: null,
    actualContribution: null,
    currency: '',
    findings: '',
    decision: 'continue',
  }
  project.value.reviews.push(row)
}

/** 事实时间缺失时保持空白；不把本次阅读时间当作采集时间。 */
function factDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN')
}

function missingCostLabels(row: SelectionCostScenario) {
  const labels = new Map<string, string>(costFields)
  return (costResult(row)?.missingFields || [])
    .map((field) => {
      const key = field.charAt(0).toLowerCase() + field.slice(1)
      return labels.get(key) || (key === 'currency' ? '币种' : field)
    })
    .join('、')
}

function costResult(row: SelectionCostScenario) {
  // 修改尚未保存时不展示上个版本的利润，避免误当本次测算结果。
  if (dirty.value) return undefined
  return project.value?.costResults.find(
    (result) => result.candidateId === row.candidateId && result.label === row.label,
  )
}

function removeRow(
  kind: 'costs' | 'trials' | 'reviews',
  row: SelectionCostScenario | SelectionTrialPlan | SelectionTrialReview,
) {
  if (!project.value || loading.value || saving.value) return
  const rows = project.value[kind] as (
    SelectionCostScenario | SelectionTrialPlan | SelectionTrialReview
  )[]
  const index = rows.indexOf(row)
  if (index >= 0) rows.splice(index, 1)
}

onBeforeUnmount(() => {
  requestVersion++
  stopOperationPolling()
})
</script>

<template>
  <BaseButton size="small" :loading="loading" class="selection-entry" @click="open">{{
    props.messageId ? '选品方案' : '我的选品方案'
  }}</BaseButton>
  <ElDrawer
    v-model="visible"
    title="选品方案"
    size="min(1040px, 96vw)"
    append-to-body
    :before-close="close"
    class="selection-workbench"
  >
    <div v-if="error" class="selection-notice" role="status">
      ⓘ {{ error }} <ElLink :disabled="loading || saving" @click="load">重新读取</ElLink>
    </div>
    <p v-if="loading" class="selection-notice" role="status">正在读取真实候选和已保存方案…</p>
    <ElSelect
      v-if="history.length"
      :model-value="project?.id"
      :disabled="loading || saving"
      class="selection-picker"
      placeholder="选择已保存的选品方案"
      aria-label="历史选品方案"
      @change="chooseProject"
    >
      <ElOption v-for="item in history" :key="item.id" :value="item.id" :label="item.title" />
    </ElSelect>
    <p v-else-if="!loading && !project && !error" class="selection-notice">
      还没有选品方案。查询商品后，可在商品结果下建立方案。
    </p>
    <div v-if="operation || operationNotice" class="selection-notice" role="status">
      <span v-if="operation">{{ operationStage }}</span>
      <span v-if="operationNotice"> {{ operationNotice }}</span>
      <ElLink :disabled="loading || saving" @click="restoreAnalysis">查看进度</ElLink>
<ElLink v-if="operation?.status === 'failed' || operation?.status === 'superseded'" :disabled="loading || saving || analyzing" @click="analyze">重新分析</ElLink>
      <BaseButton
        v-if="analyzing"
        size="small"
        :loading="cancelling"
        :disabled="operation?.cancelRequested"
        @click="cancelAnalysis"
        >取消分析</BaseButton
      >
    </div>
    <template v-if="project">
      <ElForm :disabled="saving || loading || analyzing" class="selection-fields">
        <div class="selection-heading">
          <ElInput v-model="project.title" aria-label="方案名称" placeholder="方案名称" />
          <span>版本 {{ project.version }}{{ dirty ? ' · 尚未保存' : '' }}</span>
        </div>
        <ElInput
          v-model="project.brief"
          type="textarea"
          :rows="2"
          aria-label="选品目标"
          placeholder="目标市场、销售周期、渠道与选品目标"
        />
        <p
          v-if="
            project.analysis && (dirty || project.analysis.projectVersion + 1 !== project.version)
          "
          class="selection-notice"
        >
          方案条件已变，上次分析保留为旧版本；导出会注明旧版本，不作为当前结论。
          <ElLink :disabled="loading || saving" @click="analyze">重新分析</ElLink>
        </p>
        <ElTabs v-model="activeTab">
          <ElTabPane label="候选比较" name="candidates">
            <ElTable
              :data="project.candidates"
              size="small"
              row-key="id"
              max-height="520"
              empty-text="这条回答没有可核验的商品候选"
            >
              <ElTableColumn prop="position" label="#" width="42" />
              <ElTableColumn label="商品" min-width="250">
                <template #default="{ row }">
                  <div class="selection-product">
                    <ElImage :src="safePublicUrl(row.product.imageUrl)" fit="contain" loading="lazy"
                      ><template #error><span>暂无图</span></template></ElImage
                    >
                    <div>
                      <a
                        :href="safePublicUrl(row.product.productUrl || row.product.sourceUrl)"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ row.product.name }}</a
                      ><small>{{ row.product.platform }}</small>
                    </div>
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn label="公开信息" min-width="145"
                ><template #default="{ row }">
                  <div v-if="row.product.displayedPrice">{{ row.product.displayedPrice }}</div>
                  <small v-if="row.product.rating != null"
                    >{{ row.product.rating }} 分<span v-if="row.product.reviewCount != null">
                      · {{ row.product.reviewCount }} 条评价</span
                    ></small
                  >
                  <small v-if="row.product.rank">榜单 #{{ row.product.rank }}</small>
                  <small v-else>未提供销量排名</small>
                </template></ElTableColumn
              >
              <ElTableColumn label="来源" min-width="135"
                ><template #default="{ row }">
                  <a
                    :href="safePublicUrl(row.product.sourceUrl)"
                    target="_blank"
                    rel="noopener noreferrer"
                    >查看原始来源</a
                  >
                  <small>{{
                    row.product.observedAt
                      ? new Date(row.product.observedAt).toLocaleString('zh-CN')
                      : '采集时间未知'
                  }}</small>
                </template></ElTableColumn
              >
              <ElTableColumn label="操作" width="90"
                ><template #default="{ row }"
                  ><ElLink @click="selectCandidate(row.id, 'brief')">完善方案</ElLink
                  ><ElLink @click="selectCandidate(row.id, 'history')">历史观察</ElLink></template
                ></ElTableColumn
              >
            </ElTable>
          </ElTabPane>
          <ElTabPane label="选品分析" name="analysis" />
          <ElTabPane label="产品定义" name="brief" />
          <ElTabPane label="成本情景" name="cost" />
          <ElTabPane label="试卖计划" name="trial" />
          <ElTabPane label="复盘" name="review" />
          <ElTabPane label="历史观察" name="history" />
        </ElTabs>
        <template v-if="activeTab === 'analysis'">
          <p v-if="analyzing" class="selection-notice" role="status">
            正在结合候选证据分析推荐理由、风险和验证事项…
          </p>
          <template v-if="project.analysis">
<p v-if="operation && operation.status !== 'succeeded'" class="selection-notice">以下是上次保存的分析，不是本轮的新结果。</p>
            <p class="selection-analysis-text">{{ project.analysis.overview }}</p>
            <div v-if="project.analysis.gaps?.length" class="selection-notice" role="note">
              <strong>尚待补充的依据</strong>
              <ul class="selection-analysis-list">
                <li v-for="gap in project.analysis.gaps" :key="gap">{{ gap }}</li>
              </ul>
            </div>
            <div v-if="project.analysis.scopeNotes?.length" class="selection-notice" role="note">
              <strong>阅读说明</strong>
              <ul class="selection-analysis-list">
                <li v-for="note in project.analysis.scopeNotes" :key="note">{{ note }}</li>
              </ul>
            </div>
            <p
              v-if="dirty || project.analysis.projectVersion + 1 !== project.version"
              class="selection-notice"
            >
              下方是上次已保存版本的分析，编辑后请重新分析。
            </p>
            <section
              v-for="item in project.analysis.analyses"
              :key="item.candidateId"
              class="selection-section"
            >
              <strong>{{
                project.candidates.find((candidate) => candidate.id === item.candidateId)?.product
                  .name || '商品'
              }}</strong>
              <p class="selection-analysis-text">{{ item.recommendation }}</p>
              <template v-if="item.facts?.length">
                <h4 class="selection-analysis-label">已记录事实</h4>
                <ElTable :data="item.facts" size="small" class="selection-facts">
                  <ElTableColumn prop="field" label="信息" width="170" show-overflow-tooltip />
                  <ElTableColumn
                    prop="value"
                    label="来源页面记录"
                    min-width="220"
                    show-overflow-tooltip
                  />
                  <ElTableColumn label="来源与采集时间" width="180">
                    <template #default="{ row }">
                      <a
                        v-if="safePublicUrl(row.sourceUrl)"
                        :href="safePublicUrl(row.sourceUrl)"
                        target="_blank"
                        rel="noopener noreferrer"
                        >查看来源</a
                      >
                      <small v-if="factDate(row.observedAt)" class="selection-fact-date">{{
                        factDate(row.observedAt)
                      }}</small>
                    </template>
                  </ElTableColumn>
                </ElTable>
              </template>
              <SelectionClaims v-if="item.claims?.length" :claims="item.claims" />
<template v-else>
<h4 class="selection-analysis-label">待验证判断</h4>
              <ul
                v-if="item.hypotheses?.length"
                class="selection-analysis-list selection-analysis-text"
              >
                <li v-for="hypothesis in item.hypotheses" :key="hypothesis">{{ hypothesis }}</li>
              </ul>
              <p v-else class="selection-analysis-text">{{ item.reason }}</p>
              <p v-if="item.risks.length" class="selection-notice">
                需要留意：{{ item.risks.join('；') }}
              </p>
              </template>
              <SelectionBusinessReferences
                :associations="project.analysis.businessAssociations"
                :candidate-id="item.candidateId"
              />
              <ul v-if="!item.claims?.length && item.nextActions.length">
                <li v-for="action in item.nextActions" :key="action">{{ action }}</li>
              </ul>
              <details v-if="item.evidenceUrls.length">
                <summary>查看依据</summary>
                <a
                  v-for="url in item.evidenceUrls"
                  :key="url"
                  class="selection-evidence"
                  :href="safePublicUrl(url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ url }}</a
                >
              </details>
            </section>
          </template>
          <p v-else class="selection-notice">
            点击“分析候选”，结合已有商品证据生成推荐、风险及待验证事项。
          </p>
        </template>
        <template v-if="activeTab !== 'candidates' && activeTab !== 'analysis'">
          <ElSelect
            v-model="selectedId"
            class="selection-picker"
            aria-label="选择候选商品"
            placeholder="选择商品"
          >
            <ElOption
              v-for="item in project.candidates"
              :key="item.id"
              :value="item.id"
              :label="`${item.position}. ${item.product.name}`"
            />
          </ElSelect>
          <template v-if="selected">
            <SelectionProductHistory
              v-if="activeTab === 'history'"
              :project-id="project.id"
              :candidate-id="selectedId"
            />
            <template v-if="activeTab === 'brief'">
              <BaseButton v-if="!briefs.length" size="small" @click="addBrief"
                >补充产品定义</BaseButton
              >
              <div v-for="row in briefs" :key="row.candidateId" class="selection-form">
                <label v-for="[key, label] in briefFields" :key="key"
                  >{{ label
                  }}<ElInput
                    v-model="row[key]"
                    type="textarea"
                    :rows="2"
                    :placeholder="`填写${label}，未核实的内容请注明`"
                /></label>
              </div>
            </template>
            <template v-if="activeTab === 'cost'">
              <p class="selection-notice">
                所有金额为每件、同一币种。空值代表未知；折扣、退款与退货处理费分开填写，避免重复扣除。保存后由服务器测算。
              </p>
              <BaseButton size="small" @click="addCost">添加成本情景</BaseButton>
              <section v-for="(row, index) in costs" :key="index" class="selection-section">
                <ElLink :disabled="saving || loading" @click="removeRow('costs', row)"
                  >移除此情景</ElLink
                >
                <div class="selection-form">
                  <label
                    >情景名称<ElInput
                      v-model="row.label"
                      placeholder="例如：基准 / 低价试卖" /></label
                  ><label
                    >币种<ElInput v-model="row.currency" placeholder="如 USD；费用需先统一币种"
                  /></label>
                  <label v-for="[key, label] in costFields" :key="key"
                    >{{ label
                    }}<ElInputNumber
                      v-model="row[key]"
                      :min="0"
                      :precision="2"
                      controls-position="right"
                      placeholder="未知"
                  /></label>
                </div>
                <label
                  >依据与假设<ElInput
                    v-model="row.assumptions"
                    type="textarea"
                    :rows="2"
                    placeholder="费用来源、汇率及日期、尚未确认的条件"
                /></label>
                <p v-if="costResult(row)" class="selection-notice">
                  <template v-if="costResult(row)?.contributionPerUnit != null"
                    >每件贡献利润 {{ costResult(row)?.currency }}
                    {{ costResult(row)?.contributionPerUnit?.toFixed(2)
                    }}<span v-if="costResult(row)?.marginPercent != null">
                      · 贡献率 {{ costResult(row)?.marginPercent?.toFixed(1) }}%</span
                    ></template
                  >
                  <template v-else
                    >费用尚不完整<span v-if="missingCostLabels(row)"
                      >，待补：{{ missingCostLabels(row) }}</span
                    >。补齐并保存后测算。</template
                  >
                </p>
              </section>
            </template>
            <template v-if="activeTab === 'trial'">
              <p class="selection-notice">
                这里保存试卖计划，不会创建采购单、上架或发送通知。预算按计划的同一币种记录。
              </p>
              <BaseButton size="small" @click="addTrial">添加试卖计划</BaseButton>
              <section v-for="(row, index) in trials" :key="index" class="selection-section">
                <ElLink :disabled="saving || loading" @click="removeRow('trials', row)"
                  >移除此计划</ElLink
                >
                <div class="selection-form">
                  <label>渠道 / 店铺<ElInput v-model="row.channel" /></label
                  ><label
                    >阶段<ElSelect v-model="row.status"
                      ><ElOption
                        v-for="[value, label] in statusOptions"
                        :key="value"
                        :value="value"
                        :label="label" /></ElSelect
                  ></label>
                  <label v-for="[key, label] in trialFields" :key="key"
                    >{{ label
                    }}<ElInputNumber
                      v-model="row[key]"
                      :min="0"
                      :precision="key === 'budget' || key === 'unitBudget' ? 2 : 0"
                      controls-position="right"
                      placeholder="待确认"
                  /></label>
                  <label>预算币种<ElInput v-model="row.currency" placeholder="如 USD" /></label>
                  <label
                    >计划上市日<ElDatePicker
                      v-model="row.launchDate"
                      value-format="YYYY-MM-DD"
                      type="date"
                  /></label>
                </div>
                <div class="selection-form">
                  <label
                    >验证假设<ElInput v-model="row.hypothesis" type="textarea" :rows="2" /></label
                  ><label
                    >成功条件<ElInput
                      v-model="row.successCriteria"
                      type="textarea"
                      :rows="2" /></label
                  ><label
                    >停止条件<ElInput v-model="row.stopCriteria" type="textarea" :rows="2"
                  /></label>
                </div>
              </section>
            </template>
            <template v-if="activeTab === 'review'">
              <p class="selection-notice">
                填写实际经营结果；未取得的数据保持空白，不作为零销量或零利润。
              </p>
              <BaseButton size="small" @click="addReview">添加复盘记录</BaseButton>
              <section v-for="(row, index) in reviews" :key="index" class="selection-section">
                <ElLink :disabled="saving || loading" @click="removeRow('reviews', row)"
                  >移除此记录</ElLink
                >
                <div class="selection-form">
                  <label
                    >复盘日期<ElDatePicker
                      v-model="row.reviewDate"
                      value-format="YYYY-MM-DD" /></label
                  ><label
                    >实际售出<ElInputNumber
                      v-model="row.soldUnits"
                      :min="0"
                      :precision="0"
                      controls-position="right" /></label
                  ><label
                    >退货数量<ElInputNumber
                      v-model="row.returnedUnits"
                      :min="0"
                      :precision="0"
                      controls-position="right" /></label
                  ><label
                    >实际贡献利润<ElInputNumber
                      v-model="row.actualContribution"
                      :precision="2"
                      controls-position="right" /></label
                  ><label>币种<ElInput v-model="row.currency" /></label
                  ><label
                    >下一步<ElSelect v-model="row.decision"
                      ><ElOption
                        v-for="[value, label] in decisions"
                        :key="value"
                        :value="value"
                        :label="label" /></ElSelect
                  ></label>
                </div>
                <label
                  >结论与依据<ElInput
                    v-model="row.findings"
                    type="textarea"
                    :rows="3"
                    placeholder="数据期间、来源、与原假设的差异，以及下一步行动"
                /></label>
              </section>
            </template>
          </template>
        </template>
      </ElForm>
    </template>
    <template #footer
      ><div class="selection-footer">
        <small>{{ updatedLabel }}</small
        ><ElLink :disabled="loading || saving" @click="load">重新读取</ElLink
        ><BaseButton
          :disabled="!project || loading || saving || analyzing"
          :loading="analyzing || saving"
          @click="analyze"
          >分析候选</BaseButton
        ><ElLink :disabled="!project || loading || saving" @click="exportFile('xlsx')"
          >导出 Excel</ElLink
        ><ElLink :disabled="!project || loading || saving" @click="exportFile('docx')"
          >导出 Word</ElLink
        ><small v-if="exporting" role="status">正在生成文件…</small
        ><BaseButton
          type="primary"
          :disabled="!project || loading || analyzing || !dirty"
          :loading="saving && !analyzing && !exporting"
          @click="save"
          >保存方案</BaseButton
        >
      </div></template
    >
  </ElDrawer>
</template>

<style scoped>
.selection-entry {
  margin: 4px 0 12px;
}

.selection-analysis-text {
  font-size: 13px;
  line-height: 22px;
  white-space: pre-wrap;
}

.selection-analysis-label {
  margin: 12px 0 6px;
  font-size: 13px;
  line-height: 20px;
}

.selection-analysis-list {
  padding-left: 18px;
  margin: 4px 0 8px;
}

.selection-fact-date {
  display: block;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.selection-evidence {
  display: block;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 22px;
}

.selection-fields {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.selection-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.selection-heading > .el-input {
  flex: 1;
}

.selection-heading > span {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.selection-notice {
  margin: 8px 0;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.selection-picker {
  width: 100%;
  margin-bottom: 12px;
}

.selection-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0;
}

.selection-section {
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.selection-section label,
.selection-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  line-height: 20px;
}

.selection-form :deep(.el-input-number),
.selection-form :deep(.el-date-editor.el-input) {
  width: 100%;
}

.selection-product {
  display: flex;
  gap: 8px;
  align-items: center;
}

.selection-product .el-image {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  font-size: 11px;
}

.selection-product > div {
  min-width: 0;
}

.selection-product a {
  display: -webkit-box;
  overflow: hidden;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.selection-fields a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.selection-fields small {
  display: block;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.selection-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.selection-footer small {
  color: var(--el-text-color-secondary);
  text-align: left;
  flex: 1;
}

@media (width <= 700px) {
  .selection-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
