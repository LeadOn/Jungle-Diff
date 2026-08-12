<script setup lang="ts">
import { usePatchStore } from '~/stores/patch'
import MockBadge from '~/components/ui/MockBadge.vue'

// Synergie de duo (coéquipiers récurrents du crew) : dérivable en théorie des participants
// de chaque partie, mais aucun endpoint n'expose encore cet agrégat côté API : Mock.
const patchStore = usePatchStore()

const DUOS = [
  { name: 'Hugz', icon: 4568, games: 34, wr: 62 },
  { name: 'TheoTop', icon: 5212, games: 21, wr: 48 },
  { name: 'Antuan', icon: 3546, games: 12, wr: 42 },
]
</script>

<template>
  <section class="relative rounded-2xl border border-border-base bg-surface-base p-6">
    <MockBadge />
    <div class="flex items-center justify-between gap-3 mb-4">
      <h3 class="m-0 text-sm font-extrabold text-text-main">Duos</h3>
      <span class="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-surface-high border border-border-subtle text-text-main">Saison</span>
    </div>
    <div class="flex flex-col gap-3.5">
      <div v-for="d in DUOS" :key="d.name" class="flex items-center gap-3">
        <div class="w-8 h-8 shrink-0 rounded-md overflow-hidden border border-border-subtle bg-surface-high">
          <img :src="`https://ddragon.leagueoflegends.com/cdn/${patchStore.currentPatch}/img/profileicon/${d.icon}.png`" :alt="d.name" class="w-full h-full object-cover" >
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <span class="text-[13px] font-extrabold text-text-main truncate">{{ d.name }}</span>
          <span class="font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">{{ d.games }} PARTIES ENSEMBLE</span>
        </div>
        <span class="shrink-0 text-[13px] font-black" :class="d.wr >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ d.wr }}%</span>
      </div>
    </div>
  </section>
</template>
