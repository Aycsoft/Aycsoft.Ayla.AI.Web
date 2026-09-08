/** 认证会话唯一来源：区分企业 SSO 与外部邮箱账号，凭证由服务端管理。 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiApi } from '@/api/ai'
import { ApiError, redirectToLogin } from '@/api/http'
import type {
  ExternalAuthLoginRequest,
  ExternalAuthRegisterRequest,
  ExternalAuthResult,
  ExternalPasswordLoginRequest,
  WorkspaceSession,
} from '@/types/ai'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<WorkspaceSession>()
  const ready = ref(false)
  /** 复用已认证会话；401 表示匿名，网络及服务端异常继续交由路由处理。 */
  async function ensure() {
    if (ready.value && session.value) return true
    try {
      const current = await aiApi.session()
      session.value = current.Authenticated ? current : undefined
      ready.value = true
      return Boolean(session.value)
    } catch (error) {
      ready.value = true
      if (!(error instanceof ApiError && error.status === 401)) throw error
      return false
    }
  }
  /** 用一次性 SSO 授权码兑换会话，再读取服务端确认的身份。 */
  async function exchange(code: string) {
    const result = await aiApi.exchange(code)
    await refreshSession()
    return result
  }
  /** 显式回读身份，用于认证响应未直接携带已登录状态的接口。 */
  async function refreshSession() {
    const current = await aiApi.session()
    session.value = current.Authenticated ? current : undefined
    ready.value = true
    return current
  }
  /** 统一三种外部认证结果的会话落地，避免注册和登录产生不同缓存规则。 */
  async function acceptExternalSession(result: ExternalAuthResult) {
    if (result.Authenticated) {
      session.value = result
      ready.value = true
    } else await refreshSession()
    return result
  }
  /** 外部邮箱验证码登录；成功响应缺少会话时执行二次确认。 */
  async function loginExternal(data: ExternalAuthLoginRequest) {
    return acceptExternalSession(await aiApi.loginExternal(data))
  }
  /** 外部账号注册后采用相同的服务端会话确认规则。 */
  async function registerExternal(data: ExternalAuthRegisterRequest) {
    return acceptExternalSession(await aiApi.registerExternal(data))
  }
  /** 密码只提交给认证接口，不持久化到浏览器存储。 */
  async function loginExternalPassword(data: ExternalPasswordLoginRequest) {
    return acceptExternalSession(await aiApi.loginExternalPassword(data))
  }
  /** 按账号类型登出；完成后刷新页面以清除所有内存中的私人业务状态。 */
  async function logout() {
    if (session.value?.AccountType === 'external') await aiApi.logoutExternal()
    else await aiApi.logout()
    session.value = undefined
    ready.value = true
    window.location.hash = '#/chat'
    window.location.reload()
  }
  return {
    session,
    ready,
    ensure,
    exchange,
    refreshSession,
    loginExternal,
    loginExternalPassword,
    registerExternal,
    logout,
    login: redirectToLogin,
  }
})
