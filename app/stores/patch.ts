import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLolStore } from '~/stores/lol'

/**
 * "Patch" facade over the Data Dragon version list.
 *
 * This store used to keep its own copy of the versions and reload them itself, so every SSR render
 * fired two identical calls to Riot's CDN, one per store. There is now a single source of truth
 * (`useLolStore`) and this store is only a view over it.
 */
export const usePatchStore = defineStore('patch', () => {
  const lolStore = useLolStore()

  const availablePatches = computed(() => lolStore.versions)
  const currentPatch = computed(() => lolStore.currentVersion)

  const loadPatches = () => lolStore.loadVersions()

  return {
    availablePatches,
    currentPatch,
    loadPatches
  }
})
