/** 应用启动入口：加载基础样式与图标，在挂载前按依赖顺序注册状态和路由。 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import { icons as lucideIcons } from '@iconify-json/lucide'
import 'element-plus/theme-chalk/base.css'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import './styles.css'
import App from './App.vue'
import router from './router'

// 打包图标集合，避免离线或受限网络下逐个请求第三方图标服务。
addCollection(lucideIcons)
createApp(App).use(createPinia()).use(router).mount('#app')
