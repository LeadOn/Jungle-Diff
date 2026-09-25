<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAsyncData } from '#app'
import type { LoLActivePlayerDto, LoLGameDto, PlayerDto } from '~/lib/types'
import { RECENT_MATCHES_PAGE_SIZE, useLolStore } from '~/stores/lol'
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
import { formatSigned } from '~/utils/number'
import LolGameCard from '~/components/lol/LolGameCard.vue'

const props = withDefaults(defineProps<{
  /** Owned by the page, shared with the ladder. Forwarded to the API rather than applied here: it
   *  refills the page with older matches, which a client-side filter cannot do. */
  includeSmurfs?: boolean
  /** `weeklyActivity.activePlayers`: the chips and their counts (ranked games over 7 days). */
  activePlayers?: LoLActivePlayerDto[]
  /** `weeklyActivity.gamesThisWeek`, the count on "Tout le crew". */
  rankedGames?: number | null
}>(), { includeSmurfs: false, activePlayers: () => [], rankedGames: null })

const store = useLolStore()
const patchStore = usePatchStore()
const gameOnApi = useGameOnLol()
const pageSize = RECENT_MATCHES_PAGE_SIZE

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
      record: `${wins}V · ${losses}D`,
      // Only when at least one game of the day carries its LP: a sum over nothing is not a 0.
      lp: known.length > 0 ? `${formatSigned(lp)} LP` : null,
      lpClass: lp > 0 ? 'bg-win-soft text-brand-green' : lp < 0 ? 'bg-loss-soft text-brand-red' : 'bg-surface-base text-text-main',
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
    { id: null, label: 'Tout le crew', iconUrl: null, count: props.rankedGames },
    ...[...active, ...others].slice(0, 10),
  ]
})

const subtitle = computed(() => {
  const selected = store.players.find(player => player.id === selectedPlayerId.value)
  return selected
    ? `Les parties de ${playerDisplayName(selected)}, toutes files confondues`
    : 'Tout le crew, toutes files confondues'
})

const isPending = computed(() => (selectedPlayerId.value === null ? status.value === 'pending' : playerLoading.value))
const hasError = computed(() => (selectedPlayerId.value === null ? error.value != null : playerError.value))
</script>

<template>
  <section aria-labelledby="recent-games-title" class="@container">
    <h2 id="recent-games-title" class="text-[32px] font-bold tracking-[-0.035em]">Dernières parties</h2>
    <p class="mt-1.5 text-sm font-semibold text-text-sec">{{ subtitle }}</p>

    <div role="group" aria-label="Filtrer par joueur" class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="chip in chips"
        :key="chip.id ?? 'crew'"
        type="button"
        :aria-pressed="selectedPlayerId === chip.id"
        class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border pr-[13px] text-[13px] font-bold transition-[background-color,color,translate] duration-[250ms] ease-spring hover:-translate-y-0.5"
        :class="[
          chip.iconUrl ? 'pl-[5px]' : 'pl-3.5',
          selectedPlayerId === chip.id ? 'border-inverse bg-inverse text-inverse-text' : 'border-border-base bg-surface-base text-text-main',
        ]"
        @click="selectPlayer(chip.id)"
      >
        <span v-if="chip.iconUrl" class="size-[26px] rounded-full bg-surface-sunken bg-cover bg-center" :style="{ backgroundImage: `url('${chip.iconUrl}')` }" />
        {{ chip.label }}
        <span v-if="chip.count !== null" class="font-mono text-[11px] font-medium opacity-65" title="Parties classées sur 7 jours">{{ chip.count }}</span>
      </button>
    </div>

    <div v-if="isPending && entries.length === 0" class="mt-6 flex items-center gap-2 text-sm font-bold text-text-sec">
      <Icon name="lucide:loader-circle" class="animate-spin" /> Chargement…
    </div>
    <p v-else-if="hasError" class="mt-6 text-sm font-bold text-brand-red">Erreur lors du chargement des parties récentes.</p>
    <p v-else-if="entries.length === 0" class="mt-6 text-sm font-bold text-text-sec">Aucune partie trouvée.</p>

    <div v-for="day in days" :key="day.key" class="mt-6">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-lg font-bold tracking-[-0.02em]">{{ day.label }}</span>
        <span class="text-[13px] font-semibold text-text-sec">{{ day.date }}</span>
        <span class="h-0 min-w-5 flex-1 border-t-[1.5px] border-dashed border-border-dashed" />
        <span class="rounded-full border border-border-base bg-surface-base px-2.5 py-[3px] text-xs font-bold">{{ day.record }}</span>
        <span v-if="day.lp" class="rounded-full px-2.5 py-[3px] font-mono text-[11.5px] font-semibold" :class="day.lpClass">{{ day.lp }}</span>
      </div>
      <div class="flex flex-col gap-2.5">
        <LolGameCard v-for="entry in day.entries" :key="entry.key" :entry="entry" />
      </div>
    </div>

    <button
      v-if="hasMore && entries.length > 0"
      type="button"
      :disabled="loadingMore"
      class="mt-5 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-full bg-inverse text-[15px] font-bold text-inverse-text transition-transform duration-[250ms] ease-spring hover:scale-[1.015] disabled:cursor-wait disabled:opacity-60"
      @click="loadMore"
    >
      {{ loadingMore ? 'Chargement…' : 'Voir plus de parties' }}
    </button>
  </section>
</template>
