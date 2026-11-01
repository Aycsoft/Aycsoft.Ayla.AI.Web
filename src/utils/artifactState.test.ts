import { describe, expect, it } from 'vitest'
import { artifactState, artifactProgress } from './artifactState'
import { mergeArtifacts } from './messageAttachments'
describe('真实产物展示合同', () => {
  it.each(['failed', 'expired', 'missing', 'permission_denied', 'cancelled'])(
    '%s 不显示继续生成',
    (status) => {
      expect(artifactState(status)).toMatchObject({ pending: false, unavailable: true })
    },
  )
  it('未知进度不补造百分比，真实0保持0', () => {
    expect(artifactProgress(undefined)).toBeUndefined()
    expect(artifactProgress(NaN)).toBeUndefined()
    expect(artifactProgress(0)).toBe(0)
    expect(artifactState('unknown').pending).toBe(false)
  })
  it('历史pending被同ID就绪状态更新，旧版本不能倒退', () => {
    const base = { ArtifactId: 'a', FileName: 'a.png', Type: 'image' }
    expect(
      mergeArtifacts([
        { ...base, Status: 'pending', Version: 1 },
        { ...base, Status: 'ready', Version: 2, PreviewUrl: '/api/workspace/artifacts/a' },
        { ...base, Status: 'pending', Version: 1 },
      ]),
    ).toEqual([{ ...base, Status: 'ready', Version: 2, PreviewUrl: '/api/workspace/artifacts/a' }])
  })
})
