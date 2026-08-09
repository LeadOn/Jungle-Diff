<template>
  <div class="bg-surface-base rounded-2xl p-6 border border-border-base animate-fade-in-up mt-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-[16px] font-extrabold text-text-main leading-tight">Dernières parties</h2>
      <button class="text-text-sec hover:text-text-main font-bold text-xs transition-colors cursor-pointer">Tout voir</button>
    </div>
    
    <div class="flex flex-col gap-2">
      <div 
        v-for="match in matches" 
        :key="match.id" 
        class="relative flex items-center justify-between p-3 rounded-xl bg-surface-high border border-border-subtle hover:border-border-accent hover:translate-x-1 transition-all group overflow-hidden"
      >
        <!-- Liseré gauche -->
        <div class="absolute left-0 top-0 bottom-0 w-1" :class="getResultColor(match.result)"></div>
        
        <div class="flex items-center gap-4 pl-2">
          <!-- Icône Champion -->
          <div class="w-10 h-10 rounded-full overflow-hidden border border-border-accent shadow-sm">
            <img :src="`https://ddragon.leagueoflegends.com/cdn/14.13.1/img/champion/${match.champion}.png`" :alt="match.champion" class="w-full h-full object-cover" />
          </div>
          
          <div class="flex flex-col">
            <div class="flex items-baseline gap-2">
              <span class="text-[14px] font-extrabold" :class="getResultTextColor(match.result)">{{ getResultText(match.result) }}</span>
              <span class="text-[13px] font-bold text-text-main">{{ match.player }} <span class="text-text-ter font-medium mx-0.5">·</span> {{ match.champion }}</span>
            </div>
            <div class="font-mono text-[10px] font-bold text-text-ter tracking-[0.1em] uppercase mt-0.5">
              {{ match.queue }} <span class="mx-1 opacity-50">·</span> {{ match.duration }} <span class="mx-1 opacity-50">·</span> {{ match.when }}
            </div>
          </div>
        </div>
        
        <div class="flex flex-col items-end">
          <div class="flex items-baseline gap-1.5">
            <span class="font-mono text-[13px] font-bold text-text-main">{{ match.k }}<span class="text-text-ter font-normal mx-0.5">/</span><span class="text-brand-red">{{ match.d }}</span><span class="text-text-ter font-normal mx-0.5">/</span>{{ match.a }}</span>
            <span class="text-[11px] font-bold text-text-sec">{{ getKDA(match.k, match.d, match.a) }}</span>
          </div>
          <div class="text-[12px] font-black mt-0.5" :class="getDeltaColor(match.lpChange)">
            {{ match.lpChange > 0 ? '+' : '' }}{{ match.lpChange !== 0 ? match.lpChange + ' LP' : '-' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const matches = [
  { id: 1, result: 'WIN', player: 'Hugo', champion: 'LeeSin', queue: 'Classé Solo', duration: '28:14', when: 'il y a 2h', k: 8, d: 2, a: 12, lpChange: 21 },
  { id: 2, result: 'LOSS', player: 'Théo', champion: 'Aatrox', queue: 'Classé Solo', duration: '34:02', when: 'il y a 3h', k: 4, d: 7, a: 3, lpChange: -18 },
  { id: 3, result: 'WIN', player: 'Valentin', champion: 'Leona', queue: 'Classé Flex', duration: '22:45', when: 'il y a 5h', k: 1, d: 3, a: 18, lpChange: 17 },
  { id: 4, result: 'REMAKE', player: 'Antoine', champion: 'Yasuo', queue: 'Classé Solo', duration: '3:15', when: 'il y a 12h', k: 0, d: 0, a: 0, lpChange: 0 },
  { id: 5, result: 'WIN', player: 'Maxime', champion: 'Jinx', queue: 'Classé Solo', duration: '41:20', when: 'il y a 1j', k: 14, d: 4, a: 8, lpChange: 24 }
]

const getResultColor = (result: string) => {
  if (result === 'WIN') return 'bg-brand-green'
  if (result === 'LOSS') return 'bg-brand-red'
  return 'bg-text-ter'
}

const getResultTextColor = (result: string) => {
  if (result === 'WIN') return 'text-brand-green'
  if (result === 'LOSS') return 'text-brand-red'
  return 'text-text-ter'
}

const getResultText = (result: string) => {
  if (result === 'WIN') return 'Victoire'
  if (result === 'LOSS') return 'Défaite'
  return 'Remake'
}

const getDeltaColor = (delta: number) => {
  if (delta > 0) return 'text-brand-green'
  if (delta < 0) return 'text-brand-red'
  return 'text-text-ter'
}

const getKDA = (k: number, d: number, a: number) => {
  if (d === 0) return 'Parfait'
  return ((k + a) / d).toFixed(2) + ' KDA'
}
</script>
