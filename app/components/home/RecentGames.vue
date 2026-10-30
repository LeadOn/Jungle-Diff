<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAsyncData } from '#app'
import type { LoLActivePlayerDto, LoLGameDto, PlayerDto } from '~/lib/types'
import { RECENT_MATCHES_PAGE_SIZE, useLolStore } from '~/stores/lol'
import { usePlayerStore } from '~/stores/player'
import { usePatchStore } from '~/stores/patch'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { isAbortError } from '~/lib/types/error'
import { buildFeed, feedPlayers } from '~/utils/lol-feed'
import type { FeedEntry } from '~/utils/lol-feed'
import { playerDisplayName } from '~/utils/lol-ladder'
import { isSmurf } from '~/utils/lol-smurf'
import { getProfileIconUrl } from '~/utils/ddragon'
import { dayHeading, parisDayKey } from '~/utils/date'
import LolGameCard from '~/components/lol/LolGameCard.vue'

const props = withDefaults(defineProps<{
  /** Owned by the page, shared with the ladder. Forwarded to the API rather than applied here: it
   *  refills the page with older matches, which a client-side filter cannot do. */
  includeSmurfs?: boolean
  /** `weeklyActivity.activePlayers`: the chips and their counts (ranked games over 7 days). */
  activePlayers?: LoLActivePlayerDto[]
  /** `weeklyActivity.gamesThisWeek`, kept for compatibility. */
  rankedGames?: number | null
}>(), { includeSmurfs: false, activePlayers: () => [], rankedGames: null })

const store = useLolStore()
const playerStore = usePlayerStore()
const patchStore = usePatchStore()
const gameOnApi = useGameOnLol()
const pageSize = RECENT_MATCHES_PAGE_SIZE

const isMounted = ref(false)
const meId = computed(() => (isMounted.value ? playerStore.currentPlayer?.id ?? null : null))
onMounted(() => { isMounted.value = true })

const { status, error } = useAsyncData(
  'recentGames',
  () => store.fetchLastMatches(props.includeSmurfs),
  { getCachedData: cacheOnlyDuringHydration, watch: [() => props.includeSmurfs] }
)

// Pagination is aborted if the component goes away before the response arrives.
const pagination = new AbortController()
let playerRequest: AbortController | null = null
onBeforeUnmount(() => {
  pagination.abort()
  playerRequest?.abort()
})

// --- The whole crew: page 1 from the store, the next ones kept here ---

const crewPage = ref(1)
const crewExtra = ref<LoLGameDto[]>([])
const crewExhausted = ref(false)

// --- One player, picked from the chips ---

const selectedPlayerId = ref<number | null>(null)
const playerMatches = ref<LoLGameDto[]>([])
const playerPage = ref(1)
const playerExhausted = ref(false)
const playerLoading = ref(false)
const playerError = ref(false)

const loadingMore = ref(false)

const crewMatches = computed(() => [...(store.lastMatches || []), ...crewExtra.value])
const matches = computed(() => (selectedPlayerId.value === null ? crewMatches.value : playerMatches.value))

/**
 * Pages already loaded were fetched under the previous flag, so they have to go: keeping them would
 * leave smurf-only games stranded in the list after the toggle excluded them, and would make the
 * next `loadMore` resume from the wrong offset. A smurf picked in the chips goes with them.
 */
watch(() => props.includeSmurfs, (include) => {
  crewExtra.value = []
  crewPage.value = 1
  crewExhausted.value = false
  const selected = store.players.find(player => player.id === selectedPlayerId.value)
  if (!include && selected && isSmurf(selected)) selectPlayer(null)
})

const hasMore = computed(() => (selectedPlayerId.value === null
  ? !crewExhausted.value && (store.lastMatches?.length ?? 0) >= pageSize
  : !playerExhausted.value))

const fetchPlayerPage = (playerId: number, page: number, signal: AbortSignal) =>
  gameOnApi.getLastGamesPlayedByPlayer(playerId, page, pageSize, false, null, null, null, undefined, signal)

const isLastPage = (page: number, received: number, total: number, perPage: number) =>
  received < pageSize || page >= Math.ceil(total / (perPage || pageSize))

