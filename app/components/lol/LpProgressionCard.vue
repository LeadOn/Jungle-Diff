<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LeagueOfLegendsRank, LoLRankChangeEntryDto } from '~/lib/types'
import { rankScore, tierLabel } from '~/utils/lol-tier'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'
import type { UiSegmentedOption } from '~/components/ui/Segmented.vue'
import LpChangesChart from '~/components/lol/LpChangesChart.vue'

type Queue = 'solo' | 'flex'

const props = defineProps<{
  soloEntries: LeagueOfLegendsRank[]
  flexEntries: LeagueOfLegendsRank[]
  soloChanges: LoLRankChangeEntryDto[]
  flexChanges: LoLRankChangeEntryDto[]
  period: '7j' | '30j' | 'all-time'
  loading?: boolean
  changesLoading?: boolean
}>()

const PERIOD_CAPTION: Record<string, string> = {
  '7j': '7 derniers jours',
  '30j': '30 derniers jours',
  'all-time': 'Depuis toujours',
}

const VIEW_WIDTH = 272
const VIEW_HEIGHT = 96

// The user may pick a queue; until they do, Solo/Duo is shown unless only Flex has data — and not
// while nothing is loaded yet, or the switch would flick to Flex and back on every load. One selector
// drives both charts, so the line and the bars always show the same queue.
const userSelectedQueue = ref<Queue | null>(null)
const selectedQueue = computed<Queue>(() => {
  if (userSelectedQueue.value) return userSelectedQueue.value
  const soloEmpty = props.soloEntries.length === 0 && props.soloChanges.length === 0
  const flexEmpty = props.flexEntries.length === 0 && props.flexChanges.length === 0
  return soloEmpty && !flexEmpty ? 'flex' : 'solo'
})
const QUEUES: UiSegmentedOption<Queue>[] = [
  { value: 'solo', label: 'Solo/Duo' },
  { value: 'flex', label: 'Flex' },
]
const selectQueue = (q: Queue) => {
  userSelectedQueue.value = q
  hoveredIndex.value = null
}

const entries = computed(() => (selectedQueue.value === 'solo' ? props.soloEntries : props.flexEntries))
const changes = computed(() => (selectedQueue.value === 'solo' ? props.soloChanges : props.flexChanges))

const sorted = computed(() =>
  [...entries.value].sort((a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime()),
)

const hasEnoughData = computed(() => sorted.value.length >= 2)

const points = computed(() => {
  const scores = sorted.value.map(rankScore)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = max - min || 1
  return scores.map((v, i) => ({
    x: Math.round((i / Math.max(1, scores.length - 1)) * VIEW_WIDTH * 10) / 10,
    y: Math.round((88 - ((v - min) / span) * 80) * 10) / 10,
  }))
})

const linePath = computed(() => points.value.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' '))
const areaPath = computed(() => (points.value.length ? `${linePath.value} L${VIEW_WIDTH} ${VIEW_HEIGHT} L0 ${VIEW_HEIGHT} Z` : ''))

const netScore = computed(() => {
  const scores = sorted.value.map(rankScore)
  return (scores[scores.length - 1] ?? 0) - (scores[0] ?? 0)
})
const animatedNet = useAnimatedNumber(() => netScore.value)
const trendUp = computed(() => netScore.value >= 0)
const netLabel = computed(() => `${trendUp.value ? '+' : '−'}${Math.abs(Math.round(animatedNet.value))} pts`)

// The markers are HTML over the SVG rather than circles inside it: the chart stretches with
// `preserveAspectRatio="none"`, which would squash a circle into an ellipse.
const toPercent = (p: { x: number, y: number }) => ({ left: `${(p.x / VIEW_WIDTH) * 100}%`, top: `${(p.y / VIEW_HEIGHT) * 100}%` })
const lastPoint = computed(() => points.value[points.value.length - 1])

const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '')
const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

const firstLabel = computed(() => (sorted.value[0] ? formatShortDate(sorted.value[0].createdOn) : ''))
const nowLabel = computed(() => {
  const last = sorted.value[sorted.value.length - 1]
  return last ? `${tierLabel(last)} · ${last.leaguePoints} LP` : ''
})
const caption = computed(() => PERIOD_CAPTION[props.period] ?? PERIOD_CAPTION['30j'])

