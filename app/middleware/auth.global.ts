import { defineNuxtRouteMiddleware } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // By default, pages are public unless explicitly marked with definePageMeta({ auth: true })
  const authRequired = to.meta.auth === true

  if (import.meta.client) {
    const auth = useAuthStore()

    if (authRequired && !auth.isAuthenticated) {
      // Need to initiate login if the page is protected and user is not authenticated
      await auth.login()
      // Block navigation until auth is resolved
      return false
    }
  }
})
