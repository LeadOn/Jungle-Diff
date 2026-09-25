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
  <section class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="m-0 text-xl font-bold tracking-[-0.025em]">{{ title }}</h3>
        <p class="m-0 mt-[3px] text-[12.5px] font-semibold text-text-sec">En fin de partie : {{ endValueLabel }}</p>
      </div>
      <div role="group" aria-label="Série affichée" class="flex rounded-full border border-border-subtle bg-surface-muted p-[3px]">
        <button
          v-for="m in MODES"
          :key="m.value"
          type="button"
          :aria-pressed="mode === m.value"
          class="cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors duration-200"
          :class="mode === m.value ? 'bg-inverse text-inverse-text' : 'text-text-main'"
          @click="mode = m.value; hoverIndex = null"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <div class="relative mt-[18px]">
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
        <template v-if="mode === 'team'">
          <clipPath :id="`${clipId}-up`">
            <rect x="0" y="0" :width="WIDTH" :height="MID_Y" />
          </clipPath>
          <clipPath :id="`${clipId}-down`">
            <rect x="0" :y="MID_Y" :width="WIDTH" :height="HEIGHT - MID_Y" />
          </clipPath>
          <line x1="0" :y1="MID_Y" :x2="WIDTH" :y2="MID_Y" class="stroke-border-accent" stroke-width="1" vector-effect="non-scaling-stroke" />
          <path :d="areaPath" class="fill-win/30" :clip-path="`url(#${clipId}-up)`" />
          <path :d="areaPath" class="fill-loss/28" :clip-path="`url(#${clipId}-down)`" />
          <path :d="linePath" fill="none" class="stroke-text-main/55" stroke-width="2" vector-effect="non-scaling-stroke" />
        </template>
        <template v-else>
          <path :d="areaPath" class="fill-brand-gold-bright/28" />
          <path :d="linePath" fill="none" class="stroke-brand-gold-bright" stroke-width="2" vector-effect="non-scaling-stroke" />
        </template>

        <line
          v-if="frames.length > 1"
          :x1="playheadX"
          :x2="playheadX"
          y1="0"
          :y2="HEIGHT"
          class="stroke-text-main/40"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          vector-effect="non-scaling-stroke"
        />

        <line v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="HEIGHT" class="stroke-brand-gold-bright" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>

      <!-- Outside the SVG: its non-uniform scaling would stretch a circle into an ellipse. -->
      <span
        v-if="hover"
        class="pointer-events-none absolute -ml-1 -mt-1 size-2 rounded-full bg-brand-gold-bright"
        :style="{ left: `${hover.percent}%`, top: `${(hover.y / HEIGHT) * 100}%` }"
      />
    </div>

    <div class="mt-1.5 flex justify-between font-mono text-[11.5px] text-text-sec">
      <span>00:00</span>
      <span>{{ endLabel }}</span>
    </div>
  </section>
</template>
