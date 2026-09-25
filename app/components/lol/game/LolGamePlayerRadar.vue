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
  playerRiotName,
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

const SIZE = 300
const CENTER = SIZE / 2
const RADIUS = 88
const RINGS = [0.25, 0.5, 0.75, 1]

const axes = computed<RadarAxis[]>(() => [
  { label: 'Dégâts', valueFn: p => damageToChampionsFor(p, props.timeline), formatFn: formatFull },
  { label: 'Or', valueFn: p => goldEarnedFor(p, props.timeline), formatFn: formatFull },
  { label: 'CS', valueFn: p => creepScoreFor(p, props.timeline) },
  { label: 'Vision', valueFn: p => p.visionScore ?? 0 },
  {
    label: 'Participation',
    valueFn: p => killParticipationFor(p, props.players.filter(other => other.teamId === p.teamId)),
    formatFn: value => `${Math.round(value)} %`,
  },
  {
    label: 'Encaissé',
    valueFn: p => p.stats?.damageTaken ?? latestStatsFor(props.timeline, p.puuid)?.totalDamageTaken ?? 0,
    formatFn: formatFull,
  },
])

const pointAt = (index: number, ratio: number) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.value.length
  const r = RADIUS * Math.max(0, Math.min(1.35, ratio))
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
}

const toPolygon = (points: { x: number, y: number }[]) => points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

const gridPolygons = computed(() => RINGS.map(ring => toPolygon(axes.value.map((_, index) => pointAt(index, ring)))))

const spokes = computed(() => axes.value.map((_, index) => pointAt(index, 1)))

const axisLabels = computed(() => axes.value.map((axis, index) => {
  const label = pointAt(index, 1.3)
  const dx = label.x - CENTER
  return {
    label: axis.label,
    x: label.x,
    y: label.y + 4,
    anchor: Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end',
  }
}))

const radar = computed(() => {
  if (props.player == null || props.players.length === 0) {
    return { vertices: [] as RadarVertex[], playerPolygon: '', averagePolygon: '' }
  }

  const p = props.player
  const averageRatios: number[] = []
  const vertices: RadarVertex[] = []

  axes.value.forEach((axis, index) => {
    const values = props.players.map(x => axis.valueFn(x))
    const max = Math.max(...values, 0)
    const average = values.reduce((sum, v) => sum + v, 0) / values.length
    const value = axis.valueFn(p)
    const format = axis.formatFn ?? ((v: number) => Math.round(v).toString())

    averageRatios.push(max > 0 ? average / max : 0)

    const valueLabel = format(value)
    const averageLabel = `moy. ${format(average)}`

    vertices.push({
      ...pointAt(index, max > 0 ? value / max : 0),
      label: axis.label,
      valueLabel,
      averageLabel,
      tooltipWidth: Math.max(`${axis.label} · ${valueLabel}`.length, averageLabel.length) * 6.4 + 22,
    })
  })

  return {
    vertices,
    playerPolygon: toPolygon(vertices),
    averagePolygon: toPolygon(averageRatios.map((ratio, index) => pointAt(index, ratio))),
  }
})

const hoverIndex = ref<number | null>(null)
const hoveredVertex = computed(() => (hoverIndex.value == null ? null : (radar.value.vertices[hoverIndex.value] ?? null)))

const playerLabel = computed(() => (props.player ? playerRiotName(props.player) : ''))
</script>

<template>
  <section class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <h3 class="m-0 text-xl font-bold tracking-[-0.025em]">Profil de jeu</h3>
    <p class="m-0 mt-[3px] text-[12.5px] font-semibold text-text-sec">6 axes normalisés sur les {{ players.length }} joueurs de la partie</p>

    <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="mx-auto mt-3 block h-[260px] w-full max-w-[340px] overflow-visible">
      <polygon
        v-for="(ring, index) in gridPolygons"
        :key="'ring-' + index"
        :points="ring"
        fill="none"
        class="stroke-border-accent"
        stroke-width="1"
      />
      <line
        v-for="(spoke, index) in spokes"
        :key="'spoke-' + index"
        :x1="CENTER"
        :y1="CENTER"
        :x2="spoke.x"
        :y2="spoke.y"
        class="stroke-border-accent"
        stroke-width="1"
      />

      <polygon v-if="radar.averagePolygon" :points="radar.averagePolygon" fill="none" class="stroke-text-sec" stroke-width="1.5" stroke-dasharray="4 4" />

      <template v-if="radar.playerPolygon">
        <polygon :points="radar.playerPolygon" class="fill-brand-gold-bright/28 stroke-brand-gold-bright" stroke-width="2" stroke-linejoin="round" />
        <template v-for="(vertex, index) in radar.vertices" :key="'vertex-' + index">
          <circle :cx="vertex.x" :cy="vertex.y" :r="hoverIndex === index ? 5 : 3.5" class="fill-surface-base stroke-brand-gold-bright" stroke-width="2" />
          <!-- Invisible, generously sized hit area for the dot above. -->
          <circle
            :cx="vertex.x"
            :cy="vertex.y"
            r="14"
            fill="transparent"
            class="cursor-pointer"
            @mouseenter="hoverIndex = index"
            @mouseleave="hoverIndex = null"
          />
        </template>
      </template>

      <text
        v-for="axis in axisLabels"
        :key="axis.label"
        :x="axis.x"
        :y="axis.y"
        :text-anchor="axis.anchor"
        class="fill-text-main text-[11px] font-bold"
      >{{ axis.label }}</text>

      <g v-if="hoveredVertex" class="pointer-events-none" :transform="`translate(${hoveredVertex.x},${hoveredVertex.y})`">
        <rect :x="-hoveredVertex.tooltipWidth / 2" y="-50" :width="hoveredVertex.tooltipWidth" height="40" rx="12" class="fill-ink" />
        <text x="0" y="-33" text-anchor="middle" class="fill-ink-text text-[12px] font-bold">{{ hoveredVertex.label }} · {{ hoveredVertex.valueLabel }}</text>
        <text x="0" y="-18" text-anchor="middle" class="fill-on-photo-green font-mono text-[10.5px]">{{ hoveredVertex.averageLabel }}</text>
      </g>
    </svg>

    <div class="mt-2.5 flex flex-wrap justify-center gap-x-[18px] gap-y-1.5 text-xs font-bold">
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-brand-gold-bright" />{{ playerLabel }}</span>
      <span class="flex items-center gap-1.5 text-text-sec"><span class="w-4 border-t-2 border-dashed border-text-sec" />Moyenne de la partie</span>
    </div>
  </section>
</template>
