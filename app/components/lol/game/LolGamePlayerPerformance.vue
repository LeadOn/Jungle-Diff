<template>
  <div v-if="player != null" class="space-y-3">
    <div
      class="bg-surface-base border-border-base flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-xl border p-4 shadow-sm"
    >
      <div class="flex min-w-0 items-center gap-4">
        <img
          :src="championIconUrl"
          :alt="player.championName"
          class="h-14 w-14 shrink-0 rounded-xl border border-white/20 object-cover"
        />

        <div class="min-w-0">
          <p class="font-heading text-text-main truncate text-lg font-bold">
            {{ name }}
          </p>
          <p class="text-text-ter mt-0.5 truncate text-[13px]">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-6">
        <div
          class="rounded-2xl border px-6 py-3 text-center"
          :class="ratingTone"
          title="Note sur 10 : KDA (25%, plafond 6), participation aux kills (20%, plafond 65%), part des dégâts de l'équipe (25%, plafond 30%), or/min (15%, plafond 500), survie (15%, de 0 à 12 morts), + 0,4 bonus en cas de victoire. Fournie par l'API une fois la partie synchronisée, sinon estimée côté client avec la même formule."
        >
          <p class="font-heading text-3xl font-bold">{{ ratingLabel }}</p>
          <p class="mt-0.5 text-[11px] font-semibold">
            Note &middot; {{ ratingRankLabel }}
          </p>
        </div>

        <div>
          <p
            class="text-text-ter text-[10px] font-semibold uppercase tracking-wide"
          >
            Équipement final
          </p>

          <div class="mt-2 flex items-center gap-1.5">
            <div
              v-for="(item, index) in itemSlots"
              :key="index"
              class="border-border-base bg-bg-base h-8 w-8 overflow-hidden rounded-lg border light:bg-black/5"
              :class="{ 'ml-1.5': index === itemSlots.length - 1 }"
            >
              <img
                v-if="item !== 0"
                class="h-full w-full object-cover"
                :src="itemIconUrl(item)"
                alt=""
              />
            </div>
          </div>

          <p class="text-text-ter mt-2 text-[11px]">
            {{ consumablesPurchased }} consommable{{
              consumablesPurchased > 1 ? "s" : ""
            }}
            acheté{{ consumablesPurchased > 1 ? "s" : "" }} pendant la partie
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="tile in tiles"
        :key="tile.label"
        class="bg-surface-base border-border-base rounded-xl border p-3.5 shadow-sm"
      >
        <p
          class="text-text-ter text-[10px] font-semibold uppercase tracking-wide"
        >
          {{ tile.label }}
        </p>
        <p class="font-heading text-text-main mt-1 text-2xl font-bold">
          {{ tile.value }}
        </p>
        <p class="text-text-ter mt-1 text-[11px]">{{ tile.detail }}</p>
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
  creepScoreFor,
  crowdControlSecondsFor,
  damageToChampionsFor,
  decimalLabel,
  formatCompact,
  goldEarnedFor,
  itemIconUrl as getItemIconUrl,
  itemSlots as getItemSlots,
  kda,
  kdaLabel,
  killParticipationFor,
  latestStatsFor,
  playerFullName,
  ratingFor,
  ratingToneClass,
} from '~/utils/lol-match'
import { roleLabel } from '~/utils/lol-role'

const props = defineProps<{
  player?: LoLGameParticipantDto
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  durationSeconds: number
}>()

interface StatTile {
  label: string
  value: string
  detail: string
}

const minutes = computed(() => {
  return props.durationSeconds > 0 ? props.durationSeconds / 60 : 0
})

const teamOf = (p: LoLGameParticipantDto) => {
  return props.players.filter((x) => x.teamId === p.teamId)
}

const ratingOf = (p: LoLGameParticipantDto) => {
  return ratingFor(p, teamOf(p), props.timeline, props.durationSeconds)
}

const rankLabel = (p: LoLGameParticipantDto, valueFn: (p: LoLGameParticipantDto) => number) => {
  const ranked = [...props.players].sort((a, b) => valueFn(b) - valueFn(a))
  const position = ranked.findIndex((x) => x.puuid === p.puuid) + 1

  if (position === 0) return ''
  return `${position === 1 ? '1er' : position + 'e'} / ${props.players.length}`
}

const killParticipation = (p: LoLGameParticipantDto) => killParticipationFor(p, teamOf(p))