async function selectPlayer(playerId: number | null) {
  playerRequest?.abort()
  selectedPlayerId.value = playerId
  playerMatches.value = []
  playerPage.value = 1
  playerExhausted.value = false
  playerError.value = false
  if (playerId === null) return

  playerRequest = new AbortController()
  playerLoading.value = true
  try {
    const data = await fetchPlayerPage(playerId, 1, playerRequest.signal)
    const results = data?.results ?? []
    playerMatches.value = results
    playerExhausted.value = isLastPage(1, results.length, data?.total ?? 0, data?.resultsPerPage ?? pageSize)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[home] Parties du joueur indisponibles:', e)
    playerError.value = true
  } finally {
    playerLoading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true

  const playerId = selectedPlayerId.value
  try {
    if (playerId === null) {
      const page = crewPage.value + 1
      const data = await gameOnApi.getLastMatches(page, pageSize, props.includeSmurfs, pagination.signal)
      const results = data?.results ?? []
      crewExtra.value.push(...results)
      crewPage.value = page
      crewExhausted.value = isLastPage(page, results.length, data?.total ?? 0, data?.resultsPerPage ?? pageSize)
    } else {
      const page = playerPage.value + 1
      const data = await fetchPlayerPage(playerId, page, playerRequest?.signal ?? pagination.signal)
      // The chip may have changed while the page was loading.
      if (selectedPlayerId.value !== playerId) return
      const results = data?.results ?? []
      playerMatches.value.push(...results)
      playerPage.value = page
      playerExhausted.value = isLastPage(page, results.length, data?.total ?? 0, data?.resultsPerPage ?? pageSize)
    }
  } catch (e) {
    if (!isAbortError(e)) console.error('[home] Chargement de parties supplémentaires en échec:', e)
  } finally {
    loadingMore.value = false
  }
}

// --- View ---

const entries = computed(() => buildFeed(matches.value, store.players, {
  playerId: selectedPlayerId.value,
  includeSmurfs: props.includeSmurfs,
}))

const todayKey = parisDayKey(Date.now())

const days = computed(() => {
  const groups: { key: string, entries: FeedEntry[] }[] = []
  for (const entry of entries.value) {
    const last = groups[groups.length - 1]
    if (last && last.key === entry.dayKey) last.entries.push(entry)
    else groups.push({ key: entry.dayKey, entries: [entry] })
  }

  return groups.map((group) => {
    const wins = group.entries.filter(entry => !entry.game.isRemake && entry.participant.win).length
    const losses = group.entries.filter(entry => !entry.game.isRemake && !entry.participant.win).length
    const known = group.entries.flatMap(entry => (entry.participant.rankChange ? [entry.participant.rankChange.leaguePointsChange] : []))
    const lp = known.reduce((sum, value) => sum + value, 0)
    return {
      ...group,
      ...dayHeading(group.key, todayKey),
      record: `${wins} V · ${losses} D`,
      // Only when at least one game of the day carries its LP: a sum over nothing is not a 0.
      lp: known.length > 0 ? lp : null,
    }
  })
})

/**
 * The week's ranked players first, most active first, with their ranked games over 7 days; then
 * whoever else appears in the loaded feed (normals, ARAM…), without a count. Neither source follows
 * the selected chip, so the row stays put while one player is selected.
 */
const chips = computed(() => {
  const chip = (player: Pick<PlayerDto, 'id' | 'nickname' | 'riotGamesNickname' | 'lolIconId'>, count: number | null) => ({
    id: player.id as number | null,
    label: playerDisplayName(player),
    iconUrl: player.lolIconId != null ? getProfileIconUrl(player.lolIconId, patchStore.currentPatch) : null,
    count,
  })
  const active = props.activePlayers.map(entry => chip(entry.player, entry.games))
  const activeIds = new Set(active.map(entry => entry.id))
  const others = feedPlayers(crewMatches.value, store.players, props.includeSmurfs)
    .filter(player => !activeIds.has(player.id))
    .map(player => chip(player, null))

  return [
    { id: null, label: 'Tout le crew', iconUrl: null, count: null },
    ...[...active, ...others].slice(0, 10),
  ]
})

const subtitle = computed(() => {
  const selected = store.players.find(player => player.id === selectedPlayerId.value)
  return selected
    ? `Les parties de ${playerDisplayName(selected)}, toutes files confondues.`
    : 'Toutes files confondues. Le chiffre de chaque joueur compte ses parties classées sur 7 jours.'
})

const isPending = computed(() => (selectedPlayerId.value === null ? status.value === 'pending' : playerLoading.value))
const hasError = computed(() => (selectedPlayerId.value === null ? error.value != null : playerError.value))
</script>

<template>
  <section aria-labelledby="recent-games-title" class="games @container">
    <div class="mb-3.5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
      <div>
        <h2 id="recent-games-title" class="type-d2">Dernières parties</h2>
        <p class="mt-1 text-[13px] text-ink-2">{{ subtitle }}</p>
      </div>
    </div>

    <div role="group" aria-label="Filtrer par joueur" class="flex flex-wrap gap-1.5">
      <UiPlayerChip
        v-for="chip in chips"
        :key="chip.id ?? 'crew'"
        :label="chip.label"
        :avatar-url="chip.iconUrl"
        :count="chip.count"
        :pressed="selectedPlayerId === chip.id"
        :title="chip.count !== null ? `${chip.count} parties classées sur 7 jours` : undefined"
        @click="selectPlayer(chip.id)"
      />
    </div>

    <div v-if="isPending && entries.length === 0" class="mt-5 grid gap-2.5">
      <UiSkeleton class="h-20 rounded-5" />
      <UiSkeleton class="h-20 rounded-5" />
      <UiSkeleton class="h-20 rounded-5" />
    </div>
    <UiErrorState
      v-else-if="hasError"
      class="mt-5"
      title="Parties indisponibles"
      description="Erreur lors du chargement des parties récentes."
    />
    <UiEmptyState
      v-else-if="entries.length === 0"
      class="mt-5"
      title="Aucune partie trouvée."
    />

    <div v-for="day in days" :key="day.key">
      <div class="mb-2 mt-[22px] flex flex-wrap items-center gap-2.5">
        <b class="text-[15px] font-[660]">{{ day.label }}</b>
        <span class="type-mono text-ink-3">{{ day.date }}</span>
        <span class="h-px min-w-5 flex-1 bg-line" />
        <span class="font-mono text-[11.5px] text-ink-2">{{ day.record }}</span>
        <LolLpBadge v-if="day.lp !== null" :value="day.lp" />
      </div>
      <div class="grid gap-2.5">
        <LolGameCard
          v-for="entry in day.entries"
          :key="entry.key"
          :entry="entry"
          :is-me="meId !== null && entry.participant.playerId === meId"
        />
      </div>
    </div>

    <UiButton
      v-if="hasMore && entries.length > 0"
      variant="secondary"
      size="lg"
      block
      :busy="loadingMore"
      :disabled="loadingMore"
      class="mt-4"
      @click="loadMore"
    >
      {{ loadingMore ? 'Chargement…' : 'Voir plus de parties' }}
    </UiButton>
  </section>
</template>
