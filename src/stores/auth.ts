import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiApi } from '@/api/ai'
import { ApiError, redirectToLogin } from '@/api/http'
import type { ExternalAuthLoginRequest, ExternalAuthRegisterRequest, ExternalPasswordLoginRequest, WorkspaceSession } from '@/types/ai'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<WorkspaceSession>(); const ready = ref(false)
  async function ensure() {
    if (ready.value && session.value) return true
    try {
      const current = await aiApi.session()
      session.value = current.Authenticated ? current : undefined
      ready.value = true
      return Boolean(session.value)
    }
    catch (error) { ready.value = true; if (!(error instanceof ApiError && error.status === 401)) throw error; return false }
  }
  async function exchange(code: string) {
    const result = await aiApi.exchange(code)
    const current = await aiApi.session()
    session.value = current.Authenticated ? current : undefined
    ready.value = true
    return result
  }
  async function refreshSession() {
    const current = await aiApi.session()
    session.value = current.Authenticated ? current : undefined
    ready.value = true
    return current
  }
  async function loginExternal(data: ExternalAuthLoginRequest) {
    const result = await aiApi.loginExternal(data)
    if (result.Authenticated) { session.value = result; ready.value = true }
    else await refreshSession()
    return result
  }
  async function registerExternal(data: ExternalAuthRegisterRequest) {
    const result = await aiApi.registerExternal(data)
    if (result.Authenticated) { session.value = result; ready.value = true }
    else await refreshSession()
    return result
  }
  async function loginExternalPassword(data: ExternalPasswordLoginRequest) {
    const result = await aiApi.loginExternalPassword(data)
    if (result.Authenticated) { session.value = result; ready.value = true }
    else await refreshSession()
    return result
  }
  async function logout() {
    if (session.value?.AccountType === 'external') await aiApi.logoutExternal()
    else await aiApi.logout()
    session.value = undefined
    ready.value = true
    window.location.hash = '#/chat'
    window.location.reload()
  }
  return { session, ready, ensure, exchange, refreshSession, loginExternal, loginExternalPassword, registerExternal, logout, login: redirectToLogin }
})
