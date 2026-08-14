<template>
  <div class="border-border-base border-b px-5 py-4">
    <p class="font-heading text-text-main text-base font-semibold">Profil de jeu</p>
    <p class="text-text-ter mt-0.5 text-[13px]">
      6 axes normalisés sur les {{ players.length }} joueurs de la partie
    </p>
  </div>

  <div class="p-5">
    <svg
      :viewBox="`0 0 ${size} ${size}`"
      class="mx-auto block h-64 w-full max-w-[340px]"
    >
      <polygon
        v-for="(ring, index) in gridPolygons"
        :key="'ring-' + index"
        :points="ring"
        fill="none"
        class="stroke-[rgba(255,255,255,0.15)] light:stroke-[rgba(0,0,0,0.15)]"
        stroke-width="1"
      />

      <line
        v-for="(spoke, index) in spokes"
        :key="'spoke-' + index"
        :x1="size / 2"
        :y1="size / 2"
        :x2="spoke.x"
        :y2="spoke.y"
        class="stroke-[rgba(255,255,255,0.15)] light:stroke-[rgba(0,0,0,0.15)]"
        stroke-width="1"
      />

      <polygon
        v-if="averagePolygon"
        :points="averagePolygon"
        fill="none"
        class="stroke-text-ter"
        stroke-width="1.5"
        stroke-dasharray="4 4"
      />

      <template v-if="playerPolygon">
        <polygon
          :points="playerPolygon"
          fill="rgba(240,190,78,0.18)"
          class="stroke-brand-gold"
          stroke-width="2"
        />

        <template v-for="(vertex, index) in playerVertices" :key="'vertex-' + index">
          <circle
            :cx="vertex.x"
            :cy="vertex.y"
            :r="hoverIndex === index ? 5 : 3"
            class="fill-brand-gold"
          />
          <!-- Invisible, generously sized hit area for the dot above. -->
          <circle
            :cx="vertex.x"
            :cy="vertex.y"
            r="14"
            fill="transparent"
            class="cursor-pointer"
            @mouseenter="onVertexEnter(index)"
            @mouseleave="onVertexLeave"
          />
        </template>
      </template>

      <g
        v-if="hoveredVertex != null"
        class="pointer-events-none"
        :transform="`translate(${hoveredVertex.x},${hoveredVertex.y})`"
      >
        <rect
          :x="-hoveredVertex.tooltipWidth / 2"
          y="-48"
          :width="hoveredVertex.tooltipWidth"
          height="38"
          rx="6"
          class="fill-surface-base stroke-border-base"
          stroke-width="1"
        />
        <text
          x="0"
          y="-32"
          text-anchor="middle"
          class="fill-text-main text-[12px] font-semibold"
        >
          {{ hoveredVertex.label }} · {{ hoveredVertex.valueLabel }}
        </text>
        <text
          x="0"
          y="-18"
          text-anchor="middle"
          class="fill-text-ter text-[10px]"
        >
          {{ hoveredVertex.averageLabel }}
        </text>
      </g>

      <text
        v-for="axis in axisPoints"
        :key="axis.label"
        :x="axis.labelX"
        :y="axis.labelY"
        :text-anchor="axis.anchor"
        class="fill-text-ter text-[10px] font-semibold"
      >
        {{ axis.label }}
      </text>
    </svg>

    <div
      class="text-text-ter mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs"
    >
      <span class="flex items-center gap-1.5">
        <span class="bg-brand-gold h-2.5 w-2.5 rounded-sm"></span>
        {{ playerLabel }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="border-text-ter w-4 border-t-2 border-dashed"></span>
        Moyenne de la partie
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  creepScoreFor,
  damageToChampionsFor,
  formatFull,
  goldEarnedFor,
  killParticipationFor,
  latestStatsFor,
  playerDisplayName,
} from '~/utils/lol-match'

const props = defineProps<{
  player?: LoLGameParticipantDto
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
}>()

interface RadarAxis {
  label: string
  valueFn: (player: LoLGameParticipantDto) => number
  formatFn?: (value: number) => string
}

interface RadarVertex {
  x: number
  y: number
  label: string
  valueLabel: string
  averageLabel: string
  tooltipWidth: number
}

