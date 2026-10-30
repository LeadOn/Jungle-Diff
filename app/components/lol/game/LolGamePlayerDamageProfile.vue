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
  <section class="rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <h3 class="m-0 type-title text-ink">Profil de dégâts</h3>
    <p class="m-0 mb-4 mt-0.5 type-small text-ink-2">Répartition physique / magique / brut de {{ playerLabel }}</p>

    <template v-if="rows.length > 0">
      <div class="flex h-5 overflow-hidden rounded-full bg-neutral-soft">
        <span
          v-for="row in rows"
          :key="row.label"
          class="h-full transition-[width] duration-[600ms] ease-out"
          :class="row.colorClass"
          :style="{ width: `${entered ? row.percent : 0}%` }"
        />
      </div>
      <div class="mt-4 flex flex-col gap-2">
        <div
          v-for="row in rows"
          :key="row.label"
          class="flex items-center justify-between gap-2.5 rounded-3 bg-sunken px-3.5 py-2.5"
        >
          <span class="flex items-center gap-2 text-[0.8125rem] font-semibold text-ink">
            <span class="size-2.5 rounded-1" :class="row.colorClass" />
            {{ row.label }}
            <span class="fig text-[0.9375rem] text-ink-2">{{ row.percent }} %</span>
          </span>
          <span class="fig text-[1.0625rem] text-ink">{{ formatFull(row.value) }}</span>
        </div>
      </div>
    </template>
    <p v-else class="m-0 rounded-3 border border-dashed border-line-strong px-4 py-6 text-center type-small text-ink-2">
      Répartition physique / magique / brut indisponible pour cette partie (timeline non synchronisée).
    </p>

    <div class="mt-3.5 flex flex-col gap-2 border-t border-dashed border-line-strong pt-3.5 text-[0.8125rem] font-semibold">
      <div class="flex justify-between gap-3">
        <span class="text-ink-2">Part des dégâts de l'équipe</span>
        <span class="text-ink"><span class="fig text-[0.9375rem]">{{ teamDamageShare }}</span> %</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-ink-2">Dégâts subis</span>
        <span class="text-right text-ink"><span class="fig text-[0.9375rem]">{{ formatFull(damageTaken) }}</span> · <span class="fig text-[0.9375rem]">{{ teamDamageTakenShare }}</span> % de l'équipe</span>
      </div>
    </div>
  </section>
</template>
