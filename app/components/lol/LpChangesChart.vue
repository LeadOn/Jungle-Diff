<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLRankChangeEntryDto } from '~/lib/types'
import { formatGameDate } from '~/lib/utils/lol'
import { useEntered } from '~/composables/useEntered'
import {
  averageLpChange,
  formatLpDelta,
  lpDeltaTone,
  rankChangeShortSummary,
} from '~/utils/lol-rank-change'

/**
 * LP won or lost on each ranked game, oldest on the left. A game whose LP are unknown
 * (`rankChange: null`) keeps its slot as a neutral grey bar straddling the baseline: it was played,
 * so dropping it would close a gap in the series, and drawing it as 0 would state a result the API
 * never measured. A genuine 0 is a flat tick on the baseline instead.
 */
const props = defineProps<{
  entries: LoLRankChangeEntryDto[]
  loading?: boolean
}>()

// Pixel geometry of the 96px-high plot.
const BASELINE = 48
// Headroom so the tallest bar stops short of the edge.
const MAX_BAR = BASELINE - 4
const UNKNOWN_HALF_HEIGHT = 10

// Bars grow from the baseline after mount, so hydration matches what the server painted.
const entered = useEntered()

type BarKind = 'gain' | 'loss' | 'neutral' | 'unknown'

const BAR_CLASS: Record<BarKind, string> = {
  gain: 'bg-win',
  loss: 'bg-loss',
  neutral: 'bg-text-sec',
  unknown: 'bg-text-sec',
}

// One scale for both directions, so a +20 and a -20 draw the same height. Floored at 10 LP so a run
// of small moves is not blown up to full height.
const maxAbsLp = computed(() =>
  Math.max(10, ...props.entries.map(e => Math.abs(e.rankChange?.leaguePointsChange ?? 0))),
)

// Hover: every slot is a full-height hit area, so thin or unknown bars stay easy to point at.
const hoveredIndex = ref<number | null>(null)

const bars = computed(() => props.entries.map((entry, index) => {
  const lp = entry.rankChange?.leaguePointsChange
  let kind: BarKind
  let top: number
  let height: number
  if (lp == null) {
    kind = 'unknown'
    top = BASELINE - UNKNOWN_HALF_HEIGHT
    height = UNKNOWN_HALF_HEIGHT * 2
  } else if (lp === 0) {
    kind = 'neutral'
    top = BASELINE - 1
    height = 2
  } else {
    kind = lp > 0 ? 'gain' : 'loss'
    height = (Math.abs(lp) / maxAbsLp.value) * MAX_BAR
    top = lp > 0 ? BASELINE - height : BASELINE
  }
  const dimmed = kind !== 'unknown' && hoveredIndex.value != null && hoveredIndex.value !== index
  return {
    key: entry.matchId,
    class: BAR_CLASS[kind],
    style: {
      top: `${entered.value ? top : BASELINE}px`,
      height: `${entered.value ? height : 0}px`,
      opacity: kind === 'unknown' ? 0.3 : dimmed ? 0.5 : 1,
      transitionDelay: `${Math.min(index * 18, 500)}ms, ${Math.min(index * 18, 500)}ms, 0ms`,
    },
  }
}))

const averageWin = computed(() => averageLpChange(props.entries, true))
const averageLoss = computed(() => averageLpChange(props.entries, false))
const unknownCount = computed(() => props.entries.filter(e => e.rankChange == null).length)

const plural = (count: number) => `${count} ${count > 1 ? 'parties' : 'partie'}`

const ariaLabel = computed(() => {
  const parts = [`${props.entries.length} parties classées`]
  if (averageWin.value != null) parts.push(`gain moyen en victoire ${formatLpDelta(averageWin.value)}`)
  if (averageLoss.value != null) parts.push(`perte moyenne en défaite ${formatLpDelta(averageLoss.value)}`)
  return parts.join(', ')
})

const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '')

const firstLabel = computed(() => (props.entries[0] ? formatShortDate(props.entries[0].gameStart) : ''))
const lastLabel = computed(() => {
  const last = props.entries[props.entries.length - 1]
  return last ? formatShortDate(last.gameStart) : ''
})

const hoveredEntry = computed(() => (hoveredIndex.value != null ? props.entries[hoveredIndex.value] ?? null : null))

const LP_TONE_CLASS = {
  gain: 'text-on-photo-green',
  loss: 'text-on-photo-red',
  neutral: 'text-ink-text',
} as const

