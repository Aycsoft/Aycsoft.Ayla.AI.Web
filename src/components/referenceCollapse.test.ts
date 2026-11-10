import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import * as Vue from 'vue'
import { compileTemplate } from 'vue/compiler-sfc'

// 编译真实组件的details入口，以无浏览器渲染器模拟用户展开后重新生成，验证DOM身份重建。
test.each(
  [
    ['Web', new URL('./MessageList.vue', import.meta.url)],
    [
      'Portal',
      new URL(
        '../../../CrossCart.Portal/src/components/AIAssistant/ChatPanel.vue',
        import.meta.url,
      ),
    ],
  ].filter(([, path]) => existsSync(path!)),
)('%s参考资料在重生成时重新折叠，同轮更新不强制收起用户展开', async (_, path) => {
  const source = readFileSync(path, 'utf8')
  const tag = source
    .match(/<details\b[^>]*:key=[^>]+>/g)
    ?.find((value) => value.includes('message.'))
  expect(tag).toBeTruthy()
  const compiled = compileTemplate({
    source: `${tag}<summary>来源</summary></details>`,
    filename: 'references.vue',
    id: 'test',
    compilerOptions: { mode: 'function' },
  })
  expect(compiled.errors).toEqual([])
  const render = new Function('Vue', compiled.code)(Vue)
  type Node = { type: string; children: Node[]; parent?: Node; open?: boolean }
  const root: Node = { type: 'root', children: [] }
  const renderer = Vue.createRenderer<Node, Node>({
    createElement: (type) => ({ type, children: [] }),
    createText: (text) => ({ type: text, children: [] }),
    createComment: (text) => ({ type: text, children: [] }),
    insert(node, parent) {
      parent.children.push(node)
      node.parent = parent
    },
    remove(node) {
      if (node.parent) node.parent.children = node.parent.children.filter((n) => n !== node)
    },
    patchProp(node, key, _old, value) {
      if (key === 'open') node.open = !!value
    },
    setText() {},
    setElementText() {},
    parentNode: (node) => node.parent!,
    nextSibling: () => null,
  })
  const message = Vue.reactive({ Id: 'a1', Status: 'completed' })
  const regenerating = Vue.ref(false)
  const app = renderer.createApp({
    setup: () => ({
      message,
      item: { message },
      getReferenceCount: () => 1,
      isMessageRegenerating: () => regenerating.value,
    }),
    render,
  })
  app.mount(root)
  const first = root.children[0]!
  expect(first.open).not.toBe(true)
  first.open = true
  await Vue.nextTick()
  expect(root.children[0]!.open).toBe(true)
  regenerating.value = true
  message.Status = 'streaming'
  await Vue.nextTick()
  expect(root.children[0]).not.toBe(first)
  expect(root.children[0]!.open).not.toBe(true)
  app.unmount()
})
