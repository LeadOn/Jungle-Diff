<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  championIconUrl,
  creepScoreFor,
  crowdControlSecondsFor,
  damageToChampionsFor,
  decimalLabel,
  formatCompact,
  formatFull,
  goldEarnedFor,
  itemIconUrl,
  itemSlots as getItemSlots,
  kda,
  kdaLabel,
  killParticipationFor,
  latestStatsFor,
  playerRiotName,
  ratingFor,
  ratingToneClass,
} from '~/utils/lol-match'
import { championDisplayName } from '~/utils/lol-champion'
import { roleLabel } from '~/utils/lol-role'

const props = defineProps<{
  player?: LoLGameParticipantDto
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  durationSeconds: number
  /** The signed-in viewer's GameOn id, resolved after mount; `null` otherwise. */
  mePlayerId?: number | null
}>()

interface StatTile {
  label: string
  value: string
  detail: string
}

const minutes = computed(() => (props.durationSeconds > 0 ? props.durationSeconds / 60 : 0))

const teamOf = (p: LoLGameParticipantDto) => props.players.filter(x => x.teamId === p.teamId)

const ratingOf = (p: LoLGameParticipantDto) => ratingFor(p, teamOf(p), props.timeline, props.durationSeconds)

/** "1er / 10", "4e / 10": where the player lands among the ten on one figure. */
const rankLabel = (p: LoLGameParticipantDto, valueFn: (p: LoLGameParticipantDto) => number) => {
  const ranked = [...props.players].sort((a, b) => valueFn(b) - valueFn(a))
  const position = ranked.findIndex(x => x.puuid === p.puuid) + 1
  if (position === 0) return ''
  return `${position === 1 ? '1er' : `${position}e`} / ${props.players.length}`
}

const killParticipation = (p: LoLGameParticipantDto) => killParticipationFor(p, teamOf(p))

const csPerMinute = (p: LoLGameParticipantDto) =>
  p.stats?.csPerMinute ?? (minutes.value > 0 ? creepScoreFor(p, props.timeline) / minutes.value : 0)

const goldPerMinute = (p: LoLGameParticipantDto) =>
  p.stats?.goldPerMinute ?? (minutes.value > 0 ? goldEarnedFor(p, props.timeline) / minutes.value : 0)

const damagePerMinute = (p: LoLGameParticipantDto) =>
  p.stats?.damagePerMinute ?? (minutes.value > 0 ? damageToChampionsFor(p, props.timeline) / minutes.value : 0)

const damageTaken = (p: LoLGameParticipantDto) =>
  p.stats?.damageTaken ?? latestStatsFor(props.timeline, p.puuid)?.totalDamageTaken ?? 0

const crowdControl = (p: LoLGameParticipantDto) => crowdControlSecondsFor(p, props.timeline)

const pings = (p: LoLGameParticipantDto) => (p.allInPings ?? 0) + (p.assistMePings ?? 0) + (p.commandPings ?? 0)

const rating = computed(() => (props.player ? ratingOf(props.player) : 0))
const ratingLabel = computed(() => decimalLabel(rating.value, 1))
const ratingClass = computed(() => ratingToneClass(rating.value))
const ratingRankLabel = computed(() => (props.player ? rankLabel(props.player, p => ratingOf(p)) : ''))

const isMe = computed(() => props.player != null && props.mePlayerId != null && props.player.playerId === props.mePlayerId)

const name = computed(() => (props.player ? playerRiotName(props.player) : ''))

const subtitle = computed(() => {
  const player = props.player
  if (player == null) return ''
  return [
    player.championName ? championDisplayName(player.championName) : '',
    roleLabel(player.teamPosition),
    player.champLevel ? `Niveau ${player.champLevel}` : '',
    player.riotIdTagLine ? `#${player.riotIdTagLine}` : '',
  ].filter(part => part !== '').join(' · ')
})

const championStyle = computed(() => (props.player
  ? { backgroundImage: `url('${championIconUrl(props.player.championName, props.patch)}')` }
  : {}))

const itemSlots = computed(() => (props.player ? getItemSlots(props.player) : []))
const itemStyle = (item: number) => (item !== 0 ? { backgroundImage: `url('${itemIconUrl(item, props.patch)}')` } : {})

// Custom games carry no shop counter at all, so a 0 here means "unknown", not "none".
const consumablesLabel = computed(() => {
  const count = props.player?.consumablesPurchased ?? 0
  if (count <= 0) return ''
  return `${count} consommable${count > 1 ? 's' : ''} acheté${count > 1 ? 's' : ''} pendant la partie`
})

