<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import type { LeaguePlayer, LeagueOfLegendsRank, LoLRankHistoryGranularity, LoLGameDto, LoLStatsPeriod } from '~/lib/types'
import LolPlayerHeader from '~/components/lol/LolPlayerHeader.vue'
import LolPlayerRanks from '~/components/lol/LolPlayerRanks.vue'
import PerformanceKpis from '~/components/lol/PerformanceKpis.vue'
import LpProgressionCard from '~/components/lol/LpProgressionCard.vue'
import ChampionsAside from '~/components/lol/ChampionsAside.vue'
import RolesAside from '~/components/lol/RolesAside.vue'
import DuosAside from '~/components/lol/DuosAside.vue'
import PlayerNotFound from '~/components/lol/PlayerNotFound.vue'
import LolGameCard from '~/components/lol/LolGameCard.vue'

type Period = '7j' | '30j' | 'saison'

function toApiPeriod(p: Period): LoLStatsPeriod {
  return p === '7j' ? 'Week' : p === '30j' ? 'Month' : 'AllTime'
}

const route = useRoute()
const gameOnApi = useGameOnLol()
const patchStore = usePatchStore()
const lolStore = useLolStore()

const playerId = route.params.id as string

// Player
const loading = ref(true)
const hasError = ref(false)
const player = ref<LeaguePlayer | null>(null)
const isRefreshing = ref(false)

// Performances / LP progression period (partagé entre le panneau KPI et le sparkline LP)
const period = ref<Period>('30j')

// Rank history (alimente uniquement le sparkline LP, données réelles)
const rankHistoryLoading = ref(false)
const rankHistory = ref<LeagueOfLegendsRank[]>([])

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
const selectedQueueIds = ref<number[]>([])

useSeoMeta({
  title: computed(() => player.value ? `${player.value.riotGamesNickname || player.value.nickname} · Profil` : 'Profil joueur'),
})

onMounted(async () => {
  await Promise.all([patchStore.loadPatches(), lolStore.fetchQueues()])
  await loadPlayer()
  if (player.value) {
    const pId = player.value.id.toString()
    await Promise.all([
      loadRankHistory(pId),
      loadQueueOptions(pId),
      loadGames(pId),
    ])
  }
})

// --- Player ---
async function loadPlayer() {
  loading.value = true
  hasError.value = false
  try {
    player.value = await gameOnApi.getPlayerById(playerId, toApiPeriod(period.value))
  } catch (e) {
    console.error(e)
    hasError.value = true
  } finally {
    loading.value = false
  }
}

async function retryLoadPlayer() {
  await loadPlayer()
  if (player.value) {
    const pId = player.value.id.toString()
    await Promise.all([
      loadRankHistory(pId),
      loadQueueOptions(pId),
      loadGames(pId),
    ])
  }
}

async function handleRefresh() {
  if (!player.value) return
  isRefreshing.value = true
  try {
    await gameOnApi.refreshPlayer(player.value.id)
    await loadPlayer()
    if (player.value) {
      const pId = player.value.id.toString()
      await Promise.all([loadRankHistory(pId), loadGames(pId)])
    }
  } catch (e) {
    console.error(e)
  } finally {
    isRefreshing.value = false
  }
}

// --- LP progression (réel, via l'historique de rangs) ---
const rankHistoryGranularity = computed<LoLRankHistoryGranularity>(() => (period.value === 'saison' ? 'Month' : 'Day'))
const rankHistoryDays = computed(() => (period.value === '7j' ? 7 : period.value === '30j' ? 30 : undefined))

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

async function onPeriodChange(next: Period) {
  period.value = next
  if (!player.value) return
  const pId = player.value.id.toString()
  loadRankHistory(pId)
  try {
    const updated = await gameOnApi.getPlayerById(pId, toApiPeriod(next))
    if (player.value) player.value.performanceStats = updated.performanceStats
  } catch (e) {
    console.error(e)
  }
}

const soloRankHistory = computed(() => rankHistory.value.filter((h) => h.queueType === 'RANKED_SOLO_5x5'))
const flexRankHistory = computed(() => rankHistory.value.filter((h) => h.queueType === 'RANKED_FLEX_SR'))

// --- Match history ---
async function loadQueueOptions(pId: string) {
  try {
    const data = await gameOnApi.getQueuesForPlayer(pId)
    queueOptions.value = data.map((q) => ({ id: q.id, label: q.description || q.map || `File ${q.id}` }))
  } catch (e) {
    console.error(e)
  }
}

async function loadGames(pId: string, append = false) {
  if (append) {
    loadingMoreGames.value = true
  } else {
    gameHistoryLoading.value = true
    currentPage.value = 1
  }
  try {
    const queueIds = selectedQueueIds.value.length > 0 ? selectedQueueIds.value : undefined
    const data = await gameOnApi.getLastGamesPlayedByPlayer(pId, currentPage.value, pageSize, false, queueIds)
    gamesPlayed.value = append ? [...gamesPlayed.value, ...data.results] : data.results
    totalItems.value = data.total
    totalPages.value = Math.max(1, Math.ceil(totalItems.value / (data.resultsPerPage || pageSize)))
  } catch (e) {
    console.error(e)
  } finally {
    gameHistoryLoading.value = false
    loadingMoreGames.value = false
  }
}

