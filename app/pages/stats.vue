<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, useAsyncData, useRuntimeConfig } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { AWARD_MAPPINGS, type LoLGlobalStatAwardKey } from '~/utils/lol-awards'
import type { LoLGlobalStatsDto, LoLFunStatDto } from '~/lib/types/home'
import type { LeaguePlayer } from '~/lib/types/player'

const route = useRoute()
const router = useRouter()
const patchStore = usePatchStore()
const config = useRuntimeConfig()
const api = useGameOnLol()

// Filters
const queue = ref<string>((route.query.queue as string) || 'Solo')
const period = ref<string>((route.query.period as string) || 'Month')
const rankedOnly = ref<boolean>(route.query.rankedOnly ? route.query.rankedOnly === 'true' : true)

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
const rankedOnlyDisplay = computed(() => rankedOnlyLocked.value ? true : rankedOnly.value)

// Fetch Data
const { data: summary, pending, error, refresh } = useAsyncData(
  'globalStats',
  () => api.getGlobalStats(
    queue.value,
    period.value,
    queue.value === 'All' && rankedOnly.value
  ),
  { watch: [queue, period, rankedOnly] }
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
  
  router.replace({ query })
}

watch([queue, period, rankedOnly], () => {
  syncUrl()
})

useSeoMeta({
  title: 'Statistiques Globales',
  description: 'Les records les plus glorieux (et les plus honteux) du groupe.'
})

// UI Helpers
const getPlayerName = (p: any) => {
  if (!p) return 'Crew'
  return p.riotGamesNickname || p.nickname
}

