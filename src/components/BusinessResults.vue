<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElTooltip } from 'element-plus'
import type { Message } from '@/types/ai'
import {
  businessNavigationUrl,
  businessText,
  collectBusinessImages,
  collectBusinessProducts,
  collectBusinessToolResults,
} from '@/utils/businessResults'
import { normalizeBackendResourceUrl } from '@/utils/backendResource'
import { imageSearchPreviewUrl } from '@/utils/imageSearchPreview'
import SalesComparisonResult from './SalesComparisonResult.vue'
import ResourcePreviewDialog from './ResourcePreviewDialog.vue'
import ExternalImageSearchButton from './ExternalImageSearchButton.vue'
import CompactBusinessTable from './CompactBusinessTable.vue'
import { compactBusiness, compactProduct } from '@/utils/compactBusiness'

const props = defineProps<{ message: Message }>()
const compactResults = computed(() =>
  collectBusinessToolResults(props.message).filter((result) => compactBusiness(result)),
)
const products = computed(() =>
  collectBusinessProducts({
    ...props.message,
    ToolResult: undefined,
    ToolResults: collectBusinessToolResults(props.message).filter(
      (result) => !compactBusiness(result),
    ),
  }),
)
const images = computed(() => collectBusinessImages(props.message))
const comparisons = computed(() =>
  collectBusinessToolResults(props.message).filter(
    (result) => result.ToolCode.toLowerCase().replaceAll('-', '_') === 'sales_dimension_comparison',
  ),
)
const portalOrigin = String(import.meta.env.VITE_PORTAL_ORIGIN || window.location.origin)
const productImage = (product: Record<string, unknown>) =>
  compactProduct(product, portalOrigin).image
const productText = (product: Record<string, unknown>) => compactProduct(product, portalOrigin)
const missingImages = ref<Record<string, boolean>>({})
const preview = ref<{ url: string; name: string }>()

/** ERP保护预览必须回到配置的ERP来源；失败显示缺图，不替换成示例或猜测文件地址。 */
const previewUrl = (raw: unknown) => {
  const safe = normalizeBackendResourceUrl(businessText(raw))
  if (!safe) return ''
  if (safe.startsWith('/api/AI/')) {
    try {
      const origin = new URL(portalOrigin)
      return ['http:', 'https:'].includes(origin.protocol) ? new URL(safe, origin.origin).href : ''
    } catch {
      return ''
    }
  }
  return safe
}
const showPreview = (raw: unknown, name: unknown) => {
  const url = previewUrl(raw)
  if (url) preview.value = { url, name: businessText(name) || '图片.jpg' }
}
const scopeLabel = (scope: unknown) =>
  scope === 'developer-gallery'
    ? '开发产品图库'
    : scope === 'file-library'
      ? '产品文件库'
      : '图片检索'
const scoreLabel = (score: unknown) =>
  typeof score === 'number' && Number.isFinite(score)
    ? String(Math.round(Math.max(0, Math.min(1, score)) * 100))
    : ''
</script>

