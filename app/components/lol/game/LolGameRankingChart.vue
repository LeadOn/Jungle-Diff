<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import { championIconUrl, decimalLabel, formatFull } from '~/utils/lol-match'
import { useEntered } from '~/composables/useEntered'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  patch: string
  selectedPuuid?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedPuuid', puuid: string): void
}>()

interface RankingStat {
  key: string
  label: string
  valueFn: (player: LoLGameParticipantDto) => number
  formatFn: (value: number) => string
  description?: string
}

const STATS: RankingStat[] = [
  { key: 'kda', label: 'KDA', valueFn: p => p.stats?.kda ?? 0, formatFn: v => decimalLabel(v, 2) },
  { key: 'csPerMinute', label: 'CS/min', valueFn: p => p.stats?.csPerMinute ?? 0, formatFn: v => decimalLabel(v) },
  { key: 'goldPerMinute', label: 'Or/min', valueFn: p => p.stats?.goldPerMinute ?? 0, formatFn: formatFull },
  { key: 'damagePerMinute', label: 'Dégâts/min', valueFn: p => p.stats?.damagePerMinute ?? 0, formatFn: formatFull },
  { key: 'damageTaken', label: 'Dégâts subis', valueFn: p => p.stats?.damageTaken ?? 0, formatFn: formatFull },
  {
    key: 'killParticipationPercent',
    label: 'Participation',
    valueFn: p => p.stats?.killParticipationPercent ?? 0,
    formatFn: v => `${Math.round(v)} %`,
    description: 'Part des éliminations de l\'équipe auxquelles le joueur a contribué : (kills + assists du joueur) ÷ (kills totaux de l\'équipe) × 100',
  },
  { key: 'visionScore', label: 'Vision', valueFn: p => p.visionScore ?? 0, formatFn: formatFull },
]

const selectedStatKey = ref(STATS[0]!.key)
const selectedStat = computed(() => STATS.find(s => s.key === selectedStatKey.value) ?? STATS[0]!)

const entered = useEntered()

const playersWithStats = computed(() => props.players.filter(p => p.stats != null))
const excludedPlayerCount = computed(() => props.players.length - playersWithStats.value.length)

const rows = computed(() => {
  const stat = selectedStat.value
  const sorted = playersWithStats.value
    .map(player => ({ player, value: stat.valueFn(player) }))
    .sort((a, b) => b.value - a.value)
  const max = sorted.reduce((m, row) => Math.max(m, row.value), 0) || 1

  return sorted.map((row, index) => {
    const isSelected = row.player.puuid === props.selectedPuuid
    return {
      ...row,
      rank: index + 1,
      isSelected,
      widthPercent: Math.max(2, (row.value / max) * 100),
      valueLabel: stat.formatFn(row.value),
      // Pastel sides so the picked player's ink bar stands out of the ten.
      barClass: isSelected ? 'bg-ink' : row.player.teamId === 100 ? 'bg-side-blue/55' : 'bg-side-red/55',
      championStyle: { backgroundImage: `url('${championIconUrl(row.player.championName, props.patch)}')` },
    }
  })
})
</script>

<template>
  <section class="rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="m-0 type-title text-ink">Comparaison des joueurs</h3>
        <p class="m-0 mt-0.5 type-small text-ink-2">Cliquez un joueur pour le mettre en avant</p>
      </div>
      <!-- Drawn like UiSegmented by hand: its buttons carry a definition in `title`, which the
           primitive has no room for. -->
      <div v-if="playersWithStats.length > 0" role="group" aria-label="Statistique comparée" class="inline-flex max-w-full flex-wrap gap-0.5 rounded-2 border border-line bg-neutral-soft p-0.5">
        <button
          v-for="stat in STATS"
          :key="stat.key"
          type="button"
          :title="stat.description"
          :aria-pressed="stat.key === selectedStatKey"
          class="h-7 cursor-pointer rounded-1 border-0 px-3 text-[0.8125rem] font-semibold transition-[background-color,color,box-shadow] duration-[120ms] ease-out"
          :class="stat.key === selectedStatKey
            ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong),var(--shadow-hair-value)]'
            : 'bg-transparent text-ink-2 hover:text-ink'"
          @click="selectedStatKey = stat.key"
        >
          {{ stat.label }}
        </button>
      </div>
    </div>

    <template v-if="playersWithStats.length > 0">
      <div class="flex flex-col gap-1">
        <button
          v-for="row in rows"
          :key="row.player.puuid"
          type="button"
          class="flex w-full cursor-pointer items-center gap-2.5 rounded-3 px-2 py-[5px] text-left transition-colors duration-[120ms] ease-out"
          :class="row.isSelected ? 'bg-picked' : 'hover:bg-sunken'"
          @click="emit('update:selectedPuuid', row.player.puuid ?? '')"
        >
          <span class="w-[18px] shrink-0 text-right fig text-[0.875rem] text-ink-2">{{ row.rank }}</span>
          <span class="size-[26px] shrink-0 rounded-2 bg-sunken bg-[length:112%] bg-center" :style="row.championStyle" />
          <span class="w-24 shrink-0 truncate text-[0.8125rem] font-semibold text-ink">{{ row.player.riotIdGameName }}</span>
          <span class="h-3 flex-1 overflow-hidden rounded-full bg-neutral-soft">
            <span
              class="block h-full rounded-full transition-[width] duration-700 ease-out"
              :class="row.barClass"
              :style="{ width: `${entered ? row.widthPercent : 0}%` }"
            />
          </span>
          <span class="w-14 shrink-0 text-right fig text-[0.9375rem] text-ink">{{ row.valueLabel }}</span>
        </button>
      </div>

      <p v-if="excludedPlayerCount > 0" class="m-0 mt-3 text-[0.75rem] text-ink-2">
        {{ excludedPlayerCount }} joueur{{ excludedPlayerCount > 1 ? 's' : '' }}
        exclu{{ excludedPlayerCount > 1 ? 's' : '' }} : statistiques avancées indisponibles pour cette partie.
      </p>
    </template>

    <p v-else class="m-0 rounded-3 border border-dashed border-line-strong px-4 py-6 text-center type-small text-ink-2">
      Statistiques avancées indisponibles pour cette partie (historique non recalculé).
    </p>
  </section>
</template>
