<script setup lang="ts">
import { computed } from 'vue'
import type { LeaguePlayer, LeagueOfLegendsRank } from '~/lib/types'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'
import { useEntered } from '~/composables/useEntered'
import { tierLabel, tierEmblemUrl } from '~/utils/lol-tier'
import { formatSigned } from '~/utils/number'

const props = defineProps<{
  player: LeaguePlayer
}>()

// The win-rate rings fill from empty after mount, so hydration matches what the server painted.
const entered = useEntered()

interface RankCardData {
  queueLabel: string
  rank: LeagueOfLegendsRank | null
  form: boolean[]
  lpDelta: number | null
}

// The API already returns recent form from newest to oldest, in display order; the slice only
// bounds the length, in case the API ever returns more entries.
const cards = computed<RankCardData[]>(() => [
  { queueLabel: 'Classée Solo/Duo', rank: props.player.leagueOfLegendsSoloRank, form: (props.player.recentFormSolo || []).slice(0, 8), lpDelta: props.player.lpChange7DaysSolo },
  { queueLabel: 'Classée Flex', rank: props.player.leagueOfLegendsFlexRank, form: (props.player.recentFormFlex || []).slice(0, 8), lpDelta: props.player.lpChange7DaysFlex },
])

const winRate = (rank: LeagueOfLegendsRank) => {
  const total = rank.wins + rank.losses
  return total > 0 ? Math.round((rank.wins / total) * 100) : 0
}

/**
 * A gradient cannot be transitioned, so the ring's fill is eased in script: it starts on 0 on both
 * the server and the first client render, then grows to the win rate once the card has entered.
 */
const soloFill = useAnimatedNumber(() => (entered.value && props.player.leagueOfLegendsSoloRank ? winRate(props.player.leagueOfLegendsSoloRank) : 0), 1100)
const flexFill = useAnimatedNumber(() => (entered.value && props.player.leagueOfLegendsFlexRank ? winRate(props.player.leagueOfLegendsFlexRank) : 0), 1100)

const ringStyle = (index: number) => {
  const degrees = ((index === 0 ? soloFill.value : flexFill.value) / 100) * 360
  return { background: `conic-gradient(var(--color-win-fill) 0 ${degrees}deg, var(--color-loss-rail) 0)` }
}

const deltaClass = (delta: number) =>
  delta > 0 ? 'bg-win-soft text-brand-green' : delta < 0 ? 'bg-loss-soft text-brand-red' : 'bg-surface-muted text-text-main'

const record = (rank: LeagueOfLegendsRank) =>
  `${rank.wins} victoire${rank.wins > 1 ? 's' : ''} · ${rank.losses} défaite${rank.losses > 1 ? 's' : ''}`
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div
      v-for="(card, index) in cards"
      :key="card.queueLabel"
      class="relative flex animate-rise flex-col gap-4 rounded-[26px] border border-border-subtle bg-surface-base p-5 shadow-card transition-[translate,box-shadow] duration-[350ms] ease-spring hover:-translate-y-1 hover:shadow-card-hover"
      :style="{ animationDelay: `${80 + index * 80}ms` }"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold">{{ card.queueLabel }}</span>
        <span v-if="card.rank" class="flex items-center gap-1.5">
          <span
            v-if="card.rank.hotStreak"
            title="Au moins 3 victoires d'affilée"
            class="whitespace-nowrap rounded-full bg-brand-gold-soft px-[9px] py-[3px] text-[11.5px] font-bold text-brand-gold"
          >Hot Streak</span>
          <span
            v-if="card.lpDelta != null"
            title="Sur 7 jours"
            class="whitespace-nowrap rounded-full px-[9px] py-[3px] font-mono text-[11.5px] font-semibold"
            :class="deltaClass(card.lpDelta)"
          >{{ formatSigned(card.lpDelta) }} LP · 7 j</span>
        </span>
      </div>

      <div v-if="!card.rank" class="flex flex-1 items-center gap-3.5">
        <UiAppImage :src="tierEmblemUrl(null)" alt="" class="size-[78px] shrink-0 object-contain opacity-45 grayscale" />
        <div>
          <div class="text-[26px] font-bold leading-[1.05] tracking-[-0.035em] text-text-sec">Non classé</div>
          <div class="mt-1 text-[13px] font-semibold text-text-sec">Aucune partie de placement terminée</div>
        </div>
      </div>

      <template v-else>
        <div class="flex flex-1 items-center gap-3.5">
          <UiAppImage :src="tierEmblemUrl(card.rank)" alt="" class="size-[78px] shrink-0 object-contain drop-shadow-[0_8px_12px_rgba(22,36,27,0.25)]" />
          <div class="min-w-0 flex-1">
            <div class="text-[26px] font-bold leading-[1.05] tracking-[-0.035em]">{{ tierLabel(card.rank) }}</div>
            <div class="mt-1 font-mono text-[13px] font-semibold text-text-sec">{{ card.rank.leaguePoints }} LP</div>
          </div>
          <div
            :title="record(card.rank)"
            class="flex size-[72px] shrink-0 items-center justify-center rounded-full"
            :style="ringStyle(index)"
          >
            <span
              class="flex size-[54px] items-center justify-center rounded-full bg-surface-base text-base font-bold tracking-[-0.02em]"
              :class="winRate(card.rank) >= 50 ? 'text-brand-green' : 'text-brand-red'"
            >{{ winRate(card.rank) }}%</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border-dashed pt-3">
          <span class="text-[12.5px] font-bold">{{ record(card.rank) }}</span>
          <span v-if="card.form.length > 0" class="flex items-center gap-2">
            <span class="flex gap-[3px]">
              <span
                v-for="(won, i) in card.form"
                :key="i"
                :title="won ? 'Victoire' : 'Défaite'"
                class="size-[9px] rounded-full"
                :class="won ? 'bg-win' : 'bg-loss'"
              />
            </span>
            <span class="text-[11.5px] font-semibold text-text-sec">{{ card.form.length }} dernières</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
