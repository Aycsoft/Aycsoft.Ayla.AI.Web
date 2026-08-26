import type { ExternalAuthRegisterRequest } from '@/types/ai'

export const externalUserPurposes = [
  { value: 'work-efficiency', label: '工作效率', icon: 'lucide:gauge' },
  { value: 'content-creation', label: '内容创作', icon: 'lucide:pen-tool' },
  { value: 'image-generation', label: '图片生成', icon: 'lucide:image' },
  { value: 'video-generation', label: '视频生成', icon: 'lucide:video' },
  { value: 'document-processing', label: '文档处理', icon: 'lucide:file-text' },
  { value: 'learning-research', label: '学习研究', icon: 'lucide:graduation-cap' },
  { value: 'other', label: '其他', icon: 'lucide:more-horizontal' }
] as const

export const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))

export function buildExternalRegistration(input: { name: string; email: string; code: string; purposes: string[]; otherPurpose: string; password?: string }): ExternalAuthRegisterRequest {
  const otherPurpose = input.otherPurpose.trim()
  return {
    DisplayName: input.name.trim(),
    Email: normalizeEmail(input.email),
    Code: input.code.trim(),
    Purposes: [...new Set(input.purposes)],
    ...(input.purposes.includes('other') && otherPurpose ? { OtherPurpose: otherPurpose } : {}),
    ...(input.password?.trim() ? { Password: input.password } : {})
  }
}
