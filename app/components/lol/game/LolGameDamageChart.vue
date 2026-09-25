<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { championIconUrl, damageSplitFor, formatCompact, formatFull, latestStatsFor } from '~/utils/lol-match'
import { useEntered } from '~/composables/useEntered'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  selectedPuuid?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedPuuid', puuid: string): void
}>()

type Mode = 'dealt' | 'taken'
const MODES: { value: Mode, label: string }[] = [
  { value: 'dealt', label: 'Infligés' },
  { value: 'taken', label: 'Subis' },
]
const mode = ref<Mode>('dealt')

const entered = useEntered()

interface DamageRow {
  player: LoLGameParticipantDto
  physical: number
  magic: number
  trueDamage: number
  taken: number
  total: number
}

const valueOf = (row: DamageRow) => (mode.value === 'dealt' ? row.total : row.taken)

const rows = computed<DamageRow[]>(() => props.players
  .map((player) => {
    const stats = latestStatsFor(props.timeline, player.puuid)
    const split = damageSplitFor(player, props.timeline)
    return {
      player,
      physical: split?.physical ?? 0,
      magic: split?.magic ?? 0,
      trueDamage: split?.trueDamage ?? 0,
      taken: stats?.totalDamageTaken ?? 0,
      total: stats?.totalDamageDoneToChampions ?? 0,
    }
  })
  .sort((a, b) => valueOf(b) - valueOf(a)))

const maxValue = computed(() => rows.value.reduce((m, r) => Math.max(m, valueOf(r)), 0) || 1)

const widthPercent = (row: DamageRow) => (entered.value ? Math.max(2, (valueOf(row) / maxValue.value) * 100) : 0)
const segmentPercent = (value: number, total: number) => (total <= 0 ? 0 : (value / total) * 100)

const championStyle = (player: LoLGameParticipantDto) => ({ backgroundImage: `url('${championIconUrl(player.championName, props.patch)}')` })

/** The picked player's bar turns ink; the others keep their side's colour. */
const takenBarClass = (row: DamageRow) => {
  if (row.player.puuid === props.selectedPuuid) return 'bg-text-main'
  return row.player.teamId === 100 ? 'bg-team-blue' : 'bg-team-red'
}
</script>

<template>
  <section class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 class="m-0 text-xl font-bold tracking-[-0.025em]">Dégâts aux champions</h3>
      <div role="group" aria-label="Dégâts affichés" class="flex rounded-full border border-border-subtle bg-surface-muted p-[3px]">
        <button
          v-for="m in MODES"
          :key="m.value"
          type="button"
          :aria-pressed="mode === m.value"
          class="cursor-pointer rounded-full px-[13px] py-1.5 text-[12.5px] font-bold transition-colors duration-200"
          :class="mode === m.value ? 'bg-inverse text-inverse-text' : 'text-text-main'"
          @click="mode = m.value"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <div v-if="mode === 'dealt'" class="mb-3 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs font-bold text-text-sec">
      <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-dmg-physical" />Physiques</span>
      <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-dmg-magic" />Magiques</span>
      <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-dmg-true" />Bruts</span>
    </div>

    <div class="flex flex-col gap-1">
      <button
        v-for="row in rows"
        :key="row.player.puuid"
        type="button"
        class="group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-[5px] text-left transition-colors duration-200"
        :class="selectedPuuid === row.player.puuid ? 'bg-surface-selected' : 'hover:bg-surface-muted'"
        @click="emit('update:selectedPuuid', row.player.puuid ?? '')"
      >
        <!-- The split behind each bar is only readable on hover. -->
        <span class="pointer-events-none absolute right-16 top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-[14px] bg-ink px-[11px] py-[7px] text-[11.5px] font-bold text-ink-text group-hover:block">
          <template v-if="mode === 'dealt'">
            <span class="block">Physiques · {{ formatFull(row.physical) }}</span>
            <span class="block">Magiques · {{ formatFull(row.magic) }}</span>
            <span class="block">Bruts · {{ formatFull(row.trueDamage) }}</span>
          </template>
          <span v-else class="block">Dégâts subis · {{ formatFull(row.taken) }}</span>
        </span>

        <span
          class="size-[26px] shrink-0 rounded-lg bg-surface-sunken bg-[length:112%] bg-center ring-2"
          :class="row.player.teamId === 100 ? 'ring-team-blue' : 'ring-team-red'"
          :style="championStyle(row.player)"
        />
        <span class="w-24 shrink-0 truncate text-[13px] font-bold">{{ row.player.riotIdGameName }}</span>
        <span class="h-3 flex-1 overflow-hidden rounded-full bg-surface-high">
          <span
            v-if="mode === 'dealt'"
            class="flex h-full overflow-hidden rounded-full transition-[width] duration-800 ease-spring-soft"
            :style="{ width: `${widthPercent(row)}%` }"
          >
            <span class="h-full bg-dmg-physical" :style="{ width: `${segmentPercent(row.physical, row.total)}%` }" />
            <span class="h-full bg-dmg-magic" :style="{ width: `${segmentPercent(row.magic, row.total)}%` }" />
            <span class="h-full bg-dmg-true" :style="{ width: `${segmentPercent(row.trueDamage, row.total)}%` }" />
          </span>
          <span
            v-else
            class="block h-full rounded-full transition-[width] duration-800 ease-spring-soft"
            :class="takenBarClass(row)"
            :style="{ width: `${widthPercent(row)}%` }"
          />
        </span>
        <span class="w-12 shrink-0 text-right font-mono text-xs font-semibold">{{ formatCompact(valueOf(row)) }}</span>
      </button>
    </div>
  </section>
</template>
