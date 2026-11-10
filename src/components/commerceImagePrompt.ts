export type CommerceImageMode = 'white' | 'scene' | 'custom'
/** 图像编辑只改变背景与布光，不以营销文案补造产品结构或认证。 */
export function commerceImagePrompt(
  mode: CommerceImageMode,
  instruction: string,
  ratio: string,
): string {
  const task =
    mode === 'white'
      ? '生成电商白底主图：纯白背景，主体完整居中，真实柔和布光。'
      : mode === 'scene'
        ? '生成家居使用场景图：根据原图真实灯具类型选择合理安装位置。'
        : '按以下美工要求编辑产品图片。'
  return `${task}\n以附件产品原图为依据。保留原有灯头数量、玻璃片数、材质颜色、安装盘和线缆，不改变商品结构；未知尺寸不标注，不添加虚假认证或标志。\n画面比例：${ratio}。\n美工要求：${instruction.trim() || '保持自然真实，突出产品细节。'}\n请生成图片，不只返回文字方案。`
}
