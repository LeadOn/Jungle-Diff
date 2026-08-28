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

  // Durée pendant laquelle une donnée déjà chargée est réutilisée telle quelle. Sans elle, les
  // getters ci-dessous gardaient leur valeur pour toute la durée de la session SPA : revenir sur
  // l'accueil depuis une fiche joueur réaffichait les rangs du tout premier chargement, et seul
  // un F5 (qui recrée le store) les rafraîchissait.
  const FRESHNESS_MS = 60_000

  // Horodatages du dernier chargement réussi. Ils font partie de l'état retourné par le store :
  // @pinia/nuxt ne sérialise dans le payload SSR que ce qui est retourné, et sans eux le client
  // repartirait à 0 juste après l'hydratation et rejouerait chaque requête déjà faite côté serveur.
  const homeStatsFetchedAt = ref(0)
  const playersFetchedAt = ref(0)
  const lastMatchesFetchedAt = ref(0)

  const isFresh = (fetchedAt: number) => fetchedAt > 0 && Date.now() - fetchedAt < FRESHNESS_MS

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
    homeStatsFetchedAt.value = Date.now()
  }

  const setPlayers = (p: LeaguePlayer[]) => {
    players.value = p
    playersFetchedAt.value = Date.now()
  }

  const setLastMatches = (matches: LoLGameDto[]) => {
    lastMatches.value = matches
    lastMatchesFetchedAt.value = Date.now()
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
    if (homeStats.value && isFresh(homeStatsFetchedAt.value)) return homeStats.value

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
    if (players.value.length > 0 && isFresh(playersFetchedAt.value)) return players.value

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
    if (lastMatches.value.length > 0 && isFresh(lastMatchesFetchedAt.value)) return lastMatches.value

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
    homeStatsFetchedAt,
    playersFetchedAt,
    lastMatchesFetchedAt,
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
