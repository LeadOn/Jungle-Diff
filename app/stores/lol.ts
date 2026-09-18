import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LoLQueue, LoLHomeStatsDto, LeaguePlayer, LoLGameDto } from '~/lib/types'
import { useGameOnLol } from '~/composables/useGameOnLol'

/**
 * How long an already-loaded value is reused as-is. Without it, values stayed frozen for the whole
 * SPA session: coming back to the home page from a player profile showed the ranks from the very
 * first load, and only a hard refresh updated them.
 */
const FRESHNESS_MS = 60_000

/** Fallback patch used when Riot's CDN is unreachable on the very first render. */
const FALLBACK_PATCH = '14.22.1'

export const useLolStore = defineStore('lol', () => {
  const versions = ref<string[]>([])
  const queues = ref<LoLQueue[]>([])
  const homeStats = ref<LoLHomeStatsDto | null>(null)
  const players = ref<LeaguePlayer[]>([])
  const lastMatches = ref<LoLGameDto[]>([])

  /**
   * Timestamps of the last successful load. They are part of the state the store returns:
   * `@pinia/nuxt` only serializes what is returned into the SSR payload, and without them the
   * client would restart from 0 right after hydration and replay every request already made
   * server-side.
   */
  const homeStatsFetchedAt = ref(0)
  const playersFetchedAt = ref(0)
  const lastMatchesFetchedAt = ref(0)

  /**
   * The `includeSmurfs` value `homeStats` was loaded with.
   *
   * `isFresh` only looks at the clock, so without this the freshness window would answer a toggle
   * flip with the previous answer for up to a minute — the cache would silently ignore the very
   * argument that changed. Returned with the rest of the state so the client agrees with the SSR
   * payload instead of re-fetching right after hydration.
   */
  const homeStatsIncludeSmurfs = ref<boolean | null>(null)

  /** Same guard as `homeStatsIncludeSmurfs`, for the last-matches window. */
  const lastMatchesIncludeSmurfs = ref<boolean | null>(null)

  const isFresh = (fetchedAt: number) => fetchedAt > 0 && Date.now() - fetchedAt < FRESHNESS_MS

  /** Current Data Dragon version: the most recent one Riot returns. */
  const currentVersion = computed(() => versions.value[0] || FALLBACK_PATCH)

  /**
   * Data Dragon versions, served by `/api/ddragon/versions` which caches them server-side.
   * Failures are not propagated: a Riot CDN outage should only degrade icons, not stop the page
   * from rendering — `currentVersion` then falls back to `FALLBACK_PATCH`.
   */
  const loadVersions = async (signal?: AbortSignal): Promise<void> => {
    if (versions.value.length > 0) return

    try {
      const data = await $fetch<string[]>('/api/ddragon/versions', { signal })
      if (Array.isArray(data) && data.length > 0) versions.value = data
    } catch (error) {
      console.error('[lol] Data Dragon versions unavailable, falling back to the default patch:', error)
    }
  }

  /**
   * Queues only serve to turn a `queueId` into a label. A failure degrades the display without
   * breaking it, so the error is not propagated.
   */
  const fetchQueues = async (signal?: AbortSignal): Promise<void> => {
    if (queues.value.length > 0) return

    try {
      queues.value = await useGameOnLol().getQueues(signal)
    } catch (error) {
      console.error('[lol] Failed to load game queues:', error)
    }
  }

  /**
   * The three loaders below **propagate** their errors.
   *
   * They used to swallow them and return `null`, which made failures invisible: `useAsyncData` saw
   * no error at all and the UI rendered zeros as though they were real statistics.
   */
  const fetchHomeStats = async (includeSmurfs: boolean, signal?: AbortSignal): Promise<LoLHomeStatsDto> => {
    // Both halves matter: the value must be fresh *and* have been loaded with the flag being asked
    // for, or toggling smurfs on and off inside the window would be a no-op.
    if (homeStats.value && homeStatsIncludeSmurfs.value === includeSmurfs && isFresh(homeStatsFetchedAt.value)) {
      return homeStats.value
    }

    const data = await useGameOnLol().getHomeStats(includeSmurfs, signal)
    homeStats.value = data
    homeStatsFetchedAt.value = Date.now()
    homeStatsIncludeSmurfs.value = includeSmurfs
    return data
  }

  const fetchPlayers = async (signal?: AbortSignal): Promise<LeaguePlayer[]> => {
    if (players.value.length > 0 && isFresh(playersFetchedAt.value)) return players.value

    const data = await useGameOnLol().getLeaguePlayers(false, signal)
    players.value = data
    playersFetchedAt.value = Date.now()
    return data
  }

  const fetchLastMatches = async (includeSmurfs: boolean, signal?: AbortSignal): Promise<LoLGameDto[]> => {
    if (lastMatches.value.length > 0 && lastMatchesIncludeSmurfs.value === includeSmurfs && isFresh(lastMatchesFetchedAt.value)) {
      return lastMatches.value
    }

    const data = await useGameOnLol().getLastMatches(1, 5, includeSmurfs, signal)
    const results = data?.results ?? []
    lastMatches.value = results
    lastMatchesFetchedAt.value = Date.now()
    lastMatchesIncludeSmurfs.value = includeSmurfs
    return results
  }

  return {
    versions,
    currentVersion,
    queues,
    homeStats,
    players,
    lastMatches,
    homeStatsFetchedAt,
    homeStatsIncludeSmurfs,
    playersFetchedAt,
    lastMatchesFetchedAt,
    lastMatchesIncludeSmurfs,
    loadVersions,
    fetchQueues,
    fetchHomeStats,
    fetchPlayers,
    fetchLastMatches
  }
})
