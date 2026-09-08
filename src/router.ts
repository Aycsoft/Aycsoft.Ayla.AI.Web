/** 工作台路由及登录探测边界；访客可使用聊天，其余工作区需要会话。 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { routeAfterSessionProbeFailure } from './utils/navigation'

// 页面懒加载，公开登录/回调路由不发起会话探测，避免认证重定向循环。
const routes = [
  { path: '/', redirect: '/chat' },
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/auth/sso/callback',
    name: 'sso-callback',
    component: () => import('./views/SsoCallbackView.vue'),
    meta: { public: true },
  },
  { path: '/chat', name: 'chat', component: () => import('./views/ChatView.vue') },
  { path: '/knowledge', name: 'knowledge', component: () => import('./views/KnowledgeView.vue') },
  { path: '/skills', name: 'skills', component: () => import('./views/SkillsView.vue') },
  { path: '/notes', name: 'notes', component: () => import('./views/NotesView.vue') },
  { path: '/model-lab', name: 'model-lab', component: () => import('./views/ModelLabView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/chat' },
]

const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes })
// 探测失败与未登录分开处理；不能把网络故障误判为普通匿名身份。
router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const auth = useAuthStore()
  try {
    await auth.ensure()
  } catch {
    return routeAfterSessionProbeFailure(to.name)
  }
  if (to.name !== 'chat' && !auth.session) return { name: 'chat', query: { login: 'required' } }
})
export default router
