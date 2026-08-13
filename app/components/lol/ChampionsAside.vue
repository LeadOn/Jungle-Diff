<script setup lang="ts">
import { computed } from 'vue'
import { usePatchStore } from '~/stores/patch'
import { getChampionIconUrl } from '~/utils/ddragon'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

type Period = '7j' | '30j' | 'all-time'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const patchStore = usePatchStore()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 J', '30j': '30 J', 'all-time': 'Toujours' }

const badge = computed(() => PERIOD_BADGE[props.period])
const champs = computed(() => props.stats?.championStats ?? [])

function formatKda(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
</script>

<template>
  <section class="relative rounded-2xl border border-border-base bg-surface-base p-6">
    <div class="flex items-center justify-between gap-3 mb-4">
      <h3 class="m-0 text-sm font-extrabold text-text-main">Champions</h3>
      <span class="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-surface-high border border-border-subtle text-text-main">{{ badge }}</span>
    </div>
    <div v-if="champs.length === 0" class="py-4 text-center">
      <p class="m-0 text-xs font-bold text-text-ter">Aucun champion joué sur cette période.</p>
    </div>
    <div v-else class="flex flex-col gap-3.5">
      <div v-for="c in champs" :key="c.championName" class="flex items-center gap-3">
        <div class="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-border-accent bg-surface-high">
          <img :src="getChampionIconUrl(c.championName, patchStore.currentPatch)" :alt="c.championName" class="w-full h-full object-cover" >
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-[13px] font-extrabold text-text-main truncate">{{ c.championName }}</span>
            <span class="font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter whitespace-nowrap">{{ formatKda(c.kda) }} KDA</span>
          </div>
          <span class="block mt-1.5 h-1 rounded-full bg-border-subtle overflow-hidden">
            <span class="block h-full rounded-full" :class="c.winRate >= 50 ? 'bg-brand-green' : 'bg-brand-red'" :style="{ width: c.winRate + '%' }"/>
          </span>
        </div>
        <div class="text-right shrink-0">
          <div class="text-[13px] font-black leading-none" :class="c.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ c.winRate }}%</div>
          <div class="mt-1 font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">{{ c.gamesPlayed }} PARTIE{{ c.gamesPlayed > 1 ? 'S' : '' }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
