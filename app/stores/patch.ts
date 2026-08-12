import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePatchStore = defineStore('patch', () => {
  const availablePatches = ref<string[]>([])
  
  // Le patch courant est le plus récent (premier élément du tableau Riot)
  const currentPatch = computed(() => {
    return availablePatches.value[0] || '14.22.1' // Fallback d'urgence
  })

  const loadPatches = async () => {
    // Comportement idempotent pour éviter le double fetch Serveur / Client
    if (availablePatches.value.length > 0) return true

    try {
      const data = await $fetch<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
      if (data && data.length > 0) {
        availablePatches.value = data
        return true
      }
    } catch (error) {
      console.error('Failed to fetch LoL patches from Data Dragon:', error)
    }
    return false
  }

  return {
    availablePatches,
    currentPatch,
    loadPatches
  }
})
