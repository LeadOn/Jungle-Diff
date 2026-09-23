<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLRankChangeEntryDto } from '~/lib/types'
import { formatGameDate } from '~/lib/utils/lol'
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

const VIEW_WIDTH = 272
const VIEW_HEIGHT = 96
const BASELINE = VIEW_HEIGHT / 2
// Headroom so the tallest bar stops short of the edge.
const MAX_BAR = BASELINE - 4
const UNKNOWN_HALF_HEIGHT = 10
// Caps the bar width, so a queue with a handful of games draws bars rather than blocks.
const MAX_BAR_WIDTH = 12

type BarKind = 'gain' | 'loss' | 'neutral' | 'unknown'

const BAR_FILL: Record<BarKind, string> = {
  gain: 'var(--color-green)',
  loss: 'var(--color-red)',
  neutral: 'var(--color-text-tertiary)',
  unknown: 'var(--color-text-tertiary)',
}

// One scale for both directions, so a +20 and a -20 draw the same height. Floored at 10 LP so a run
// of small moves is not blown up to full height.
const maxAbsLp = computed(() =>
  Math.max(10, ...props.entries.map(e => Math.abs(e.rankChange?.leaguePointsChange ?? 0))),
)

const slotWidth = computed(() => VIEW_WIDTH / Math.max(props.entries.length, 1))

const bars = computed(() => {
  const slot = slotWidth.value
  const width = Math.min(MAX_BAR_WIDTH, Math.max(1, slot * 0.7))
  return props.entries.map((entry, index) => {
    const x = index * slot + (slot - width) / 2
    const lp = entry.rankChange?.leaguePointsChange
    let kind: BarKind
    let y: number
    let height: number
    if (lp == null) {
      kind = 'unknown'
      y = BASELINE - UNKNOWN_HALF_HEIGHT
      height = UNKNOWN_HALF_HEIGHT * 2
    } else if (lp === 0) {
      kind = 'neutral'
      y = BASELINE - 1
      height = 2
    } else {
      kind = lp > 0 ? 'gain' : 'loss'
      height = (Math.abs(lp) / maxAbsLp.value) * MAX_BAR
      y = lp > 0 ? BASELINE - height : BASELINE
    }
    return { key: entry.matchId, x, width, y, height, kind, fill: BAR_FILL[kind] }
  })
})

const averageWin = computed(() => averageLpChange(props.entries, true))
const averageLoss = computed(() => averageLpChange(props.entries, false))
const unknownCount = computed(() => props.entries.filter(e => e.rankChange == null).length)

const ariaLabel = computed(() => {
  const parts = [`${props.entries.length} parties classées`]
  if (averageWin.value != null) parts.push(`gain moyen en victoire ${formatLpDelta(averageWin.value)}`)
  if (averageLoss.value != null) parts.push(`perte moyenne en défaite ${formatLpDelta(averageLoss.value)}`)
  return parts.join(', ')
})

const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .toUpperCase()
    .replace('.', '')

const firstLabel = computed(() => (props.entries[0] ? formatShortDate(props.entries[0].gameStart) : ''))
const lastLabel = computed(() => {
  const last = props.entries[props.entries.length - 1]
  return last ? formatShortDate(last.gameStart) : ''
})

// Hover: every slot carries a full-height hit area, so thin or unknown bars stay easy to point at.
const hoveredIndex = ref<number | null>(null)
const hoveredEntry = computed(() => (hoveredIndex.value != null ? props.entries[hoveredIndex.value] ?? null : null))

const LP_TONE_CLASS = {
  gain: 'text-brand-green',
  loss: 'text-brand-red',
  neutral: 'text-text-sec',
} as const

const hoveredLpLabel = computed(() => {
  const change = hoveredEntry.value?.rankChange
  return change ? rankChangeShortSummary(change) : 'LP inconnus'
})
const hoveredLpClass = computed(() => {
  const change = hoveredEntry.value?.rankChange
  return change ? LP_TONE_CLASS[lpDeltaTone(change.leaguePointsChange)] : 'text-text-ter'
})

