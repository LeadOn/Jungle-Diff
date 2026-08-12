import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  console.log('[Plugin] auth.client.ts is executing')
  const auth = useAuthStore()
  await auth.initAuth()
  console.log('[Plugin] auth.client.ts finished')
})
