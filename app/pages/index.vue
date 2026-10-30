<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { refreshNuxtData, useAsyncData } from '#app'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { isSmurf } from '~/utils/lol-smurf'
import { playerDisplayName } from '~/utils/lol-ladder'
import { dayRange, parisDayKey, timeAgo } from '~/utils/date'
import { formatSigned } from '~/utils/number'
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
 * mechanisms answer to it: `/lol/Home` re-queried with `includeSmurfs` (weekly ledger, player of the
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
  return `${dayRange(parisDayKey(activity.windowStart), parisDayKey(activity.windowEnd))} · 7 jours`
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

const activity = computed(() => store.homeStats?.weeklyActivity ?? null)
const factOfTheWeek = computed(() => store.homeStats?.factOfTheWeek ?? null)
const netLp = computed(() => activity.value?.netLpChangeThisWeek ?? 0)

const headlineParts = computed(() => {
  if (!activity.value) return { kind: 'fallback' as const }
  if (activity.value.gamesThisWeek === 0) return { kind: 'none' as const }
  if (netLp.value === 0) return { kind: 'even' as const }
  const lost = netLp.value < 0
  return {
    kind: 'delta' as const,
    verb: lost ? 'lâché' : 'pris',
    lp: Math.abs(netLp.value),
    toneClass: lost ? 'text-loss-ink' : 'text-win-ink',
  }
})

const standfirstParts = computed(() => {
  if (!activity.value) return null
  const games = activity.value.gamesThisWeek
  const wr = Math.round(activity.value.winRateThisWeek)
  const activeCount = activity.value.activePlayers?.length ?? 0
  const summary = `${games} partie${games > 1 ? 's' : ''} classée${games > 1 ? 's' : ''} à ${wr}\u00A0% de victoires, par ${activeCount} joueur${activeCount > 1 ? 's' : ''} sur ${crewSize.value}.`
  const hero = factOfTheWeek.value
    ? {
        name: playerDisplayName(factOfTheWeek.value.player),
        verb: netLp.value < 0 ? 'sauve l\'honneur' : 'mène la remontée',
        lp: `${formatSigned(factOfTheWeek.value.lpChange)}\u00A0LP`,
      }
    : null
  return { summary, hero }
})

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
  <div class="grid gap-10 md:gap-12">
    <section class="grid gap-5" aria-labelledby="home-headline">
      <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 font-mono text-xs font-medium tabular-nums text-ink-3">
        <button
          type="button"
          title="Relire les données du crew"
          :aria-busy="reloading"
          class="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-ink-2 transition-colors hover:text-ink"
          @click="reload"
        >
          <Icon name="lucide:refresh-cw" class="size-3.5 text-win-ink" :class="reloading ? 'animate-spin' : ''" />
          <span>{{ reloading ? 'Chargement…' : syncLabel }}</span>
        </button>
        <template v-if="periodLabel">
          <span class="size-[3px] rounded-full bg-line-strong" aria-hidden="true" />
          <span>{{ periodLabel }}</span>
        </template>
        <span class="size-[3px] rounded-full bg-line-strong" aria-hidden="true" />
        <span>Parties classées</span>
        <span class="size-[3px] rounded-full bg-line-strong" aria-hidden="true" />
        <span>EUW · Patch {{ patchLabel }}</span>
      </div>

      <div class="grid items-end gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:gap-8">
        <div>
          <h1 id="home-headline" class="headline">
            <template v-if="headlineParts.kind === 'delta'">
              Le crew a {{ headlineParts.verb }} <span class="fig" :class="headlineParts.toneClass">{{ headlineParts.lp }}&nbsp;LP</span> cette semaine.
            </template>
            <template v-else-if="headlineParts.kind === 'even'">
              Le crew finit la semaine à l'équilibre.
            </template>
            <template v-else-if="headlineParts.kind === 'none'">
              Aucune partie classée jouée cette semaine.
            </template>
            <template v-else>
              Tableau de bord du crew.
            </template>
          </h1>
          <p v-if="standfirstParts" class="mt-3 max-w-[58ch] text-pretty text-base leading-[1.55] text-ink-2">
            {{ standfirstParts.summary }}<template v-if="standfirstParts.hero"> <b class="font-[640] text-ink">{{ standfirstParts.hero.name }}</b> {{ standfirstParts.hero.verb }} avec {{ standfirstParts.hero.lp }}.</template>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UiSwitch v-model="includeSmurfs" label="Inclure les smurfs" />
        </div>
      </div>

      <template v-if="!hasApiError && store.homeStats">
        <WeekBento :activity="store.homeStats.weeklyActivity" :crew-size="crewSize" />
        <LiveStrip :include-smurfs="includeSmurfs" />
      </template>

      <UiErrorState
        v-else
        title="Oups, l'API ne répond pas."
        description="Impossible de récupérer les statistiques du crew et l'historique récent. Le serveur semble indisponible pour le moment."
      >
        <template #actions>
          <UiButton variant="primary" size="sm" :busy="reloading" :disabled="reloading" @click="reload">
            Réessayer
          </UiButton>
        </template>
      </UiErrorState>
    </section>

    <div v-if="!hasApiError" class="cols">
      <div class="col-main">
        <CrewLadder v-model:include-smurfs="includeSmurfs" class="sec-tower" :players="store.players" />
        <RecentGames
          class="sec-feed"
          :include-smurfs="includeSmurfs"
          :active-players="store.homeStats?.weeklyActivity.activePlayers ?? []"
          :ranked-games="store.homeStats?.weeklyActivity.gamesThisWeek ?? null"
        />
      </div>

      <aside class="rail" aria-label="La semaine en bref">
        <PlayerOfTheWeek
          v-if="store.homeStats?.factOfTheWeek"
          :fact="store.homeStats.factOfTheWeek"
          :players="store.players"
        />
        <MonthRecords v-if="store.homeStats" :records="store.homeStats.crewRecords" />
        <CrewChampions v-if="store.homeStats" :champions="store.homeStats.crewRecords.topChampions ?? []" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

.headline {
  font-stretch: 118%;
  font-weight: 760;
  font-size: clamp(1.875rem, 1.05rem + 2.9vw, 3.25rem);
  line-height: 1;
  letter-spacing: -0.035em;
  max-width: 20ch;
}

.headline .fig {
  font-size: 1.32em;
  letter-spacing: -0.02em;
  line-height: 0.8;
}

.cols {
  display: grid;
  gap: 40px;
  align-items: start;
}

.col-main {
  display: contents;
}

.sec-tower {
  order: 1;
}

.rail {
  order: 2;
  display: grid;
  gap: 20px;
  min-width: 0;
  align-content: start;
}

.sec-feed {
  order: 3;
}

@media (min-width: 768px) {
  .rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rail > :deep(.feature) {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1100px) {
  .cols {
    grid-template-columns: minmax(0, 1fr) 336px;
    gap: 32px;
  }

  .col-main {
    display: grid;
    gap: 48px;
    min-width: 0;
  }

  .rail {
    order: 0;
    grid-template-columns: minmax(0, 1fr);
    position: sticky;
    top: 80px;
  }
}
</style>
