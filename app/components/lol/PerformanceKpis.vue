<script setup lang="ts">
import { computed } from 'vue'
import type { LoLSummonerPerformanceStats } from '~/lib/types'
import type { UiSegmentedOption } from '~/components/ui/Segmented.vue'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'

type Period = '7j' | '30j' | 'all-time'

const props = withDefaults(defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
  /** "Support · Classée Solo/Duo" when the history filters also narrow these figures. */
  filterSummary?: string | null
}>(), { filterSummary: null })

const emit = defineEmits<{
  (e: 'update:period', value: Period): void
}>()

const PERIODS: UiSegmentedOption<Period>[] = [
  { value: '7j', label: '7 j' },
  { value: '30j', label: '30 j' },
  { value: 'all-time', label: 'Toujours' },
]

const PERIOD_HINTS: Record<Period, string> = {
  '7j': '7 derniers jours, toutes files confondues',
  '30j': '30 derniers jours, toutes files confondues',
  'all-time': 'Tout l\'historique, toutes files confondues',
}

const headerHint = computed(() => PERIOD_HINTS[props.period])

function formatFr(value: number, fractionDigits = 1): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
}

function formatPlaytime(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours}h ${minutes}min`
}

// Count-ups watch the stats through getters: a period or filter change animates to the new figure.
const games = useAnimatedNumber(() => props.stats?.gamesPlayed ?? 0)
const winRate = useAnimatedNumber(() => props.stats?.winRatePercent ?? 0)
const kda = useAnimatedNumber(() => props.stats?.averageKda ?? 0)
const vision = useAnimatedNumber(() => props.stats?.averageVisionScore ?? 0)

const kpis = computed(() => {
  const stats = props.stats
  if (!stats) return []
  return [
    { label: 'Parties', value: String(Math.round(games.value)), unit: '', hint: `${stats.wins} victoires · ${stats.losses} défaites`, color: 'text-ink' },
    { label: 'Taux de victoire', value: formatFr(winRate.value), unit: '%', hint: `${formatPlaytime(stats.totalPlaytimeSeconds)} de jeu · ${Math.round(stats.averageGameDurationSeconds / 60)} min par partie`, color: stats.winRatePercent >= 50 ? 'text-win-ink' : 'text-loss-ink' },
    { label: 'KDA moyen', value: formatFr(kda.value, 2), unit: '', hint: `${formatFr(stats.averageCsPerMinute)} CS/min · ${formatFr(stats.averageDamagePerMinute)} dégâts/min`, color: 'text-ink' },
    { label: 'Score de vision', value: formatFr(vision.value), unit: '', hint: 'Score de vision moyen par partie', color: 'text-ink' },
  ]
})
</script>

<template>
  <section aria-labelledby="profile-performance">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
      <div class="min-w-0">
        <h2 id="profile-performance" class="type-d2 m-0">Performances</h2>
        <p class="type-small m-0 mt-1 flex flex-wrap items-center gap-2 text-ink-2">
          {{ headerHint }}
          <span
            v-if="filterSummary"
            class="inline-flex h-[22px] items-center rounded-1 bg-canopy-soft px-1.5 text-[11.5px] font-[650] text-ink"
          >Filtré · {{ filterSummary }}</span>
        </p>
      </div>
      <UiSegmented
        :model-value="period"
        :options="PERIODS"
        aria-label="Période"
        @update:model-value="emit('update:period', $event)"
      />
    </div>

    <UiEmptyState v-if="!stats || stats.gamesPlayed === 0" title="Aucune partie sur cette période." />

    <div
      v-else
      class="grid grid-cols-2 gap-px overflow-hidden rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-line shadow-card rail:grid-cols-4"
    >
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="flex min-w-0 flex-col gap-2.5 bg-surface px-4 pt-4 pb-[18px] md:px-[18px]"
      >
        <span class="type-label text-ink-2">{{ kpi.label }}</span>
        <span class="flex items-baseline gap-1.5" :class="kpi.color">
          <span class="fig text-[2.75rem] md:text-[3.5rem]">{{ kpi.value }}</span>
          <span v-if="kpi.unit" class="text-[0.9375rem] font-[620] text-ink-2">{{ kpi.unit }}</span>
        </span>
        <span class="type-small text-pretty text-ink-2">{{ kpi.hint }}</span>
      </div>
    </div>
  </section>
</template>