<template>
  <section
    v-if="products.length || images.length || comparisons.length || compactResults.length"
    class="business-results"
    aria-label="业务查询结果"
  >
    <CompactBusinessTable
      v-for="(result, index) in compactResults"
      :key="result.InvocationId || index"
      :result="result"
    />
    <SalesComparisonResult
      v-for="(result, index) in comparisons"
      :key="result.InvocationId || index"
      :data="result.Data"
    />
    <div v-if="products.length" class="business-results__products">
      <article v-for="entry in products" :key="entry.key" class="business-product">
        <button
          v-if="productImage(entry.product)"
          type="button"
          class="business-image"
          @click="showPreview(productImage(entry.product), productText(entry.product).name)"
        >
          <img
            v-if="!missingImages[entry.key]"
            :src="productImage(entry.product)"
            :alt="businessText(entry.product.Name)"
            loading="lazy"
            @error="missingImages[entry.key] = true"
          />
          <span v-else>图片暂不可用</span>
        </button>
        <div>
          <strong :title="productText(entry.product).name">{{
            productText(entry.product).shortName
          }}</strong>
          <p>{{ productText(entry.product).sku }}</p>
          <small>{{ businessText(entry.product.CategoryName) }}</small>
          <ExternalImageSearchButton
            :file-id="businessText(entry.product.MainImageFileId)"
            scope="product"
            :conversation-id="message.ConversationId"
            image-label="商品主图"
          />
          <a
            v-if="businessNavigationUrl(entry.navigation, portalOrigin)"
            :href="businessNavigationUrl(entry.navigation, portalOrigin)"
            target="_blank"
            rel="noopener noreferrer"
            >在系统中查看 ↗</a
          >
        </div>
      </article>
    </div>
    <details v-if="images.length" class="business-results__images" open>
      <summary>相似图片 · {{ images.length }} 条匹配证据</summary>
      <small>按查询图片与图库保留原始顺序</small>
      <div class="image-results-grid">
        <article v-for="entry in images" :key="entry.key">
          <button
            v-if="imageSearchPreviewUrl(entry.image)"
            class="business-image"
            type="button"
            @click="
              showPreview(
                imageSearchPreviewUrl(entry.image),
                entry.image.ProductCode || entry.image.DisplayName || entry.image.FileName,
              )
            "
          >
            <img
              v-if="!missingImages[entry.key]"
              :src="imageSearchPreviewUrl(entry.image)"
              :alt="
                businessText(
                  entry.image.ProductCode || entry.image.DisplayName || entry.image.FileName,
                )
              "
              loading="lazy"
              @error="missingImages[entry.key] = true"
            />
            <span v-else>图片暂不可用</span>
          </button>
          <small v-else>未提供可访问预览</small>
          <strong>{{
            businessText(
              entry.image.ProductCode || entry.image.DisplayName || entry.image.FileName,
            ) || '图库图片'
          }}</strong>
          <small>{{ scopeLabel(entry.image.Scope) }}</small>
          <small v-if="entry.image.QueryFileName"
            >查询图片：{{ businessText(entry.image.QueryFileName) }}</small
          >
          <ElTooltip
            v-if="scoreLabel(entry.image.Score) !== ''"
            content="用于排序，不代表同款概率；不同图库分数不直接比较"
            placement="top"
          >
            <small class="image-similarity-score">
              <span>相似分</span><b>{{ scoreLabel(entry.image.Score) }}</b
              ><span>分</span>
            </small>
          </ElTooltip>
          <ExternalImageSearchButton
            v-if="entry.image.Scope === 'file-library' || entry.image.Scope === 'developer-gallery'"
            :file-id="businessText(entry.image.FileId)"
            :scope="entry.image.Scope === 'file-library' ? 'product' : 'developer'"
            :conversation-id="message.ConversationId"
            image-label="结果图"
          />
        </article>
      </div>
    </details>
    <ResourcePreviewDialog
      :open="Boolean(preview)"
      :content-url="preview?.url"
      :file-name="preview?.name || '图片.jpg'"
      content-type="image/jpeg"
      @close="preview = undefined"
    />
  </section>
</template>

<style scoped>
.business-results {
  margin-top: 14px;
}
.business-results__products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 12px;
}
.business-product {
  display: flex;
  min-width: 0;
  gap: 12px;
  padding: 10px 0;
}
.business-product > div {
  min-width: 0;
}
.business-results strong,
.business-results small,
.business-results a {
  display: block;
  overflow-wrap: anywhere;
}
.business-results strong {
  font-size: 13px;
  font-weight: 500;
}
.business-results small,
.business-results p {
  font-size: 12px;
  color: var(--mm-secondary);
  margin: 4px 0;
}
.business-results a {
  font-size: 12px;
  margin-top: 8px;
  color: var(--mm-text);
}
.business-image {
  display: flex;
  width: 84px;
  height: 84px;
  flex: none;
  justify-content: center;
  align-items: center;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--mm-line);
  border-radius: 6px;
  cursor: pointer;
  background: var(--surface-subtle);
}
.business-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.business-image span {
  font-size: 11px;
  color: var(--mm-secondary);
}
.business-results__images {
  margin-top: 12px;
}
.business-results__images summary {
  cursor: pointer;
  font-size: 13px;
}
.image-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(130px, 100%), 1fr));
  gap: 12px;
  margin-top: 12px;
}
.image-results-grid article {
  min-width: 0;
}
.image-results-grid .business-image {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  margin-bottom: 6px;
}
.image-similarity-score {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  white-space: nowrap;
  color: var(--mm-secondary);
}
.image-similarity-score b {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
