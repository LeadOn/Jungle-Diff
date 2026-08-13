<template>
  <div class="p-5">
    <div
      v-if="mode === 'dealt'"
      class="text-text-ter mb-3 flex items-center justify-end gap-4 text-xs"
    >
      <span class="flex items-center gap-1.5">
        <span class="bg-brand-gold h-2 w-2 rounded-full"></span>
        Physique
      </span>
      <span class="flex items-center gap-1.5">
        <span class="bg-blue-400 h-2 w-2 rounded-full"></span>
        Magique
      </span>
      <span class="flex items-center gap-1.5">
        <span class="bg-text-main h-2 w-2 rounded-full"></span>
        Brut
      </span>
    </div>

    <div class="space-y-2.5">
      <div
        v-for="row in rows"
        :key="row.player.puuid"
        class="group relative flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors"
        :class="
          selectedPuuid === row.player.puuid
            ? 'light:bg-black/5 bg-white/10'
            : 'light:hover:bg-black/5 hover:bg-white/5'
        "
        @click="select(row.player)"
      >
        <!-- The split behind each bar is only readable on hover. -->
        <div
          class="border-border-base bg-surface-base pointer-events-none absolute right-16 top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] shadow-lg group-hover:block"
        >
          <template v-if="mode === 'dealt'">
            <p class="text-brand-gold">
              Physique · {{ formatNumber(row.physical) }}
            </p>
            <p class="text-blue-400">
              Magique · {{ formatNumber(row.magic) }}
            </p>
            <p class="text-text-main">
              Brut · {{ formatNumber(row.trueDamage) }}
            </p>
          </template>
          <template v-else>
            <p class="text-brand-red">
              Dégâts subis · {{ formatNumber(row.taken) }}
            </p>
          </template>
        </div>
        
        <div class="flex w-36 min-w-0 shrink-0 items-center gap-2">
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :class="row.player.teamId === 100 ? 'bg-brand-green' : 'bg-brand-red'"
          ></span>
          <img
            :src="championIconUrl(row.player)"
            class="h-6 w-6 shrink-0 rounded-full border border-white/20 object-cover"
          />
          <span class="text-text-main truncate text-xs font-medium">
            {{ row.player.riotIdGameName }}
          </span>
        </div>

        <div
          class="h-4 flex-1 overflow-hidden rounded-full bg-white/5 light:bg-black/5"
        >
          <div
            v-if="mode === 'dealt'"
            class="flex h-full overflow-hidden rounded-full transition-all duration-500"
            :style="{ width: `${widthPercent(row.total)}%` }"
          >
            <div
              class="bg-brand-gold h-full"
              :style="{ width: `${segmentPercent(row.physical, row.total)}%` }"
            ></div>
            <div
              class="bg-blue-400 h-full"
              :style="{ width: `${segmentPercent(row.magic, row.total)}%` }"
            ></div>
            <div
              class="bg-text-main h-full"
              :style="{ width: `${segmentPercent(row.trueDamage, row.total)}%` }"
            ></div>
          </div>
          <div
            v-else
            class="bg-brand-red h-full rounded-full transition-all duration-500"
            :style="{ width: `${widthPercent(row.taken)}%` }"
          ></div>
        </div>

        <span
          class="text-text-secondary w-16 shrink-0 text-right text-xs font-semibold"
        >
          {{ formatNumber(mode === 'dealt' ? row.total : row.taken) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  championIconUrl as getChampionIconUrl,
  damageSplitFor,
  latestStatsFor,
} from '~/utils/lol-match'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  mode: 'dealt' | 'taken'
  selectedPuuid?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedPuuid', puuid: string): void
}>()

interface DamageRow {
  player: LoLGameParticipantDto
  physical: number
  magic: number
  trueDamage: number
  taken: number
  total: number
}

const rows = computed<DamageRow[]>(() => {
  const r = props.players.map((player) => {
    const stats = latestStatsFor(props.timeline, player.puuid)
    const split = damageSplitFor(player, props.timeline)
    return {
      player,
      physical: split?.physical ?? 0,
      magic: split?.magic ?? 0,
      trueDamage: split?.trueDamage ?? 0,
      taken: stats?.totalDamageTaken ?? 0,
      total: stats?.totalDamageDoneToChampions ?? 0,
    }
  })

  const key = props.mode === 'dealt'
    ? (x: DamageRow) => x.total
    : (x: DamageRow) => x.taken

  return r.sort((a, b) => key(b) - key(a))
})

const maxValue = computed(() => {
  const key = props.mode === 'dealt'
    ? (r: DamageRow) => r.total
    : (r: DamageRow) => r.taken

  return rows.value.reduce((m, r) => Math.max(m, key(r)), 0) || 1
})

const widthPercent = (value: number): number => {
  return Math.max(2, (value / maxValue.value) * 100)
}

const segmentPercent = (value: number, total: number): number => {
  return total <= 0 ? 0 : (value / total) * 100
}

const championIconUrl = (player: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player.championName ?? '', props.patch)
}

const select = (player: LoLGameParticipantDto) => {
  emit('update:selectedPuuid', player.puuid ?? '')
}

const formatNumber = (value: number) => {
  return Math.round(value).toString()
}
</script>
