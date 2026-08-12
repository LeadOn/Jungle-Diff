<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import type { LeaguePlayer, LeagueOfLegendsRank, LoLRankHistoryGranularity, LoLQueue, LoLGameDto } from '~/lib/types'
import { gameDayKey, formatDayLabel } from '~/lib/utils/lol'

const route = useRoute()
const gameOnApi = useGameOnLol()
const store = useLolStore()
const patchStore = usePatchStore()

const playerId = route.params.id as string

const loading = ref(true)
const player = ref<LeaguePlayer | null>(null)
const rankPosition = ref<number | null>(null)

const rankHistoryLoading = ref(false)
const rankHistory = ref<LeagueOfLegendsRank[]>([])
const rankHistoryRange = ref<'sevenDays' | 'day' | 'week' | 'month'>('day')

const gameHistoryLoading = ref(false)
const gamesPlayed = ref<LoLGameDto[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const totalPages = ref(1)
const rankedOnly = ref(true)

const queueOptions = ref<LoLQueue[]>([])
const selectedQueueIds = ref<number[]>([])

const startDate = ref<string | null>(null)
const endDate = ref<string | null>(null)

const queueFilterOpen = ref(false)
const dateFilterOpen = ref(false)

const isRefreshing = ref(false)

// Fetch Initial Data
onMounted(async () => {
  await Promise.all([
    store.fetchQueues(),
    patchStore.loadPatches(),
    loadPlayer()
  ])
  
  if (player.value) {
    const pId = player.value.id.toString()
    await Promise.all([
      loadRankHistory(pId),
      loadQueueOptions(pId),
      loadGames(pId),
      loadRankPosition()
    ])
  }
})

// Player Loading
async function loadPlayer() {
  loading.value = true
  try {
    player.value = await gameOnApi.getPlayerById(playerId)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Rank Position (Basic implementation based on store data)
async function loadRankPosition() {
  if (!player.value?.leagueOfLegendsSoloRank) {
    rankPosition.value = null
    return
  }
  try {
    await store.fetchPlayers()
    const ranked = store.players
      .filter(p => p.leagueOfLegendsSoloRank != null)
      .sort((a, b) => (b.leagueOfLegendsSoloRank?.leaguePoints || 0) - (a.leagueOfLegendsSoloRank?.leaguePoints || 0))
    const index = ranked.findIndex(p => p.id === player.value!.id)
    rankPosition.value = index >= 0 ? index + 1 : null
  } catch (e) {
    console.error(e)
  }
}

// Rank History
const rankHistoryGranularity = computed<LoLRankHistoryGranularity>(() => {
  if (rankHistoryRange.value === 'sevenDays' || rankHistoryRange.value === 'day') return 'Day'
  if (rankHistoryRange.value === 'week') return 'Week'
  return 'Month'
})

const rankHistoryDays = computed(() => rankHistoryRange.value === 'sevenDays' ? 7 : undefined)

async function loadRankHistory(pId: string) {
  rankHistoryLoading.value = true
  try {
    rankHistory.value = await gameOnApi.getRankHistory(pId, rankHistoryGranularity.value, rankHistoryDays.value)
  } catch (e) {
    console.error(e)
  } finally {
    rankHistoryLoading.value = false
  }
}

function onRankHistoryRangeChange(event: Event) {
  rankHistoryRange.value = (event.target as HTMLSelectElement).value as any
  if (player.value) {
    loadRankHistory(player.value.id.toString())
  }
}

// Rank Winrates
const soloWins = computed(() => rankHistory.value.filter(h => h.queueType === 'RANKED_SOLO_5x5').pop()?.wins || 0)
const soloLosses = computed(() => rankHistory.value.filter(h => h.queueType === 'RANKED_SOLO_5x5').pop()?.losses || 0)
const soloWinRate = computed(() => {
  const total = soloWins.value + soloLosses.value
  return total > 0 ? (soloWins.value / total) * 100 : 0
})

const flexWins = computed(() => rankHistory.value.filter(h => h.queueType === 'RANKED_FLEX_SR').pop()?.wins || 0)
const flexLosses = computed(() => rankHistory.value.filter(h => h.queueType === 'RANKED_FLEX_SR').pop()?.losses || 0)
const flexWinRate = computed(() => {
  const total = flexWins.value + flexLosses.value
  return total > 0 ? (flexWins.value / total) * 100 : 0
})

// Match History
async function loadQueueOptions(pId: string) {
  try {
    queueOptions.value = await gameOnApi.getQueuesForPlayer(pId)
  } catch (e) {
    console.error(e)
  }
}

async function loadGames(pId: string) {
  gameHistoryLoading.value = true
  try {
    const startIso = startDate.value ? `${startDate.value}T00:00:00` : undefined
    const endIso = endDate.value ? `${endDate.value}T23:59:59` : undefined
    
    const data = await gameOnApi.getLastGamesPlayedByPlayer(
      pId,
      currentPage.value,
      pageSize.value,
      rankedOnly.value,
      selectedQueueIds.value,
      startIso,
      endIso
    )
    
    gamesPlayed.value = data.results
    totalItems.value = data.total
    pageSize.value = data.resultsPerPage || pageSize.value
    totalPages.value = Math.max(1, Math.ceil(totalItems.value / pageSize.value))
    
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
      await loadGames(pId)
    }
  } catch (e) {
    console.error(e)
  } finally {
    gameHistoryLoading.value = false
  }
}

const gameGroups = computed(() => {
  const groups: { key: string, label: string, games: LoLGameDto[] }[] = []
  for (const game of gamesPlayed.value) {
    const key = gameDayKey(game.gameStart)
    const lastGroup = groups[groups.length - 1]
    
    if (lastGroup && lastGroup.key === key) {
      lastGroup.games.push(game)
    } else {
      groups.push({ key, label: formatDayLabel(game.gameStart), games: [game] })
    }
  }
  return groups
})

// Filters
const dateFilterLabel = computed(() => {
  if (startDate.value && endDate.value) return `${formatDateLabel(startDate.value)} → ${formatDateLabel(endDate.value)}`
  if (startDate.value) return `Depuis le ${formatDateLabel(startDate.value)}`
  if (endDate.value) return `Jusqu'au ${formatDateLabel(endDate.value)}`
  return 'Toutes les dates'
})

function formatDateLabel(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function clearDateFilter() {
  startDate.value = null
  endDate.value = null
  currentPage.value = 1
  if (player.value) loadGames(player.value.id.toString())
  dateFilterOpen.value = false
}

const queueFilterLabel = computed(() => {
  if (selectedQueueIds.value.length === 0) return 'Toutes les files'
  if (selectedQueueIds.value.length === 1) {
    const q = queueOptions.value.find(q => q.id === selectedQueueIds.value[0])
    return q ? (q.description || `${q.map} #${q.id}`) : '1 file sélectionnée'
  }
  return `${selectedQueueIds.value.length} files sélectionnées`
})

function toggleQueue(id: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    selectedQueueIds.value.push(id)
  } else {
    selectedQueueIds.value = selectedQueueIds.value.filter(q => q !== id)
  }
  currentPage.value = 1
  if (player.value) loadGames(player.value.id.toString())
}

function clearQueueFilter() {
  selectedQueueIds.value = []
  currentPage.value = 1
  queueFilterOpen.value = false
  if (player.value) loadGames(player.value.id.toString())
}

// Pagination
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    if (player.value) loadGames(player.value.id.toString())
  }
}
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    if (player.value) loadGames(player.value.id.toString())
  }
}

