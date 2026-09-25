<script setup lang="ts">
import { computed } from 'vue'
import type { LoLSummonerPerformanceStats } from '~/lib/types'
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

const PERIODS: { value: Period, label: string }[] = [
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
    { label: 'Parties', value: String(Math.round(games.value)), unit: '', hint: `${stats.wins} victoires · ${stats.losses} défaites`, color: 'text-text-main' },
    { label: 'Taux de victoire', value: formatFr(winRate.value), unit: '%', hint: `${formatPlaytime(stats.totalPlaytimeSeconds)} de jeu · ${Math.round(stats.averageGameDurationSeconds / 60)} min par partie`, color: stats.winRatePercent >= 50 ? 'text-brand-green' : 'text-brand-red' },
    { label: 'KDA moyen', value: formatFr(kda.value, 2), unit: '', hint: `${formatFr(stats.averageCsPerMinute)} CS/min · ${formatFr(stats.averageDamagePerMinute)} dégâts/min`, color: 'text-text-main' },
    { label: 'Score de vision', value: formatFr(vision.value), unit: '', hint: 'Score de vision moyen par partie', color: 'text-text-main' },
  ]
})
</script>

<template>
  <section aria-labelledby="profile-performance">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
      <div class="min-w-0">
        <h2 id="profile-performance" class="m-0 text-[32px] font-bold tracking-[-0.035em]">Performances</h2>
        <p class="m-0 mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-text-sec">
          {{ headerHint }}
          <span
            v-if="filterSummary"
            class="rounded-full border border-border-accent bg-brand-gold-soft px-2.5 py-[3px] text-[12.5px] font-bold text-text-main"
          >Filtré · {{ filterSummary }}</span>
        </p>
      </div>
      <div role="group" aria-label="Période" class="flex rounded-full border border-border-base bg-surface-base p-[3px]">
        <button
          v-for="p in PERIODS"
          :key="p.value"
          type="button"
          :aria-pressed="period === p.value"
          class="cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors duration-200"
          :class="period === p.value ? 'bg-inverse text-inverse-text' : 'text-text-main'"
          @click="emit('update:period', p.value)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="!stats || stats.gamesPlayed === 0" class="rounded-[22px] border-[1.5px] border-dashed border-border-dashed px-6 py-10 text-center text-sm font-bold text-text-sec">
      Aucune partie sur cette période.
    </div>

    <div v-else class="grid grid-cols-2 gap-4 rail:grid-cols-4">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="flex flex-col gap-2.5 rounded-[26px] border border-border-subtle bg-surface-base p-5 shadow-card transition-transform duration-[350ms] ease-spring hover:-translate-y-1"
      >
        <span class="text-sm font-bold">{{ kpi.label }}</span>
        <span class="flex items-baseline gap-[5px]" :class="kpi.color">
          <span class="text-[34px] font-bold leading-none tracking-[-0.05em] md:text-[46px]">{{ kpi.value }}</span>
          <span v-if="kpi.unit" class="text-base font-bold">{{ kpi.unit }}</span>
        </span>
        <span class="text-pretty text-[12.5px] font-semibold text-text-sec">{{ kpi.hint }}</span>
      </div>
    </div>
  </section>
</template>
