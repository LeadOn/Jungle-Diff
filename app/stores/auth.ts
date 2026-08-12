import { defineStore } from 'pinia'
import { ref } from 'vue'
import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { useRuntimeConfig } from '#app'

let userManager: UserManager | null = null

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  
  const isAuthenticated = ref(false)
  const isInitialized = ref(false)
  const user = ref<unknown>(null)
  
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
      let callbackSuccess = false
      const router = useRouter()
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        try {
          const loggedInUser = await userManager.signinCallback()
          user.value = loggedInUser
          isAuthenticated.value = true
          callbackSuccess = true
          
          // Use Vue Router to safely remove query params
          if (router) {
            router.replace({ query: {} })
          } else {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (err) {
          console.warn('[Auth] signinCallback failed (already consumed?). Falling back...', err)
        }
      }
      
      if (!callbackSuccess) {
        console.log('[Auth] Checking existing user in storage...')
        const existingUser = await userManager.getUser()
        console.log('[Auth] Existing user:', existingUser ? `Found (expired: ${existingUser.expired})` : 'Not found')
        
        if (existingUser) {
          if (!existingUser.expired) {
            user.value = existingUser
            isAuthenticated.value = true
            console.log('[Auth] User loaded successfully')
          } else {
            console.log('[Auth] User expired, attempting silent renew...')
            try {
              const renewed = await userManager.signinSilent()
              user.value = renewed
              isAuthenticated.value = true
              console.log('[Auth] Silent renew successful')
            } catch (e) {
              console.error('[Auth] Silent renew failed', e)
              await userManager.removeUser()
            }
          }
        }
      }
    } catch (e) {
      console.error('[Auth] Init Error:', e)
    } finally {
      isInitialized.value = true
      console.log('[Auth] Initialization complete. isAuthenticated:', isAuthenticated.value)
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
    isAuthenticated,
    isInitialized,
    user,
    initAuth,
    login,
    logout,
    getToken
  }
})
