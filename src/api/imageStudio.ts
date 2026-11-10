import { request } from './http'
export interface ImageStudioOption {
  id: string
  name: string
  englishName?: string | null
  children?: ImageStudioOption[] | null
}
export const getImageStudioOptions = () =>
  request<{ platforms: ImageStudioOption[]; categories: ImageStudioOption[] }>(
    '/workspace/image-studio/options',
  )
