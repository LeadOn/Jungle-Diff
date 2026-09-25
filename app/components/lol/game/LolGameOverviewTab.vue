<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameDto, LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { TEAM_OUTCOME_LABELS, durationSecondsFor, formatCompact, teamGold, teamKillCount, teamOutcome } from '~/utils/lol-match'
import type { TeamOutcome } from '~/utils/lol-match'
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
  /** The signed-in viewer's GameOn id, resolved after mount; `null` otherwise. */
  mePlayerId?: number | null
}>()

defineEmits<{
  (e: 'playerSelected', player: LoLGameParticipantDto): void
}>()

const durationSeconds = computed(() => durationSecondsFor(props.game))

const OUTCOME_CLASSES: Record<TeamOutcome, string> = {
  win: 'bg-win text-white dark:text-ink',
  loss: 'bg-loss text-white dark:text-ink',
  remake: 'bg-text-ter text-white dark:text-ink',
}

const scoreboards = computed(() => [
  { teamId: 100, label: 'Équipe bleue', dotClass: 'bg-team-blue', washClass: 'from-team-blue-soft', players: props.team1 },
  { teamId: 200, label: 'Équipe rouge', dotClass: 'bg-team-red', washClass: 'from-team-red-soft', players: props.team2 },
]
  .filter(side => side.players.length > 0)
  .map((side) => {
    const outcome = teamOutcome(props.game, side.teamId)
    return {
      ...side,
      outcomeLabel: outcome ? TEAM_OUTCOME_LABELS[outcome] : '',
      outcomeClass: outcome ? OUTCOME_CLASSES[outcome] : '',
      kills: teamKillCount(side.players),
      goldLabel: formatCompact(teamGold(side.players, props.timeline)),
    }
  }))

const isMe = (player: LoLGameParticipantDto) => props.mePlayerId != null && player.playerId === props.mePlayerId
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="(side, index) in scoreboards"
      :key="side.teamId"
      class="animate-rise overflow-hidden rounded-[26px] border border-border-subtle bg-surface-base shadow-card"
      :style="{ animationDelay: `${120 + index * 80}ms` }"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 bg-linear-to-r to-surface-base to-75% px-3.5 py-4 sm:px-5"
        :class="side.washClass"
      >
        <div class="flex items-center gap-2.5">
          <span class="size-2.5 shrink-0 rounded-full" :class="side.dotClass" />
          <span class="text-[17px] font-bold tracking-[-0.02em]">{{ side.label }}</span>
          <span
            v-if="side.outcomeLabel"
            class="rounded-lg px-2.5 py-[3px] text-[11.5px] font-bold uppercase tracking-[0.03em]"
            :class="side.outcomeClass"
          >{{ side.outcomeLabel }}</span>
        </div>
        <div class="flex gap-1.5">
          <span class="inline-flex items-baseline gap-[5px] rounded-full border border-border-base bg-surface-base px-[11px] py-1 text-xs font-bold">
            <span class="font-mono font-semibold">{{ side.kills }}</span>
            <span class="text-text-sec">kills</span>
          </span>
          <span class="inline-flex items-baseline gap-[5px] rounded-full border border-border-base bg-surface-base px-[11px] py-1 text-xs font-bold">
            <span class="font-mono font-semibold">{{ side.goldLabel }}</span>
            <span class="text-text-sec">or</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2.5 border-t border-border-subtle px-3.5 py-[9px] text-[11px] font-bold uppercase tracking-[0.05em] text-text-sec sm:gap-3 sm:px-5">
        <span class="min-w-0 flex-1 truncate">Joueur — cliquez pour analyser</span>
        <span title="Note sur 10 : KDA, KP, Dégâts, Or, Survie" class="w-11 shrink-0 cursor-help text-center sm:w-[58px]">Note</span>
        <span class="w-[72px] shrink-0 text-center sm:w-20">K / D / A</span>
        <span class="hidden w-40 shrink-0 lg:block">Dégâts</span>
        <span class="hidden w-[104px] shrink-0 min-[560px]:block">Économie</span>
        <span class="hidden w-[58px] shrink-0 text-center rail:block">Vision</span>
        <span class="hidden w-[196px] shrink-0 min-[700px]:block">Objets</span>
        <span class="w-[30px] shrink-0" />
      </div>

      <LolGameDetailsPlayer
        v-for="player in side.players"
        :key="player.puuid"
        class="border-t border-border-subtle"
        :player="player"
        :team="side.players"
        :timeline="timeline"
        :is-selected="selectedPlayer?.puuid === player.puuid"
        :is-mvp="mvpPuuid === player.puuid"
        :is-ace="acePuuid === player.puuid"
        :is-me="isMe(player)"
        :patch="patch"
        :duration-seconds="durationSeconds"
        @player-selected="$emit('playerSelected', $event)"
      />
    </div>
  </div>
</template>
