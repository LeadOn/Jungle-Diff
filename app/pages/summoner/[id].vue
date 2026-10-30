<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter, useAsyncData } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { AppError, isAbortError } from '~/lib/types/error'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { roleIconUrl } from '~/utils/lol-role'
import { formatQueue } from '~/lib/utils/lol'
import { longDayLabel, parisDayKey } from '~/utils/date'
import { formatSigned } from '~/utils/number'
import { buildFeed } from '~/utils/lol-feed'
import type { FeedEntry } from '~/utils/lol-feed'
import type { LeagueOfLegendsRank, LoLRankChangeEntryDto, LoLRankHistoryGranularity, LoLGameDto, LoLStatsPeriod } from '~/lib/types'
import LolPlayerHeader from '~/components/lol/LolPlayerHeader.vue'
import LolPlayerRanks from '~/components/lol/LolPlayerRanks.vue'
import PerformanceKpis from '~/components/lol/PerformanceKpis.vue'
import LpProgressionCard from '~/components/lol/LpProgressionCard.vue'
import ChampionsAside from '~/components/lol/ChampionsAside.vue'
import RolesAside from '~/components/lol/RolesAside.vue'
import DuosAside from '~/components/lol/DuosAside.vue'
import PlayerNotFound from '~/components/lol/PlayerNotFound.vue'
import LolGameCard from '~/components/lol/LolGameCard.vue'
import LolLpBadge from '~/components/lol/LolLpBadge.vue'

type Period = '7j' | '30j' | 'all-time'

function toApiPeriod(p: Period): LoLStatsPeriod {
  return p === '7j' ? 'Week' : p === '30j' ? 'Month' : 'AllTime'
}

const route = useRoute()
const router = useRouter()
const gameOnApi = useGameOnLol()
const patchStore = usePatchStore()
const lolStore = useLolStore()

/**
 * The API only exposes `GET /lol/summoner/{id:int}`, so a non-numeric segment cannot designate any
 * player. Deciding that here yields a genuine 404 instead of a call doomed to fail.
 */
const playerId = route.params.id as string
const isValidPlayerId = /^\d+$/.test(playerId)

const isRefreshing = ref(false)
const isRetrying = ref(false)

/**
 * Secondary requests (ranks, queues, match history) are triggered by hand and must be cancelled
 * when the page is left or a filter changes, otherwise a late response overwrites the state of a
 * more recent one.
 */
let pageRequests = new AbortController()

const restartRequests = () => {
  pageRequests.abort()
  pageRequests = new AbortController()
  return pageRequests.signal
}

onBeforeUnmount(() => pageRequests.abort())

/**
 * Registered before the `await` below on purpose: in `<script setup>`, everything after a top-level
 * await runs without an active component instance, so a lifecycle hook declared there is silently
 * dropped. `loadSecondaryData` is a hoisted function declaration, so referencing it here is safe.
 */
onMounted(async () => {
  // Data Dragon versions are already loaded by `plugins/init.ts`; only the queues remain.
  await lolStore.fetchQueues()
  await loadSecondaryData()
})

// Performance / LP progression period (shared by the KPI panel, the LP sparkline and the per-game LP bars)
const initialPeriod = route.query.period as Period
const period = ref<Period>(['7j', '30j', 'all-time'].includes(initialPeriod) ? initialPeriod : '30j')

// Rank history (feeds the LP sparkline only, real data)
const rankHistoryLoading = ref(false)
const rankHistory = ref<LeagueOfLegendsRank[]>([])

// LP moved per ranked game (the bar chart under the sparkline), one list per queue
const RANK_CHANGES_LIMIT = 50
const rankChangesLoading = ref(false)
const soloRankChanges = ref<LoLRankChangeEntryDto[]>([])
const flexRankChanges = ref<LoLRankChangeEntryDto[]>([])

// Match history
const gameHistoryLoading = ref(false)
const loadingMoreGames = ref(false)
const gamesPlayed = ref<LoLGameDto[]>([])
const currentPage = ref(1)
const pageSize = 10
const totalItems = ref(0)
const totalPages = ref(1)

