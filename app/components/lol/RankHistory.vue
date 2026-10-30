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

/**
 * Every colour comes from the Canopée tokens, which already flip with the `.dark` class: Solo/Duo on
 * `--side-blue`, Flex on `--canopy`, rules on `--line` / `--line-strong`, the tooltip on the night band.
 * Chart.js draws on a canvas, which cannot read a CSS variable, so each one is resolved to a computed
 * colour when the chart is built (and rebuilt on every data change).
 */
const SERIES_TOKENS = { solo: '--side-blue', flex: '--canopy' } as const

function resolveColor(expression: string): string {
  if (typeof document === 'undefined') return 'transparent'
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.style.color = expression
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved || 'transparent'
}

const tokenColor = (token: string, percent = 100) =>
  resolveColor(percent >= 100 ? `var(${token})` : `color-mix(in oklch, var(${token}) ${percent}%, transparent)`)

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
    ctx.strokeStyle = tokenColor('--line-strong')
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

  const timestamps = Array.from(new Set([...soloPoints, ...flexPoints].map((p) => p.x))).sort((a, b) => a - b)

  const alignToTimeline = (points: RankPoint[]) => {
    const byTimestamp = new Map(points.map((p) => [p.x, p]))
    return {
      data: timestamps.map((t) => byTimestamp.get(t)?.y ?? null),
      entries: timestamps.map((t) => byTimestamp.get(t)?.entry ?? null),
    }
  }

  const buildDataset = (label: string, points: RankPoint[], token: string): RankDataset => {
    const { data, entries } = alignToTimeline(points)
    const color = tokenColor(token)
    const fillTop = tokenColor(token, 25)
    const fillBottom = tokenColor(token, 0)

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
        if (!chartArea) return fillTop
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, fillTop)
        gradient.addColorStop(1, fillBottom)
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
  if (soloPoints.length > 0) datasets.push(buildDataset('Solo 5v5', soloPoints, SERIES_TOKENS.solo))
  if (flexPoints.length > 0) datasets.push(buildDataset('Flex 5v5', flexPoints, SERIES_TOKENS.flex))

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
          grid: { display: true, color: tokenColor('--line'), drawTicks: false },
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
            color: tokenColor('--ink-2'),
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: tokenColor('--night'),
          titleColor: tokenColor('--on-night-2'),
          bodyColor: tokenColor('--on-night'),
          padding: 10,
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          cornerRadius: 10,
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
