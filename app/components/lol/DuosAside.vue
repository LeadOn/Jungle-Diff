<script setup lang="ts">
import { computed } from 'vue'
import { usePatchStore } from '~/stores/patch'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

type Period = '7j' | '30j' | 'all-time'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const patchStore = usePatchStore()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 J', '30j': '30 J', 'all-time': 'Toujours' }

const badge = computed(() => PERIOD_BADGE[props.period])
const duos = computed(() => props.stats?.duoStats ?? [])
</script>

<template>
  <section class="relative rounded-2xl border border-border-base bg-surface-base p-6">
    <div class="flex items-center justify-between gap-3 mb-4">
      <h3 class="m-0 text-sm font-extrabold text-text-main">Duos</h3>
      <span class="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-surface-high border border-border-subtle text-text-main">{{ badge }}</span>
    </div>
    
    <div v-if="duos.length === 0" class="py-4 text-center">
      <p class="m-0 text-xs font-bold text-text-ter">Aucun duo suivi sur cette période.</p>
    </div>
    <div v-else class="flex flex-col gap-3.5">
      <div v-for="d in duos" :key="d.player.id" class="flex items-center gap-3">
        <div class="w-8 h-8 shrink-0 rounded-md overflow-hidden border border-border-subtle bg-surface-high">
          <img v-if="d.player.lolIconId" :src="`https://ddragon.leagueoflegends.com/cdn/${patchStore.currentPatch}/img/profileicon/${d.player.lolIconId}.png`" :alt="d.player.riotGamesNickname || d.player.nickname" class="w-full h-full object-cover" >
          <div v-else class="w-full h-full bg-surface-high flex items-center justify-center">
            <Icon name="lucide:user" class="h-4 w-4 text-text-ter" />
          </div>
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <span class="text-[13px] font-extrabold text-text-main truncate">{{ d.player.riotGamesNickname || d.player.nickname }}</span>
          <span class="font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">{{ d.gamesPlayed }} PARTIE{{ d.gamesPlayed > 1 ? 'S' : '' }} ENSEMBLE</span>
        </div>
        <span class="shrink-0 text-[13px] font-black" :class="d.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ d.winRate }}%</span>
      </div>
    </div>
  </section>
</template>
