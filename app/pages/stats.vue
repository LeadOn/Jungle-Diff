<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, useAsyncData, useRuntimeConfig } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { AWARD_MAPPINGS, getPlayerName } from '~/utils/lol-awards'
import type { PlayerDto } from '~/lib/types/home'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()
const config = useRuntimeConfig()
const api = useGameOnLol()

// Filters
const queue = ref<string>((route.query.queue as string) || 'Solo')
const period = ref<string>((route.query.period as string) || 'Month')
const rankedOnly = ref<boolean>(route.query.rankedOnly ? route.query.rankedOnly === 'true' : true)
// Defaults to `false`, against the API's own default of `true`: the records are meant to rank the
// crew's main accounts, and a smurf sitting in a low-elo bracket distorts every award it touches.
// Opting back in is one click, and that opt-in is what reaches the URL.
const includeSmurfs = ref<boolean>(route.query.includeSmurfs ? route.query.includeSmurfs === 'true' : false)

// Options
const queueOptions = [
  { value: 'All', label: 'Toutes' },
  { value: 'Solo', label: 'Solo/Duo' },
  { value: 'Flex', label: 'Flex' }
]

const periodOptions = [
  { value: 'AllTime', label: 'Depuis toujours' },
  { value: 'Week', label: '7 derniers jours' },
  { value: 'Month', label: '1 mois' },
  { value: 'ThreeMonths', label: '3 mois' },
  { value: 'SixMonths', label: '6 mois' }
]

const awardsList = Object.values(AWARD_MAPPINGS)

const rankedOnlyLocked = computed(() => queue.value !== 'All')

// Fetch Data
const { data: summary, status, error, refresh } = useAsyncData(
  'globalStats',
  () => api.getGlobalStats(
    queue.value,
    period.value,
    queue.value === 'All' && rankedOnly.value,
    includeSmurfs.value
  ),
  { watch: [queue, period, rankedOnly, includeSmurfs] }
)

const hasNoGames = computed(() => summary.value?.totalGamesAnalyzed === 0)

// Actions
const setQueue = (val: string) => {
  queue.value = val
}

const syncUrl = () => {
  const query: Record<string, string> = {}
  if (queue.value !== 'Solo') query.queue = queue.value
  if (period.value !== 'Month') query.period = period.value
  // rankedOnly default is true, so only put it in URL if it's explicitly false when queue is All
  if (queue.value === 'All' && !rankedOnly.value) query.rankedOnly = 'false'
  // Same rule, mirrored: this page defaults to excluding smurfs, so only a deliberate opt-IN is
  // worth carrying in the URL.
  if (includeSmurfs.value) query.includeSmurfs = 'true'

  router.replace({ query })
}

watch([queue, period, rankedOnly, includeSmurfs], () => {
  syncUrl()
})

useSeoMeta({
  title: 'Statistiques Globales',
  description: 'Les records les plus glorieux (et les plus honteux) du groupe.'
})

// UI Helpers
const getPlayerAvatarUrl = (p: PlayerDto) => {
  if (p.lolIconId != null) {
    return getProfileIconUrl(p.lolIconId, patchStore.currentPatch)
  }
  if (p.profilePictureUrl) {
    return `${config.public.gameOnApiUrl}/player/${p.id}/pp`
  }
  return '/img/JungleDiff_Logo.png'
}
</script>

