<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  bestParticipant,
  championIconUrl,
  crowdControlSecondsFor,
  csFor,
  csPerMinute,
  decimalLabel,
  formatCompact,
  formatFull,
  isLinkedToGameOn,
  latestStatsFor,
  playerRiotName,
} from '~/utils/lol-match'
import { championDisplayName } from '~/utils/lol-champion'
import { maxBountyOnHead } from '~/utils/lol-timeline-event'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  durationSeconds: number
  patch: string
  /** The signed-in viewer's GameOn id, resolved after mount; `null` otherwise. */
  mePlayerId?: number | null
}>()

interface HighlightConfig {
  key: string
  title: string
  subtitle: string
  unit: string
  valueFn: (player: LoLGameParticipantDto, timeline: LoLGameTimelineFrame[] | undefined, durationSeconds: number) => number
  formatFn: (value: number) => string
}

const CONFIGS: HighlightConfig[] = [
  {
    key: 'pingMachine',
    title: 'La Ping Machine',
    subtitle: 'Pings envoyés (all-in, aidez-moi, commandes)',
    unit: 'pings',
    valueFn: p => (p.allInPings ?? 0) + (p.assistMePings ?? 0) + (p.commandPings ?? 0),
    formatFn: v => v.toFixed(0),
  },
  {
    key: 'punchingBall',
    title: 'Le Punching-Ball',
    subtitle: 'Dégâts encaissés',
    unit: 'subis',
    valueFn: (p, timeline) => latestStatsFor(timeline, p.puuid)?.totalDamageTaken ?? 0,
    formatFn: formatCompact,
  },
  {
    key: 'ccMaster',
    title: 'Maître du CC',
    subtitle: 'Temps de contrôle infligé',
    unit: 's',
    valueFn: (p, timeline) => crowdControlSecondsFor(p, timeline),
    formatFn: v => v.toFixed(0),
  },
  {
    key: 'shoppingAddict',
    title: 'Shopping Addict',
    subtitle: 'Consommables achetés',
    unit: 'achats',
    valueFn: p => p.consumablesPurchased ?? 0,
    formatFn: v => v.toFixed(0),
  },
  {
    key: 'bounty',
    title: 'Tête mise à prix',
    subtitle: 'Prime la plus élevée collectée en le tuant',
    unit: 'or',
    valueFn: (p, timeline) => maxBountyOnHead(timeline, p.puuid),
    formatFn: formatFull,
  },
  {
    key: 'reaper',
    title: 'La Faucheuse',
    subtitle: 'Meilleur CS par minute',
    unit: 'CS/min',
    valueFn: (p, timeline, durationSeconds) => csPerMinute(csFor(timeline, p.puuid), durationSeconds),
    formatFn: v => decimalLabel(v, 1),
  },
]

/**
 * `bestParticipant` only sorts: when every participant scores 0 it still returns whoever ends up
 * first, which crowned a random player. Custom games imported from the LoL client carry none of
 * the ping or shop counters, and a Riot game where nobody bought a consumable hits the same case.
 * A card is only awarded on a value strictly above 0; below that it stays empty.
 */
const cards = computed(() => CONFIGS.map((config) => {
  const best = bestParticipant(props.players, p => config.valueFn(p, props.timeline, props.durationSeconds))
  const player = best != null && best.value > 0 ? best.player : undefined

  return {
    config,
    player,
    valueLabel: player && best ? config.formatFn(best.value) : '—',
    // Trivia, not results: the figure stays in ink, the win and loss colours are kept for outcomes.
    valueClass: player ? 'text-ink' : 'text-ink-3',
    holderName: player ? playerRiotName(player) : '',
    championName: player?.championName ? championDisplayName(player.championName) : '',
    isLinked: player ? isLinkedToGameOn(player) : false,
    isMe: player != null && props.mePlayerId != null && player.playerId === props.mePlayerId,
    championStyle: player ? { backgroundImage: `url('${championIconUrl(player.championName, props.patch)}')` } : {},
  }
}))
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-3">
    <div
      v-for="card in cards"
      :key="card.config.key"
      :title="card.config.subtitle"
      class="flex items-center gap-3 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface px-4 py-3.5 shadow-card"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-3 bg-sunken bg-[length:112%] bg-center"
        :style="card.championStyle"
      >
        <img v-if="!card.player" src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-7 object-contain opacity-50 grayscale">
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[0.875rem] font-[640] text-ink">{{ card.config.title }}</span>
        <span v-if="card.player" class="mt-0.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-2">
          <span class="truncate"><span :class="{ 'font-semibold text-ink': card.isLinked }">{{ card.holderName }}</span> · {{ card.championName }}</span>
          <UiStatus v-if="card.isMe" variant="me" class="shrink-0" />
        </span>
        <span v-else class="mt-0.5 block text-xs font-medium text-ink-3">Pas assez de données</span>
        <span class="mt-0.5 block truncate text-[11.5px] text-ink-2">{{ card.config.subtitle }}</span>
      </span>
      <span class="shrink-0 whitespace-nowrap">
        <span class="fig text-[30px]" :class="card.valueClass">{{ card.valueLabel }}</span>
        <span v-if="card.player" class="ml-[3px] text-xs font-semibold text-ink-2">{{ card.config.unit }}</span>
      </span>
    </div>
  </div>
</template>
