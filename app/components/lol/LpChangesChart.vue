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
  neutral: 'bg-ink-2',
  unknown: 'bg-ink-2',
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
  gain: 'text-on-night-win',
  loss: 'text-on-night-loss',
  neutral: 'text-on-night',
} as const

const hoveredLpLabel = computed(() => {
  const change = hoveredEntry.value?.rankChange
  return change ? rankChangeShortSummary(change) : 'LP inconnus'
})
const hoveredLpClass = computed(() => {
  const change = hoveredEntry.value?.rankChange
  return change ? LP_TONE_CLASS[lpDeltaTone(change.leaguePointsChange)] : 'text-on-night-2'
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
      <h4 class="m-0 text-[0.9375rem] font-[640] text-ink">Gains et pertes par partie</h4>
      <span v-if="!loading && entries.length > 0" class="type-small text-ink-2">{{ plural(entries.length) }}</span>
    </div>

    <UiSkeleton v-if="loading" class="mt-3.5 h-24 rounded-3" />
    <div
      v-else-if="entries.length === 0"
      class="type-small mt-3.5 flex h-24 items-center justify-center rounded-3 border border-dashed border-line-strong px-3 text-center text-ink-2"
    >
      Aucune partie classée sur cette période.
    </div>
    <template v-else>
      <div class="mt-2.5 mb-[18px] flex flex-wrap gap-1.5">
        <span class="inline-flex h-[22px] items-center gap-1 rounded-full bg-win-soft px-[9px] text-[11.5px] font-semibold text-win-ink">
          Moy. victoire <span class="font-mono tabular-nums">{{ averageWin != null ? formatLpDelta(averageWin) : '—' }}</span>
        </span>
        <span class="inline-flex h-[22px] items-center gap-1 rounded-full bg-loss-soft px-[9px] text-[11.5px] font-semibold text-loss-ink">
          Moy. défaite <span class="font-mono tabular-nums">{{ averageLoss != null ? formatLpDelta(averageLoss) : '—' }}</span>
        </span>
        <span
          v-if="unknownCount > 0"
          class="inline-flex h-[22px] items-center gap-[5px] rounded-full border border-dashed border-line-strong px-[9px] text-[11.5px] font-semibold text-ink-2"
        >
          <span class="h-2.5 w-[5px] rounded-[2px] bg-ink-2/45" />
          {{ plural(unknownCount) }} aux LP inconnus
        </span>
      </div>

      <div role="img" :aria-label="ariaLabel" class="relative flex h-24" @mouseleave="hoveredIndex = null">
        <span class="absolute inset-x-0 top-12 h-px bg-line-strong" />
        <span
          v-for="(bar, index) in bars"
          :key="bar.key"
          class="relative h-full flex-1 cursor-crosshair"
          @mouseenter="hoveredIndex = index"
        >
          <span
            class="absolute inset-x-0 mx-auto w-[70%] max-w-3 rounded-[2px] transition-[top,height,opacity] duration-[600ms,600ms,120ms] ease-out"
            :class="bar.class"
            :style="bar.style"
          />
        </span>

        <span
          v-if="hoveredEntry"
          role="tooltip"
          class="pointer-events-none absolute -top-2 z-10 grid gap-0.5 whitespace-nowrap rounded-3 bg-night px-2.5 py-2 text-on-night shadow-float"
          :style="tooltipStyle"
        >
          <span class="block font-mono text-[11px] text-on-night-2">{{ formatGameDate(hoveredEntry.gameStart) }}</span>
          <span class="block text-[0.8125rem] font-[640]">
            <span :class="hoveredEntry.win ? 'text-on-night-win' : 'text-on-night-loss'">{{ hoveredEntry.win ? 'Victoire' : 'Défaite' }}</span>
            · {{ hoveredEntry.championName }}
            <span class="font-mono text-[11px] font-medium text-on-night-2">{{ hoveredEntry.kills }}/{{ hoveredEntry.deaths }}/{{ hoveredEntry.assists }}</span>
          </span>
          <span class="block font-mono text-[11.5px] font-semibold" :class="hoveredLpClass">{{ hoveredLpLabel }}</span>
        </span>
      </div>

      <div class="mt-2.5 flex justify-between gap-2">
        <span class="type-mono text-ink-3">{{ firstLabel }}</span>
        <span class="type-mono text-ink-3">{{ lastLabel }}</span>
      </div>
    </template>
  </div>
</template>
