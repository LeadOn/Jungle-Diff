<script setup lang="ts">
import { computed } from 'vue'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

type Period = '7j' | '30j' | 'saison'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const emit = defineEmits<{
  (e: 'update:period', value: Period): void
}>()

const PERIODS: { value: Period, label: string }[] = [
  { value: '7j', label: '7 j' },
  { value: '30j', label: '30 j' },
  { value: 'saison', label: 'Toujours' },
]

const PERIOD_HINTS: Record<Period, string> = {
  '7j': '7 DERNIERS JOURS · TOUTES FILES',
  '30j': '30 DERNIERS JOURS · TOUTES FILES',
  saison: 'TOUT L\'HISTORIQUE · TOUTES FILES',
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

function formatDurationMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

const kpis = computed(() => {
  const stats = props.stats
  if (!stats) return []
  const winRate = stats.winRatePercent
  return [
    { label: 'PARTIES', value: String(stats.gamesPlayed), hint: `${stats.wins} victoires - ${stats.losses} défaites`, color: 'text-text-main' },
    { label: 'WINRATE', value: `${formatFr(winRate)} %`, hint: `${formatPlaytime(stats.totalPlaytimeSeconds)} de jeu · ${formatDurationMinutes(stats.averageGameDurationSeconds)} par partie`, color: winRate >= 50 ? 'text-brand-green' : 'text-brand-red' },
    { label: 'KDA MOYEN', value: formatFr(stats.averageKda, 2), hint: `${formatFr(stats.averageCsPerMinute)} CS/min · ${formatFr(stats.averageDamagePerMinute)} dégâts/min`, color: 'text-text-main' },
    { label: 'VISION / MIN', value: formatFr(stats.averageVisionScore), hint: 'Score de vision moyen par partie', color: 'text-text-main' },
  ]
})
</script>

<template>
  <section class="relative">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
      <div>
        <h2 class="m-0 text-lg font-extrabold tracking-tight text-text-main">Performances</h2>
        <p class="m-0 mt-0.5 font-mono text-[11px] font-bold tracking-widest uppercase text-text-ter">{{ headerHint }}</p>
      </div>
      <div class="flex p-1 rounded-full bg-surface-high border border-border-subtle w-fit">
        <button
          v-for="p in PERIODS"
          :key="p.value"
          type="button"
          class="px-4.5 py-1.5 rounded-full text-xs font-bold transition-colors"
          :class="period === p.value ? 'bg-surface-base shadow-sm text-text-main border border-border-accent' : 'text-text-sec hover:text-text-main'"
          @click="emit('update:period', p.value)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="!stats" class="p-12 rounded-xl border border-dashed border-border-base text-center">
      <p class="m-0 text-sm font-bold text-text-sec">Aucune partie sur cette période.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpis" :key="kpi.label" class="h-full rounded-2xl border border-border-base bg-surface-base p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-border-accent">
        <div>
          <h3 class="m-0 mb-2 font-mono text-[11px] font-bold tracking-widest uppercase text-text-ter">{{ kpi.label }}</h3>
          <div class="mb-1.5 text-[28px] leading-none font-extrabold" :class="kpi.color">{{ kpi.value }}</div>
        </div>
        <div class="text-xs font-medium text-text-sec">{{ kpi.hint }}</div>
      </div>
    </div>
  </section>
</template>
