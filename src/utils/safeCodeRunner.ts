/**
 * 浏览器代码示例运行辅助：JSON 校验、iframe 预览及可终止 Worker。
 * Worker 中屏蔽常见网络 API 不是完整安全沙箱；部署 CSP 与 iframe sandbox
 * 必须由宿主配置，不能据此允许运行来源不明的代码或处理账号凭据。
 */
export type CodeRunResult = { ok: boolean; output: string }

const javascriptLanguages = new Set(['js', 'javascript', 'mjs', 'cjs'])
const previewLanguages = new Set(['html', 'css'])

/** 返回当前浏览器实现支持的示例语言；不代表代码已经通过安全审查。 */
export function isRunnableLanguage(language: string): boolean {
  const normalized = language.toLowerCase()
  return (
    javascriptLanguages.has(normalized) || previewLanguages.has(normalized) || normalized === 'json'
  )
}

/** 生成带限制性 CSP 的 HTML/CSS 预览；调用方必须放入独立 sandbox iframe。 */
export function buildSandboxPreview(language: string, code: string): string | null {
  const normalized = language.toLowerCase()
  if (!previewLanguages.has(normalized)) return null
  const content =
    normalized === 'css'
      ? `<main class="preview-root"><h1>样式预览</h1><p>这是隔离预览内容。</p><button>示例按钮</button></main><style>${code}</style>`
      : code
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none';"><style>body{font:14px system-ui;margin:16px;color:#1f2937}</style></head><body>${content}</body></html>`
}

/**
 * JSON 仅解析，HTML/CSS 由预览路径处理，JavaScript 在临时 Worker 中同步执行。
 * 超时或用户中止会终止 Worker；异步任务/模块加载不属于此示例运行器契约。
 */
export async function runCodeSafely(
  language: string,
  code: string,
  timeoutMs = 1800,
  signal?: AbortSignal,
): Promise<CodeRunResult> {
  const normalized = language.toLowerCase()
  if (normalized === 'json') {
    try {
      return { ok: true, output: JSON.stringify(JSON.parse(code), null, 2) }
    } catch (error) {
      return { ok: false, output: `JSON 解析失败：${(error as Error).message}` }
    }
  }
  if (previewLanguages.has(normalized)) return { ok: true, output: '隔离预览已更新。' }
  if (!javascriptLanguages.has(normalized)) {
    return { ok: false, output: '该语言仅支持编辑和复制，不允许在浏览器中运行。' }
  }
  if (typeof Worker === 'undefined') return { ok: false, output: '当前浏览器不支持隔离代码运行。' }

  const workerSource = `
    "use strict";
    const send = self.postMessage.bind(self);
    for (const key of ["fetch", "WebSocket", "EventSource", "XMLHttpRequest", "importScripts"])
      Object.defineProperty(self, key, { value: () => { throw new Error("网络和外部资源访问已禁用") }, configurable: false });
    const values = [];
    const format = value => typeof value === "string" ? value : (() => { try { return JSON.stringify(value) } catch { return String(value) } })();
    console.log = (...items) => values.push(items.map(format).join(" "));
    console.info = console.log; console.warn = console.log; console.error = console.log;
    try {
      const result = (() => { ${code}\n })();
      if (result !== undefined) values.push(format(result));
      send({ ok: true, output: values.join("\\n") || "运行完成（无输出）" });
    } catch (error) { send({ ok: false, output: String(error && error.message || error) }); }
  `
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))
  const worker = new Worker(url)
  return await new Promise((resolve) => {
    const finish = (result: CodeRunResult) => {
      worker.terminate()
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const timer = window.setTimeout(
      () => finish({ ok: false, output: '运行超过安全时限，已终止。' }),
      timeoutMs,
    )
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        finish({ ok: false, output: '运行已手动停止。' })
      },
      { once: true },
    )
    worker.onmessage = (event) => {
      window.clearTimeout(timer)
      finish(event.data as CodeRunResult)
    }
    worker.onerror = (event) => {
      window.clearTimeout(timer)
      finish({ ok: false, output: event.message || '代码运行失败。' })
    }
  })
}
