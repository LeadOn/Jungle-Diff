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
  <section class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <h3 class="m-0 text-xl font-bold tracking-[-0.025em]">Or cumulé</h3>
    <p class="m-0 mt-[3px] truncate text-[12.5px] font-semibold text-text-sec">{{ playerLabel }} — {{ finalGoldLabel }} or en fin de partie</p>

    <div v-if="linePath" class="relative mt-[18px]">
      <span
        v-if="hover"
        role="tooltip"
        class="pointer-events-none absolute -top-1.5 z-[5] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[14px] bg-ink px-[11px] py-[7px] text-ink-text"
        :style="{ left: `${hover.percent}%` }"
      >
        <span class="block font-mono text-[11px] text-on-photo-green">{{ hover.time }}</span>
        <span class="block text-[12.5px] font-bold">{{ hover.value }}</span>
      </span>

      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        preserveAspectRatio="none"
        class="block h-[220px] w-full cursor-crosshair"
        @mousemove="onChartMouseMove"
        @mouseleave="hoverIndex = null"
      >
        <path :d="areaPath" class="fill-brand-gold-bright/26" />
        <path :d="linePath" fill="none" class="stroke-brand-gold-bright" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="HEIGHT" class="stroke-text-main/50" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>

      <!-- Outside the SVG: its non-uniform scaling would stretch a circle into an ellipse. -->
      <span
        v-if="hover"
        class="pointer-events-none absolute -ml-1 -mt-1 size-2 rounded-full bg-brand-gold-bright"
        :style="{ left: `${hover.percent}%`, top: `${(hover.y / HEIGHT) * 100}%` }"
      />
    </div>
    <p v-else class="m-0 mt-[18px] rounded-[14px] border-[1.5px] border-dashed border-border-dashed px-4 py-16 text-center text-[13px] font-semibold text-text-sec">
      Timeline indisponible pour cette partie.
    </p>

    <div class="mt-1.5 flex justify-between font-mono text-[11.5px] text-text-sec">
      <span>00:00</span>
      <span>{{ endLabel }}</span>
    </div>
  </section>
</template>
