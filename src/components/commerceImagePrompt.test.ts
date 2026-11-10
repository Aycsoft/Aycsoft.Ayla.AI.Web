import { expect, test } from 'vitest'
import { commerceImagePrompt } from './commerceImagePrompt'
test('场景基于真实原图类型，不固定吊灯场景或虚构技术规格', () => {
  const prompt = commerceImagePrompt(
    'scene',
    '目标平台：Wayfair；产品类目：壁灯；使用暖色书房',
    '4:5',
  )
  expect(prompt).toContain('壁灯')
  expect(prompt).toContain('暖色书房')
  expect(prompt).toContain('4:5')
  expect(prompt).toContain('根据原图真实灯具类型')
  expect(prompt).toContain('未知尺寸不标注')
  expect(prompt).not.toContain('吊灯')
})
test('白底编辑保留结构，自定义美工要求不丢失', () => {
  const white = commerceImagePrompt('white', '', '1:1')
  expect(white).toContain('纯白背景')
  expect(white).toContain('灯头数量、玻璃片数、材质颜色')
  const custom = commerceImagePrompt('custom', '去除背景，保留铜色金属', '16:9')
  expect(custom).toContain('去除背景，保留铜色金属')
  expect(custom).toContain('请生成图片')
})