const getPlayerAvatarUrl = (p: any) => {
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
    <!-- Hero Section -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-12 mb-12 animate-fade-in-up">
      <div class="w-full flex flex-col items-start text-left">
        <h1 class="text-[44px] md:text-6xl font-extrabold text-text-main leading-none mb-6 tracking-[-0.03em]">
          Statistiques Globales
        </h1>
        <p class="text-lg text-text-sec max-w-2xl leading-relaxed font-medium">
          Les records les plus glorieux (et les plus honteux) du groupe, tous joueurs et toutes parties confondues.
        </p>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="mb-8 flex flex-wrap items-center gap-4 bg-surface-base p-4 rounded-2xl border border-border-base shadow-sm">
      <!-- Queue Filter -->
      <div class="inline-flex items-center gap-1 rounded-full border border-border-base bg-surface-high p-1">
        <button
          v-for="opt in queueOptions"
          :key="opt.value"
          class="rounded-full px-4 py-1.5 text-sm font-bold transition-colors"
          :class="queue === opt.value ? 'bg-brand-gold text-brand-gold-text shadow-sm' : 'text-text-ter hover:text-text-main'"
          @click="setQueue(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Period Filter -->
      <select
        v-model="period"
        class="bg-surface-high border-border-base text-text-main rounded-xl border py-2 pl-4 pr-10 text-sm font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
      >
        <option v-for="opt in periodOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- Ranked Only Toggle -->
      <label
        class="flex items-center gap-3 ml-auto"
        :class="rankedOnlyLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
      >
        <span class="text-sm font-bold text-text-main">Classées uniquement</span>
        <div class="relative">
          <input
            type="checkbox"
            class="peer sr-only"
            v-model="rankedOnly"
            :disabled="rankedOnlyLocked"
          />
          <div
            class="peer-checked:bg-brand-green h-6 w-11 rounded-full bg-surface-high border border-border-base transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
          ></div>
        </div>
      </label>
    </div>

    <!-- Stats Count / Meta -->
    <div v-if="!pending && summary" class="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up">
      <span class="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-high border border-border-base text-xs font-bold text-text-main">
        <Icon name="lucide:swords" class="mr-2 text-brand-gold" size="14" />
        {{ summary.totalGamesAnalyzed }} parties analysées
      </span>
      <span class="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-high border border-border-base text-xs font-bold text-text-main">
        <Icon name="lucide:users" class="mr-2 text-brand-green" size="14" />
        {{ summary.totalPlayersTracked }} joueurs
      </span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-brand-red/10 border border-brand-red/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center">
      <Icon name="lucide:triangle-alert" class="text-brand-red" size="32" />
      <div>
        <p class="text-text-main font-bold mb-1">Impossible de charger les statistiques globales</p>
        <p class="text-text-sec text-sm">Une erreur est survenue lors de la récupération des données.</p>
      </div>
      <button @click="() => refresh()" class="px-4 py-2 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl font-bold text-sm transition-colors">
        Réessayer
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="pending" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="bg-surface-base rounded-2xl border border-border-base p-5 animate-pulse h-40">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-surface-high"></div>
          <div class="space-y-3 flex-1">
            <div class="h-4 bg-surface-high rounded w-2/3"></div>
            <div class="h-3 bg-surface-high rounded w-4/5"></div>
          </div>
        </div>
        <div class="mt-6 h-6 bg-surface-high rounded w-1/3"></div>
      </div>
    </div>

    <!-- No Games State -->
    <div v-else-if="hasNoGames" class="bg-surface-base rounded-2xl border border-border-base border-dashed p-12 text-center">
      <Icon name="lucide:ghost" class="mx-auto text-text-ter mb-4" size="48" />
      <p class="text-text-main font-bold text-lg mb-2">Aucune partie trouvée</p>
      <p class="text-text-sec text-sm">Aucune partie n'a été analysée pour cette période et ce mode de jeu.</p>
    </div>

    <!-- Grid -->
    <div v-else-if="summary" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
      <article
        v-for="award in awardsList"
        :key="award.key"
        class="group bg-surface-base hover:bg-surface-high transition-colors rounded-2xl border border-border-base p-5 flex flex-col shadow-sm relative overflow-hidden"
      >
        <template v-for="stat in [summary[award.key] as any]" :key="stat ? 'has-stat' : 'no-stat'">
          <NuxtLink
            v-if="stat?.matchId && stat?.player?.id"
            :to="`/game/${stat.matchId}/${stat.player.id}`"
            class="absolute inset-0 z-10"
            title="Voir la partie"
          ></NuxtLink>

          <!-- Header: Icon + Title/Desc -->
          <div class="flex items-start gap-4 mb-5">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl bg-surface-high border border-border-subtle group-hover:border-border-accent transition-colors">
              {{ award.icon }}
            </div>
            <div class="min-w-0 flex-1 pt-1">
              <h3 class="text-text-main truncate font-extrabold text-[15px] mb-1 leading-tight">
                {{ award.title }}
              </h3>
              <p class="text-xs text-text-ter leading-snug line-clamp-2" :title="award.description">
                {{ award.description }}
              </p>
            </div>
          </div>

          <template v-if="stat">
            <!-- Main Stat Value -->
            <div class="flex items-baseline gap-2 mb-1 relative z-20">
              <span class="text-3xl font-black tabular-nums tracking-tight" :class="award.color">
                {{ stat.value }}
              </span>
              <span class="text-sm font-bold text-text-ter uppercase tracking-wider">
                {{ award.unit }}
              </span>
            </div>

            <!-- Extra Detail (e.g., specific item/champ) -->
            <p v-if="stat.detail" class="text-[13px] font-medium text-text-sec mb-4">
              {{ stat.detail }}
            </p>
            <div v-else class="mb-4"></div> <!-- Spacer -->

            <!-- Footer: Player Info & Date -->
            <div class="mt-auto pt-4 border-t border-border-subtle flex items-center justify-between relative z-20">
              <NuxtLink
                v-if="stat.player"
                :to="`/summoner/${stat.player.id}`"
                class="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div class="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border-accent bg-surface-high">
                  <img :src="getPlayerAvatarUrl(stat.player)" class="h-full w-full object-cover" />
                </div>
                <span class="truncate text-[13px] font-bold text-text-main group-hover:text-brand-gold transition-colors">
                  {{ getPlayerName(stat.player) }}
                </span>
              </NuxtLink>
              <span v-else class="text-[13px] font-bold text-text-ter">
                Groupe
              </span>

              <span class="shrink-0 text-xs font-mono font-bold uppercase tracking-wider text-text-ter">
                {{ award.getSubtitle(stat).split('·').pop()?.trim() }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="mt-auto pt-4 flex items-center justify-center">
              <span class="text-xs font-medium text-text-ter text-center">Pas assez de données</span>
            </div>
          </template>
        </template>
      </article>
    </div>
  </div>
</template>
