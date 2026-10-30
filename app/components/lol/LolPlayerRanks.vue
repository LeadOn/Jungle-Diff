<script setup lang="ts">
import { computed } from 'vue'
import type { LeaguePlayer, LeagueOfLegendsRank } from '~/lib/types'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'
import { useEntered } from '~/composables/useEntered'
import { tierLabel, tierEmblemUrl } from '~/utils/lol-tier'
import { formatSigned } from '~/utils/number'
import LolLpBadge from '~/components/lol/LolLpBadge.vue'
import LolFormPills from '~/components/lol/LolFormPills.vue'

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

// The API returns recent form newest first; `LolFormPills` reverses it to read oldest → newest.
// The slice only bounds the length, in case the API ever returns more entries.
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
  return { background: `conic-gradient(var(--win) 0 ${degrees}deg, color-mix(in oklch, var(--loss) 22%, var(--surface)) 0)` }
}

const record = (rank: LeagueOfLegendsRank) =>
  `${rank.wins} victoire${rank.wins > 1 ? 's' : ''} · ${rank.losses} défaite${rank.losses > 1 ? 's' : ''}`
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div
      v-for="(card, index) in cards"
      :key="card.queueLabel"
      class="flex min-w-0 flex-col gap-4 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-[18px] shadow-card"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="type-title m-0 text-ink">{{ card.queueLabel }}</h2>
        <span v-if="card.rank" class="flex items-center gap-1.5">
          <span
            v-if="card.rank.hotStreak"
            title="Au moins 3 victoires d'affilée"
            class="inline-flex h-[22px] items-center whitespace-nowrap rounded-1 bg-win-soft px-1.5 text-[11.5px] font-[650] text-win-ink"
          >Hot Streak</span>
          <LolLpBadge v-if="card.lpDelta != null" :value="card.lpDelta" title="Sur 7 jours">
            {{ formatSigned(card.lpDelta) }} LP · 7 j
          </LolLpBadge>
        </span>
      </div>

      <div v-if="!card.rank" class="flex flex-1 items-center gap-3.5">
        <UiAppImage :src="tierEmblemUrl(null)" alt="" class="size-[72px] shrink-0 object-contain opacity-45 grayscale" />
        <div>
          <div class="type-d3 text-ink-2">Non classé</div>
          <div class="type-small mt-1 text-ink-2">Aucune partie de placement terminée</div>
        </div>
      </div>

      <template v-else>
        <div class="flex flex-1 items-center gap-3.5">
          <UiAppImage :src="tierEmblemUrl(card.rank)" alt="" class="size-[72px] shrink-0 object-contain" />
          <div class="min-w-0 flex-1">
            <div class="type-d3 text-ink">{{ tierLabel(card.rank) }}</div>
            <div class="mt-1.5 flex items-baseline gap-1">
              <span class="fig text-[1.5rem] text-ink">{{ card.rank.leaguePoints }}</span>
              <span class="text-[0.8125rem] font-[620] text-ink-2">LP</span>
            </div>
          </div>
          <div
            :title="record(card.rank)"
            class="flex size-[72px] shrink-0 items-center justify-center rounded-full"
            :style="ringStyle(index)"
          >
            <span
              class="fig flex size-[58px] items-center justify-center rounded-full bg-surface text-[1.375rem]"
              :class="winRate(card.rank) >= 50 ? 'text-win-ink' : 'text-loss-ink'"
            >{{ winRate(card.rank) }}<small class="ml-px text-[0.75rem]">%</small></span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line-strong pt-3">
          <span class="text-[0.8125rem] font-[620] text-ink">{{ record(card.rank) }}</span>
          <span v-if="card.form.length > 0" class="flex items-center gap-2">
            <LolFormPills :form="card.form" />
            <span class="type-small text-ink-2">{{ card.form.length }} dernières</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
