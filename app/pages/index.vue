<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { refreshNuxtData, useAsyncData } from '#app'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { isSmurf } from '~/utils/lol-smurf'
import { dayRange, parisDayKey, timeAgo } from '~/utils/date'
import WeekBento from '~/components/home/WeekBento.vue'
import LiveStrip from '~/components/home/LiveStrip.vue'
import CrewLadder from '~/components/home/CrewLadder.vue'
import RecentGames from '~/components/home/RecentGames.vue'
import PlayerOfTheWeek from '~/components/home/PlayerOfTheWeek.vue'
import MonthRecords from '~/components/home/MonthRecords.vue'
import CrewChampions from '~/components/home/CrewChampions.vue'

const store = useLolStore()
const patchStore = usePatchStore()

/**
 * Owned by the page because it governs the whole dashboard, not just the ladder. Three different
 * mechanisms answer to it: `/lol/Home` re-queried with `includeSmurfs` (weekly tiles, player of the
 * week, crew records), the ladder filtered in place from the full roster, and the recent games
 * re-queried through `/lol/Match/last`, which refills its page.
 *
 * Defaults to excluding smurfs, like `/stats`.
 */
const includeSmurfs = ref(false)

// "Synchro il y a 4 min" depends on the reader's clock, and `/` is served from a shared SWR cache:
// the relative time only exists client side, refreshed every minute.
const now = ref<number | null>(null)
let clock: ReturnType<typeof setInterval> | undefined

// Lifecycle hooks go before the first top-level `await`, or they are silently dropped.
onMounted(() => {
  now.value = Date.now()
  clock = setInterval(() => { now.value = Date.now() }, 60_000)
  // Queue labels gate no blocking render, so they load off the critical path.
  store.fetchQueues()
})
onBeforeUnmount(() => clearInterval(clock))

// The handler replays on every return to the home page (see cacheOnlyDuringHydration); the store's
// freshness window is what decides whether the API actually needs to be called again.
const freshOnNavigation = { getCachedData: cacheOnlyDuringHydration }

// `watch` is what makes the toggle reach the dashboard: the key stays static because there is only
// ever one home page in flight, and the store's own guard is what prevents a stale answer being
// served for the other flag value. `getCachedData` returns nothing outside hydration, so the
// handler really does replay here.
const { error: homeStatsError } = await useAsyncData(
  'homeStats',
  () => store.fetchHomeStats(includeSmurfs.value),
  { ...freshOnNavigation, watch: [includeSmurfs] }
)
await useAsyncData('players', () => store.fetchPlayers(), freshOnNavigation)
// Server-side preload for `RecentGames`, which asks for the same window under its own key: the
// store's freshness guard makes the second call a cache hit. It takes the flag for the same reason
// the component does — without it the SSR pass would warm the store with the wrong filter.
await useAsyncData(
  'lastMatches',
  () => store.fetchLastMatches(includeSmurfs.value),
  { ...freshOnNavigation, watch: [includeSmurfs] }
)

useSeoMeta({
  title: 'Accueil',
  description: 'Retrouvez les statistiques, le classement et l\'historique récent du Crew JungleDiff.'
})

// The error surfaced by `useAsyncData` is authoritative. The check used to be `homeStats === null`,
// which could not tell "the API is down" apart from "the API answered, there is nothing to show".
const hasApiError = computed(() => homeStatsError.value != null)

// `/lol/Home` is asked for the last 7 days (`window=Last7Days`), and says which days it covered.
const periodLabel = computed(() => {
  const activity = store.homeStats?.weeklyActivity
  // An API without the window fields answered for the calendar week: no label beats a wrong one.
  if (!activity?.windowStart || !activity.windowEnd) return null
  return `7 derniers jours · ${dayRange(parisDayKey(activity.windowStart), parisDayKey(activity.windowEnd))}`
})

/** "16.19" out of Data Dragon's "16.19.1". */
const patchLabel = computed(() => patchStore.currentPatch.split('.').slice(0, 2).join('.'))

/** Accounts the dashboard counts under the smurf flag: the denominator of "joueurs actifs". */
const crewSize = computed(() => (includeSmurfs.value ? store.players.length : store.players.filter(player => !isSmurf(player)).length))

