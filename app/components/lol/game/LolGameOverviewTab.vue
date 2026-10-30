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
  win: 'bg-win-soft text-win-ink',
  loss: 'bg-loss-soft text-loss-ink',
  remake: 'bg-neutral-soft text-ink-2',
}

const scoreboards = computed(() => [
  { teamId: 100, label: 'Équipe bleue', dotClass: 'bg-side-blue', washClass: 'from-side-blue-soft', players: props.team1 },
  { teamId: 200, label: 'Équipe rouge', dotClass: 'bg-side-red', washClass: 'from-side-red-soft', players: props.team2 },
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
      v-for="side in scoreboards"
      :key="side.teamId"
      class="overflow-hidden rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface shadow-card"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 bg-linear-to-r to-surface to-75% px-3.5 py-3.5 sm:px-5"
        :class="side.washClass"
      >
        <div class="flex items-center gap-2.5">
          <span class="size-2.5 shrink-0 rounded-full" :class="side.dotClass" />
          <span class="type-title text-ink">{{ side.label }}</span>
          <span
            v-if="side.outcomeLabel"
            class="inline-flex h-5 items-center rounded-1 px-1.5 text-[11px] font-[650] uppercase tracking-[0.04em]"
            :class="side.outcomeClass"
          >{{ side.outcomeLabel }}</span>
        </div>
        <div class="flex gap-1.5">
          <span class="inline-flex h-7 items-baseline gap-[5px] rounded-full border border-line bg-surface px-2.5 pt-[5px] text-xs font-semibold">
            <span class="fig text-[15px] text-ink">{{ side.kills }}</span>
            <span class="text-ink-2">kills</span>
          </span>
          <span class="inline-flex h-7 items-baseline gap-[5px] rounded-full border border-line bg-surface px-2.5 pt-[5px] text-xs font-semibold">
            <span class="fig text-[15px] text-ink">{{ side.goldLabel }}</span>
            <span class="text-ink-2">or</span>
          </span>
        </div>
      </div>

      <div class="type-label flex items-center gap-2.5 border-t border-line px-3.5 py-[9px] text-ink-2 sm:gap-3 sm:px-5">
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
        class="border-t border-line"
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
