/** 逐文件验收入口：校验清单、UTF-8/LF 与手写代码职责说明；--write 仅生成目录文档。 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format } from 'prettier'

const root = fileURLToPath(new URL('../', import.meta.url))
process.chdir(root)
const inventoryPath = 'docs/file-inventory.md'
const binaryExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ico',
  '.mp4',
  '.woff2',
])
const sourceExtensions = new Set(['.ts', '.vue', '.css', '.mjs', '.cs'])
const descriptions = {
  '.editorconfig': '跨编辑器缩进、编码和换行约定',
  '.gitattributes': 'Git 文本换行与二进制资源分类',
  '.gitignore': '排除依赖、构建和本地调试数据',
  '.prettierignore': '格式化的生成文件与法律文本边界',
  '.prettierrc.json': '前端与文档格式参数',
  '.env.example': '开发环境公开配置示例',
  '.env.production': '现有生产站点公开地址，不含服务凭据',
  'package.json': '依赖、运行要求与开发验收命令',
  'pnpm-lock.yaml': 'pnpm 生成的依赖解析锁定',
  'tsconfig.json': 'TypeScript 严格类型检查和模块解析约定',
  'CITATION.cff': '软件引用元数据与作者身份',
  LICENSE: 'MIT 许可法律正文，保持原样',
  'public/favicon.svg': '站点矢量图标',
  'deploy/Host/CrossCart.AI.Web.Host.csproj': '.NET 10 静态站点与代理宿主项目',
  [inventoryPath]: '版本控制文件逐路径目录与验收方式',
}

/** Git 同时列出已跟踪及未忽略的新文件，避免新增源码在首次提交前漏验。 */
function collectFiles() {
  const paths = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean)
    .filter((path) => existsSync(path))
  return [...new Set([...paths, inventoryPath])].sort()
}

/** 职责来自手写文件说明；自动目录不声称已完成业务或视觉验收。 */
function describe(path, content) {
  if (descriptions[path]) return descriptions[path]
  if (binaryExtensions.has(extname(path))) {
    return path.startsWith('docs/screenshots/')
      ? '项目文档截图：' + path.split('/').at(-1)
      : '公开展示素材：' + path.split('/').at(-1)
  }
  const firstLine = content.match(/(?:\/\*\*?|<!--|^\/\/|^#)\s*([^\n]+)/m)?.[1]
  return (firstLine || path.split('/').at(-1)).replace(/\*\/|-->/g, '').trim()
}

/** 不支持注释的结构化文件使用目录说明，不能为满足检查写入非法语法。 */
function verification(path) {
  if (binaryExtensions.has(extname(path))) return '资源保留；公开授权与视觉/播放人工验收'
  if (path === 'LICENSE') return '法律正文保留'
  if (path === 'pnpm-lock.yaml') return 'pnpm frozen-lockfile'
  if (/\.(cs|csproj)$/.test(path)) return '文件检查；dotnet format/build'
  if (sourceExtensions.has(extname(path)))
    return '文件检查；Prettier；ESLint/类型或 CSS 构建；对应测试'
  if (/\.conf$|Dockerfile|^\.env/.test(path)) return '文件检查；配置人工审查；部署环境验收'
  return '文件检查；支持的格式由 Prettier 校验'
}

const errors = []
const rows = []
for (const path of collectFiles()) {
  let content = ''
  if (path !== inventoryPath && !binaryExtensions.has(extname(path))) {
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path))
      if (path !== 'LICENSE') {
        if (content.includes('\r')) errors.push(`${path}: 必须使用 LF 换行`)
        if (!content.endsWith('\n')) errors.push(`${path}: 缺少文件末尾换行`)
        if (/[^\S\n]+$/m.test(content)) errors.push(`${path}: 存在行末空白`)
      }
      if (sourceExtensions.has(extname(path)) && !/(\/\*|\/\/|<!--)/.test(content.slice(0, 1200))) {
        errors.push(`${path}: 文件开头缺少职责说明`)
      }
    } catch (error) {
      errors.push(`${path}: 无法读取有效 UTF-8 (${error.message})`)
    }
  }
  rows.push(
    `| \`${path}\` | ${describe(path, content).replaceAll('|', '\\|')} | ${verification(path)} |`,
  )
}

const markdown = await format(
  [
    '# 文件目录与验收清单',
    '',
    '由 `node scripts/check-files.mjs --write` 生成。覆盖所有 Git 已跟踪及未忽略的新文件；排除依赖、构建与本地审查产物。职责取自手写文件说明，清单存在不等于业务验收完成。',
    '',
    `共 ${rows.length} 个文件。新增/删除文件或修改职责说明后重新生成；人工审查标准见 [代码规范](coding-standards.md)。`,
    '',
    '| 文件 | 职责 / 资源用途 | 验收方式 |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'),
  { parser: 'markdown', printWidth: 100 },
)

if (process.argv.includes('--write')) {
  writeFileSync(inventoryPath, markdown)
  console.log(`已生成 ${inventoryPath}（${rows.length} 个文件）。`)
} else if (!existsSync(inventoryPath) || readFileSync(inventoryPath, 'utf8') !== markdown) {
  errors.push('文件清单过期，请运行 node scripts/check-files.mjs --write')
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`逐文件检查通过：${rows.length} 个文件。注释准确性仍需人工评审。`)
}
