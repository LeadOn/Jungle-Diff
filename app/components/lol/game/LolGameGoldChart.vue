<script setup lang="ts">
import { ref, computed, useId } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { formatFull, formatTimestamp, frameStatsFor } from '~/utils/lol-match'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  team1: LoLGameParticipantDto[]
  team2: LoLGameParticipantDto[]
  selectedPlayer?: LoLGameParticipantDto
  currentFrameIndex: number
}>()

const WIDTH = 800
const HEIGHT = 220
const MID_Y = HEIGHT / 2

type Mode = 'team' | 'player'
const MODES: { value: Mode, label: string }[] = [
  { value: 'team', label: 'Écart d\'équipes' },
  { value: 'player', label: 'Joueur sélectionné' },
]
const mode = ref<Mode>('team')

const onModeChange = (value: Mode) => {
  mode.value = value
  hoverIndex.value = null
}

// Clip paths are document-wide ids: one per instance, so two charts never share a mask.
const clipId = useId()

const frames = computed(() => props.timeline ?? [])

const series = computed(() => {
  if (mode.value === 'team') {
    return frames.value.map((frame) => {
      const gold1 = props.team1.reduce((sum, p) => sum + (frameStatsFor(frame, p.puuid)?.totalGold ?? 0), 0)
      const gold2 = props.team2.reduce((sum, p) => sum + (frameStatsFor(frame, p.puuid)?.totalGold ?? 0), 0)
      return gold1 - gold2
    })
  }
  return frames.value.map(frame => frameStatsFor(frame, props.selectedPlayer?.puuid)?.totalGold ?? 0)
})

const xFor = (index: number): number => {
  const count = frames.value.length
  return count <= 1 ? 0 : (index / (count - 1)) * WIDTH
}

const scale = computed(() => {
  const values = series.value
  if (mode.value === 'team') return (MID_Y - 12) / Math.max(1, ...values.map(v => Math.abs(v)))
  return (HEIGHT - 16) / Math.max(1, ...values)
})

const yFor = (value: number): number => (mode.value === 'team' ? MID_Y - value * scale.value : HEIGHT - 6 - value * scale.value)

const valueLabel = (value: number): string => {
  if (mode.value === 'team') {
    const side = value >= 0 ? 'équipe bleue' : 'équipe rouge'
    return `${value >= 0 ? '+' : '−'}${formatFull(Math.abs(value))} pour l'${side}`
  }
  return `${formatFull(value)} d'or`
}

const title = computed(() => (mode.value === 'team' ? 'Écart d\'or entre équipes' : 'Or du joueur sélectionné'))
const endValueLabel = computed(() => (series.value.length > 0 ? valueLabel(series.value.at(-1) ?? 0) : ''))

const linePath = computed(() => series.value.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' '))

const areaPath = computed(() => {
  const values = series.value
  if (values.length === 0) return ''
  const baseline = mode.value === 'team' ? MID_Y : HEIGHT
  const line = values.map((v, i) => `L ${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ')
  return `M ${xFor(0)},${baseline} ${line} L ${xFor(values.length - 1)},${baseline} Z`
})

const playheadX = computed(() => xFor(props.currentFrameIndex))

const hoverIndex = ref<number | null>(null)

const onChartMouseMove = (event: MouseEvent) => {
  if (frames.value.length === 0) return
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  hoverIndex.value = Math.round(ratio * (frames.value.length - 1))
}

const hover = computed(() => {
  const index = hoverIndex.value
  if (index == null) return null
  const value = series.value[index] ?? 0
  const x = xFor(index)
  return {
    x,
    y: yFor(value),
    percent: (x / WIDTH) * 100,
    time: formatTimestamp(frames.value[index]?.timestamp ?? 0),
    value: valueLabel(value),
  }
})

const endLabel = computed(() => formatTimestamp(frames.value.at(-1)?.timestamp ?? 0))
</script>

<template>
  <section class="rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="m-0 type-title text-ink">{{ title }}</h3>
        <p class="m-0 mt-0.5 type-small text-ink-2">En fin de partie : {{ endValueLabel }}</p>
      </div>
      <UiSegmented
        :model-value="mode"
        :options="MODES"
        aria-label="Série affichée"
        @update:model-value="onModeChange"
      />
    </div>

    <div class="relative mt-4">
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
        <!-- A side is not a result: above the line the blue side leads, below it the red side. -->
        <template v-if="mode === 'team'">
          <clipPath :id="`${clipId}-up`">
            <rect x="0" y="0" :width="WIDTH" :height="MID_Y" />
          </clipPath>
          <clipPath :id="`${clipId}-down`">
            <rect x="0" :y="MID_Y" :width="WIDTH" :height="HEIGHT - MID_Y" />
          </clipPath>
          <line x1="0" :y1="MID_Y" :x2="WIDTH" :y2="MID_Y" class="stroke-line-strong" stroke-width="1" vector-effect="non-scaling-stroke" />
          <path :d="areaPath" class="fill-side-blue/25" :clip-path="`url(#${clipId}-up)`" />
          <path :d="areaPath" class="fill-side-red/25" :clip-path="`url(#${clipId}-down)`" />
          <path :d="linePath" fill="none" class="stroke-ink/55" stroke-width="2" vector-effect="non-scaling-stroke" />
        </template>
        <template v-else>
          <path :d="areaPath" class="fill-canopy/20" />
          <path :d="linePath" fill="none" class="stroke-canopy" stroke-width="2" vector-effect="non-scaling-stroke" />
        </template>

        <line
          v-if="frames.length > 1"
          :x1="playheadX"
          :x2="playheadX"
          y1="0"
          :y2="HEIGHT"
          class="stroke-ink/40"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          vector-effect="non-scaling-stroke"
        />

        <line v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="HEIGHT" class="stroke-ink/60" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>

      <!-- Outside the SVG: its non-uniform scaling would stretch a circle into an ellipse. -->
      <span
        v-if="hover"
        class="pointer-events-none absolute -ml-1 -mt-1 size-2 rounded-full bg-ink ring-2 ring-surface"
        :style="{ left: `${hover.percent}%`, top: `${(hover.y / HEIGHT) * 100}%` }"
      />
    </div>

    <div class="mt-1.5 flex justify-between type-mono text-ink-3">
      <span>00:00</span>
      <span>{{ endLabel }}</span>
    </div>
  </section>
</template>