const queueOptions = ref<{ id: number, label: string }[]>([])
const queueFilterOpen = ref(false)
const initialQueues = route.query.queues ? String(route.query.queues).split(',').map(Number).filter(Boolean) : []
const selectedQueueIds = ref<number[]>(initialQueues)
const selectedRole = ref<string | null>(route.query.role as string || null)

function updateQueryParams() {
  const query = { ...route.query }
  
  if (period.value !== '30j') query.period = period.value
  else delete query.period

  if (selectedQueueIds.value.length > 0) query.queues = selectedQueueIds.value.join(',')
  else delete query.queues

  if (selectedRole.value) query.role = selectedRole.value
  else delete query.role

  router.replace({ query })
}

// --- Player ---
/**
 * The profile is loaded through `useAsyncData` instead of `onMounted`: the page used to be rendered
 * entirely client-side, so it was served empty to crawlers, and `useSeoMeta` described a player
 * still unknown at render time.
 */
const { data: player, status, error, refresh: reloadPlayer } = await useAsyncData(
  `summoner-${playerId}`,
  () => {
    if (!isValidPlayerId) throw new AppError('Invocateur introuvable', 404)

    const queueIds = selectedQueueIds.value.length > 0 ? selectedQueueIds.value : undefined
    const role = selectedRole.value || undefined

    return gameOnApi.getPlayerById(playerId, toApiPeriod(period.value), queueIds, role)
  }
)

/**
 * A non-existent player is a genuine 404, and the error has to be raised *here* rather than inside
 * the handler above: `useAsyncData` captures anything the handler throws into `error`, so a
 * `createError` raised in there never reaches Nuxt and the response stays 200 — exactly the
 * behaviour we set out to fix, where crawlers and monitoring probes read an error page as valid.
 *
 * Every other failure (silent API, 5xx) is transient and deliberately left in `error`, so the page
 * can offer a retry instead of disappearing.
 */
