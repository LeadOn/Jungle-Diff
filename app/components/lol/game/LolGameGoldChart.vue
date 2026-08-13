<template>
  <div class="border-border-base flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
    <div>
      <p class="font-heading text-text-main text-base font-semibold">
        {{ mode === 'team' ? "Écart d'or entre équipes" : "Or du joueur sélectionné" }}
      </p>
      <p class="text-text-ter mt-0.5 text-[13px]">
        En fin de partie : {{ centerLabel }}
      </p>
    </div>

    <div class="border-border-base inline-flex items-center gap-1 rounded-full border p-1">
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="mode === 'team' ? 'text-text-main bg-white/10 light:bg-black/5' : 'text-text-ter hover:text-text-main'"
        @click="setMode('team')"
      >
        Écart d'équipes
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="mode === 'player' ? 'text-text-main bg-white/10 light:bg-black/5' : 'text-text-ter hover:text-text-main'"
        @click="setMode('player')"
      >
        Joueur sélectionné
      </button>
    </div>
  </div>

  <div class="p-5">
    <div class="relative">
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
        <template v-if="mode === 'team'">
          <line
            x1="0"
            :y1="midY"
            :x2="width"
            :y2="midY"
            class="stroke-[rgba(255,255,255,0.12)] light:stroke-[rgba(0,0,0,0.1)]"
            stroke-width="1"
          />
          <clipPath id="gold-clip-above">
            <rect x="0" y="0" :width="width" :height="midY" />
          </clipPath>
          <clipPath id="gold-clip-below">
            <rect
              x="0"
              :y="midY"
              :width="width"
              :height="height - midY"
            />
          </clipPath>
          <path
            :d="areaPath"
            fill="rgba(45,224,165,0.35)"
            clip-path="url(#gold-clip-above)"
          />
          <path
            :d="areaPath"
            fill="rgba(255,92,116,0.35)"
            clip-path="url(#gold-clip-below)"
          />
          <path
            :d="linePath"
            fill="none"
            class="stroke-[rgba(255,255,255,0.4)] light:stroke-[rgba(0,0,0,0.3)]"
            stroke-width="2"
          />
        </template>
        <template v-else>
          <path :d="areaPath" fill="rgba(240,190,78,0.35)" />
          <path
            :d="linePath"
            fill="none"
            class="stroke-brand-gold"
            stroke-width="2"
          />
        </template>

        <line
          v-if="frames.length > 1"
          :x1="playheadX"
          :x2="playheadX"
          y1="0"
          :y2="height"
          class="stroke-[rgba(255,255,255,0.45)] light:stroke-[rgba(0,0,0,0.3)]"
          stroke-width="1.5"
          stroke-dasharray="4 4"
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

    <div class="text-text-ter mt-1 flex items-center justify-between text-xs">
      <span>{{ startLabel }}</span>
      <span class="text-text-secondary font-medium">{{ centerLabel }}</span>
      <span>{{ endLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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

const width = 800
const height = 220
const midY = height / 2

type Mode = 'team' | 'player'
const mode = ref<Mode>('team')

const setMode = (m: Mode) => {
  mode.value = m
}

const frames = computed(() => props.timeline ?? [])

const series = computed(() => {
  if (mode.value === 'team') {
    return frames.value.map((frame) => {
      const gold1 = props.team1.reduce(
        (sum, p) => sum + (frameStatsFor(frame, p.puuid)?.totalGold ?? 0),
        0
      )
      const gold2 = props.team2.reduce(
        (sum, p) => sum + (frameStatsFor(frame, p.puuid)?.totalGold ?? 0),
        0
      )
      return gold1 - gold2
    })
  }

  return frames.value.map(
    (frame) => frameStatsFor(frame, props.selectedPlayer?.puuid)?.totalGold ?? 0
  )
})

const hoverIndex = ref<number | null>(null)

const onChartMouseMove = (event: MouseEvent) => {
  if (frames.value.length === 0) return

  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const index = Math.round(ratio * (frames.value.length - 1))
  hoverIndex.value = Math.min(frames.value.length - 1, Math.max(0, index))
}

const onChartMouseLeave = () => {
  hoverIndex.value = null
}

const xFor = (index: number): number => {
  const count = frames.value.length
  if (count <= 1) return 0
  return (index / (count - 1)) * width
}

const scale = computed(() => {
  const values = series.value

  if (mode.value === 'team') {
    const max = Math.max(1, ...values.map((v) => Math.abs(v)))
    return (midY - 12) / max
  }

  const max = Math.max(1, ...values)
  return (height - 16) / max
})

const yFor = (value: number): number => {
  if (mode.value === 'team') {
    return midY - value * scale.value
  }

  return height - 6 - value * scale.value
}

const hoverX = computed(() => {
  return hoverIndex.value == null ? undefined : xFor(hoverIndex.value)
})

const hoverY = computed(() => {
  return hoverIndex.value == null ? undefined : yFor(series.value[hoverIndex.value] ?? 0)
})

const hoverPercent = computed(() => {
  return hoverX.value == null ? 0 : (hoverX.value / width) * 100
})

const hoverTimeLabel = computed(() => {
  if (hoverIndex.value == null) return ''
  return formatTimestamp(frames.value[hoverIndex.value]?.timestamp ?? 0)
})

const hoverValueLabel = computed(() => {
  if (hoverIndex.value == null) return ''

  const value = series.value[hoverIndex.value] ?? 0

  if (mode.value === 'team') {
    const side = value >= 0 ? 'équipe bleue' : 'équipe rouge'
    const sign = value >= 0 ? '+' : '-'
    return `${sign}${formatFull(Math.abs(value))} pour l'${side}`
  }

  return `${formatFull(value)} d'or`
})

const linePath = computed(() => {
  const values = series.value
  if (values.length === 0) return ''

  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(v ?? 0)}`)
    .join(' ')
})

const areaPath = computed(() => {
  const values = series.value
  if (values.length === 0) return ''

  const baseline = mode.value === 'team' ? midY : height
  const first = `M ${xFor(0)},${baseline}`
  const line = values
    .map((v, i) => `L ${xFor(i)},${yFor(v ?? 0)}`)
    .join(' ')
  const last = `L ${xFor(values.length - 1)},${baseline}`

  return `${first} ${line} ${last} Z`
})

const playheadX = computed(() => xFor(props.currentFrameIndex))

const startLabel = '00:00'
const endLabel = computed(() => {
  const last = frames.value.at(-1)
  return last ? formatTimestamp(last.timestamp) : '00:00'
})

const centerLabel = computed(() => {
  const values = series.value
  if (values.length === 0) return ''

  const last = values.at(-1) ?? 0

  if (mode.value === 'team') {
    const side = last >= 0 ? 'équipe bleue' : 'équipe rouge'
    const sign = last >= 0 ? '+' : '-'
    return `${sign}${formatFull(Math.abs(last))} pour l'${side}`
  }

  return `${formatFull(last)} d'or`
})
</script>
