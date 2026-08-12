import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LoLQueue, LoLHomeStatsDto, LeaguePlayer, LoLGameDto } from '~/lib/types'
import { useGameOnLol } from '~/composables/useGameOnLol'

export const useLolStore = defineStore('lol', () => {
  const version = ref<string>('')
  const versions = ref<string[]>([])
  const queues = ref<LoLQueue[]>([])
  const homeStats = ref<LoLHomeStatsDto | null>(null)
  const players = ref<LeaguePlayer[]>([])
  const lastMatches = ref<LoLGameDto[]>([])

  const setVersion = (v: string) => {
    version.value = v
  }

  const setVersions = (vs: string[]) => {
    versions.value = vs
  }

  const setQueues = (q: LoLQueue[]) => {
    queues.value = q
  }

  const setHomeStats = (stats: LoLHomeStatsDto) => {
    homeStats.value = stats
  }

  const setPlayers = (p: LeaguePlayer[]) => {
    players.value = p
  }

  const setLastMatches = (matches: LoLGameDto[]) => {
    lastMatches.value = matches
  }

  const fetchQueues = async () => {
    // Cache check
    if (queues.value.length > 0) return

    const gameOnApi = useGameOnLol()
    try {
      const data = await gameOnApi.getQueues()
      if (data) {
        setQueues(data)
      }
    } catch (e) {
      console.error('Failed to fetch queues', e)
    }
  }

  const fetchHomeStats = async () => {
    if (homeStats.value) return homeStats.value

    const gameOnApi = useGameOnLol()
    try {
      const data = await gameOnApi.getHomeStats()
      if (data) {
        setHomeStats(data)
        return data
      }
    } catch (e) {
      console.error('Failed to fetch home stats', e)
    }
    return null
  }

  const fetchPlayers = async () => {
    if (players.value.length > 0) return players.value

    const gameOnApi = useGameOnLol()
    try {
      const data = await gameOnApi.getLeaguePlayers()
      if (data) {
        setPlayers(data)
        return data
      }
    } catch (e) {
      console.error('Failed to fetch players', e)
    }
    return null
  }

  const fetchLastMatches = async () => {
    if (lastMatches.value.length > 0) return lastMatches.value

    const gameOnApi = useGameOnLol()
    try {
      const data = await gameOnApi.getLastMatches(1, 5)
      if (data && data.results) {
        setLastMatches(data.results)
        return data.results
      }
    } catch (e) {
      console.error('Failed to fetch last matches', e)
    }
    return null
  }

  return {
    version,
    versions,
    queues,
    homeStats,
    players,
    lastMatches,
    setVersion,
    setVersions,
    setQueues,
    setHomeStats,
    setPlayers,
    setLastMatches,
    fetchQueues,
    fetchHomeStats,
    fetchPlayers,
    fetchLastMatches
  }
})
