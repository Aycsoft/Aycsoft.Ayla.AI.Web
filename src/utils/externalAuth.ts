/** 外部账号表单规范化；此处格式提示不能替代服务端验证码与身份校验。 */
import type { ExternalAuthRegisterRequest } from '@/types/ai'

/** 注册用途选项；value 是发送给后端的稳定值，label 可独立调整。 */
export const externalUserPurposes = [
  { value: 'work-efficiency', label: '工作效率', icon: 'lucide:gauge' },
  { value: 'content-creation', label: '内容创作', icon: 'lucide:pen-tool' },
  { value: 'image-generation', label: '图片生成', icon: 'lucide:image' },
  { value: 'video-generation', label: '视频生成', icon: 'lucide:video' },
  { value: 'document-processing', label: '文档处理', icon: 'lucide:file-text' },
  { value: 'learning-research', label: '学习研究', icon: 'lucide:graduation-cap' },
  { value: 'other', label: '其他', icon: 'lucide:more-horizontal' },
] as const

/** 沿用账号协议统一邮箱首尾空白与大小写。 */
export const normalizeEmail = (value: string) => value.trim().toLowerCase()
/** 提供交互层基础邮箱格式提示，不验证地址存在性。 */
export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))

/** 整理注册请求并去重用途；密码仅判空，发送时不 trim，以免改变用户凭据。 */
export function buildExternalRegistration(input: {
  name: string
  email: string
  code: string
  purposes: string[]
  otherPurpose: string
  password?: string
}): ExternalAuthRegisterRequest {
  const otherPurpose = input.otherPurpose.trim()
  return {
    DisplayName: input.name.trim(),
    Email: normalizeEmail(input.email),
    Code: input.code.trim(),
    Purposes: [...new Set(input.purposes)],
    ...(input.purposes.includes('other') && otherPurpose ? { OtherPurpose: otherPurpose } : {}),
    ...(input.password?.trim() ? { Password: input.password } : {}),
  }
}