const hoveredLpLabel = computed(() => {
  const change = hoveredEntry.value?.rankChange
  return change ? rankChangeShortSummary(change) : 'LP inconnus'
})
const hoveredLpClass = computed(() => {
  const change = hoveredEntry.value?.rankChange
  return change ? LP_TONE_CLASS[lpDeltaTone(change.leaguePointsChange)] : 'text-ink-muted'
})

// Keeps the tooltip inside the card near the chart's left and right edges.
const tooltipStyle = computed(() => {
  if (hoveredIndex.value == null) return {}
  const fraction = (hoveredIndex.value + 0.5) / Math.max(props.entries.length, 1)
  const shift = fraction < 0.2 ? '0' : fraction > 0.8 ? '-100%' : '-50%'
  return { left: `${fraction * 100}%`, transform: `translate(${shift}, -100%)` }
})
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-2">
      <h4 class="m-0 text-[14.5px] font-bold">Gains et pertes par partie</h4>
      <span v-if="!loading && entries.length > 0" class="text-xs font-semibold text-text-sec">{{ plural(entries.length) }}</span>
    </div>

    <div v-if="loading" class="mt-3.5 h-24 animate-pulse rounded-[14px] bg-surface-high" />
    <div
      v-else-if="entries.length === 0"
      class="mt-3.5 flex h-24 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-border-dashed text-center text-[12.5px] font-bold text-text-sec"
    >
      Aucune partie classée sur cette période.
    </div>
    <template v-else>
      <div class="mb-[18px] mt-2.5 flex flex-wrap gap-1.5">
        <span class="rounded-full bg-win-soft px-[9px] py-[3px] text-[11.5px] font-bold text-brand-green">
          Moy. victoire <span class="font-mono font-semibold">{{ averageWin != null ? formatLpDelta(averageWin) : '—' }}</span>
        </span>
        <span class="rounded-full bg-loss-soft px-[9px] py-[3px] text-[11.5px] font-bold text-brand-red">
          Moy. défaite <span class="font-mono font-semibold">{{ averageLoss != null ? formatLpDelta(averageLoss) : '—' }}</span>
        </span>
        <span
          v-if="unknownCount > 0"
          class="inline-flex items-center gap-[5px] rounded-full border border-dashed border-border-accent px-[9px] py-[3px] text-[11.5px] font-bold text-text-sec"
        >
          <span class="h-2.5 w-[5px] rounded-[2px] bg-text-sec/45" />
          {{ plural(unknownCount) }} aux LP inconnus
        </span>
      </div>

      <div role="img" :aria-label="ariaLabel" class="relative flex h-24" @mouseleave="hoveredIndex = null">
        <span class="absolute inset-x-0 top-12 h-px bg-border-accent" />
        <span
          v-for="(bar, index) in bars"
          :key="bar.key"
          class="relative h-full flex-1 cursor-crosshair"
          @mouseenter="hoveredIndex = index"
        >
          <span
            class="absolute inset-x-0 mx-auto w-[70%] max-w-3 rounded-[3px] transition-[top,height,opacity] duration-[600ms,600ms,150ms] ease-spring-soft"
            :class="bar.class"
            :style="bar.style"
          />
        </span>

        <span
          v-if="hoveredEntry"
          role="tooltip"
          class="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-xl bg-ink px-[11px] py-2 text-ink-text"
          :style="tooltipStyle"
        >
          <span class="block text-[11px] font-semibold text-ink-muted">{{ formatGameDate(hoveredEntry.gameStart) }}</span>
          <span class="block text-[12.5px] font-bold">
            <span :class="hoveredEntry.win ? 'text-on-photo-green' : 'text-on-photo-red'">{{ hoveredEntry.win ? 'Victoire' : 'Défaite' }}</span>
            · {{ hoveredEntry.championName }}
            <span class="font-mono font-medium text-ink-muted">{{ hoveredEntry.kills }}/{{ hoveredEntry.deaths }}/{{ hoveredEntry.assists }}</span>
          </span>
          <span class="mt-px block text-xs font-bold" :class="hoveredLpClass">{{ hoveredLpLabel }}</span>
        </span>
      </div>

      <div class="mt-2.5 flex justify-between gap-2 text-[11.5px] font-bold text-text-sec">
        <span>{{ firstLabel }}</span>
        <span>{{ lastLabel }}</span>
      </div>
    </template>
  </div>
</template>
