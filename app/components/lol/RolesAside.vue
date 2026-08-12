<script setup lang="ts">
import MockBadge from '~/components/ui/MockBadge.vue'

// La position (teamPosition) est bien présente sur chaque participant renvoyé par l'API,
// mais aucun endpoint n'agrège encore une répartition par rôle pour un joueur : Mock.
const ROLES = [
  { label: 'SUPPORT', share: 68, wr: 54 },
  { label: 'TOP', share: 19, wr: 47 },
  { label: 'JUNGLE', share: 13, wr: 41 },
]
</script>

<template>
  <section class="relative rounded-2xl border border-border-base bg-surface-base p-6">
    <MockBadge />
    <h3 class="m-0 mb-4 text-sm font-extrabold text-text-main">Rôles</h3>
    <div class="flex flex-col gap-3">
      <div v-for="r in ROLES" :key="r.label" class="flex items-center gap-3">
        <span class="w-[78px] shrink-0 font-mono text-[10px] font-bold tracking-widest uppercase text-text-ter">{{ r.label }}</span>
        <span class="flex-1 min-w-0 h-1.5 rounded-full bg-border-subtle overflow-hidden block">
          <span class="block h-full rounded-full bg-brand-gold" :style="{ width: r.share + '%' }"/>
        </span>
        <span class="w-[62px] shrink-0 text-right text-xs font-extrabold text-text-main">
          {{ r.share }}% <span class="font-mono text-[10px] font-bold text-text-ter">{{ r.wr }}% WR</span>
        </span>
      </div>
    </div>
  </section>
</template>
