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

addCollection(lucideIcons)
createApp(App).use(createPinia()).use(router).mount('#app')
