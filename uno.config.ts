/** 原子样式入口；使用统一预设，业务语义样式维护在 src/styles 下。 */
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({ presets: [presetUno()] })
