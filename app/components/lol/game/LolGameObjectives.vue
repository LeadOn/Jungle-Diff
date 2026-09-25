<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameDto, LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { TEAM_OUTCOME_LABELS, teamOutcome } from '~/utils/lol-match'
import type { TeamOutcome } from '~/utils/lol-match'
import {
  ATAKHAN_ICON_URL,
  BARON_ICON_URL,
  DRAGON_ICON_URL,
  GRUB_ICON_URL,
  HERALD_ICON_URL,
  INHIBITOR_ICON_URL,
  teamObjectivesFor,
  TOWER_ICON_URL,
} from '~/utils/lol-timeline-event'

const props = defineProps<{
  game: LoLGameDto
  team1: LoLGameParticipantDto[]
  team2: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
}>()

const OUTCOME_CLASSES: Record<TeamOutcome, string> = {
  win: 'bg-win-soft text-brand-green',
  loss: 'bg-loss-soft text-brand-red',
  remake: 'bg-surface-high text-text-sec',
}

const rows = computed(() => {
  const players = [...props.team1, ...props.team2]
  return [
    { teamId: 100, label: 'Équipe bleue', dotClass: 'bg-team-blue' },
    { teamId: 200, label: 'Équipe rouge', dotClass: 'bg-team-red' },
  ].map((side) => {
    const objectives = teamObjectivesFor(props.game.leagueOfLegendsGameTeams || [], props.timeline, players, side.teamId)
    const outcome = teamOutcome(props.game, side.teamId)

    // A 0 is left out: the row lists what a side took, and a wall of zeros says nothing.
    const badges = [
      { iconUrl: TOWER_ICON_URL, label: 'Tourelles', value: objectives.towers },
      { iconUrl: INHIBITOR_ICON_URL, label: 'Inhibiteurs', value: objectives.inhibitors },
      { iconUrl: DRAGON_ICON_URL, label: 'Dragons', value: objectives.dragons },
      { iconUrl: HERALD_ICON_URL, label: 'Hérauts de la Faille', value: objectives.heralds },
      { iconUrl: GRUB_ICON_URL, label: 'Voracraves', value: objectives.grubs },
      { iconUrl: BARON_ICON_URL, label: 'Barons Nashor', value: objectives.barons },
      { iconUrl: ATAKHAN_ICON_URL, label: 'Atakhan', value: objectives.atakhans },
    ].filter((badge) => badge.value > 0)

    return {
      ...side,
      kills: objectives.kills,
      badges,
      outcomeLabel: outcome ? TEAM_OUTCOME_LABELS[outcome] : '',
      outcomeClass: outcome ? OUTCOME_CLASSES[outcome] : '',
    }
  })
})

const hasObjectives = computed(() => rows.value.some((row) => row.kills > 0 || row.badges.length > 0))
</script>

<template>
  <section
    v-if="hasObjectives"
    aria-label="Objectifs par équipe"
    class="grid animate-rise grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-4 [animation-delay:80ms]"
  >
    <div
      v-for="row in rows"
      :key="row.teamId"
      class="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[22px] border border-border-subtle bg-surface-base px-5 py-4 shadow-card"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span class="size-2.5 shrink-0 rounded-full" :class="row.dotClass" />
        <span class="text-sm font-bold">{{ row.label }}</span>
        <span
          v-if="row.outcomeLabel"
          class="rounded-lg px-[9px] py-0.5 text-[11px] font-bold uppercase tracking-[0.03em]"
          :class="row.outcomeClass"
        >{{ row.outcomeLabel }}</span>
      </span>
      <span class="flex items-baseline gap-1">
        <span class="text-[28px] font-bold leading-none tracking-[-0.04em]">{{ row.kills }}</span>
        <span class="text-xs font-bold text-text-sec">kills</span>
      </span>
      <span class="flex-1" />
      <span class="flex flex-wrap gap-1.5">
        <span
          v-for="badge in row.badges"
          :key="badge.label"
          :title="badge.label"
          class="inline-flex h-[30px] items-center gap-[5px] rounded-full border border-border-subtle bg-surface-muted pl-1.5 pr-2.5 font-mono text-[12.5px] font-semibold"
        >
          <span class="flex size-5 items-center justify-center rounded-full bg-ink">
            <UiAppImage :src="badge.iconUrl" alt="" class="size-3.5 object-contain" />
          </span>
          {{ badge.value }}
        </span>
      </span>
    </div>
  </section>
</template>
