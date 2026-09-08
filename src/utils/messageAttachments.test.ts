/** 历史附件回归：验证字段别名、顶层优先、鉴权路径回退与上传/生成资源汇集。 */
import { describe, expect, it } from 'vitest'
import type { Message } from '@/types/ai'
import { collectWorkspaceArtifacts, normalizeMessageResponse } from './messageAttachments'

describe('normalizeMessageResponse', () => {
  it('restores persisted attachments from PageContext', () => {
    const [message] = normalizeMessageResponse([
      {
        Id: 'm1',
        Role: 'user',
        Content: '分析附件',
        PageContext: { Attachments: [{ FileId: 'f1', FileName: 'report.pdf', FileSize: 42 }] },
      },
    ])
    expect(message.Attachments).toEqual([
      {
        FileId: 'f1',
        FileName: 'report.pdf',
        FileSize: 42,
        ContentType: undefined,
        ContentUrl: '/api/sso/attachments/f1',
        DownloadUrl: '/api/sso/attachments/f1?download=true',
      },
    ])
  })

  it('keeps top-level attachments ahead of PageContext fallbacks', () => {
    const response = normalizeMessageResponse({
      Items: [
        {
          Id: 'm1',
          Role: 'user',
          Content: '分析附件',
          Attachments: [{ FileId: 'top', FileName: 'top.txt' }],
          PageContext: { Attachments: [{ FileId: 'context', FileName: 'context.txt' }] },
        },
      ],
      HasMore: false,
    })
    expect(response.Items[0].Attachments?.[0].FileId).toBe('top')
  })

  it('normalizes camel-case attachment fields returned by compatible APIs', () => {
    const legacyMessage: Message & {
      pageContext: { attachments: Array<Record<string, unknown>> }
    } = {
      Id: 'm1',
      Role: 'user',
      Content: '附件',
      pageContext: { attachments: [{ fileId: 'f2', fileName: 'data.csv', size: 18 }] },
    }
    const [message] = normalizeMessageResponse([legacyMessage])
    expect(message.Attachments?.[0]).toMatchObject({
      FileId: 'f2',
      FileName: 'data.csv',
      FileSize: 18,
    })
  })

  it('maps the backend FileUrl and PreviewUrl contract used by historical messages', () => {
    const [message] = normalizeMessageResponse([
      {
        Id: 'm1',
        Role: 'user',
        Content: '附件',
        Attachments: [
          {
            FileId: 'legacy/1',
            FileName: 'photo.png',
            FileUrl: '/download/photo',
            PreviewUrl: '/preview/photo',
          },
        ],
      },
    ])
    expect(message.Attachments?.[0]).toMatchObject({
      ContentUrl: '/preview/photo',
      DownloadUrl: '/download/photo',
    })
  })

  it('derives encoded authorized attachment routes for old history records without URLs', () => {
    const [message] = normalizeMessageResponse([
      {
        Id: 'm1',
        Role: 'user',
        Content: '附件',
        Attachments: [{ FileId: 'external file/1', FileName: 'old.png' }],
      },
    ])
    expect(message.Attachments?.[0].ContentUrl).toBe('/api/sso/attachments/external%20file%2F1')
    expect(message.Attachments?.[0].DownloadUrl).toBe(
      '/api/sso/attachments/external%20file%2F1?download=true',
    )
  })

  it('adds user uploads to workspace assets while retaining generated assistant artifacts', () => {
    const artifacts = collectWorkspaceArtifacts([
      {
        Id: 'u1',
        Role: 'user',
        Content: '分析图片',
        Attachments: [{ FileId: 'f1', FileName: 'input.png', ContentType: 'image/png' }],
      },
      {
        Id: 'a1',
        Role: 'assistant',
        Content: '完成',
        Artifacts: [
          {
            ArtifactId: 'output-1',
            Type: 'image/png',
            FileName: 'output.png',
            Status: 'completed',
          },
        ],
      },
    ])
    expect(artifacts).toHaveLength(2)
    expect(artifacts[0]).toMatchObject({
      ArtifactId: 'attachment:f1',
      FileName: 'input.png',
      ContentUrl: '/api/sso/attachments/f1',
      DownloadUrl: '/api/sso/attachments/f1?download=true',
    })
    expect(artifacts[1].ArtifactId).toBe('output-1')
  })
})
