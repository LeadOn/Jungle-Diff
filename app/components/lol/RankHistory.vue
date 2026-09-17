<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, type ChartDataset, type ScriptableContext, type TooltipItem } from 'chart.js/auto'
import type { LeagueOfLegendsRank, LoLRankHistoryGranularity } from '~/lib/types'
import { tierLabel, rankScore } from '~/utils/lol-tier'

/**
 * Each dataset carries the rank entry behind every point so the tooltip can render the tier and LP.
 * Chart.js has no slot for custom dataset fields, hence this local extension of its own type.
 */
type RankDataset = ChartDataset<'line', (number | null)[]> & {
  entries: (LeagueOfLegendsRank | null)[]
}

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
  afterDatasetsDraw(chart: Chart<'line'>) {
    const { ctx, chartArea, scales } = chart

    if (chartArea == null) {
      return
    }

    const values = chart.data.datasets
      .flatMap(dataset => dataset.data)
      .filter((value): value is number => typeof value === 'number')

    if (values.length === 0) {
      return
    }

    const average = values.reduce((a: number, b: number) => a + b, 0) / values.length
    // The `y` scale is registered by the chart config below, but Chart.js types `scales` as a
    // partial record: bail out rather than assert, so a future config change fails visibly here
    // instead of throwing during a draw.
    const yScale = scales.y
    if (!yScale) return
    const y = yScale.getPixelForValue(average)

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

function toPoints(entries: LeagueOfLegendsRank[]): RankPoint[] {
  return entries
    .map((entry) => ({
      x: periodStart(new Date(entry.createdOn), props.granularity),
      y: rankScore(entry),
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

  // The theme is read through `isLightTheme()`: this block used to test a `.dark` class the app
  // never sets, so the chart always rendered its light palette — including in dark mode, which is
  // the default theme.
  const colors = isLightTheme() ? SERIES_COLORS.light : SERIES_COLORS.dark

  const timestamps = Array.from(new Set([...soloPoints, ...flexPoints].map((p) => p.x))).sort((a, b) => a - b)

  const alignToTimeline = (points: RankPoint[]) => {
    const byTimestamp = new Map(points.map((p) => [p.x, p]))
    return {
      data: timestamps.map((t) => byTimestamp.get(t)?.y ?? null),
      entries: timestamps.map((t) => byTimestamp.get(t)?.entry ?? null),
    }
  }

  const buildDataset = (label: string, points: RankPoint[], color: string): RankDataset => {
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
      backgroundColor: (context: ScriptableContext<'line'>) => {
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
      pointRadius: (context: ScriptableContext<'line'>) => (context.dataIndex === lastIndex ? 4 : 0),
      pointHoverRadius: 5,
      tension: 0.35,
      cubicInterpolationMode: 'monotone',
      fill: true,
      spanGaps: true,
    } satisfies RankDataset
  }

  const datasets: RankDataset[] = []
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
            title: (context: TooltipItem<'line'>[]) => {
              if (!context || !context[0]) return ''
              const timestamp = timestamps[context[0].dataIndex]
              if (!timestamp) return ''
              return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' }).format(new Date(timestamp))
            },
            label: (context) => {
              const entry = (context.dataset as RankDataset).entries?.[context.dataIndex] ?? null
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
    <canvas ref="rankHistoryChart"/>
  </div>
</template>
