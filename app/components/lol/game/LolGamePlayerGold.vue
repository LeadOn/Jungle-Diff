<template>
  <div class="border-border-base border-b px-5 py-4">
    <p class="font-heading text-text-main text-base font-semibold">Or cumulé</p>
    <p class="text-text-ter mt-0.5 truncate text-[13px]">
      {{ playerLabel }} — {{ finalGoldLabel }} or en fin de partie
    </p>
  </div>

  <div class="p-5">
    <div v-if="linePath" class="relative">
      <div
        v-if="hoverIndex != null"
        class="border-border-base bg-surface-base pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs shadow-lg"
        :style="{ left: `${hoverPercent}%` }"
      >
        <p class="text-text-ter">{{ hoverTimeLabel }}</p>
        <p class="text-text-main font-semibold">{{ hoverValueLabel }}</p>
      </div>

      <svg
        :viewBox="`0 0 ${width} ${height}`"
        preserveAspectRatio="none"
        class="h-56 w-full cursor-crosshair"
        @mousemove="onChartMouseMove"
        @mouseleave="onChartMouseLeave"
      >
        <path :d="areaPath" fill="rgba(240,190,78,0.22)" />
        <path
          :d="linePath"
          fill="none"
          class="stroke-brand-gold"
          stroke-width="2"
        />

        <template v-if="hoverIndex != null">
          <line
            :x1="hoverX"
            :x2="hoverX"
            y1="0"
            :y2="height"
            class="stroke-brand-gold"
            stroke-width="1"
          />
          <circle
            :cx="hoverX"
            :cy="hoverY"
            r="4"
            class="fill-brand-gold"
          />
        </template>
      </svg>
    </div>
    <p v-else class="text-text-ter py-16 text-center text-sm">
      Timeline indisponible pour cette partie.
    </p>

    <div class="text-text-ter mt-1 flex items-center justify-between text-xs">
      <span>00:00</span>
      <span>{{ endLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  formatCompact,
  formatFull,
  formatTimestamp,
  frameStatsFor,
  playerFullName,
} from '~/utils/lol-match'

const props = defineProps<{
  player?: LoLGameParticipantDto
  timeline?: LoLGameTimelineFrame[]
}>()

const width = 800
const height = 220

const values = computed(() => {
  const frames = props.timeline ?? []
  return frames.map(
    (frame) => frameStatsFor(frame, props.player?.puuid)?.totalGold ?? 0
  )
})

const endLabel = computed(() => {
  const lastFrame = props.timeline?.[(props.timeline?.length ?? 0) - 1]
  return lastFrame ? formatTimestamp(lastFrame.timestamp) : '00:00'
})

const finalGoldLabel = computed(() => {
  const vals = values.value
  return formatCompact(vals[vals.length - 1] ?? 0)
})

const points = computed(() => {
  const vals = values.value
  if (vals.length < 2) return []

  const max = Math.max(...vals, 1)
  return vals.map((value, index) => ({
    x: (index / (vals.length - 1)) * width,
    y: height - (value / max) * (height - 8),
  }))
})

const linePath = computed(() => {
  const pts = points.value
  if (pts.length < 2) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
})

const areaPath = computed(() => {
  const lp = linePath.value
  if (!lp) return ''
  return `${lp} L${width},${height} L0,${height} Z`
})

const hoverIndex = ref<number | null>(null)

const onChartMouseMove = (event: MouseEvent) => {
  const pts = points.value
  if (pts.length === 0) return

  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const ratio = Math.min(
    1,
    Math.max(0, (event.clientX - rect.left) / rect.width)
  )

  hoverIndex.value = Math.round(ratio * (pts.length - 1))
}

const onChartMouseLeave = () => {
  hoverIndex.value = null
}

const hoverX = computed(() => {
  return hoverIndex.value == null ? undefined : points.value[hoverIndex.value]?.x
})

const hoverY = computed(() => {
  return hoverIndex.value == null ? undefined : points.value[hoverIndex.value]?.y
})

const hoverPercent = computed(() => {
  if (hoverX.value == null) return 0
  return (hoverX.value / width) * 100
})

const hoverTimeLabel = computed(() => {
  if (hoverIndex.value == null || props.timeline == null) return ''
  return formatTimestamp(props.timeline[hoverIndex.value]?.timestamp ?? 0)
})

const hoverValueLabel = computed(() => {
  if (hoverIndex.value == null) return ''
  return `${formatFull(values.value[hoverIndex.value] ?? 0)} or`
})

const playerLabel = computed(() => {
  return props.player ? playerFullName(props.player) : ''
})
</script>
