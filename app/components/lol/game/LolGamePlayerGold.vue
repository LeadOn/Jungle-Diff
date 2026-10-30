<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { formatCompact, formatFull, formatTimestamp, frameStatsFor, playerRiotName } from '~/utils/lol-match'

const props = defineProps<{
  player?: LoLGameParticipantDto
  timeline?: LoLGameTimelineFrame[]
}>()

const WIDTH = 800
const HEIGHT = 220

const frames = computed(() => props.timeline ?? [])
const values = computed(() => frames.value.map(frame => frameStatsFor(frame, props.player?.puuid)?.totalGold ?? 0))

const endLabel = computed(() => formatTimestamp(frames.value.at(-1)?.timestamp ?? 0))
const finalGoldLabel = computed(() => formatCompact(values.value.at(-1) ?? 0))
const playerLabel = computed(() => (props.player ? playerRiotName(props.player) : ''))

const points = computed(() => {
  const vals = values.value
  if (vals.length < 2) return []
  const max = Math.max(...vals, 1)
  return vals.map((value, index) => ({
    x: (index / (vals.length - 1)) * WIDTH,
    y: HEIGHT - 6 - (value / max) * (HEIGHT - 16),
  }))
})

const linePath = computed(() => points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const areaPath = computed(() => (linePath.value ? `${linePath.value} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z` : ''))

const hoverIndex = ref<number | null>(null)

const onChartMouseMove = (event: MouseEvent) => {
  if (points.value.length === 0) return
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  hoverIndex.value = Math.round(ratio * (points.value.length - 1))
}

const hover = computed(() => {
  const index = hoverIndex.value
  const point = index == null ? undefined : points.value[index]
  if (index == null || point == null) return null
  return {
    ...point,
    percent: (point.x / WIDTH) * 100,
    time: formatTimestamp(frames.value[index]?.timestamp ?? 0),
    value: `${formatFull(values.value[index] ?? 0)} or`,
  }
})
</script>

<template>
  <section class="rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <h3 class="m-0 type-title text-ink">Or cumulé</h3>
    <p class="m-0 mt-0.5 truncate type-small text-ink-2">{{ playerLabel }} — {{ finalGoldLabel }} or en fin de partie</p>

    <div v-if="linePath" class="relative mt-4">
      <span
        v-if="hover"
        role="tooltip"
        class="pointer-events-none absolute -top-1.5 z-[5] grid -translate-x-1/2 -translate-y-full gap-0.5 whitespace-nowrap rounded-2 bg-night px-2.5 py-2 text-on-night shadow-float"
        :style="{ left: `${hover.percent}%` }"
      >
        <span class="type-mono text-[0.6875rem] text-on-night-2">{{ hover.time }}</span>
        <span class="text-[0.8125rem] font-semibold">{{ hover.value }}</span>
      </span>

      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        preserveAspectRatio="none"
        class="block h-[220px] w-full cursor-crosshair"
        @mousemove="onChartMouseMove"
        @mouseleave="hoverIndex = null"
      >
        <path :d="areaPath" class="fill-canopy/20" />
        <path :d="linePath" fill="none" class="stroke-canopy" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="HEIGHT" class="stroke-ink/60" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>

      <!-- Outside the SVG: its non-uniform scaling would stretch a circle into an ellipse. -->
      <span
        v-if="hover"
        class="pointer-events-none absolute -ml-1 -mt-1 size-2 rounded-full bg-ink ring-2 ring-surface"
        :style="{ left: `${hover.percent}%`, top: `${(hover.y / HEIGHT) * 100}%` }"
      />
    </div>
    <p v-else class="m-0 mt-4 rounded-3 border border-dashed border-line-strong px-4 py-16 text-center type-small text-ink-2">
      Timeline indisponible pour cette partie.
    </p>

    <div class="mt-1.5 flex justify-between type-mono text-ink-3">
      <span>00:00</span>
      <span>{{ endLabel }}</span>
    </div>
  </section>
</template>