<template>
  <div class="w-full">
    <!-- Hero -->
    <header class="mb-8 grid gap-3">
      <h1 class="type-d2 text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] text-ink">
        Statistiques Globales
      </h1>
      <p class="max-w-[58ch] text-pretty text-base leading-[1.55] text-ink-2">
        Les records les plus glorieux (et les plus honteux) du groupe, tous joueurs et toutes parties confondues.
      </p>
    </header>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
      <UiSegmented
        :model-value="queue"
        :options="queueOptions"
        aria-label="File"
        @update:model-value="setQueue"
      />

      <!-- Five periods do not fit a phone's width: the control scrolls inside its own box rather
           than pushing the page sideways. The padding keeps the focus ring clear of the clip. -->
      <div class="-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1 [&_button]:shrink-0 [&_button]:whitespace-nowrap">
        <UiSegmented v-model="period" :options="periodOptions" aria-label="Période" />
      </div>

      <!-- Toggles. A single `ml-auto` on the group rather than one per toggle: two competing
           `ml-auto` push each other apart and strand the first one mid-row. -->
      <div class="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
        <UiSwitch v-model="rankedOnly" label="Classées uniquement" :disabled="rankedOnlyLocked" />
        <UiSwitch v-model="includeSmurfs" label="Inclure les smurfs" />
      </div>
    </div>

    <!-- Stats Count / Meta -->
    <p
      v-if="status !== 'pending' && summary"
      class="mb-5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 type-small text-ink-2"
    >
      <span class="inline-flex items-center gap-1.5">
        <Icon name="lucide:swords" class="size-3.5 text-ink-3" aria-hidden="true" />
        <span class="fig text-[1.0625rem] text-ink">{{ summary.totalGamesAnalyzed }}</span> parties analysées
      </span>
      <span class="size-[3px] rounded-full bg-line-strong" aria-hidden="true" />
      <span class="inline-flex items-center gap-1.5">
        <Icon name="lucide:users" class="size-3.5 text-ink-3" aria-hidden="true" />
        <span class="fig text-[1.0625rem] text-ink">{{ summary.totalPlayersTracked }}</span> joueurs
      </span>
    </p>

    <!-- Error State -->
    <UiErrorState
      v-if="error"
      title="Impossible de charger les statistiques globales"
      description="Une erreur est survenue lors de la récupération des données."
      retry-label="Réessayer"
      @retry="() => refresh()"
    />

    <!-- Loading State: skeletons shaped like the award cards -->
    <div v-else-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <div
        v-for="i in 6"
        :key="i"
        class="flex h-[13.5rem] flex-col rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-[18px] shadow-card"
      >
        <div class="flex items-start gap-3.5">
          <UiSkeleton class="h-11 w-11 shrink-0" />
          <div class="grid flex-1 gap-2 pt-1">
            <UiSkeleton class="h-4 w-2/3" />
            <UiSkeleton class="h-3 w-4/5" />
          </div>
        </div>
        <UiSkeleton class="mt-5 h-8 w-1/3" />
        <div class="mt-auto flex items-center justify-between border-t border-dashed border-line pt-3.5">
          <UiSkeleton circle class="h-6 w-6" />
          <UiSkeleton class="h-3 w-12" />
        </div>
      </div>
    </div>

    <!-- No Games State -->
    <UiEmptyState
      v-else-if="hasNoGames"
      title="Aucune partie trouvée"
      description="Aucune partie n'a été analysée pour cette période et ce mode de jeu."
    />

    <!-- Grid -->
    <div v-else-if="summary" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="award in awardsList"
        :key="award.key"
        class="group relative flex min-w-0 flex-col rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-[18px] shadow-card transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_oklch,var(--sunken)_70%,var(--surface))]"
      >
        <template v-for="stat in [summary[award.key]]" :key="stat ? 'has-stat' : 'no-stat'">
          <NuxtLink
            v-if="stat?.matchId && stat?.player?.id"
            :to="`/game/${stat.matchId}/${stat.player.id}`"
            class="absolute inset-0 z-10 rounded-5"
            title="Voir la partie"
          />

          <!-- Header: Icon + Title/Desc -->
          <div class="mb-4 flex items-start gap-3.5">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-3 border border-line bg-sunken text-[1.375rem]">
              {{ award.icon }}
            </div>
            <div class="min-w-0 flex-1 pt-0.5">
              <h3 class="type-title mb-0.5 truncate text-ink">
                {{ award.title }}
              </h3>
              <p class="type-small line-clamp-2 text-ink-3" :title="award.description">
                {{ award.description }}
              </p>
            </div>
          </div>

          <template v-if="stat">
            <!-- Main Stat Value -->
            <div class="relative z-20 mb-1 flex items-baseline gap-1">
              <span class="fig text-[2.25rem]" :class="award.color">
                {{ stat.value }}
              </span>
              <span class="text-[0.8125rem] font-semibold text-ink-3">
                {{ award.unit }}
              </span>
            </div>

            <!-- Extra Detail (e.g., specific item/champ) -->
            <p v-if="stat.detail" class="type-small mb-4 text-ink-2">
              {{ stat.detail }}
            </p>
            <div v-else class="mb-4"/> <!-- Spacer -->

            <!-- Footer: Player Info & Date -->
            <div class="relative z-20 mt-auto flex items-center justify-between gap-3 border-t border-dashed border-line pt-3.5">
              <NuxtLink
                v-if="stat.player"
                :to="`/summoner/${stat.player.id}`"
                class="flex min-w-0 items-center gap-2.5 rounded-2 hover:underline hover:underline-offset-[3px]"
              >
                <div class="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-sunken">
                  <img :src="getPlayerAvatarUrl(stat.player)" alt="" class="h-full w-full object-cover" >
                </div>
                <span class="truncate text-[0.8125rem] font-semibold text-ink">
                  {{ getPlayerName(stat.player) }}
                </span>
              </NuxtLink>
              <span v-else class="text-[0.8125rem] font-semibold text-ink-3">
                Groupe
              </span>

              <span class="type-mono shrink-0 uppercase text-ink-3">
                {{ award.getSubtitle(stat).split('·').pop()?.trim() }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="mt-auto flex items-center justify-center pt-4">
              <span class="type-small text-center text-ink-3">Pas assez de données</span>
            </div>
          </template>
        </template>
      </article>
    </div>
  </div>
</template>
