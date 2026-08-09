import { defineNuxtRouteMiddleware } from '#app'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  // By default, pages are public unless explicitly marked with definePageMeta({ auth: true })
  const authRequired = to.meta.auth === true

  if (import.meta.client) {
    const auth = useAuth()
    
    // Always initialize auth to restore session if available (so the navbar shows the user profile)
    await auth.initAuth()
    
    if (authRequired && !auth.isAuthenticated.value) {
      // Need to initiate login if the page is protected and user is not authenticated
      await auth.login()
      // Block navigation until auth is resolved
      return false
    }
  }
})