// Keeps the tooltip inside the card near the chart's left and right edges.
const tooltipStyle = computed(() => {
  if (hoveredIndex.value == null) return {}
  const fraction = (hoveredIndex.value + 0.5) / Math.max(props.entries.length, 1)
  let translateX = '-50%'
  if (fraction < 0.25) translateX = '0%'
  else if (fraction > 0.75) translateX = '-100%'
  return {
    left: `${fraction * 100}%`,
    top: '-4px',
    transform: `translate(${translateX}, -100%)`,
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-1">
      <h4 class="m-0 text-xs font-extrabold text-text-main">Gains et pertes par partie</h4>
      <span
        v-if="!loading && entries.length > 0"
        class="font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">
        {{ entries.length }} {{ entries.length > 1 ? 'parties' : 'partie' }}
      </span>
    </div>

    <div
      v-if="!loading && entries.length > 0"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6 text-[11px] font-semibold text-text-sec">
      <span>
        Moy. victoire
        <span class="font-mono font-bold" :class="averageWin != null ? 'text-brand-green' : 'text-text-ter'">
          {{ averageWin != null ? formatLpDelta(averageWin) : '—' }}
        </span>
      </span>
      <span>
        Moy. défaite
        <span class="font-mono font-bold" :class="averageLoss != null ? 'text-brand-red' : 'text-text-ter'">
          {{ averageLoss != null ? formatLpDelta(averageLoss) : '—' }}
        </span>
      </span>
      <span v-if="unknownCount > 0" class="inline-flex items-center gap-1.5 text-text-ter">
        <span class="inline-block h-2.5 w-1.5 rounded-xs bg-text-ter opacity-40" />
        {{ unknownCount }} {{ unknownCount > 1 ? 'parties' : 'partie' }} aux LP inconnus
      </span>
    </div>

    <div v-if="loading" class="h-24 w-full rounded-lg bg-surface-high animate-pulse" />
    <div
      v-else-if="entries.length === 0"
      class="h-24 flex items-center justify-center text-center text-xs font-bold text-text-ter">
      Aucune partie classée sur cette période.
    </div>
    <template v-else>
      <div class="relative">
        <svg
          :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
          preserveAspectRatio="none"
          class="w-full h-24 block overflow-visible"
          role="img"
          :aria-label="ariaLabel"
          @mouseleave="hoveredIndex = null">
          <line
            x1="0"
            :x2="VIEW_WIDTH"
            :y1="BASELINE"
            :y2="BASELINE"
            stroke="var(--color-border)"
            stroke-width="1" />

          <rect
            v-for="(bar, index) in bars"
            :key="bar.key"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="bar.fill"
            :opacity="bar.kind === 'unknown' ? 0.35 : hoveredIndex == null || hoveredIndex === index ? 1 : 0.55" />

          <rect
            v-for="(bar, index) in bars"
            :key="`hit-${bar.key}`"
            :x="index * slotWidth"
            y="0"
            :width="slotWidth"
            :height="VIEW_HEIGHT"
            fill="transparent"
            class="cursor-crosshair"
            @mouseenter="hoveredIndex = index" />
        </svg>

        <div
          v-if="hoveredEntry"
          class="pointer-events-none absolute z-10 rounded-lg border border-border-base bg-surface-high px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          :style="tooltipStyle">
          <div class="font-mono text-[9px] font-bold uppercase tracking-widest text-text-ter">
            {{ formatGameDate(hoveredEntry.gameStart) }}
          </div>
          <div class="text-xs font-bold text-text-main">
            <span :class="hoveredEntry.win ? 'text-brand-green' : 'text-brand-red'">
              {{ hoveredEntry.win ? 'Victoire' : 'Défaite' }}
            </span>
            · {{ hoveredEntry.championName }}
            <span class="font-mono text-text-sec">
              {{ hoveredEntry.kills }}/{{ hoveredEntry.deaths }}/{{ hoveredEntry.assists }}
            </span>
          </div>
          <div class="text-xs font-bold" :class="hoveredLpClass">{{ hoveredLpLabel }}</div>
        </div>
      </div>

      <div
        class="mt-3 flex items-center justify-between gap-2 font-mono text-[10px] font-bold tracking-widest uppercase text-text-ter">
        <span>{{ firstLabel }}</span>
        <span>{{ lastLabel }}</span>
      </div>
    </template>
  </div>
</template>
