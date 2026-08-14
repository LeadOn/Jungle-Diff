<template>
  <div class="space-y-4">
    <div v-for="side in scoreboards" :key="side.teamId" class="rounded-2xl bg-surface-base border border-border-base shadow-sm overflow-hidden @container">
      <div
        class="border-border-base flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3"
        :class="side.headerTintClass"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :class="side.dotClass"
          ></span>
          <span class="text-text-main font-semibold">{{ side.label }}</span>
          <span
            class="text-sm font-semibold"
            :class="side.outcomeTone"
          >
            {{ side.outcomeLabel }}
          </span>
        </div>

        <div class="text-text-sec flex items-center gap-4 text-sm">
          <span>{{ side.kills }} kills</span>
          <span>{{ side.goldLabel }} or</span>
        </div>
      </div>

      <div class="border-border-base text-text-ter flex items-center gap-2.5 border-b px-4 py-2 text-[10px] font-semibold uppercase tracking-wide">
        <span class="min-w-0 flex-1">Joueur — cliquez pour analyser</span>
        <span class="w-[58px] shrink-0 text-center" title="Note sur 10">Note ⓘ</span>
        <span class="w-[76px] shrink-0 text-center">K / D / A</span>
        <span class="hidden lg:block w-40 shrink-0">Dégâts</span>
        <span class="hidden min-[520px]:block w-[104px] shrink-0">Économie</span>
        <span class="hidden min-[1100px]:block w-[58px] shrink-0">Vision</span>
        <span class="hidden min-[660px]:block w-[196px] shrink-0">Objets</span>
        <span class="w-7 shrink-0"></span>
      </div>

      <div class="divide-border-base divide-y">
        <LolGameDetailsPlayer
          v-for="player in side.players"
          :key="player.puuid"
          :player="player"
          :team="side.players"
          :timeline="timeline"
          :is-selected="selectedPlayer?.puuid === player.puuid"
          :is-mvp="mvpPuuid === player.puuid"
          :is-ace="acePuuid === player.puuid"
          :patch="patch"
          :duration-seconds="durationSeconds"
          @player-selected="$emit('playerSelected', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameDto, LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { teamKillCount, teamGold, formatCompact, durationSecondsFor } from '~/utils/lol-match'
import LolGameDetailsPlayer from './LolGameDetailsPlayer.vue'

const props = defineProps<{
  game: LoLGameDto
  team1: LoLGameParticipantDto[]
  team2: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  selectedPlayer?: LoLGameParticipantDto
  mvpPuuid?: string
  acePuuid?: string
}>()

defineEmits<{
  (e: 'playerSelected', player: LoLGameParticipantDto): void
}>()

const durationSeconds = computed(() => durationSecondsFor(props.game))

const scoreboards = computed(() => {
  return [
    {
      teamId: 100,
      label: 'Équipe bleue',
      dotClass: 'bg-blue-400',
      headerTintClass: 'bg-[linear-gradient(90deg,rgba(96,165,250,0.16),transparent_70%)]', // blue-400 wash
      players: props.team1,
    },
    {
      teamId: 200,
      label: 'Équipe rouge',
      dotClass: 'bg-brand-red',
      headerTintClass: 'bg-[linear-gradient(90deg,rgba(255,98,87,0.16),transparent_70%)]', // brand-red wash
      players: props.team2,
    },
  ].filter((side) => side.players.length > 0)
   .map((side) => ({
      ...side,
      outcomeLabel: outcomeLabel(side.teamId),
      outcomeTone: outcomeTone(side.teamId),
      kills: teamKillCount(side.players),
      goldLabel: formatCompact(teamGold(side.players, props.timeline)),
   }))
})

const outcomeLabel = (teamId: number): string => {
  if (props.game.isRemake) return 'Remake'
  if (props.game.winningTeamId == null) return ''
  return props.game.winningTeamId === teamId ? 'Victoire' : 'Défaite'
}

const outcomeTone = (teamId: number): string => {
  if (props.game.isRemake || props.game.winningTeamId == null) {
    return 'text-text-sec'
  }
  return props.game.winningTeamId === teamId ? 'text-brand-green' : 'text-brand-red'
}
</script>
