<template>
  <div class="p-5">
    <template v-if="playersWithStats.length > 0">
      <div class="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          v-for="stat in stats"
          :key="stat.key"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="
            stat.key === selectedStatKey
              ? 'text-text-main bg-white/10 light:bg-black/10'
              : 'text-text-ter hover:text-text-main hover:bg-white/5 light:hover:bg-black/5'
          "
          :title="stat.description"
          @click="selectStat(stat.key)"
        >
          {{ stat.label }}
        </button>
      </div>

      <div class="space-y-2.5">
        <div
          v-for="row in rows"
          :key="row.player.puuid"
          class="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors"
          :class="
            selectedPuuid === row.player.puuid
              ? 'light:bg-black/5 bg-white/10'
              : 'light:hover:bg-black/5 hover:bg-white/5'
          "
          @click="select(row.player)"
        >
          <div class="flex w-40 min-w-0 shrink-0 items-center gap-2">
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="row.player.teamId === 100 ? 'bg-brand-green' : 'bg-brand-red'"
            ></span>
            <img
              :src="championIconUrl(row.player)"
              :alt="row.player.championName"
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
              class="h-full rounded-full transition-all duration-500"
              :class="row.player.teamId === 100 ? 'bg-brand-green' : 'bg-brand-red'"
              :style="{ width: `${widthPercent(row.value)}%` }"
            ></div>
          </div>

          <span
            class="text-text-secondary w-16 shrink-0 text-right text-xs font-semibold"
          >
            {{ formatValue(row.value) }}
          </span>
        </div>
      </div>

      <p v-if="excludedPlayerCount > 0" class="text-text-ter mt-3 text-[11px]">
        {{ excludedPlayerCount }} joueur{{ excludedPlayerCount > 1 ? "s" : "" }}
        exclu{{ excludedPlayerCount > 1 ? "s" : "" }} : statistiques avancées
        indisponibles pour cette partie.
      </p>
    </template>
    
    <div v-else class="text-text-ter p-4 text-center text-sm font-medium">
      Statistiques avancées indisponibles pour cette partie (historique non recalculé).
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import {
  championIconUrl as getChampionIconUrl,
  decimalLabel,
  formatFull,
} from '~/utils/lol-match'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  patch: string
  selectedPuuid?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedPuuid', puuid: string): void
}>()

interface RankingStat {
  key: string
  label: string
  valueFn: (player: LoLGameParticipantDto) => number
  formatFn: (value: number) => string
  description?: string
}

interface RankingRow {
  player: LoLGameParticipantDto
  value: number
}

const stats: RankingStat[] = [
  {
    key: 'kda',
    label: 'KDA',
    valueFn: (p) => p.stats?.kda ?? 0,
    formatFn: (v) => decimalLabel(v, 2),
  },
  {
    key: 'csPerMinute',
    label: 'CS/min',
    valueFn: (p) => p.stats?.csPerMinute ?? 0,
    formatFn: (v) => decimalLabel(v),
  },
  {
    key: 'goldPerMinute',
    label: 'Or/min',
    valueFn: (p) => p.stats?.goldPerMinute ?? 0,
    formatFn: (v) => formatFull(v),
  },
  {
    key: 'damagePerMinute',
    label: 'Dégâts/min',
    valueFn: (p) => p.stats?.damagePerMinute ?? 0,
    formatFn: (v) => formatFull(v),
  },
  {
    key: 'damageTaken',
    label: 'Dégâts subis',
    valueFn: (p) => p.stats?.damageTaken ?? 0,
    formatFn: (v) => formatFull(v),
  },
  {
    key: 'killParticipationPercent',
    label: 'Participation',
    valueFn: (p) => p.stats?.killParticipationPercent ?? 0,
    formatFn: (v) => `${Math.round(v)}%`,
    description:
      "Part des éliminations de l'équipe auxquelles le joueur a contribué : (kills + assists du joueur) ÷ (kills totaux de l'équipe) × 100",
  },
  {
    key: 'visionScore',
    label: 'Score de vision',
    valueFn: (p) => p.visionScore ?? 0,
    formatFn: (v) => formatFull(v),
  },
]

const selectedStatKey = ref(stats[0]!.key)

const selectedStat = computed<RankingStat>(() => {
  return stats.find((s) => s.key === selectedStatKey.value) ?? stats[0]!
})

const playersWithStats = computed(() => {
  return props.players.filter((p) => p.stats != null)
})

const excludedPlayerCount = computed(() => {
  return props.players.length - playersWithStats.value.length
})

const rows = computed<RankingRow[]>(() => {
  const stat = selectedStat.value
  return playersWithStats.value
    .map((player) => ({ player, value: stat.valueFn(player) }))
    .sort((a, b) => b.value - a.value)
})

const maxValue = computed(() => {
  return rows.value.reduce((m, row) => Math.max(m, row.value), 0) || 1
})

const widthPercent = (value: number): number => {
  return Math.max(2, (value / maxValue.value) * 100)
}

const formatValue = (value: number): string => {
  return selectedStat.value.formatFn(value)
}

const selectStat = (key: string) => {
  selectedStatKey.value = key
}

const select = (player: LoLGameParticipantDto) => {
  emit('update:selectedPuuid', player.puuid ?? '')
}

const championIconUrl = (player: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player.championName ?? '', props.patch)
}
</script>
