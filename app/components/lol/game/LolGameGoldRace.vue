<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { championIconUrl, formatFull, formatTimestamp, frameStatsFor } from '~/utils/lol-match'
import { championDisplayName } from '~/utils/lol-champion'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  team1: LoLGameParticipantDto[]
  team2: LoLGameParticipantDto[]
  patch: string
  currentFrameIndex: number
  /** Fraction of the way to the next frame while the film plays, so the bars glide between minutes. */
  playProgress: number
}>()

const ROW_HEIGHT = 40

const frames = computed(() => props.timeline ?? [])
const currentFrame = computed(() => frames.value[props.currentFrameIndex])
const nextFrame = computed(() => frames.value[props.currentFrameIndex + 1])

const frameLabel = computed(() => formatTimestamp(currentFrame.value?.timestamp ?? 0))

/**
 * Rows keep one DOM order (the roster's) and only their `top` moves: re-sorting the elements
 * themselves would re-insert them and skip the slide.
 */
const rows = computed(() => {
  const frame = currentFrame.value
  if (frame == null) return []

  const next = nextFrame.value
  const t = props.playProgress

  const values = [...props.team1, ...props.team2].map((player) => {
    const base = frameStatsFor(frame, player.puuid)?.totalGold ?? 0
    const target = next ? (frameStatsFor(next, player.puuid)?.totalGold ?? base) : base
    return { player, value: base + (target - base) * t }
  })

  const ranking = [...values].sort((a, b) => b.value - a.value)
  const max = ranking[0]?.value || 1

  return values.map(row => ({
    ...row,
    rank: ranking.indexOf(row),
    widthPercent: Math.max(4, (row.value / max) * 100),
    championName: row.player.championName ? championDisplayName(row.player.championName) : '',
    championStyle: { backgroundImage: `url('${championIconUrl(row.player.championName, props.patch)}')` },
    teamClass: row.player.teamId === 100 ? 'bg-team-blue' : 'bg-team-red',
    ringClass: row.player.teamId === 100 ? 'ring-team-blue' : 'ring-team-red',
  }))
})
</script>

<template>
  <div class="p-[22px]">
    <div class="mb-3.5 flex items-baseline justify-between gap-2">
      <span class="text-[17px] font-bold tracking-[-0.02em]">Course à l'or</span>
      <span class="font-mono text-xs font-semibold text-text-sec">à {{ frameLabel }}</span>
    </div>

    <div class="relative" :style="{ height: `${rows.length * ROW_HEIGHT}px` }">
      <div
        v-for="row in rows"
        :key="row.player.puuid"
        class="absolute inset-x-0 flex h-10 items-center gap-2.5 transition-[top] duration-500 ease-spring-soft"
        :style="{ top: `${row.rank * ROW_HEIGHT}px` }"
      >
        <span class="w-[18px] shrink-0 text-right font-mono text-[11.5px] text-text-sec">{{ row.rank + 1 }}</span>
        <span
          class="size-7 shrink-0 rounded-[9px] bg-surface-sunken bg-[length:112%] bg-center ring-2"
          :class="row.ringClass"
          :style="row.championStyle"
        />
        <span class="w-[78px] shrink-0 truncate text-[12.5px] font-bold" :title="row.player.riotIdGameName">{{ row.championName }}</span>
        <span class="h-3.5 flex-1 overflow-hidden rounded-full bg-surface-high">
          <span class="block h-full rounded-full transition-[width] duration-400" :class="row.teamClass" :style="{ width: `${row.widthPercent}%` }" />
        </span>
        <span class="w-[58px] shrink-0 text-right font-mono text-xs font-semibold">{{ formatFull(row.value) }}</span>
      </div>
    </div>
  </div>
</template>
