/** 全部 Vue 页面与组件模板编译回归；类型检查不能替代事件表达式的真实模板编译。 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileTemplate, parse } from 'vue/compiler-sfc'

/** 递归发现新增子目录，防止组件拆分后脱离模板编译验收。 */
function collectVueFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    return entry.isDirectory() ? collectVueFiles(url) : entry.name.endsWith('.vue') ? [url] : []
  })
}
const files = collectVueFiles(new URL('./', import.meta.url))

describe('全部页面和组件模板能够实际编译', () => {
  it.each(files.map((url) => [fileURLToPath(url)]))('%s', (filename) => {
    const source = readFileSync(filename, 'utf8')
    const parsed = parse(source, { filename })
    expect(parsed.errors).toEqual([])
    expect(parsed.descriptor.template).not.toBeNull()
    const result = compileTemplate({
      source: parsed.descriptor.template!.content,
      filename,
      id: filename,
      compilerOptions: { expressionPlugins: ['typescript'] },
    })
    expect(result.errors).toEqual([])
  })
})
