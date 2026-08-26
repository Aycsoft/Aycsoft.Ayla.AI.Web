import { describe, expect, it } from 'vitest'
import { classifyOutput, isSuccessfulArtifact, parseMessageContent } from './messageContent'
import { buildSandboxPreview, isRunnableLanguage, runCodeSafely } from './safeCodeRunner'

describe('message output contracts', () => {
  it('preserves text around fenced code and labels the language', () => {
    expect(parseMessageContent('说明\n```js\nconsole.log(1)\n```\n完成')).toEqual([
      { type: 'text', content: '说明\n' },
      { type: 'code', language: 'js', content: 'console.log(1)' },
      { type: 'text', content: '完成' }
    ])
  })

  it('keeps an unfinished streaming fence in the dedicated code card path', () => {
    expect(parseMessageContent('### 实时回答\n```typescript\nconst value = 1')).toEqual([
      { type: 'text', content: '### 实时回答\n' },
      { type: 'code', language: 'typescript', content: 'const value = 1' }
    ])
  })

  it('classifies every supported output family', () => {
    expect(classifyOutput('', 'photo.webp')).toBe('image')
    expect(classifyOutput('artifact.video', 'clip.bin')).toBe('video')
    expect(classifyOutput('', 'voice.ogg')).toBe('audio')
    expect(classifyOutput('', 'task.py')).toBe('code')
    expect(classifyOutput('', 'report.docx')).toBe('file')
  })

  it('only promotes confirmed artifacts to real cases', () => {
    expect(isSuccessfulArtifact('succeeded')).toBe(true)
    expect(isSuccessfulArtifact('running')).toBe(false)
    expect(isSuccessfulArtifact('failed')).toBe(false)
  })

  it('runs JSON validation without executing arbitrary code', async () => {
    expect(isRunnableLanguage('javascript')).toBe(true)
    expect(isRunnableLanguage('html')).toBe(true)
    expect(isRunnableLanguage('css')).toBe(true)
    expect(isRunnableLanguage('python')).toBe(false)
    await expect(runCodeSafely('json', '{"ok":true}')).resolves.toEqual({ ok: true, output: '{\n  "ok": true\n}' })
    const preview = buildSandboxPreview('html', '<h1>safe</h1><script>document.body.dataset.ok="1"</script>')!
    expect(preview).toContain("default-src 'none'")
    expect(preview).toContain("connect-src 'none'")
    expect(buildSandboxPreview('python', 'print(1)')).toBeNull()
  })
})
