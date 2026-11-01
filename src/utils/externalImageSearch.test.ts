import assert from 'node:assert/strict'
import { test } from 'vitest'
import type { AIExternalImageSearchLaunch, AIExternalImageSearchScope } from '@/types/ai'
import {
  buildExternalImageSearchRequest,
  validatedExternalImageSearchUrl,
} from './externalImageSearch'

const request = buildExternalImageSearchRequest('file-123', 'product', 'conversation')!
const launch: AIExternalImageSearchLaunch = {
  Provider: '1688',
  Label: '打开1688搜同款',
  LaunchUrl: 'https://aibuy.1688.com/landingpage/new-home/find-products.html?bizType=ERP',
  QueryFileId: 'file-123',
  QueryFileName: '商品.jpg',
}

test('三个真实文件作用域及会话标识按合同提交，不拼接授权参数', () => {
  for (const Scope of ['chat-attachment', 'product', 'developer'] as const)
    assert.deepEqual(buildExternalImageSearchRequest('file-123', Scope, 'conversation'), {
      Provider: '1688',
      FileId: 'file-123',
      Scope,
      ConversationId: 'conversation',
    })
  assert.equal('ConversationId' in buildExternalImageSearchRequest('file-123', 'product')!, false)
})

test('缺少文件ID或仅有图片URL时不生成请求', () => {
  for (const id of [
    undefined,
    '',
    ' ',
    'blob:https://erp.example/id',
    'https://erp.example/image.jpg',
    '/api/files/id',
  ])
    assert.equal(buildExternalImageSearchRequest(id, 'product'), undefined)
  assert.equal(
    buildExternalImageSearchRequest('file-123', 'unknown' as AIExternalImageSearchScope),
    undefined,
  )
})

test('只接受服务端为当前图片返回的1688 HTTPS入口', () => {
  assert.equal(validatedExternalImageSearchUrl(launch, request), launch.LaunchUrl)
  assert.equal(
    validatedExternalImageSearchUrl({ ...launch, QueryFileId: 'another-file' }, request),
    '',
  )
  assert.equal(
    validatedExternalImageSearchUrl({ ...launch, Provider: 'other' as '1688' }, request),
    '',
  )
})

test('拒绝伪装域名、HTTP、用户信息、非默认端口和脚本链接', () => {
  for (const LaunchUrl of [
    'https://aibuy.1688.com.evil.example/',
    'https://evil.example/aibuy.1688.com',
    'http://aibuy.1688.com/',
    'https://name@aibuy.1688.com/',
    'https://aibuy.1688.com:9443/',
    '//aibuy.1688.com/',
    'javascript:alert(1)',
    'data:text/html,test',
  ])
    assert.equal(validatedExternalImageSearchUrl({ ...launch, LaunchUrl }, request), '')
})

test('失败或缺失返回值不会产生外部跳转', () => {
  assert.equal(validatedExternalImageSearchUrl(undefined, request), '')
  assert.equal(validatedExternalImageSearchUrl({ ...launch, LaunchUrl: '' }, request), '')
})
