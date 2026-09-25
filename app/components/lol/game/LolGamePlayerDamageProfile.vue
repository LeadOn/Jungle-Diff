<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { damageSplitFor, damageToChampionsFor, formatFull, latestStatsFor, playerRiotName } from '~/utils/lol-match'
import { useEntered } from '~/composables/useEntered'

const props = defineProps<{
  player?: LoLGameParticipantDto
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
}>()

const entered = useEntered()

const percent = (value: number, total: number): number => (total > 0 ? Math.round((value / total) * 100) : 0)

const damageTakenOf = (p: LoLGameParticipantDto): number =>
  p.stats?.damageTaken ?? latestStatsFor(props.timeline, p.puuid)?.totalDamageTaken ?? 0

const playerLabel = computed(() => (props.player ? playerRiotName(props.player) : ''))

const split = computed(() => (props.player ? damageSplitFor(props.player, props.timeline) : null))

const rows = computed(() => {
  const s = split.value
  if (s == null) return []
  const total = s.physical + s.magic + s.trueDamage
  return [
    { label: 'Physiques', colorClass: 'bg-dmg-physical', value: s.physical, percent: percent(s.physical, total) },
    { label: 'Magiques', colorClass: 'bg-dmg-magic', value: s.magic, percent: percent(s.magic, total) },
    { label: 'Bruts', colorClass: 'bg-dmg-true', value: s.trueDamage, percent: percent(s.trueDamage, total) },
  ]
})

const team = computed(() => props.players.filter(p => p.teamId === props.player?.teamId))

const teamDamageShare = computed(() => (props.player
  ? percent(
      damageToChampionsFor(props.player, props.timeline),
      team.value.reduce((sum, p) => sum + damageToChampionsFor(p, props.timeline), 0),
    )
  : 0))

const damageTaken = computed(() => (props.player ? damageTakenOf(props.player) : 0))

const teamDamageTakenShare = computed(() => percent(
  damageTaken.value,
  team.value.reduce((sum, p) => sum + damageTakenOf(p), 0),
))
</script>

<template>
  <section class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <h3 class="m-0 text-xl font-bold tracking-[-0.025em]">Profil de dégâts</h3>
    <p class="m-0 mb-[18px] mt-[3px] text-[12.5px] font-semibold text-text-sec">Répartition physique / magique / brut de {{ playerLabel }}</p>

    <template v-if="rows.length > 0">
      <div class="flex h-5 overflow-hidden rounded-full bg-surface-high">
        <span
          v-for="row in rows"
          :key="row.label"
          class="h-full transition-[width] duration-600 ease-spring-soft"
          :class="row.colorClass"
          :style="{ width: `${entered ? row.percent : 0}%` }"
        />
      </div>
      <div class="mt-4 flex flex-col gap-2">
        <div
          v-for="row in rows"
          :key="row.label"
          class="flex items-center justify-between gap-2.5 rounded-[14px] bg-surface-muted px-3.5 py-2.5"
        >
          <span class="flex items-center gap-2 text-[13.5px] font-bold">
            <span class="size-2.5 rounded-[3px]" :class="row.colorClass" />
            {{ row.label }}
            <span class="font-semibold text-text-sec">{{ row.percent }} %</span>
          </span>
          <span class="font-mono text-[13px] font-semibold">{{ formatFull(row.value) }}</span>
        </div>
      </div>
    </template>
    <p v-else class="m-0 rounded-[14px] border-[1.5px] border-dashed border-border-dashed px-4 py-6 text-center text-[13px] font-semibold text-text-sec">
      Répartition physique / magique / brut indisponible pour cette partie (timeline non synchronisée).
    </p>

    <div class="mt-3.5 flex flex-col gap-2 border-t-[1.5px] border-dashed border-border-dashed pt-3.5 text-[13.5px] font-bold">
      <div class="flex justify-between gap-3">
        <span class="text-text-sec">Part des dégâts de l'équipe</span>
        <span class="font-mono font-semibold">{{ teamDamageShare }} %</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-text-sec">Dégâts subis</span>
        <span class="font-mono font-semibold">{{ formatFull(damageTaken) }} · {{ teamDamageTakenShare }} % de l'équipe</span>
      </div>
    </div>
  </section>
</template>
