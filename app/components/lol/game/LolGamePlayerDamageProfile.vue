<template>
  <div class="border-border-base border-b px-5 py-4">
    <p class="font-heading text-text-main text-base font-semibold">
      Profil de dégâts
    </p>
    <p class="text-text-ter mt-0.5 text-[13px]">
      Répartition des dégâts infligés aux champions
    </p>
  </div>

  <div class="p-5">
    <div v-if="hasSplitData" class="space-y-4">
      <div v-for="row in rows" :key="row.label">
        <div class="flex items-center justify-between gap-3">
          <span
            class="text-text-secondary flex items-center gap-2 text-[13px]"
          >
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-sm"
              :class="row.dotClass"
            ></span>
            {{ row.label }}
          </span>
          <span class="text-text-main text-[13px] font-semibold">
            {{ row.valueLabel }}
          </span>
        </div>

        <div
          class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10 light:bg-black/5"
        >
          <div
            class="h-full rounded-full"
            :class="row.barClass"
            :style="{ width: `${row.percent}%` }"
          ></div>
        </div>
      </div>
    </div>
    <p v-else class="text-text-ter text-[13px]">
      Répartition physique / magique / brut indisponible pour cette partie
      (timeline non synchronisée).
    </p>

    <div class="border-border-base mt-5 grid grid-cols-2 gap-4 border-t pt-4">
      <div>
        <p
          class="text-text-ter text-[10px] font-semibold uppercase tracking-wide"
        >
          Part des dégâts de l'équipe
        </p>
        <p class="font-heading text-brand-gold mt-1 text-2xl font-bold">
          {{ teamDamageShare }}%
        </p>
      </div>

      <div>
        <p
          class="text-text-ter text-[10px] font-semibold uppercase tracking-wide"
        >
          Dégâts encaissés
        </p>
        <p class="font-heading text-brand-red mt-1 text-2xl font-bold">
          {{ damageTakenLabel }}
        </p>
        <p class="text-text-ter mt-1 text-[11px]">
          {{ teamDamageTakenShare }}% des dégâts subis par l'équipe
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  damageSplitFor,
  damageToChampionsFor,
  formatCompact,
  latestStatsFor,
} from '~/utils/lol-match'

const props = defineProps<{
  player?: LoLGameParticipantDto
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
}>()

interface DamageRow {
  label: string
  dotClass: string
  barClass: string
  valueLabel: string
  percent: number
}

const percent = (value: number, total: number): number => {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

const shareLabel = (value: number, total: number): string => {
  return `${formatCompact(value)} · ${percent(value, total)}%`
}

const getDamageTaken = (p: LoLGameParticipantDto): number => {
  return (
    p.stats?.damageTaken ??
    latestStatsFor(props.timeline, p.puuid)?.totalDamageTaken ??
    0
  )
}

const splitData = computed(() => {
  if (props.player == null) return null
  return damageSplitFor(props.player, props.timeline)
})

const hasSplitData = computed(() => splitData.value != null)

const rows = computed<DamageRow[]>(() => {
  const split = splitData.value
  const physical = split?.physical ?? 0
  const magic = split?.magic ?? 0
  const trueDamage = split?.trueDamage ?? 0
  const total = physical + magic + trueDamage

  return [
    {
      label: 'Physiques',
      dotClass: 'bg-brand-gold',
      barClass: 'bg-brand-gold',
      valueLabel: shareLabel(physical, total),
      percent: percent(physical, total),
    },
    {
      label: 'Magiques',
      dotClass: 'bg-blue-400',
      barClass: 'bg-blue-400',
      valueLabel: shareLabel(magic, total),
      percent: percent(magic, total),
    },
    {
      label: 'Bruts',
      dotClass: 'bg-white light:bg-black/55',
      barClass: 'bg-white light:bg-black/55',
      valueLabel: shareLabel(trueDamage, total),
      percent: percent(trueDamage, total),
    },
  ]
})

const team = computed(() => {
  return props.players.filter((p) => p.teamId === props.player?.teamId)
})

const teamDamageShare = computed(() => {
  if (props.player == null) return 0
  return percent(
    damageToChampionsFor(props.player, props.timeline),
    team.value.reduce((sum, p) => sum + damageToChampionsFor(p, props.timeline), 0)
  )
})

const damageTakenLabel = computed(() => {
  if (props.player == null) return '0'
  return formatCompact(getDamageTaken(props.player))
})

const teamDamageTakenShare = computed(() => {
  if (props.player == null) return 0
  const damageTaken = getDamageTaken(props.player)
  return percent(
    damageTaken,
    team.value.reduce((sum, p) => sum + getDamageTaken(p), 0)
  )
})
</script>
