<template>
  <div class="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
    <div
      v-for="card in cards"
      :key="card.config.key"
      class="rounded-2xl bg-surface-base border border-border-base p-4 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          :class="chipClass(card)"
        >
          {{ card.config.icon }}
        </div>
        <div class="min-w-0">
          <p class="text-text-main truncate text-sm font-semibold">
            {{ card.config.title }}
          </p>
          <p class="text-text-ter truncate text-xs">
            {{ card.config.subtitle }}
          </p>
        </div>
      </div>

      <div v-if="!card.player">
        <p class="text-text-ter mt-4 text-xs">Pas assez de données.</p>
      </div>
      <div v-else>
        <p
          class="font-heading mt-4 text-3xl font-bold"
          :class="valueClass(card)"
        >
          {{ formattedValue(card) }}
        </p>

        <div class="border-border-base mt-4 flex items-center gap-2 border-t pt-3">
          <img
            :src="championIconUrl(card.player)"
            :alt="card.player.championName"
            class="h-6 w-6 shrink-0 rounded-full border border-white/20 object-cover"
          />
          <span
            v-if="isLinked(card.player)"
            class="text-brand-green truncate text-sm font-medium"
          >
            {{ displayName(card.player) }}
          </span>
          <span
            v-else
            class="text-text-sec truncate text-sm font-medium"
          >
            {{ card.player.riotIdGameName }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  bestParticipant,
  championIconUrl as getChampionIconUrl,
  crowdControlSecondsFor,
  csFor,
  csPerMinute,
  isLinkedToGameOn,
  latestStatsFor,
  playerDisplayName
} from '~/utils/lol-match'
import { maxBountyOnHead } from '~/utils/lol-timeline-event'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  durationSeconds: number
  patch: string
}>()

type Accent = 'green' | 'red' | 'blue' | 'yellow'

interface HighlightConfig {
  key: string
  icon: string
  title: string
  subtitle: string
  accent: Accent
  valueFn: (
    player: LoLGameParticipantDto,
    timeline: LoLGameTimelineFrame[] | undefined,
    durationSeconds: number
  ) => number
  formatFn: (value: number) => string
}

const CONFIGS: HighlightConfig[] = [
  {
    key: 'pingMachine',
    icon: '📍',
    title: 'La Ping Machine',
    subtitle: 'Pings envoyés (all-in, aidez-moi, commandes)',
    accent: 'blue',
    valueFn: (p) => (p.allInPings ?? 0) + (p.assistMePings ?? 0) + (p.commandPings ?? 0),
    formatFn: (v) => v.toFixed(0),
  },
  {
    key: 'punchingBall',
    icon: '🥊',
    title: 'Le Punching-Ball',
    subtitle: 'Dégâts encaissés',
    accent: 'red',
    valueFn: (p, timeline) => latestStatsFor(timeline, p.puuid)?.totalDamageTaken ?? 0,
    formatFn: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)),
  },
  {
    key: 'ccMaster',
    icon: '🌀',
    title: 'Maître du CC',
    subtitle: 'Temps de contrôle infligé',
    accent: 'blue',
    valueFn: (p, timeline) => crowdControlSecondsFor(p, timeline),
    formatFn: (v) => v.toFixed(0) + 's',
  },
  {
    key: 'shoppingAddict',
    icon: '🛍️',
    title: 'Shopping Addict',
    subtitle: 'Consommables achetés',
    accent: 'yellow',
    valueFn: (p) => p.consumablesPurchased ?? 0,
    formatFn: (v) => v.toFixed(0),
  },
  {
    key: 'bounty',
    icon: '💰',
    title: 'Tête mise à prix',
    subtitle: 'Prime la plus élevée collectée en le tuant',
    accent: 'yellow',
    valueFn: (p, timeline) => maxBountyOnHead(timeline, p.puuid),
    formatFn: (v) => `${v.toFixed(0)}`,
  },
  {
    key: 'reaper',
    icon: '🌾',
    title: 'La Faucheuse',
    subtitle: 'Meilleur CS/min',
    accent: 'green',
    valueFn: (p, timeline, durationSeconds) => csPerMinute(csFor(timeline, p.puuid), durationSeconds),
    formatFn: (v) => v.toFixed(1),
  },
]

const ACCENT_CLASSES: Record<Accent, { chip: string; value: string }> = {
  green: { chip: 'bg-brand-green/15 text-brand-green', value: 'text-brand-green' },
  red: { chip: 'bg-brand-red/15 text-brand-red', value: 'text-brand-red' },
  blue: { chip: 'bg-blue-400/15 text-blue-400', value: 'text-blue-400' },
  yellow: { chip: 'bg-brand-gold/15 text-brand-gold', value: 'text-brand-gold' },
}

interface HighlightCard {
  config: HighlightConfig
  player?: LoLGameParticipantDto
  value: number
}

const cards = computed(() => {
  return CONFIGS.map((config) => {
    const best = bestParticipant(props.players, (p) => config.valueFn(p, props.timeline, props.durationSeconds))
    return { config, player: best?.player, value: best?.value ?? 0 }
  })
})

const formattedValue = (card: HighlightCard) => card.config.formatFn(card.value)
const chipClass = (card: HighlightCard) => ACCENT_CLASSES[card.config.accent].chip
const valueClass = (card: HighlightCard) => ACCENT_CLASSES[card.config.accent].value

const displayName = (player: LoLGameParticipantDto) => playerDisplayName(player)
const isLinked = (player: LoLGameParticipantDto) => isLinkedToGameOn(player)
const championIconUrl = (player: LoLGameParticipantDto) => getChampionIconUrl(player.championName, props.patch)
</script>