// Refresh
async function handleRefresh() {
  if (!player.value) return
  isRefreshing.value = true
  try {
    await gameOnApi.refreshPlayer(player.value.id)
    await loadPlayer()
    if (player.value) {
      await Promise.all([
        loadRankHistory(player.value.id.toString()),
        loadGames(player.value.id.toString())
      ])
    }
  } catch (e) {
    console.error(e)
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl w-full">
    <section class="px-4 pt-4">
      <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-blue-500 dark:text-gray-300">
        <Icon name="lucide:chevron-left" class="h-4 w-4" />
        Classement League of Legends
      </NuxtLink>
    </section>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="px-4 mt-4 animate-pulse">
      <div class="border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm">
        <div class="flex items-center gap-4">
          <div class="h-16 w-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div class="space-y-2">
            <div class="h-6 w-52 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
            <div class="h-4 w-36 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="player">
      <!-- Header -->
      <section class="mt-4 px-4">
        <LolPlayerHeader 
          :player="player"
          :rank-position="rankPosition"
          :current-lo-l-patch="patchStore.availablePatches[0] || '14.22.1'"
          :is-refreshing="isRefreshing"
          @refresh="handleRefresh"
        />
      </section>

      <!-- Ranks -->
      <section class="mt-4 px-4">
        <LolPlayerRanks 
          :player="player"
          :solo-wins="soloWins"
          :solo-losses="soloLosses"
          :solo-win-rate="soloWinRate"
          :flex-wins="flexWins"
          :flex-losses="flexLosses"
          :flex-win-rate="flexWinRate"
        />
      </section>

      <!-- Rank History -->
      <section class="mt-6 px-4">
        <div class="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl border p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span class="text-gray-900 dark:text-white text-lg font-semibold">Historique des rangs</span>
            <div class="flex items-center gap-3">
              <span v-if="!rankHistoryLoading && rankHistory.length > 0" class="text-sm text-gray-500 dark:text-gray-300">
                {{ rankHistory.length }} points
              </span>
              <select
                class="border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white bg-gray-50/60 dark:bg-gray-800/60 rounded-lg border py-1 pr-7 pl-3 text-sm backdrop-blur-sm focus:ring-blue-500 focus:border-blue-500"
                v-model="rankHistoryRange"
                @change="onRankHistoryRangeChange"
                :disabled="rankHistoryLoading"
              >
                <option value="sevenDays">1 semaine</option>
                <option value="day">3 semaines</option>
                <option value="week">3 mois</option>
                <option value="month">1 an</option>
              </select>
            </div>
          </div>
          
          <div v-if="rankHistoryLoading" class="animate-pulse space-y-3">
            <div class="h-14 w-full bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div class="h-14 w-full bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div v-else-if="rankHistory.length === 0" class="text-gray-500 dark:text-gray-400 py-4 text-center text-sm">
            {{ player.riotGamesNickname }} n'a pas encore joué de partie classée.
          </div>
          <div v-else>
            <LolRankHistory :rank-history="rankHistory" :granularity="rankHistoryGranularity" />
          </div>
        </div>
      </section>

      <!-- Match History -->
      <section class="mt-6 px-4 pb-6">
        <!-- Controls -->
        <div class="border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 relative z-10 mb-3 flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-md backdrop-contrast-100 backdrop-saturate-100 backdrop-filter sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span class="text-gray-900 dark:text-white text-lg font-semibold">Historique de parties</span>
            <p v-if="!gameHistoryLoading" class="text-sm text-gray-500 dark:text-gray-300">
              Page {{ currentPage }} / {{ totalPages }} &middot; {{ totalItems }} partie(s)
            </p>
          </div>
          
          <div class="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <!-- Date Filter -->
            <div class="relative">
              <button
                @click="dateFilterOpen = !dateFilterOpen; queueFilterOpen = false"
                :disabled="gameHistoryLoading"
                class="border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white bg-gray-50/60 dark:bg-gray-800/60 flex items-center gap-1.5 rounded-lg border py-1 pl-3 pr-2 text-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="lucide:calendar" class="h-3.5 w-3.5 shrink-0" />
                <span class="max-w-44 truncate">{{ dateFilterLabel }}</span>
                <Icon name="lucide:chevron-down" class="h-3.5 w-3.5 shrink-0" />
              </button>
              
              <div v-if="dateFilterOpen" class="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 absolute left-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-lg sm:left-auto sm:right-0">
                <label class="block">
                  <span class="text-gray-900 dark:text-white mb-1 block text-xs font-medium">Du</span>
                  <input type="date" v-model="startDate" @change="currentPage = 1; loadGames(player!.id.toString())" class="w-full rounded-lg border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                </label>
                <label class="mt-3 block">
                  <span class="text-gray-900 dark:text-white mb-1 block text-xs font-medium">Au</span>
                  <input type="date" v-model="endDate" @change="currentPage = 1; loadGames(player!.id.toString())" class="w-full rounded-lg border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white" />
                </label>
                <button v-if="startDate || endDate" @click="clearDateFilter" class="text-blue-500 mt-3 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800">
                  Réinitialiser
                </button>
              </div>
            </div>

            <!-- Queue Filter -->
            <div class="relative" v-if="queueOptions.length > 0">
              <button
                @click="queueFilterOpen = !queueFilterOpen; dateFilterOpen = false"
                :disabled="gameHistoryLoading"
                class="border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white bg-gray-50/60 dark:bg-gray-800/60 flex items-center gap-1.5 rounded-lg border py-1 pl-3 pr-2 text-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span class="max-w-40 truncate">{{ queueFilterLabel }}</span>
                <Icon name="lucide:chevron-down" class="h-3.5 w-3.5 shrink-0" />
              </button>
              
              <div v-if="queueFilterOpen" class="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 absolute left-0 z-20 mt-2 max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border p-2 shadow-lg sm:left-auto sm:right-0">
                <label v-for="q in queueOptions" :key="q.id" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                  <input type="checkbox" :checked="selectedQueueIds.includes(q.id)" @change="toggleQueue(q.id, $event)" class="text-blue-500 rounded border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600" />
                  <span class="text-gray-900 dark:text-white truncate">{{ q.description || q.map }}</span>
                </label>
                <button v-if="selectedQueueIds.length > 0" @click="clearQueueFilter" class="text-blue-500 mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800">
                  Réinitialiser
                </button>
              </div>
            </div>

            <!-- Ranked Only -->
            <label class="flex cursor-pointer items-center gap-2">
              <input type="checkbox" v-model="rankedOnly" @change="currentPage = 1; loadGames(player!.id.toString())" :disabled="gameHistoryLoading" class="peer sr-only" />
              <div class="peer-checked:bg-green-500 relative h-5 w-9 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-4"></div>
              <span class="text-gray-900 dark:text-white text-sm font-medium">Classées</span>
            </label>
            
            <!-- Page Size -->
            <select v-model="pageSize" @change="currentPage = 1; loadGames(player!.id.toString())" :disabled="gameHistoryLoading" class="border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white bg-gray-50/60 dark:bg-gray-800/60 rounded-lg border py-1 pr-7 pl-3 text-sm backdrop-blur-sm">
              <option :value="5">5 / page</option>
              <option :value="10">10 / page</option>
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
            </select>
          </div>
        </div>

        <!-- Pagination top -->
        <div v-if="!gameHistoryLoading" class="border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-2 py-2 shadow-sm backdrop-blur-md backdrop-contrast-100 backdrop-saturate-100 backdrop-filter sm:px-4">
          <button @click="prevPage" :disabled="currentPage === 1" class="text-gray-900 dark:text-white flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
            <Icon name="lucide:chevron-left" class="h-4 w-4" /> Précédent
          </button>
          <button @click="nextPage" :disabled="currentPage >= totalPages" class="text-gray-900 dark:text-white flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
            Suivant <Icon name="lucide:chevron-right" class="h-4 w-4" />
          </button>
        </div>

        <div v-if="gameHistoryLoading" class="space-y-3 animate-pulse">
          <div v-for="i in 5" :key="i" class="h-24 w-full bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
        </div>

        <div v-else>
          <div v-if="gamesPlayed.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucune partie enregistrée.
          </div>
          <div v-else>
            <div v-for="group in gameGroups" :key="group.key">
              <div class="mb-2 mt-4 flex items-center gap-3 first:mt-0">
                <span class="text-gray-900 dark:text-white text-xs font-semibold uppercase tracking-wide">{{ group.label }}</span>
                <span class="bg-gray-200 dark:bg-gray-800 h-px flex-1"></span>
              </div>
              <div class="space-y-2">
                <LolGameCard 
                  v-for="game in group.games" 
                  :key="game.matchId" 
                  :game="game" 
                  :player-id="player.id"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
