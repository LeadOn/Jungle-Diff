import { defineNuxtRouteMiddleware } from '#app'
import { useAuthStore } from '~/stores/auth'

/**
 * Pages are public by default; only those marked `definePageMeta({ auth: true })` require a session.
 *
 * The check is client-side only: server-rendering a protected page produces nothing but a shell
 * with no personal data, and the GameOn API remains the real authority on permissions anyway. This
 * guard is for navigation comfort, not security.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return
  if (to.meta.auth !== true) return

  const auth = useAuthStore()

  // A direct navigation to a protected page can run before the session is resolved; without this
  // wait we would bounce an already-signed-in user back to Keycloak.
  if (!auth.isInitialized) await auth.initAuth()

  if (!auth.isAuthenticated) {
    auth.login(to.fullPath)
    // Navigation cancelled: the redirect to Keycloak is already under way.
    return false
  }
})
