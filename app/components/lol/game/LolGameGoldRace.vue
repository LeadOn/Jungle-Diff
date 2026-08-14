<template>
  <div class="p-5">
    <p class="text-brand-gold mb-3 text-xs font-bold uppercase tracking-wide">
      Course à l'or
    </p>

    <div class="relative" :style="{ height: `${rows.length * rowHeight}px` }">
      <div
        v-for="row in rows"
        :key="row.player.puuid"
        class="absolute left-0 flex w-full items-center gap-3 transition-[top] duration-300"
        :style="{ top: `${row.rank * rowHeight}px`, height: `${rowHeight}px` }"
      >
        <span class="text-text-ter w-5 shrink-0 text-right text-xs">
          {{ row.rank + 1 }}
        </span>

        <img
          :src="championIconUrl(row.player)"
          alt=""
          class="h-6 w-6 shrink-0 rounded-full border border-white/20 object-cover"
        />

        <span
          class="w-28 shrink-0 truncate text-xs font-semibold"
          :class="row.player.teamId === 100 ? 'text-brand-green' : 'text-brand-red'"
        >
          {{ row.player.championName }}
        </span>

        <div
          class="h-4 flex-1 overflow-hidden rounded-full bg-border-base light:bg-black/5"
        >
          <div
            class="h-full rounded-full"
            :class="row.player.teamId === 100 ? 'bg-brand-green' : 'bg-brand-red'"
            :style="{ width: `${row.widthPercent}%` }"
          ></div>
        </div>

        <span
          class="text-text-secondary w-16 shrink-0 text-right text-xs font-semibold"
        >
          {{ formatNumber(row.value) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { championIconUrl as getChampionIconUrl, frameStatsFor } from '~/utils/lol-match'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  team1: LoLGameParticipantDto[]
  team2: LoLGameParticipantDto[]
  patch: string
  currentFrameIndex: number
  playProgress: number
}>()

const rowHeight = 40

interface RaceRow {
  player: LoLGameParticipantDto
  value: number
  rank: number
  widthPercent: number
}

const frames = computed(() => props.timeline ?? [])

const currentFrame = computed(() => frames.value[props.currentFrameIndex])

const nextFrame = computed(() => frames.value[props.currentFrameIndex + 1])

const rows = computed<RaceRow[]>(() => {
  const frame = currentFrame.value
  if (frame == null) {
    return []
  }

  const next = nextFrame.value
  const t = props.playProgress

  const players = [...props.team1, ...props.team2]
  const rowsRaw = players.map((player) => {
    const base = frameStatsFor(frame, player.puuid)?.totalGold ?? 0
    const target = next
      ? (frameStatsFor(next, player.puuid)?.totalGold ?? base)
      : base

    return { player, value: base + (target - base) * t }
  })

  rowsRaw.sort((a, b) => b.value - a.value)

  const max = rowsRaw.reduce((m, r) => Math.max(m, r.value), 0) || 1

  return rowsRaw.map((r, index) => ({
    ...r,
    rank: index,
    widthPercent: Math.max(4, (r.value / max) * 100),
  }))
})

const championIconUrl = (player: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player.championName, props.patch)
}

const formatNumber = (value: number) => {
  return Math.round(value).toString()
}
</script>
