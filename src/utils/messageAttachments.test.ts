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

it('将Portal继承的同ID保护附件映射到SSO网关而非匿名文件地址', () => {
  const [message] = normalizeMessageResponse([
    {
      Id: 'm',
      Role: 'user',
      Content: '图',
      Attachments: [
        {
          FileId: 'image-1',
          FileName: 'photo.png',
          PreviewUrl: '/api/AI/Chat/Attachments/image-1',
          FileUrl: '/api/AI/Chat/Attachments/image-1?download=1',
        },
      ],
    },
  ])
  expect(message.Attachments?.[0]).toMatchObject({
    ContentUrl: '/api/sso/attachments/image-1',
    DownloadUrl: '/api/sso/attachments/image-1?download=true',
  })
})

it('不改写不一致FileId、任意外部地址和其他已提供的资源协议', () => {
  for (const url of [
    '/api/AI/Chat/Attachments/another-file',
    'https://external.example/photo.png',
    '/api/artifacts/image-1',
  ]) {
    const [message] = normalizeMessageResponse([
      {
        Id: 'm',
        Role: 'user',
        Content: '图',
        Attachments: [
          {
            FileId: 'image-1',
            FileName: 'photo.png',
            ContentUrl: url,
            DownloadUrl: url,
          },
        ],
      },
    ])
    expect(message.Attachments?.[0].ContentUrl).toBe(url)
    expect(message.Attachments?.[0].DownloadUrl).toBe(url)
  }
})

describe('历史生成状态恢复', () => {
  it.each(['failed', 'tool_failed', 'document_evidence_unavailable'])(
    '只有GenerationStatus=%s的失败也显示错误且不丢原文',
    (GenerationStatus) => {
      const original: Message = {
        Id: 'synthetic',
        Role: 'assistant',
        Content: '具体失败原因',
        GenerationStatus,
        ErrorCode: 'SAFE_FAILURE',
        SuggestedQuestions: ['不应显示'],
      }
      const [message] = normalizeMessageResponse([original])
      expect(message.Status).toBe('error')
      expect(message.ErrorMessage).toContain('未完成')
      expect(message.Content).toBe(original.Content)
      expect(message.ErrorCode).toBe('SAFE_FAILURE')
      expect(message.SuggestedQuestions).toEqual([])
      expect(original.Status).toBeUndefined()
    },
  )
  it('partial仍为部分结果，保留实际产物和原始错误码', () => {
    const Artifacts = [
      {
        ArtifactId: 'real-output',
        Type: 'image/png',
        FileName: 'synthetic.png',
        Status: 'completed',
      },
    ]
    const [message] = normalizeMessageResponse([
      {
        Id: 'm',
        Role: 'assistant',
        Content: '部分结果',
        GenerationStatus: 'partial',
        ErrorCode: 'INCOMPLETE',
        Artifacts,
      },
    ])
    expect(message.Status).toBe('partial')
    expect(message.Artifacts).toBe(Artifacts)
    expect(message.ErrorCode).toBe('INCOMPLETE')
  })
  it('取消与完成各自保留，未知状态不猜成功', () => {
    const rows = normalizeMessageResponse(
      ['cancelled', 'tool_completed', 'new_unknown_status'].map((GenerationStatus) => ({
        Id: GenerationStatus,
        Role: 'assistant',
        Content: '',
        GenerationStatus,
      })),
    )
    expect(rows.map((m) => m.Status)).toEqual(['stopped', 'completed', undefined])
  })
})