const tiles = computed<StatTile[]>(() => {
  const p = props.player
  if (p == null) return []

  return [
    {
      label: 'KDA',
      value: kdaLabel(p),
      detail: `${p.kills} / ${p.deaths} / ${p.assists} · ${rankLabel(p, x => kda(x))}`,
    },
    {
      label: 'Participation',
      value: `${killParticipation(p)} %`,
      detail: `des kills de son équipe · ${rankLabel(p, x => killParticipation(x))}`,
    },
    {
      label: 'CS / min',
      value: decimalLabel(csPerMinute(p), 1),
      detail: `${creepScoreFor(p, props.timeline)} CS au total · ${rankLabel(p, x => csPerMinute(x))}`,
    },
    {
      label: 'Or / min',
      value: formatFull(goldPerMinute(p)),
      detail: `${formatCompact(goldEarnedFor(p, props.timeline))} au total · ${rankLabel(p, x => goldPerMinute(x))}`,
    },
    {
      label: 'Dégâts / min',
      value: formatFull(damagePerMinute(p)),
      detail: `${formatCompact(damageToChampionsFor(p, props.timeline))} infligés · ${rankLabel(p, x => damagePerMinute(x))}`,
    },
    {
      label: 'Dégâts subis',
      value: formatCompact(damageTaken(p)),
      detail: `${rankLabel(p, x => damageTaken(x))} le plus ciblé`,
    },
    {
      label: 'Score de vision',
      value: String(p.visionScore ?? 0),
      detail: rankLabel(p, x => x.visionScore ?? 0),
    },
    {
      label: 'Contrôle infligé',
      value: `${crowdControl(p)} s`,
      // Ping counters are absent from custom games: 0 would read as "sent none" instead of
      // "never recorded", so the mention is dropped entirely rather than shown at zero.
      detail: [rankLabel(p, x => crowdControl(x)), pings(p) > 0 ? `${pings(p)} pings envoyés` : '']
        .filter(part => part !== '')
        .join(' · '),
    },
  ]
})
</script>

<template>
  <div v-if="player != null" class="flex flex-col gap-4">
    <div class="flex animate-rise flex-wrap items-center justify-between gap-x-7 gap-y-[18px] rounded-[26px] border border-border-subtle bg-surface-base px-[22px] py-5 shadow-card">
      <div class="flex min-w-0 items-center gap-4">
        <span class="size-16 shrink-0 rounded-[20px] bg-surface-sunken bg-[length:112%] bg-center" :style="championStyle" />
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-2xl font-bold tracking-[-0.03em]">{{ name }}</span>
            <span v-if="isMe" class="shrink-0 rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-bold text-brand-gold-text">Vous</span>
          </div>
          <div class="mt-0.5 text-[13px] font-semibold text-text-sec">{{ subtitle }}</div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-6">
        <div
          class="rounded-[20px] px-[22px] py-2.5 text-center"
          :class="ratingClass"
          title="Note sur 10 : KDA (25%, plafond 6), participation aux kills (20%, plafond 65%), part des dégâts de l'équipe (25%, plafond 30%), or/min (15%, plafond 500), survie (15%, de 0 à 12 morts), + 0,4 bonus en cas de victoire. Fournie par l'API une fois la partie synchronisée, sinon estimée côté client avec la même formule."
        >
          <div class="text-[34px] font-bold leading-none tracking-[-0.04em]">{{ ratingLabel }}</div>
          <div class="mt-1 text-[11.5px] font-bold">Note · {{ ratingRankLabel }}</div>
        </div>

        <div>
          <div class="text-xs font-bold text-text-sec">Équipement final</div>
          <div class="mt-2 flex gap-1">
            <span
              v-for="(item, index) in itemSlots"
              :key="index"
              class="size-8 shrink-0 rounded-[9px] bg-surface-high bg-cover bg-center"
              :class="{ 'ml-1.5': index === itemSlots.length - 1 }"
              :style="itemStyle(item)"
            />
          </div>
          <div v-if="consumablesLabel" class="mt-2 text-[11.5px] font-semibold text-text-sec">{{ consumablesLabel }}</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3">
      <div
        v-for="tile in tiles"
        :key="tile.label"
        class="rounded-[20px] border border-border-subtle bg-surface-base px-[18px] py-4 shadow-card"
      >
        <div class="text-[13px] font-bold">{{ tile.label }}</div>
        <div class="mt-1.5 text-[32px] font-bold leading-none tracking-[-0.04em]">{{ tile.value }}</div>
        <div class="mt-1.5 text-[11.5px] font-semibold text-text-sec">{{ tile.detail }}</div>
      </div>
    </div>
  </div>
</template>
