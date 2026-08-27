import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { routeAfterSessionProbeFailure } from './utils/navigation'

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
  { path: '/auth/sso/callback', name: 'sso-callback', component: () => import('./views/SsoCallbackView.vue'), meta: { public: true } },
  { path: '/chat', name: 'chat', component: () => import('./views/ChatView.vue') },
  { path: '/knowledge', name: 'knowledge', component: () => import('./views/KnowledgeView.vue') },
  { path: '/skills', name: 'skills', component: () => import('./views/SkillsView.vue') },
  { path: '/notes', name: 'notes', component: () => import('./views/NotesView.vue') },
  { path: '/model-lab', name: 'model-lab', component: () => import('./views/ModelLabView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/chat' }
]

const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes })
router.beforeEach(async to => {
  if (to.meta.public) return true
  const auth = useAuthStore()
  try { await auth.ensure() }
  catch { return routeAfterSessionProbeFailure(to.name) }
  if (to.name !== 'chat' && !auth.session) return { name: 'chat', query: { login: 'required' } }
})
export default router
