import { ref, readonly } from 'vue'
import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { useRuntimeConfig } from '#app'

let userManager: UserManager | null = null

const isAuthenticated = ref(false)
const isInitialized = ref(false)
const user = ref<unknown>(null)

export const useAuth = () => {
  const config = useRuntimeConfig()
  
  if (!userManager && import.meta.client) {
    userManager = new UserManager({
      authority: config.public.keycloak.authority as string,
      client_id: config.public.keycloak.clientId as string,
      redirect_uri: window.location.origin,
      post_logout_redirect_uri: window.location.origin,
      response_type: 'code',
      scope: 'openid profile email offline_access',
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      automaticSilentRenew: true,
      filterProtocolClaims: true,
      loadUserInfo: true
    })

    userManager.events.addUserLoaded((loadedUser) => {
      user.value = loadedUser
      isAuthenticated.value = true
    })

    userManager.events.addUserUnloaded(() => {
      user.value = null
      isAuthenticated.value = false
    })
  }

  const initAuth = async () => {
    if (!userManager || !import.meta.client || isInitialized.value) return
    
    try {
      // Check if this is a callback from Keycloak
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        const loggedInUser = await userManager.signinCallback()
        user.value = loggedInUser
        isAuthenticated.value = true
        
        // Remove code from URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        const existingUser = await userManager.getUser()
        if (existingUser && !existingUser.expired) {
          user.value = existingUser
          isAuthenticated.value = true
        }
      }
    } catch (e) {
      console.error('Auth Init Error', e)
    } finally {
      isInitialized.value = true
    }
  }

  const login = async () => {
    if (userManager) {
      await userManager.signinRedirect()
    }
  }

  const logout = async () => {
    if (userManager) {
      await userManager.signoutRedirect()
    }
  }

  const getToken = async (): Promise<string | null> => {
    if (!userManager) return null
    const currentUser = await userManager.getUser()
    if (!currentUser) return null
    
    if (currentUser.expired) {
      try {
        const renewed = await userManager.signinSilent()
        return renewed?.access_token || null
      } catch (e) {
        console.error('Silent renew failed', e)
        return null
      }
    }
    
    return currentUser.access_token
  }

  return {
    isAuthenticated: readonly(isAuthenticated),
    isInitialized: readonly(isInitialized),
    user: readonly(user),
    initAuth,
    login,
    logout,
    getToken
  }
}