/** The most recent rank refresh across the crew: when the API last synchronised anyone. */
const lastSyncedAt = computed(() => store.players.reduce<string | null>(
  (latest, player) => (player.lolRefreshedOn && (!latest || player.lolRefreshedOn > latest) ? player.lolRefreshedOn : latest),
  null
))

const syncLabel = computed(() => (now.value !== null && lastSyncedAt.value ? `Synchro ${timeAgo(lastSyncedAt.value, now.value)}` : 'Synchro'))

const reloading = ref(false)

/** Re-reads the dashboard from the API. It does not ask the API to re-synchronise with Riot. */
const reload = async () => {
  if (reloading.value) return
  reloading.value = true
  store.invalidateDashboard()
  try {
    await refreshNuxtData(['homeStats', 'players', 'lastMatches'])
    now.value = Date.now()
  } finally {
    reloading.value = false
  }
}
</script>

<template>
  <div>
    <section aria-label="Les 7 derniers jours du crew">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          title="Recharger les données du crew"
          class="chip cursor-pointer bg-surface-base transition-colors duration-200 hover:border-border-accent"
          @click="reload"
        >
          <Icon name="lucide:refresh-cw" class="size-[13px] text-win" :class="reloading ? 'animate-spin' : ''" />
          {{ reloading ? 'Chargement…' : syncLabel }}
        </button>
        <span v-if="periodLabel" class="chip bg-brand-gold-soft">{{ periodLabel }}</span>
        <span class="chip bg-surface-base">EUW · Patch {{ patchLabel }}</span>
      </div>

      <template v-if="!hasApiError && store.homeStats">
        <WeekBento :activity="store.homeStats.weeklyActivity" :crew-size="crewSize" />
        <LiveStrip :include-smurfs="includeSmurfs" />
      </template>

      <div v-else class="flex flex-wrap items-center gap-5 rounded-[26px] border border-brand-red/30 bg-surface-base p-[26px] shadow-card">
        <img src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-20 object-contain grayscale-[0.4]">
        <div class="min-w-60 flex-1">
          <div class="text-[26px] font-bold tracking-[-0.03em]">Oups, l'API ne répond pas.</div>
          <p class="mt-1.5 text-pretty text-[14.5px] leading-normal text-text-sec">
            Impossible de récupérer les statistiques du crew et l'historique récent. Le serveur semble indisponible pour le moment.
          </p>
        </div>
        <button
          type="button"
          :disabled="reloading"
          class="inline-flex h-[46px] cursor-pointer items-center rounded-full bg-inverse px-[22px] text-[15px] font-bold text-inverse-text transition-transform duration-[250ms] ease-spring hover:scale-105 disabled:cursor-wait disabled:opacity-60"
          @click="reload"
        >
          {{ reloading ? 'Chargement…' : 'Réessayer' }}
        </button>
      </div>
    </section>

    <div v-if="!hasApiError" class="mt-9 grid items-start gap-9 md:mt-12 rail:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex min-w-0 flex-col gap-9 md:gap-12">
        <CrewLadder v-model:include-smurfs="includeSmurfs" :players="store.players" />
        <RecentGames
          :include-smurfs="includeSmurfs"
          :active-players="store.homeStats?.weeklyActivity.activePlayers ?? []"
          :ranked-games="store.homeStats?.weeklyActivity.gamesThisWeek ?? null"
        />
      </div>

      <aside class="min-w-0">
        <div class="grid items-start gap-7 md:max-rail:grid-cols-2">
          <PlayerOfTheWeek
            v-if="store.homeStats?.factOfTheWeek"
            :fact="store.homeStats.factOfTheWeek"
            :players="store.players"
            class="md:max-rail:col-span-2"
          />
          <MonthRecords v-if="store.homeStats" :records="store.homeStats.crewRecords" />
          <CrewChampions v-if="store.homeStats" :champions="store.homeStats.crewRecords.topChampions ?? []" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

.chip {
  @apply inline-flex h-[30px] items-center gap-[7px] rounded-full border border-border-base px-3 text-[12.5px] font-bold text-text-main;
}
</style>
