<script setup lang="ts">
import { computed } from 'vue'
import { usePatchStore } from '~/stores/patch'
import { getChampionIconUrl } from '~/utils/ddragon'
import MockBadge from '~/components/ui/MockBadge.vue'

type Period = '7j' | '30j' | 'saison'

const props = defineProps<{
  period: Period
}>()

const patchStore = usePatchStore()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 J', '30j': '30 J', saison: 'SAISON' }

// Pas d'endpoint GameOn API pour un top champions par joueur et par période : données Mock.
const CHAMPS: Record<Period, { name: string, games: number, wr: number, kda: string }[]> = {
  '7j': [
    { name: 'Leona', games: 7, wr: 57, kda: '2,9' },
    { name: 'Nautilus', games: 5, wr: 60, kda: '2,4' },
    { name: 'Rakan', games: 4, wr: 50, kda: '3,1' },
  ],
  '30j': [
    { name: 'Leona', games: 26, wr: 58, kda: '2,8' },
    { name: 'Nautilus', games: 18, wr: 61, kda: '2,5' },
    { name: 'Rakan', games: 14, wr: 50, kda: '3,0' },
    { name: 'Braum', games: 9, wr: 44, kda: '2,1' },
  ],
  saison: [
    { name: 'Leona', games: 94, wr: 55, kda: '2,7' },
    { name: 'Nautilus', games: 61, wr: 57, kda: '2,5' },
    { name: 'Rakan', games: 48, wr: 52, kda: '2,9' },
    { name: 'Braum', games: 34, wr: 47, kda: '2,2' },
    { name: 'Thresh', games: 22, wr: 45, kda: '2,4' },
  ],
}

const champs = computed(() => CHAMPS[props.period])
const badge = computed(() => PERIOD_BADGE[props.period])
</script>

<template>
  <section class="relative rounded-2xl border border-border-base bg-surface-base p-6">
    <MockBadge />
    <div class="flex items-center justify-between gap-3 mb-4">
      <h3 class="m-0 text-sm font-extrabold text-text-main">Champions</h3>
      <span class="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-surface-high border border-border-subtle text-text-main">{{ badge }}</span>
    </div>
    <div class="flex flex-col gap-3.5">
      <div v-for="c in champs" :key="c.name" class="flex items-center gap-3">
        <div class="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-border-accent bg-surface-high">
          <img :src="getChampionIconUrl(c.name, patchStore.currentPatch)" :alt="c.name" class="w-full h-full object-cover" >
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-[13px] font-extrabold text-text-main truncate">{{ c.name }}</span>
            <span class="font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter whitespace-nowrap">{{ c.kda }} KDA</span>
          </div>
          <span class="block mt-1.5 h-1 rounded-full bg-border-subtle overflow-hidden">
            <span class="block h-full rounded-full" :class="c.wr >= 50 ? 'bg-brand-green' : 'bg-brand-red'" :style="{ width: c.wr + '%' }"/>
          </span>
        </div>
        <div class="text-right shrink-0">
          <div class="text-[13px] font-black leading-none" :class="c.wr >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ c.wr }}%</div>
          <div class="mt-1 font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">{{ c.games }} PARTIE{{ c.games > 1 ? 'S' : '' }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
