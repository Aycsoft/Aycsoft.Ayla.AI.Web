export type MediaCreationMode = 'image' | 'video'
export type MediaGenerationMode =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'keyframe-video'

export interface MediaInspirationItem {
  id: string
  title: string
  meta: string
  summary: string
  prompt: string
  asset: string
  assetKind: 'image' | 'video'
  generationMode: MediaGenerationMode
}

const imageItems: MediaInspirationItem[] = [
  {
    id: 'product-diffuser',
    title: '香薰产品棚拍',
    meta: '文生图 · 16:9',
    summary: '材质、光线与商业构图',
    prompt: '生成一张 16:9 商业产品图：白色陶瓷香薰瓶与黑色藤条置于暖灰色摄影棚中，柔和侧逆光突出陶瓷质感，主体完整，画面简洁，无品牌、无文字。',
    asset: 'cases/image-product-diffuser.png',
    assetKind: 'image',
    generationMode: 'text-to-image'
  },
  {
    id: 'lifestyle-lavender',
    title: '薰衣草生活方式',
    meta: '文生图 · 16:9',
    summary: '人物、环境与电影氛围',
    prompt: '生成一张 16:9 生活方式摄影：一位穿白色长裙的年轻东亚女性行走在日落时分的薰衣草田，微风吹动衣摆，暖色逆光，电影感，人物自然，无文字。',
    asset: 'cases/image-lifestyle-lavender.png',
    assetKind: 'image',
    generationMode: 'text-to-image'
  },
  {
    id: 'tech-shoe-poster',
    title: '科技运动鞋海报',
    meta: '文生图 · 16:9',
    summary: '产品悬浮与科技光效',
    prompt: '生成一张 16:9 科技运动鞋产品海报：浅灰色未来感跑鞋悬浮于深蓝背景，蓝紫色光轨环绕，轮廓光清晰，构图高级，为标题预留安全区域，不生成文字。',
    asset: 'cases/image-tech-shoe.png',
    assetKind: 'image',
    generationMode: 'text-to-image'
  },
  {
    id: 'image-to-image-diffuser',
    title: '同主体更换场景',
    meta: '图生图 · 参考图',
    summary: '保留主体，重构背景与光线',
    prompt: '请先上传一张产品参考图。以附件中的产品为唯一主体参考，严格保留产品造型、比例、颜色与材质，把背景更换为暖色现代客厅窗边场景，加入柔和晨光和自然景深，不增加文字或其他产品。',
    asset: 'cases/image-to-image-diffuser.png',
    assetKind: 'image',
    generationMode: 'image-to-image'
  }
]

const videoItems: MediaInspirationItem[] = [
  {
    id: 'product-motion',
    title: '产品环绕运镜',
    meta: '文生视频 · 5 秒',
    summary: '稳定镜头与材质表现',
    prompt: '生成一段 5 秒 16:9 产品展示视频：白色陶瓷香薰瓶在浅灰背景上缓慢旋转，镜头平稳环绕，棚拍柔光突出陶瓷材质，背景干净，无文字。',
    asset: 'cases/video-product-motion.mp4',
    assetKind: 'video',
    generationMode: 'text-to-video'
  },
  {
    id: 'image-to-video',
    title: '让参考图动起来',
    meta: '图生视频 · 参考图',
    summary: '保持主体，补充自然运动',
    prompt: '请先上传一张参考图片。基于附件画面生成 5 秒 16:9 视频，严格保持主体外观和场景结构，仅加入轻微自然运动、柔和光影变化与缓慢推镜，首帧与参考图一致，避免主体变形和新增文字。',
    asset: 'cases/video-image-to-video.mp4',
    assetKind: 'video',
    generationMode: 'image-to-video'
  },
  {
    id: 'cinematic-scene',
    title: '电影感场景短片',
    meta: '文生视频 · 5 秒',
    summary: '光线变化与细腻推镜',
    prompt: '生成一段 5 秒 16:9 电影感短片：清晨阳光缓慢扫过整洁办公桌、笔记本电脑与绿植，镜头轻微向前推进，光影自然变化，画面稳定，无人物、无文字。',
    asset: 'cases/video-cinematic-scene.mp4',
    assetKind: 'video',
    generationMode: 'text-to-video'
  },
  {
    id: 'keyframe-transition',
    title: '首尾帧自然转场',
    meta: '关键帧 · 两张图',
    summary: '首尾一致与连续转场',
    prompt: '请上传首帧和尾帧两张参考图。生成一段 5 秒 16:9 连贯转场视频：从首帧场景平滑过渡到尾帧场景，主体身份、比例和纹理保持一致，运动路径自然，镜头稳定，不新增文字。',
    asset: 'cases/video-keyframe-transition.mp4',
    assetKind: 'video',
    generationMode: 'keyframe-video'
  }
]

export const mediaInspirationFor = (mode: MediaCreationMode): readonly MediaInspirationItem[] =>
  mode === 'image' ? imageItems : videoItems

export const shouldShowMediaInspiration = (
  mode: 'chat' | MediaCreationMode,
  messageCount: number
) => mode !== 'chat' && messageCount === 0