interface AxisPoint {
  label: string
  x: number
  y: number
  labelX: number
  labelY: number
  anchor: 'start' | 'middle' | 'end'
}

const size = 300
const CENTER = size / 2
const RADIUS = 88
const RINGS = [0.25, 0.5, 0.75, 1]

const axes = computed<RadarAxis[]>(() => [
  {
    label: 'Dégâts',
    valueFn: (p) => damageToChampionsFor(p, props.timeline),
    formatFn: formatFull,
  },
  {
    label: 'Or',
    valueFn: (p) => goldEarnedFor(p, props.timeline),
    formatFn: formatFull,
  },
  { label: 'CS', valueFn: (p) => creepScoreFor(p, props.timeline) },
  { label: 'Vision', valueFn: (p) => p.visionScore ?? 0 },
  {
    label: 'Participation',
    valueFn: (p) =>
      killParticipationFor(
        p,
        props.players.filter((other) => other.teamId === p.teamId)
      ),
    formatFn: (value) => `${Math.round(value)}%`,
  },
  {
    label: 'Encaissé',
    valueFn: (p) =>
      p.stats?.damageTaken ??
      latestStatsFor(props.timeline, p.puuid)?.totalDamageTaken ??
      0,
    formatFn: formatFull,
  },
])

const pointAt = (index: number, ratio: number): { x: number; y: number } => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.value.length
  const r = RADIUS * Math.max(0, Math.min(1.35, ratio))

  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  }
}

const toPolygon = (points: { x: number; y: number }[]): string => {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

const gridPolygons = computed(() => {
  return RINGS.map((ring) =>
    toPolygon(axes.value.map((_, index) => pointAt(index, ring)))
  )
})

const spokes = computed(() => {
  return axes.value.map((_, index) => pointAt(index, 1))
})

const axisPoints = computed<AxisPoint[]>(() => {
  return axes.value.map((axis, index) => {
    const outer = pointAt(index, 1)
    const label = pointAt(index, 1.28)
    const dx = label.x - CENTER

    return {
      label: axis.label,
      x: outer.x,
      y: outer.y,
      labelX: label.x,
      labelY: label.y + 3,
      anchor: Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end',
    }
  })
})

const playerVerticesData = computed(() => {
  if (props.player == null || props.players.length === 0) {
    return { playerVertices: [], playerPolygon: '', averagePolygon: '' }
  }

  const p = props.player
  const averageRatios: number[] = []
  const vertices: RadarVertex[] = []

  axes.value.forEach((axis, index) => {
    const values = props.players.map((x) => axis.valueFn(x))
    const max = Math.max(...values, 0)
    const average = values.reduce((sum, v) => sum + v, 0) / values.length
    const value = axis.valueFn(p)
    const format = axis.formatFn ?? ((v: number) => Math.round(v).toString())

    averageRatios.push(max > 0 ? average / max : 0)

    const point = pointAt(index, max > 0 ? value / max : 0)
    const valueLabel = format(value)
    const averageLabel = `moy. ${format(average)}`

    vertices.push({
      ...point,
      label: axis.label,
      valueLabel,
      averageLabel,
      tooltipWidth:
        Math.max(
          `${axis.label} · ${valueLabel}`.length,
          averageLabel.length
        ) *
          6.4 +
        18,
    })
  })

  return {
    playerVertices: vertices,
    playerPolygon: toPolygon(vertices),
    averagePolygon: toPolygon(
      averageRatios.map((ratio, index) => pointAt(index, ratio))
    ),
  }
})

const playerVertices = computed(() => playerVerticesData.value.playerVertices)
const playerPolygon = computed(() => playerVerticesData.value.playerPolygon)
const averagePolygon = computed(() => playerVerticesData.value.averagePolygon)

const hoverIndex = ref<number | null>(null)

const onVertexEnter = (index: number) => {
  hoverIndex.value = index
}

const onVertexLeave = () => {
  hoverIndex.value = null
}

const hoveredVertex = computed<RadarVertex | null>(() => {
  return hoverIndex.value == null
    ? null
    : (playerVertices.value[hoverIndex.value] ?? null)
})

const playerLabel = computed(() => {
  return props.player ? playerDisplayName(props.player) : ''
})
</script>
