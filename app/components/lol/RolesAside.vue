<script setup lang="ts">
import { computed } from 'vue'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

const props = defineProps<{
  stats: LoLSummonerPerformanceStats | null
}>()

const ROLE_LABELS: Record<string, string> = {
  TOP: 'TOP',
  JUNGLE: 'JUNGLE',
  MIDDLE: 'MID',
  BOTTOM: 'ADC',
  UTILITY: 'SUPPORT',
}

const roles = computed(() => props.stats?.roleStats ?? [])
</script>

<template>
  <section class="relative rounded-2xl border border-border-base bg-surface-base p-6">
    <h3 class="m-0 mb-4 text-sm font-extrabold text-text-main">Rôles</h3>
    
    <div v-if="roles.length === 0" class="py-4 text-center">
      <p class="m-0 text-xs font-bold text-text-ter">Aucun rôle connu sur cette période.</p>
    </div>
    <div v-else class="flex flex-col gap-3">
      <div v-for="r in roles" :key="r.teamPosition" class="flex items-center gap-3">
        <span class="w-[78px] shrink-0 font-mono text-[10px] font-bold tracking-widest uppercase text-text-ter">{{ ROLE_LABELS[r.teamPosition] || r.teamPosition }}</span>
        <span class="flex-1 min-w-0 h-1.5 rounded-full bg-border-subtle overflow-hidden block">
          <span class="block h-full rounded-full bg-brand-gold" :style="{ width: r.playRate + '%' }"/>
        </span>
        <span class="w-[70px] shrink-0 text-right text-xs font-extrabold text-text-main whitespace-nowrap">
          {{ r.playRate }}% <span class="font-mono text-[10px] font-bold text-text-ter">{{ r.winRate }}% WR</span>
        </span>
      </div>
    </div>
  </section>
</template>
