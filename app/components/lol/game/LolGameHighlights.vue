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

type Accent = 'green' | 'red' | 'blue' | 'yellow'

interface HighlightConfig {
  key: string
  title: string
  subtitle: string
  unit: string
  accent: Accent
  valueFn: (player: LoLGameParticipantDto, timeline: LoLGameTimelineFrame[] | undefined, durationSeconds: number) => number
  formatFn: (value: number) => string
}

const CONFIGS: HighlightConfig[] = [
  {
    key: 'pingMachine',
    title: 'La Ping Machine',
    subtitle: 'Pings envoyés (all-in, aidez-moi, commandes)',
    unit: 'pings',
    accent: 'blue',
    valueFn: p => (p.allInPings ?? 0) + (p.assistMePings ?? 0) + (p.commandPings ?? 0),
    formatFn: v => v.toFixed(0),
  },
  {
    key: 'punchingBall',
    title: 'Le Punching-Ball',
    subtitle: 'Dégâts encaissés',
    unit: 'subis',
    accent: 'red',
    valueFn: (p, timeline) => latestStatsFor(timeline, p.puuid)?.totalDamageTaken ?? 0,
    formatFn: formatCompact,
  },
  {
    key: 'ccMaster',
    title: 'Maître du CC',
    subtitle: 'Temps de contrôle infligé',
    unit: 's',
    accent: 'blue',
    valueFn: (p, timeline) => crowdControlSecondsFor(p, timeline),
    formatFn: v => v.toFixed(0),
  },
  {
    key: 'shoppingAddict',
    title: 'Shopping Addict',
    subtitle: 'Consommables achetés',
    unit: 'achats',
    accent: 'yellow',
    valueFn: p => p.consumablesPurchased ?? 0,
    formatFn: v => v.toFixed(0),
  },
  {
    key: 'bounty',
    title: 'Tête mise à prix',
    subtitle: 'Prime la plus élevée collectée en le tuant',
    unit: 'or',
    accent: 'yellow',
    valueFn: (p, timeline) => maxBountyOnHead(timeline, p.puuid),
    formatFn: formatFull,
  },
  {
    key: 'reaper',
    title: 'La Faucheuse',
    subtitle: 'Meilleur CS par minute',
    unit: 'CS/min',
    accent: 'green',
    valueFn: (p, timeline, durationSeconds) => csPerMinute(csFor(timeline, p.puuid), durationSeconds),
    formatFn: v => decimalLabel(v, 1),
  },
]

const ACCENT_CLASSES: Record<Accent, string> = {
  green: 'text-brand-green',
  red: 'text-brand-red',
  blue: 'text-team-blue-text',
  yellow: 'text-brand-gold',
}

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
    valueClass: player ? ACCENT_CLASSES[config.accent] : 'text-text-ter',
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
      class="flex items-center gap-3 rounded-[20px] border border-border-subtle bg-surface-base px-4 py-3.5 shadow-card transition-transform duration-300 ease-spring hover:-translate-y-[3px]"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-sunken bg-[length:112%] bg-center"
        :style="card.championStyle"
      >
        <img v-if="!card.player" src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-7 object-contain opacity-50 grayscale">
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[14.5px] font-bold">{{ card.config.title }}</span>
        <span v-if="card.player" class="mt-0.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-text-sec">
          <span class="truncate"><span :class="{ 'text-brand-green': card.isLinked }">{{ card.holderName }}</span> · {{ card.championName }}</span>
          <span v-if="card.isMe" class="shrink-0 rounded-full bg-brand-gold px-1.5 text-[10.5px] font-bold text-brand-gold-text">Vous</span>
        </span>
        <span v-else class="mt-0.5 block text-xs font-semibold text-text-ter">Pas assez de données</span>
        <span class="mt-0.5 block truncate text-[11.5px] font-medium text-text-sec">{{ card.config.subtitle }}</span>
      </span>
      <span class="shrink-0 whitespace-nowrap">
        <span class="text-[28px] font-bold tracking-[-0.04em]" :class="card.valueClass">{{ card.valueLabel }}</span>
        <span v-if="card.player" class="ml-[3px] text-xs font-bold text-text-sec">{{ card.config.unit }}</span>
      </span>
    </div>
  </div>
</template>
