import { defineNuxtPlugin } from '#app'
import { useLolStore } from '~/stores/lol'
import { useRiotLol } from '~/composables/useRiotLol'

export default defineNuxtPlugin(async (_nuxtApp) => {
  const store = useLolStore()
  const riot = useRiotLol()

  // During SSR or on initial client load, fetch versions
  if (!store.versions.length) {
    try {
      const versions = await riot.getVersions()
      if (versions && versions.length > 0 && versions[0]) {
        store.setVersions(versions)
        store.setVersion(versions[0])
      }
    } catch (e) {
      console.error('Failed to load initial LoL versions', e)
    }
  }
})
