<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
// 工作台未全量引入Element样式，弹层及按钮需按既有方式显式加载。
import 'element-plus/es/components/dialog/style/css.mjs'
import 'element-plus/es/components/button/style/css.mjs'
import { mediaJobsApi } from '@/api/mediaJobs'
import {
  mediaJobCanStop,
  mediaJobNeedsRefresh,
  mediaJobStatus,
  type MediaJob,
} from '@/utils/mediaJobs'

const props = defineProps<{ identityKey?: string }>()
const opened = ref(false)
const jobs = ref<MediaJob[]>([])
const loading = ref(false)
const operation = ref('')
const notice = ref('')
const previewUrl = ref('')
let version = 0
let timer: ReturnType<typeof setTimeout> | undefined
const busy = computed(() => loading.value || Boolean(operation.value))
const clearPreview = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}
const schedule = () => {
  if (timer) clearTimeout(timer)
  if (opened.value && jobs.value.some(mediaJobNeedsRefresh))
    timer = setTimeout(() => void load(), 5000)
}
const load = async () => {
  if (!props.identityKey || busy.value) return
  const epoch = version
  loading.value = true
  notice.value = ''
  try {
    const result = await mediaJobsApi.list()
    if (epoch !== version) return
    jobs.value = result
  } catch (error) {
    if (epoch !== version) return
    jobs.value = []
    const status =
      (error as { status?: number; response?: { status?: number } }).status ||
      (error as { response?: { status?: number } }).response?.status
    notice.value =
      status === 401
        ? '登录已失效，请重新登录。'
        : status === 503
          ? '持久视频任务尚未启用。'
          : '视频任务暂时无法读取，请稍后重试。'
  } finally {
    if (epoch === version) {
      loading.value = false
      schedule()
    }
  }
}
// 恢复只查询同一供应商任务；停止本地轮询不等于取消供应商任务或收费。
const act = async (job: MediaJob, action: 'resume' | 'local-stop') => {
  if (busy.value) return
  const epoch = version
  operation.value = job.JobId
  notice.value = ''
  try {
    const result = await mediaJobsApi.act(job.JobId, action)
    if (epoch !== version) return
    if (result) jobs.value = jobs.value.map((row) => (row.JobId === result.JobId ? result : row))
  } catch {
    if (epoch === version) notice.value = '操作未完成；请刷新当前任务状态，不要重新提交生成。'
  } finally {
    if (epoch === version) {
      operation.value = ''
      schedule()
    }
  }
}
const readFile = async (job: MediaJob, download: boolean) => {
  if (busy.value) return
  const epoch = version
  operation.value = job.JobId
  notice.value = ''
  try {
    const blob = await mediaJobsApi.file(job.JobId)
    if (epoch !== version) return
    if (download) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `media-${job.JobId}.mp4`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } else {
      clearPreview()
      previewUrl.value = URL.createObjectURL(blob)
    }
  } catch {
    if (epoch === version) notice.value = '文件暂不可读取，登录或文件权限可能已变化。'
  } finally {
    if (epoch === version) operation.value = ''
  }
}
watch(opened, (value) => {
  version++
  loading.value = false
  operation.value = ''
  if (timer) clearTimeout(timer)
  if (value) void load()
  else clearPreview()
})
watch(
  () => props.identityKey,
  () => {
    version++
    opened.value = false
    jobs.value = []
    clearPreview()
  },
)
onBeforeUnmount(() => {
  version++
  if (timer) clearTimeout(timer)
  clearPreview()
})
</script>

<template>
  <ElButton v-if="identityKey" class="media-jobs-trigger" text size="small" @click="opened = true"
    >视频任务</ElButton
  >
  <ElDialog
    v-model="opened"
    title="我的视频任务"
    width="min(640px, 94vw)"
    append-to-body
    destroy-on-close
  >
    <div class="media-jobs">
      <p class="media-jobs__note">
        继续查询会恢复同一任务。停止本地等待，不代表供应商取消或停止计费。
      </p>
      <ElButton text size="small" :loading="loading" :disabled="busy" @click="load"
        >刷新状态</ElButton
      >
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-else-if="!loading && !jobs.length">暂无已保存的视频任务。</p>
      <article v-for="job in jobs" :key="job.JobId" class="media-jobs__item">
        <strong>{{ job.Title }}</strong>
        <span
          >{{ mediaJobStatus(job.Status)
          }}<template v-if="job.Progress !== null"> · {{ job.Progress }}%</template></span
        >
        <small v-if="job.LocalStopRequested">已请求停止本地等待</small>
        <small v-if="job.Status === 'submission_rejected'"
          >供应商已明确拒绝本轮请求，不会自动继续提交。</small
        >
        <small v-if="job.Status === 'preparation_failed'"
          >未向供应商提交，请处理参考图授权后再发起新请求。</small
        >
        <small v-if="job.Status === 'submission_unknown' || job.Status === 'needs_reconciliation'"
          >结果待核对，请勿重复生成或保存。</small
        >
        <div>
          <ElButton
            v-if="job.CanResume"
            text
            size="small"
            :loading="operation === job.JobId"
            :disabled="busy"
            @click="act(job, 'resume')"
            >继续查询</ElButton
          >
          <ElButton
            v-if="mediaJobCanStop(job)"
            text
            size="small"
            :disabled="busy"
            @click="act(job, 'local-stop')"
            >停止本地等待</ElButton
          >
          <template v-if="job.Status === 'succeeded'">
            <ElButton text size="small" :disabled="busy" @click="readFile(job, false)"
              >预览视频</ElButton
            >
            <ElButton text size="small" :disabled="busy" @click="readFile(job, true)"
              >下载</ElButton
            >
          </template>
        </div>
      </article>
      <video
        v-if="previewUrl"
        :src="previewUrl"
        controls
        preload="metadata"
        class="media-jobs__preview"
      ></video>
    </div>
  </ElDialog>
</template>

<style scoped>
.media-jobs-trigger {
  flex: 0 0 auto;
  white-space: nowrap;
}
.media-jobs {
  display: grid;
  gap: 12px;
}
.media-jobs__note,
.media-jobs__item small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.media-jobs__item {
  display: grid;
  gap: 8px;
  padding: 14px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  overflow-wrap: anywhere;
}
.media-jobs__item span {
  font-size: 13px;
}
.media-jobs__preview {
  width: 100%;
  max-height: 55vh;
  background: #111;
}
</style>
