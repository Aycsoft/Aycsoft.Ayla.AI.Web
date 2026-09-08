/** 构建与开发服务：统一部署子路径、同源 API 代理和第三方依赖分包。 */
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:5088'
  const listenHost = env.VITE_HOST || '0.0.0.0'
  const appBase =
    `/${String(env.VITE_APP_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '') + '/'
  return {
    base: appBase,
    plugins: [vue(), UnoCSS()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: listenHost,
      port: Number(env.VITE_PORT || 5176),
      strictPort: true,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true, secure: false } },
    },
    preview: {
      host: listenHost,
      port: Number(env.VITE_PREVIEW_PORT || 4176),
      strictPort: true,
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-runtime': ['vue', 'vue-router', 'pinia'],
            'element-plus': ['element-plus'],
            'markdown-runtime': ['markdown-it', 'markdown-it-footnote', 'markdown-it-task-lists'],
          },
        },
      },
    },
  }
})
