import { defineNuxtRouteMiddleware } from '#app'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  // If the route requires authentication, redirect to login if not authenticated
  // For now, we will assume all routes except index and public ones need auth, 
  // or we can just protect specific routes. The prompt says "Implement route protection via Nuxt middleware".
  
  // We can let specific routes opt-out with definePageMeta({ auth: false })
  const authRequired = to.meta.auth !== false

  if (authRequired && import.meta.client) {
    const auth = useAuth()
    await auth.initAuth()
    
    if (!auth.isAuthenticated.value) {
      // Need to initiate login, but let oidc-client-ts handle the redirect
      await auth.login()
      // Block navigation until auth is resolved
      return false
    }
  }
})