if (error.value?.statusCode === 404 || (!player.value && !error.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Invocateur introuvable', fatal: true })
}

const loading = computed(() => status.value === 'pending')
const hasError = computed(() => error.value != null)

/**
 * Declared after `player` on purpose: it reads `player.value`, and while it sat above the
 * `useAsyncData` call it hit the constant's temporal dead zone. The resulting ReferenceError left
 * unhead without a head entry, which then crashed on unmount and broke hydration for the page.
 */
useSeoMeta({
  title: () => (player.value ? `${player.value.riotGamesNickname || player.value.nickname} · Profil` : 'Profil joueur'),
  description: () => (player.value
    ? `Statistiques, rangs et historique de parties de ${player.value.riotGamesNickname || player.value.nickname} sur JungleDiff.`
    : 'Statistiques, rangs et historique de parties League of Legends sur JungleDiff.'),
})

/** Ranks, queues and history: secondary data, loaded after render and cancellable. */
async function loadSecondaryData() {
  if (!player.value) return
  const pId = player.value.id.toString()
  const signal = restartRequests()
  await Promise.all([
    loadCrew(signal),
    loadRankHistory(pId, signal),
    loadRankChanges(pId, signal),
    loadQueueOptions(pId, signal),
    loadGames(pId, false, signal)
  ])
}

/**
 * The crew list gives the hero its main-champion splash (`mainChampionName` is only served there) and
 * resolves a smurf's main account. Cached by the store for a minute, so arriving from `/` costs nothing.
 */
async function loadCrew(signal?: AbortSignal) {
  try {
    await lolStore.fetchPlayers(signal)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[summoner] Liste du crew indisponible:', e)
  }
}

async function retryLoadPlayer() {
  isRetrying.value = true
  try {
    await reloadPlayer()
    await loadSecondaryData()
  } finally {
    isRetrying.value = false
  }
}

async function handleRefresh() {
  if (!player.value) return
  isRefreshing.value = true
  try {
    await gameOnApi.refreshPlayer(player.value.id, pageRequests.signal)
    await reloadPlayer()
    await loadSecondaryData()
  } catch (e) {
    console.error('[summoner] Rafraîchissement du profil en échec:', e)
  } finally {
    isRefreshing.value = false
  }
}

// --- LP progression (real, derived from rank history) ---
const rankHistoryGranularity = computed<LoLRankHistoryGranularity>(() => (period.value === 'all-time' ? 'Month' : 'Day'))
const rankHistoryDays = computed(() => (period.value === '7j' ? 7 : period.value === '30j' ? 30 : undefined))

async function loadRankHistory(pId: string, signal?: AbortSignal) {
  rankHistoryLoading.value = true
  try {
    rankHistory.value = await gameOnApi.getRankHistory(pId, rankHistoryGranularity.value, rankHistoryDays.value, signal)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[summoner] Historique de rangs indisponible:', e)
  } finally {
    rankHistoryLoading.value = false
  }
}

/**
 * Both queues are fetched up front, like the rank history, so the card's Solo/Flex switch is
 * instant. They are separate calls rather than one `queue=All`: the limit applies to the merged
 * list, and a busy Solo queue would crowd the Flex games out of it.
 */
async function loadRankChanges(pId: string, signal?: AbortSignal) {
  rankChangesLoading.value = true
  try {
    const [solo, flex] = await Promise.all([
      gameOnApi.getRankChanges(pId, 'Solo', RANK_CHANGES_LIMIT, rankHistoryDays.value, signal),
      gameOnApi.getRankChanges(pId, 'Flex', RANK_CHANGES_LIMIT, rankHistoryDays.value, signal),
    ])
    // The API answers `204 No Content` rather than an empty list for a player it does not know.
    soloRankChanges.value = solo ?? []
    flexRankChanges.value = flex ?? []
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[summoner] Gains de LP par partie indisponibles:', e)
  } finally {
    // A superseded call must not clear the spinner of the call that replaced it.
    if (!signal?.aborted) rankChangesLoading.value = false
  }
}

async function refreshPerformanceStats() {
  if (!player.value) return
  const pId = player.value.id.toString()
  try {
    const queueIds = selectedQueueIds.value.length > 0 ? selectedQueueIds.value : undefined
    const role = selectedRole.value || undefined
    const updated = await gameOnApi.getPlayerById(pId, toApiPeriod(period.value), queueIds, role, pageRequests.signal)
    // `useAsyncData` defaults to `deep: false` (a shallowRef), so mutating a nested property like
    // `player.value.performanceStats` is invisible to Vue's reactivity — it silently applies and
    // only surfaces on some later, unrelated re-render. Reassigning `.value` is what a shallowRef
    // actually tracks.
    if (player.value) player.value = { ...player.value, performanceStats: updated.performanceStats }
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[summoner] Statistiques de performance indisponibles:', e)
  }
}

async function onPeriodChange(next: Period) {
  period.value = next
  updateQueryParams()
  if (!player.value) return
  const pId = player.value.id.toString()
  const signal = restartRequests()
  loadRankHistory(pId, signal)
  loadRankChanges(pId, signal)
  refreshPerformanceStats()
}

async function onRoleChange(role: string | null) {
  selectedRole.value = role
  updateQueryParams()
  if (!player.value) return
  const pId = player.value.id.toString()
  const signal = restartRequests()
  loadGames(pId, false, signal)
  refreshPerformanceStats()
}

const soloRankHistory = computed(() => rankHistory.value.filter((h) => h.queueType === 'RANKED_SOLO_5x5'))
const flexRankHistory = computed(() => rankHistory.value.filter((h) => h.queueType === 'RANKED_FLEX_SR'))

// --- Match history ---
async function loadQueueOptions(pId: string, signal?: AbortSignal) {
  try {
    const data = await gameOnApi.getQueuesForPlayer(pId, signal)
    // French labels first (`QUEUE_LABELS`), the API's own English description as the fallback.
    queueOptions.value = data.map((q) => ({ id: q.id, label: formatQueue(q.id, data) }))
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[summoner] Files de jeu du joueur indisponibles:', e)
  }
}

async function loadGames(pId: string, append = false, signal?: AbortSignal) {
  if (append) {
    loadingMoreGames.value = true
  } else {
    gameHistoryLoading.value = true
    currentPage.value = 1
  }
  try {
    const queueIds = selectedQueueIds.value.length > 0 ? selectedQueueIds.value : undefined
    const role = selectedRole.value || undefined
    const data = await gameOnApi.getLastGamesPlayedByPlayer(pId, currentPage.value, pageSize, false, queueIds, undefined, undefined, role, signal)
    gamesPlayed.value = append ? [...gamesPlayed.value, ...data.results] : data.results
    totalItems.value = data.total
    totalPages.value = Math.max(1, Math.ceil(totalItems.value / (data.resultsPerPage || pageSize)))
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[summoner] Historique de parties indisponible:', e)
  } finally {
    gameHistoryLoading.value = false
    loadingMoreGames.value = false
  }
}

function loadMoreGames() {
  if (!player.value || currentPage.value >= totalPages.value) return
  currentPage.value++
  loadGames(player.value.id.toString(), true, pageRequests.signal)
}

function toggleQueueFilter(id: number, checked: boolean) {
  if (checked) {
    if (!selectedQueueIds.value.includes(id)) selectedQueueIds.value.push(id)
  } else {
    selectedQueueIds.value = selectedQueueIds.value.filter((q) => q !== id)
  }
  updateQueryParams()
  if (player.value) {
    loadGames(player.value.id.toString(), false, restartRequests())
    refreshPerformanceStats()
  }
}

function clearQueueFilter() {
  selectedQueueIds.value = []
  queueFilterOpen.value = false
  updateQueryParams()
  if (player.value) {
    loadGames(player.value.id.toString(), false, restartRequests())
    refreshPerformanceStats()
  }
}

const queueFilterLabel = computed(() => {
  if (selectedQueueIds.value.length === 0) return 'Toutes les files'
  if (selectedQueueIds.value.length === 1) {
    const q = queueOptions.value.find((q) => q.id === selectedQueueIds.value[0])
    return q ? q.label : '1 file sélectionnée'
  }
  return `${selectedQueueIds.value.length} files sélectionnées`
})

const historyCountLabel = computed(() => {
  const shown = gamesPlayed.value.length
  return `${shown} partie${shown > 1 ? 's' : ''} affichée${shown > 1 ? 's' : ''} · ${totalItems.value} sur l'historique`
})

const ROLE_FILTERS: { value: string, label: string }[] = [
  { value: 'TOP', label: 'Top' },
  { value: 'JUNGLE', label: 'Jungle' },
  { value: 'MIDDLE', label: 'Milieu' },
  { value: 'BOTTOM', label: 'ADC' },
  { value: 'UTILITY', label: 'Support' },
]

/** "Support · Classée Solo/Duo": what the history filters also narrow in the performance panel. */
const filterSummary = computed(() => {
  const role = ROLE_FILTERS.find((r) => r.value === selectedRole.value)?.label ?? null
  const ids = selectedQueueIds.value
  const queues = ids.length === 1 && ids[0] != null
    ? (queueOptions.value.find((q) => q.id === ids[0])?.label ?? formatQueue(ids[0], lolStore.queues))
    : ids.length > 1 ? `${ids.length} files` : null
  return [role, queues].filter(Boolean).join(' · ') || null
})

// The day the page was rendered, in Paris: games are grouped on Paris days, like the dashboard.
const todayKey = parisDayKey(Date.now())

/**
 * The history as feed entries, the shape the home feed draws: every game is the profile's player's,
 * and the other crew members of the game become the card's "+N" chip.
 */
const historyEntries = computed(() => (player.value
  ? buildFeed(gamesPlayed.value, lolStore.players, { playerId: player.value.id, includeSmurfs: true })
  : []))

const groupedGames = computed(() => {
  const groups: { key: string, entries: FeedEntry[] }[] = []
  for (const entry of historyEntries.value) {
    const last = groups[groups.length - 1]
    if (last && last.key === entry.dayKey) last.entries.push(entry)
    else groups.push({ key: entry.dayKey, entries: [entry] })
  }

  return groups.map((group) => {
    const played = group.entries.filter((entry) => !entry.game.isRemake)
    const wins = played.filter((entry) => entry.participant.win).length
    const known = played.flatMap((entry) => (entry.participant.rankChange ? [entry.participant.rankChange.leaguePointsChange] : []))
    const lp = known.reduce((sum, value) => sum + value, 0)
    return {
      ...group,
      label: longDayLabel(group.key, todayKey),
      record: `${wins}V · ${played.length - wins}D`,
      // Only when at least one game of the day carries its LP: a sum over nothing is not a 0.
      lp: known.length > 0 ? `${formatSigned(lp)} LP` : null,
      lpValue: lp,
    }
  })
})
</script>

<template>
  <div class="w-full">
    <UiButton to="/" variant="secondary" size="sm" class="mb-4 pl-2">
      <Icon name="lucide:chevron-left" class="size-3.5" />
      Retour au ladder
    </UiButton>

    <!-- Loading skeleton -->
    <div v-if="loading" aria-busy="true" aria-label="Chargement du profil" class="flex flex-col gap-4">
      <div class="flex items-center gap-[22px] rounded-5 bg-sunken px-5 py-[22px] md:px-8 md:py-[30px]">
        <UiSkeleton circle class="size-[84px] shrink-0 md:size-28" />
        <span class="flex flex-1 flex-col gap-3">
          <UiSkeleton class="h-11 w-[min(320px,70%)]" />
          <UiSkeleton class="h-4 w-[min(200px,50%)]" />
        </span>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <UiSkeleton class="h-[196px] rounded-5" />
        <UiSkeleton class="h-[196px] rounded-5" />
      </div>
    </div>

    <!-- Error state -->
    <PlayerNotFound v-else-if="hasError || !player" :retrying="isRetrying" @retry="retryLoadPlayer" />

    <!-- Content -->
    <template v-else>
      <LolPlayerHeader
        :player="player"
        :current-lo-l-patch="patchStore.currentPatch"
        :is-refreshing="isRefreshing"
        @refresh="handleRefresh"
      />

      <LolPlayerRanks :player="player" class="mt-4" />

      <PerformanceKpis
        :period="period"
        :stats="player.performanceStats"
        :filter-summary="filterSummary"
        class="mt-9 md:mt-12"
        @update:period="onPeriodChange"
      />

      <div class="mt-9 grid items-start gap-9 md:mt-12 rail:grid-cols-[minmax(0,1fr)_340px]">
        <!-- Match history -->
        <section aria-labelledby="profile-history" class="@container min-w-0">
          <div class="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
            <div class="min-w-0">
              <h2 id="profile-history" class="type-d2 m-0">Historique</h2>
              <p class="type-small m-0 mt-1 text-ink-2">{{ gameHistoryLoading ? 'Chargement des parties…' : historyCountLabel }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <div role="group" aria-label="Filtrer par rôle" class="inline-flex gap-0.5 rounded-2 border border-line bg-neutral-soft p-0.5">
                <button
                  v-for="role in ROLE_FILTERS"
                  :key="role.value"
                  type="button"
                  :title="role.label"
                  :aria-label="role.label"
                  :aria-pressed="selectedRole === role.value"
                  class="flex h-7 w-8 cursor-pointer items-center justify-center rounded-1 transition-[background-color,box-shadow] duration-[120ms] ease-out"
                  :class="selectedRole === role.value
                    ? 'bg-surface shadow-[0_0_0_1px_var(--line-strong),var(--shadow-hair-value)]'
                    : 'bg-transparent hover:bg-surface/60'"
                  @click="onRoleChange(selectedRole === role.value ? null : role.value)"
                >
                  <img
                    :src="roleIconUrl(role.value)"
                    alt=""
                    class="size-4 brightness-0 transition-opacity duration-[120ms] dark:invert"
                    :class="selectedRole === role.value ? 'opacity-100' : 'opacity-45'"
                  >
                </button>
              </div>

              <div class="relative" @keydown.escape="queueFilterOpen = false">
                <button
                  type="button"
                  aria-haspopup="true"
                  :aria-expanded="queueFilterOpen"
                  class="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-2 border pr-2.5 pl-3 text-[0.8125rem] font-semibold transition-colors duration-[120ms] ease-out"
                  :class="selectedQueueIds.length > 0
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-surface text-ink hover:border-ink-3'"
                  @click="queueFilterOpen = !queueFilterOpen"
                >
                  <span class="max-w-[170px] truncate">{{ queueFilterLabel }}</span>
                  <Icon name="lucide:chevron-down" class="size-3.5 transition-transform duration-200 ease-out" :class="{ 'rotate-180': queueFilterOpen }" />
                </button>

                <template v-if="queueFilterOpen">
                  <div class="fixed inset-0 z-30" @click="queueFilterOpen = false" />
                  <div
                    role="menu"
                    aria-label="Files de jeu"
                    class="absolute top-[calc(100%+6px)] right-0 z-31 w-[264px] max-w-[calc(100vw-32px)] rounded-3 bg-raised p-1.5 shadow-float"
                  >
                    <p v-if="queueOptions.length === 0" class="type-small m-0 px-2.5 py-2 text-ink-2">Aucune file connue.</p>
                    <button
                      v-for="q in queueOptions"
                      :key="q.id"
                      type="button"
                      role="menuitemcheckbox"
                      :aria-checked="selectedQueueIds.includes(q.id)"
                      class="flex w-full cursor-pointer items-center gap-2.5 rounded-2 px-2.5 py-2 text-left text-[0.8125rem] font-semibold text-ink transition-colors duration-[120ms] ease-out hover:bg-neutral-soft"
                      @click="toggleQueueFilter(q.id, !selectedQueueIds.includes(q.id))"
                    >
                      <span
                        class="flex size-[18px] shrink-0 items-center justify-center rounded-1 border-[1.5px] text-paper transition-colors duration-[120ms] ease-out"
                        :class="selectedQueueIds.includes(q.id) ? 'border-ink bg-ink' : 'border-line-strong bg-surface'"
                      >
                        <Icon v-if="selectedQueueIds.includes(q.id)" name="lucide:check" class="size-[11px]" />
                      </span>
                      <span class="min-w-0 flex-1 truncate">{{ q.label }}</span>
                    </button>
                    <button
                      v-if="selectedQueueIds.length > 0"
                      type="button"
                      class="mt-1 block w-full cursor-pointer rounded-2 border-t border-line px-2.5 py-2 text-left text-[0.8125rem] font-semibold text-canopy transition-colors duration-[120ms] ease-out hover:bg-neutral-soft"
                      @click="clearQueueFilter"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div v-if="gameHistoryLoading" aria-busy="true" class="mt-6 flex flex-col gap-2.5">
            <UiSkeleton class="h-[18px] w-[140px]" />
            <UiSkeleton v-for="i in 5" :key="i" class="h-[84px] rounded-5" />
          </div>
          <template v-else>
            <UiEmptyState
              v-if="gamesPlayed.length === 0"
              class="mt-6"
              title="Aucune partie ne correspond à ces filtres."
            />

            <div v-for="group in groupedGames" :key="group.key">
              <div class="mt-[22px] mb-2 flex flex-wrap items-center gap-2.5">
                <b class="text-[15px] font-[660] text-ink">{{ group.label }}</b>
                <span class="h-px min-w-5 flex-1 bg-line" />
                <span class="font-mono text-[11.5px] text-ink-2">{{ group.record }}</span>
                <LolLpBadge v-if="group.lp" :value="group.lpValue">{{ group.lp }}</LolLpBadge>
              </div>
              <div class="grid gap-2.5">
                <LolGameCard v-for="entry in group.entries" :key="entry.key" :entry="entry" :show-player="false" />
              </div>
            </div>

            <UiButton
              v-if="currentPage < totalPages && gamesPlayed.length > 0"
              variant="secondary"
              size="lg"
              block
              :busy="loadingMoreGames"
              :disabled="loadingMoreGames"
              class="mt-4"
              @click="loadMoreGames"
            >
              {{ loadingMoreGames ? 'Chargement…' : `Charger ${pageSize} parties de plus` }}
            </UiButton>
          </template>
        </section>

        <!-- Rail: beside the history from 1100px, two columns under it on tablets -->
        <aside class="grid min-w-0 items-start gap-4 md:grid-cols-2 rail:grid-cols-1">
          <LpProgressionCard
            class="md:col-span-2 rail:col-span-1"
            :solo-entries="soloRankHistory"
            :flex-entries="flexRankHistory"
            :solo-changes="soloRankChanges"
            :flex-changes="flexRankChanges"
            :period="period"
            :loading="rankHistoryLoading"
            :changes-loading="rankChangesLoading"
          />
          <ChampionsAside :period="period" :stats="player.performanceStats" />
          <RolesAside :period="period" :stats="player.performanceStats" />
          <DuosAside :period="period" :stats="player.performanceStats" />
        </aside>
      </div>
    </template>
  </div>
</template>
