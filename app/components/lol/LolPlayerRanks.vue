<script setup lang="ts">
import { computed } from 'vue'
import type { LeaguePlayer, LeagueOfLegendsRank } from '~/lib/types'
import { tierLabel, tierEmblemUrl } from '~/utils/lol-tier'

const props = defineProps<{
  player: LeaguePlayer
}>()

interface RankCardData {
  queueLabel: string
  rank: LeagueOfLegendsRank | null
  form: boolean[]
  lpDelta: number | null
}

// L'API renvoie déjà la forme de la partie la plus récente à la plus ancienne, dans l'ordre
// d'affichage ; le slice ne borne que la longueur, au cas où l'API en renverrait davantage.
const cards = computed<RankCardData[]>(() => [
  { queueLabel: 'Classée Solo/Duo', rank: props.player.leagueOfLegendsSoloRank, form: (props.player.recentFormSolo || []).slice(0, 8), lpDelta: props.player.lpChange7DaysSolo },
  { queueLabel: 'Classée Flex', rank: props.player.leagueOfLegendsFlexRank, form: (props.player.recentFormFlex || []).slice(0, 8), lpDelta: props.player.lpChange7DaysFlex },
])

const winRate = (rank: LeagueOfLegendsRank) => {
  const total = rank.wins + rank.losses
  return total > 0 ? Math.round((rank.wins / total) * 100) : 0
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div v-for="card in cards" :key="card.queueLabel" class="rounded-2xl border border-border-base bg-surface-base p-5 flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <span class="font-mono text-[11px] font-bold tracking-widest uppercase text-text-ter">{{ card.queueLabel }}</span>
        <span v-if="card.rank?.hotStreak" class="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-brand-green/15 text-brand-green">Hot Streak</span>
      </div>

      <div v-if="!card.rank" class="flex items-center gap-4">
        <img :src="tierEmblemUrl(null)" alt="" class="w-14 h-14 shrink-0 opacity-60" >
        <p class="text-sm font-bold text-text-sec">Non classé</p>
      </div>

      <template v-else>
        <div class="flex items-center gap-4">
          <img :src="tierEmblemUrl(card.rank)" alt="" class="w-14 h-14 shrink-0" >
          <div class="min-w-0">
            <div class="text-xl font-extrabold tracking-tight leading-tight text-text-main">{{ tierLabel(card.rank) }}</div>
            <div class="mt-1 font-mono text-xs font-bold text-text-sec">
              {{ card.rank.leaguePoints }} LP
              <span v-if="card.lpDelta != null" :class="card.lpDelta > 0 ? 'text-brand-green' : card.lpDelta < 0 ? 'text-brand-red' : 'text-text-ter'">
                {{ card.lpDelta > 0 ? '+' : '' }}{{ card.lpDelta }} &middot; 7 J
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-sm font-extrabold" :class="winRate(card.rank) >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ winRate(card.rank) }}%</span>
            <span class="font-mono text-[10.5px] font-bold text-text-ter">{{ card.rank.wins }}V {{ card.rank.losses }}D</span>
          </div>
          <span class="block h-1 rounded-full bg-border-subtle overflow-hidden">
            <span
              class="block h-full rounded-full transition-[width] duration-1000 ease-out"
              :class="winRate(card.rank) >= 50 ? 'bg-brand-green' : 'bg-brand-red'"
              :style="{ width: winRate(card.rank) + '%' }"
            />
          </span>
        </div>

        <div v-if="card.form.length > 0" class="flex items-center justify-between gap-3 pt-1">
          <span class="flex items-center gap-1">
            <span
              v-for="(won, i) in card.form"
              :key="i"
              :title="won ? 'Victoire' : 'Défaite'"
              class="w-2 h-3.5 rounded-xs block"
              :class="won ? 'bg-brand-green' : 'bg-brand-red opacity-80'"
            />
          </span>
          <span class="font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">{{ card.form.length }} dernières</span>
        </div>
      </template>
    </div>
  </div>
</template>