// Hover: the point nearest the cursor, its date and its rank.
const hoveredIndex = ref<number | null>(null)
const hoveredEntry = computed(() => (hoveredIndex.value != null ? sorted.value[hoveredIndex.value] ?? null : null))
const hoveredPoint = computed(() => (hoveredIndex.value != null ? points.value[hoveredIndex.value] ?? null : null))

// Keeps the tooltip inside the card near the chart's left and right edges.
const tooltipStyle = computed(() => {
  const point = hoveredPoint.value
  if (!point) return {}
  const fraction = point.x / VIEW_WIDTH
  const shift = fraction < 0.2 ? '0' : fraction > 0.8 ? '-100%' : '-50%'
  return { left: `${fraction * 100}%`, transform: `translate(${shift}, -100%)` }
})

function onMouseMove(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const count = points.value.length
  if (!rect.width || count < 2) return
  const fraction = (event.clientX - rect.left) / rect.width
  hoveredIndex.value = Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))))
}
</script>

<template>
  <section aria-labelledby="profile-lp" class="min-w-0 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-4 shadow-card">
    <div class="flex items-baseline justify-between gap-2">
      <h3 id="profile-lp" class="type-title m-0 text-ink">Progression classement</h3>
      <span
        v-if="hasEnoughData && !loading"
        class="fig whitespace-nowrap text-[1.375rem]"
        :class="trendUp ? 'text-win-ink' : 'text-loss-ink'"
      >{{ netLabel }}</span>
    </div>

    <div class="mt-1.5 mb-5 flex items-center justify-between gap-2">
      <span class="type-small text-ink-2">{{ caption }}</span>
      <UiSegmented
        :model-value="selectedQueue"
        :options="QUEUES"
        aria-label="File classée"
        @update:model-value="selectQueue"
      />
    </div>

    <UiSkeleton v-if="loading" class="h-24 rounded-3" />
    <div
      v-else-if="!hasEnoughData"
      class="type-small flex h-24 items-center justify-center rounded-3 border border-dashed border-line-strong px-3 text-center text-ink-2"
    >
      Pas assez de relevés sur cette période.
    </div>
    <template v-else>
      <div class="relative h-24 cursor-crosshair" @mousemove="onMouseMove" @mouseleave="hoveredIndex = null">
        <svg :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`" preserveAspectRatio="none" class="absolute inset-0 size-full overflow-visible">
          <path :d="areaPath" :class="trendUp ? 'fill-win/15' : 'fill-loss/15'" />
          <path
            :key="`${selectedQueue}-${period}`"
            :d="linePath"
            fill="none"
            :class="trendUp ? 'stroke-win' : 'stroke-loss'"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
            stroke-dasharray="1400"
            class="animate-draw"
          />
        </svg>
        <span
          v-if="lastPoint"
          class="absolute -mt-[4.5px] -ml-[4.5px] size-[9px] rounded-full"
          :class="trendUp ? 'bg-win' : 'bg-loss'"
          :style="toPercent(lastPoint)"
        />
        <template v-if="hoveredPoint && hoveredEntry">
          <span class="absolute inset-y-0 w-0 border-l border-dashed border-line-strong" :style="{ left: toPercent(hoveredPoint).left }" />
          <span
            class="absolute -mt-[5.5px] -ml-[5.5px] size-[11px] rounded-full border-2 border-surface shadow-hair"
            :class="trendUp ? 'bg-win' : 'bg-loss'"
            :style="toPercent(hoveredPoint)"
          />
          <span role="tooltip" class="pointer-events-none absolute -top-2 z-10 grid gap-0.5 whitespace-nowrap rounded-3 bg-night px-2.5 py-2 text-on-night shadow-float" :style="tooltipStyle">
            <span class="block font-mono text-[11px] text-on-night-2">{{ formatLongDate(hoveredEntry.createdOn) }}</span>
            <span class="block text-[0.8125rem] font-[640]">{{ tierLabel(hoveredEntry) }} {{ hoveredEntry.leaguePoints }} LP</span>
          </span>
        </template>
      </div>
      <div class="mt-2.5 flex justify-between gap-2 border-t border-dashed border-line-strong pt-2.5">
        <span class="type-mono text-ink-3">{{ firstLabel }}</span>
        <span class="text-[0.75rem] font-[640] text-ink">{{ nowLabel }}</span>
      </div>
    </template>

    <div class="mt-5 border-t border-line pt-4">
      <LpChangesChart :entries="changes" :loading="changesLoading" />
    </div>
  </section>
</template>
