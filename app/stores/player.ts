import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LeaguePlayer } from '~/lib/types'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useAuthStore } from './auth'

export const usePlayerStore = defineStore('player', () => {
  const currentPlayer = ref<LeaguePlayer | null>(null)
  const loading = ref(false)

  const fetchCurrentPlayer = async (force = false, signal?: AbortSignal): Promise<void> => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      currentPlayer.value = null
      return
    }

    if (currentPlayer.value && !force) return

    loading.value = true
    try {
      currentPlayer.value = await useGameOnLol().getCurrentPlayer(signal)
    } catch (error) {
      // This call only feeds the header pill and the settings page: a failure must not break
      // navigation. The settings page renders its own error state.
      console.error('[player] Current player profile unavailable:', error)
      currentPlayer.value = null
    } finally {
      loading.value = false
    }
  }

  const setCurrentPlayer = (player: LeaguePlayer | null) => {
    currentPlayer.value = player
  }

  return {
    currentPlayer,
    loading,
    fetchCurrentPlayer,
    setCurrentPlayer
  }
})