const csPerMinute = (p: LoLGameParticipantDto) => {
  return (
    p.stats?.csPerMinute ??
    (minutes.value > 0 ? creepScoreFor(p, props.timeline) / minutes.value : 0)
  )
}

const goldPerMinute = (p: LoLGameParticipantDto) => {
  return (
    p.stats?.goldPerMinute ??
    (minutes.value > 0 ? goldEarnedFor(p, props.timeline) / minutes.value : 0)
  )
}

const damagePerMinute = (p: LoLGameParticipantDto) => {
  return (
    p.stats?.damagePerMinute ??
    (minutes.value > 0 ? damageToChampionsFor(p, props.timeline) / minutes.value : 0)
  )
}

const damageTaken = (p: LoLGameParticipantDto) => {
  return (
    p.stats?.damageTaken ??
    latestStatsFor(props.timeline, p.puuid)?.totalDamageTaken ??
    0
  )
}

const crowdControl = (p: LoLGameParticipantDto) => crowdControlSecondsFor(p, props.timeline)

const pings = (p: LoLGameParticipantDto) => {
  return (p.allInPings ?? 0) + (p.assistMePings ?? 0) + (p.commandPings ?? 0)
}

const rating = computed(() => {
  return props.player ? ratingOf(props.player) : 0
})

const ratingLabel = computed(() => decimalLabel(rating.value, 1))

const ratingTone = computed(() => ratingToneClass(rating.value))

const ratingRankLabel = computed(() => {
  return props.player ? rankLabel(props.player, (p) => ratingOf(p)) : ''
})

const name = computed(() => {
  return props.player ? playerFullName(props.player) : ''
})

const subtitle = computed(() => {
  if (props.player == null) return ''

  return [
    props.player.championName ?? '',
    roleLabel(props.player.teamPosition),
    props.player.champLevel ? `Niveau ${props.player.champLevel}` : '',
    props.player.riotIdTagLine ? `#${props.player.riotIdTagLine}` : '',
  ]
    .filter((part) => part !== '')
    .join(' · ')
})

const championIconUrl = computed(() => {
  return getChampionIconUrl(props.player?.championName, props.patch)
})

const itemSlots = computed(() => {
  return props.player ? getItemSlots(props.player) : []
})

const consumablesPurchased = computed(() => {
  return props.player?.consumablesPurchased ?? 0
})

const itemIconUrl = (itemId: number) => {
  return getItemIconUrl(itemId, props.patch)
}

const tiles = computed<StatTile[]>(() => {
  if (props.player == null) return []
  const p = props.player

  return [
    {
      label: 'KDA',
      value: kdaLabel(p),
      detail: `${p.kills} / ${p.deaths} / ${p.assists} · ${rankLabel(p, (x) => kda(x))}`,
    },
    {
      label: 'Participation',
      value: `${killParticipation(p)}%`,
      detail: `des kills de son équipe · ${rankLabel(p, (x) => killParticipation(x))}`,
    },
    {
      label: 'CS / min',
      value: decimalLabel(csPerMinute(p), 1),
      detail: `${creepScoreFor(p, props.timeline)} CS au total · ${rankLabel(p, (x) => csPerMinute(x))}`,
    },
    {
      label: 'Or / min',
      value: Math.round(goldPerMinute(p)).toString(),
      detail: `${formatCompact(goldEarnedFor(p, props.timeline))} au total · ${rankLabel(p, (x) => goldPerMinute(x))}`,
    },
    {
      label: 'Dégâts / min',
      value: Math.round(damagePerMinute(p)).toString(),
      detail: `${formatCompact(damageToChampionsFor(p, props.timeline))} infligés · ${rankLabel(p, (x) => damagePerMinute(x))}`,
    },
    {
      label: 'Dégâts subis',
      value: formatCompact(damageTaken(p)),
      detail: `${rankLabel(p, (x) => damageTaken(x))} le plus ciblé`,
    },
    {
      label: 'Score de vision',
      value: (p.visionScore ?? 0).toString(),
      detail: rankLabel(p, (x) => x.visionScore ?? 0),
    },
    {
      label: 'Contrôle infligé',
      value: `${crowdControl(p)}s`,
      detail: `${rankLabel(p, (x) => crowdControl(x))} · ${pings(p)} pings envoyés`,
    },
  ]
})
</script>
