import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LeaguePlayer } from '~/lib/types'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useAuthStore } from './auth'

export const usePlayerStore = defineStore('player', () => {
  const currentPlayer = ref<LeaguePlayer | null>(null)
  const loading = ref(false)
  
  const fetchCurrentPlayer = async (force = false) => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      currentPlayer.value = null
      return
    }
    
    // Don't refetch if we already have it, unless forced
    if (currentPlayer.value && !force) return
    
    loading.value = true
    try {
      const api = useGameOnLol()
      currentPlayer.value = await api.getCurrentPlayer()
    } catch (e) {
      console.error('[PlayerStore] Failed to fetch current player', e)
    } finally {
      loading.value = false
    }
  }

  const setCurrentPlayer = (player: LeaguePlayer) => {
    currentPlayer.value = player
  }
  
  return { 
    currentPlayer, 
    loading,
    fetchCurrentPlayer, 
    setCurrentPlayer 
  }
})
