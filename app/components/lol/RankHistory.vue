<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Chart, type ChartDataset } from 'chart.js/auto'
import type { LeagueOfLegendsRank, LoLRankHistoryGranularity } from '~/lib/types'
import { tierLabel, APEX_TIERS } from '~/utils/lol-tier'

const props = defineProps<{
  rankHistory: LeagueOfLegendsRank[]
  granularity: LoLRankHistoryGranularity
}>()

const rankHistoryChart = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const SERIES_COLORS = {
  // Use tailwind dark mode colors directly via CSS or just hardcode suitable ones
  light: { solo: '#4d6ce5', flex: '#0ea47a' },
  dark: { solo: '#6b8afb', flex: '#1b998b' },
}

const GRID_COLOR = 'rgba(156, 163, 175, 0.15)'
const AVERAGE_LINE_COLOR = 'rgba(156, 163, 175, 0.5)'

const TIER_BASE_POINTS: [string, number][] = [
  ['IRON', 0],
  ['BRONZE', 400],
  ['SILVER', 800],
  ['GOLD', 1200],
  ['PLATINUM', 1600],
  ['EMERALD', 2000],
  ['DIAMOND', 2400],
  ['MASTER', 2800],
  ['GRANDMASTER', 3200],
  ['CHALLENGER', 3600],
]
const DIVISION_POINTS: Record<string, number> = { I: 300, II: 200, III: 100, IV: 0 }

interface RankPoint {
  x: number;
  y: number;
  entry: LeagueOfLegendsRank;
}

function periodStart(date: Date, granularity: LoLRankHistoryGranularity): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)

  switch (granularity) {
    case 'Day':
      return d.getTime()
    case 'Week': {
      const mondayOffset = (d.getDay() + 6) % 7
      d.setDate(d.getDate() - mondayOffset)
      return d.getTime()
    }
    case 'Month':
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const averageLinePlugin = {
  id: 'averageLine',
  afterDatasetsDraw(chart: any) {
    const { ctx, chartArea, scales } = chart

    if (chartArea == null) {
      return
    }

    const values = chart.data.datasets
      .flatMap((dataset: any) => dataset.data)
      .filter((value: number | null) => value != null) as number[]

    if (values.length === 0) {
      return
    }

    const average = values.reduce((a: number, b: number) => a + b, 0) / values.length
    const y = scales['y'].getPixelForValue(average)

    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = AVERAGE_LINE_COLOR
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()
    ctx.restore()
  },
}

function scoreFor(entry: LeagueOfLegendsRank): number {
  const tier = entry.tier?.toUpperCase() ?? ''
  const division = entry.rank?.toUpperCase() ?? ''
  const base = TIER_BASE_POINTS.find(([name]) => name === tier)?.[1] ?? 0
  const divisionPoints = APEX_TIERS.has(tier) ? 0 : (DIVISION_POINTS[division] ?? 0)
  return base + divisionPoints + entry.leaguePoints
}

function toPoints(entries: LeagueOfLegendsRank[]): RankPoint[] {
  return entries
    .map((entry) => ({
      x: periodStart(new Date(entry.createdOn), props.granularity),
      y: scoreFor(entry),
      entry,
    }))
    .sort((a, b) => a.x - b.x)
}

function rebuildChart() {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  if (!props.rankHistory || props.rankHistory.length === 0 || !rankHistoryChart.value) {
    return
  }

  const soloPoints = toPoints(props.rankHistory.filter((h) => h.queueType === 'RANKED_SOLO_5x5'))
  const flexPoints = toPoints(props.rankHistory.filter((h) => h.queueType === 'RANKED_FLEX_SR'))

  // We are in tailwind v4, for simplicity assume dark mode colors
  // The system handles dark mode class, ideally we'd detect it, but since jungle-diff forces dark/light we can just pick dark for now or rely on a media query.
  // Actually, we can check if document.documentElement.classList.contains('dark')
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  const colors = isDark ? SERIES_COLORS.dark : SERIES_COLORS.light

  const timestamps = Array.from(new Set([...soloPoints, ...flexPoints].map((p) => p.x))).sort((a, b) => a - b)

  const alignToTimeline = (points: RankPoint[]) => {
    const byTimestamp = new Map(points.map((p) => [p.x, p]))
    return {
      data: timestamps.map((t) => byTimestamp.get(t)?.y ?? null),
      entries: timestamps.map((t) => byTimestamp.get(t)?.entry ?? null),
    }
  }

  const buildDataset = (label: string, points: RankPoint[], color: string): ChartDataset<'line'> => {
    const { data, entries } = alignToTimeline(points)

    let lastIndex = -1
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] != null) {
        lastIndex = i
        break
      }
    }

    return {
      label,
      data,
      entries,
      borderColor: color,
      backgroundColor: (context: any) => {
        const { ctx, chartArea } = context.chart
        if (!chartArea) return hexToRgba(color, 0.2)
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, hexToRgba(color, 0.25))
        gradient.addColorStop(1, hexToRgba(color, 0))
        return gradient
      },
      borderWidth: 2.5,
      pointBackgroundColor: color,
      pointBorderColor: color,
      pointBorderWidth: 0,
      pointRadius: (context: any) => (context.dataIndex === lastIndex ? 4 : 0),
      pointHoverRadius: 5,
      tension: 0.35,
      cubicInterpolationMode: 'monotone',
      fill: true,
      spanGaps: true,
    } as any
  }

  const datasets: ChartDataset<'line'>[] = []
  if (soloPoints.length > 0) datasets.push(buildDataset('Solo 5v5', soloPoints, colors.solo))
  if (flexPoints.length > 0) datasets.push(buildDataset('Flex 5v5', flexPoints, colors.flex))

  chartInstance = new Chart(rankHistoryChart.value, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets,
    },
    plugins: [averageLinePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid: { display: true, color: GRID_COLOR, drawTicks: false },
          border: { display: false },
          ticks: { display: false, maxTicksLimit: 3 },
        },
      },
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            boxWidth: 6,
            boxHeight: 6,
            color: 'rgba(156, 163, 175, 0.9)',
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: 10,
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            title: (context: any[]) => {
              if (!context || !context[0]) return ''
              const timestamp = timestamps[context[0].dataIndex]
              if (!timestamp) return ''
              return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' }).format(new Date(timestamp))
            },
            label: (context) => {
              const entry = (context.dataset as any).entries?.[context.dataIndex] as LeagueOfLegendsRank | null
              if (entry == null) return ''
              return `${context.dataset.label}: ${tierLabel(entry)} · ${entry.leaguePoints} LP`
            },
          },
        },
      },
    },
  })
}

onMounted(() => {
  rebuildChart()
})

watch(() => [props.rankHistory, props.granularity], () => {
  rebuildChart()
}, { deep: true })

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<template>
  <div class="h-64 w-full">
    <canvas ref="rankHistoryChart"></canvas>
  </div>
</template>