function loadMoreGames() {
  if (!player.value || currentPage.value >= totalPages.value) return
  currentPage.value++
  loadGames(player.value.id.toString(), true)
}

function toggleQueueFilter(id: number, checked: boolean) {
  if (checked) {
    if (!selectedQueueIds.value.includes(id)) selectedQueueIds.value.push(id)
  } else {
    selectedQueueIds.value = selectedQueueIds.value.filter((q) => q !== id)
  }
  if (player.value) loadGames(player.value.id.toString())
}

function clearQueueFilter() {
  selectedQueueIds.value = []
  queueFilterOpen.value = false
  if (player.value) loadGames(player.value.id.toString())
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
</script>

<template>
  <div class="w-full">
    <NuxtLink to="/" class="inline-flex items-center gap-2 mb-5 text-[13px] font-bold text-text-sec transition-colors hover:text-text-main">
      <Icon name="lucide:chevron-left" class="h-3.5 w-3.5" />
      Retour au ladder
    </NuxtLink>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="animate-pulse">
      <div class="rounded-2xl border border-border-base bg-surface-base p-6 flex items-center gap-5">
        <div class="w-22 h-22 rounded-full bg-surface-high shrink-0"/>
        <div class="flex-1 space-y-3">
          <div class="h-7 w-56 rounded-md bg-surface-high"/>
          <div class="h-4 w-40 rounded-md bg-surface-high"/>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <PlayerNotFound v-else-if="hasError || !player" @retry="retryLoadPlayer" />

    <!-- Content -->
    <template v-else>
      <div class="flex flex-col gap-4">
        <LolPlayerHeader
          :player="player"
          :current-lo-l-patch="patchStore.currentPatch"
          :is-refreshing="isRefreshing"
          @refresh="handleRefresh"
        />

        <LolPlayerRanks :player="player" />

        <PerformanceKpis :period="period" :stats="player.performanceStats" @update:period="onPeriodChange" />

        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Historique -->
          <div class="flex-1 min-w-0 flex flex-col gap-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
              <div>
                <h2 class="m-0 text-lg font-extrabold tracking-tight text-text-main">Historique</h2>
                <p class="m-0 mt-0.5 font-mono text-[11px] font-bold tracking-widest uppercase text-text-ter">{{ historyCountLabel }}</p>
              </div>

              <div class="relative inline-flex">
                <button
                  type="button"
                  class="h-8.5 flex items-center gap-1.5 pl-3.5 pr-3 rounded-full bg-surface-high border border-border-subtle text-text-main text-xs font-bold"
                  @click="queueFilterOpen = !queueFilterOpen"
                >
                  <span class="max-w-40 truncate">{{ queueFilterLabel }}</span>
                  <Icon name="lucide:chevron-down" class="h-3 w-3 shrink-0 text-text-ter" />
                </button>

                <div v-if="queueFilterOpen" class="absolute right-0 z-20 mt-10 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border-base bg-surface-base p-2 shadow-lg">
                  <label
                    v-for="q in queueOptions"
                    :key="q.id"
                    class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-high"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedQueueIds.includes(q.id)"
                      class="rounded border-border-subtle text-brand-gold"
                      @change="toggleQueueFilter(q.id, ($event.target as HTMLInputElement).checked)"
                    >
                    <span class="truncate text-text-main">{{ q.label }}</span>
                  </label>
                  <button
                    v-if="selectedQueueIds.length > 0"
                    type="button"
                    class="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold text-brand-gold hover:bg-surface-high"
                    @click="clearQueueFilter"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <div v-if="gameHistoryLoading" class="space-y-2 animate-pulse">
                <div v-for="i in 6" :key="i" class="h-22 w-full rounded-xl bg-surface-high"/>
              </div>
              <template v-else>
                <div v-if="gamesPlayed.length === 0" class="p-12 rounded-xl border border-dashed border-border-base text-center">
                  <p class="m-0 text-sm font-bold text-text-sec">Aucune partie ne correspond à ces filtres.</p>
                </div>
                <LolGameCard
                  v-for="g in gamesPlayed"
                  :key="g.matchId"
                  :game="g"
                  :player-id="player.id"
                  :show-summoner-name="false"
                />
              </template>
            </div>

            <button
              v-if="!gameHistoryLoading && currentPage < totalPages"
              :disabled="loadingMoreGames"
              class="w-full py-3 rounded-xl text-center bg-surface-base border border-border-base text-text-main font-bold text-[13px] transition-colors hover:border-border-accent hover:text-brand-gold disabled:opacity-60 disabled:cursor-wait"
              @click="loadMoreGames"
            >
              {{ loadingMoreGames ? 'Chargement…' : `Charger ${pageSize} parties de plus` }}
            </button>
          </div>

          <!-- Aside -->
          <aside class="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
            <LpProgressionCard
              :solo-entries="soloRankHistory"
              :flex-entries="flexRankHistory"
              :period="period"
              :loading="rankHistoryLoading"
            />
            <ChampionsAside :period="period" />
            <RolesAside />
            <DuosAside />
          </aside>
        </div>
      </div>
    </template>
  </div>
</template>
