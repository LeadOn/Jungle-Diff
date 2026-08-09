<template>
  <div class="bg-surface-base rounded-2xl p-6 border border-border-base animate-fade-in-up">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-[16px] font-extrabold text-text-main leading-tight">Ladder du crew</h2>
        <p class="font-mono text-[11px] text-text-ter font-bold tracking-[0.1em] uppercase mt-0.5">6 JOUEURS · SYNC IL Y A 12 MIN</p>
      </div>
      
      <!-- Queue Toggle -->
      <div class="flex bg-surface-high rounded-full p-1 border border-border-subtle w-fit">
        <button 
          @click="activeQueue = 'solo'"
          class="px-5 py-1.5 text-xs font-bold rounded-full transition-all"
          :class="activeQueue === 'solo' ? 'bg-surface-base shadow-sm text-text-main border border-border-accent' : 'text-text-sec hover:text-text-main'"
        >
          Solo/Duo
        </button>
        <button 
          @click="activeQueue = 'flex'"
          class="px-5 py-1.5 text-xs font-bold rounded-full transition-all"
          :class="activeQueue === 'flex' ? 'bg-surface-base shadow-sm text-text-main border border-border-accent' : 'text-text-sec hover:text-text-main'"
        >
          Flex
        </button>
      </div>
    </div>
    
    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr class="font-mono text-[10px] font-bold text-text-ter uppercase tracking-[0.1em] border-b border-border-subtle">
            <th class="pb-3 w-8">#</th>
            <th class="pb-3">Joueur</th>
            <th class="pb-3">{{ activeQueue === 'solo' ? 'SOLO / DUO' : 'FLEX' }}</th>
            <th class="pb-3">Forme</th>
            <th class="pb-3 w-32">Winrate</th>
            <th class="pb-3 text-right">7J</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-for="(player, i) in sortedPlayers" :key="player.id" class="border-b border-border-subtle last:border-0 hover:bg-surface-high transition-colors group">
            <td class="py-3.5 font-bold" :class="i === 0 && player.queues[activeQueue].tier !== 'UNRANKED' ? 'text-brand-gold' : 'text-text-ter'">{{ i + 1 }}</td>
            <td class="py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shadow-sm" :style="{ backgroundColor: getTierColor(player.queues[activeQueue].tier, 0.15), color: getTierColor(player.queues[activeQueue].tier, 1), border: `1px solid ${getTierColor(player.queues[activeQueue].tier, 0.3)}` }">
                  {{ player.initial }}
                </div>
                <div>
                  <div class="font-bold text-[13px] text-text-main leading-tight" :class="i === 0 && player.queues[activeQueue].tier !== 'UNRANKED' ? 'text-brand-gold' : ''">{{ player.name }}</div>
                  <div class="text-[11px] text-text-ter font-medium">{{ player.tag }}</div>
                </div>
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex items-center gap-2.5" v-if="player.queues[activeQueue].tier !== 'UNRANKED'">
                <div class="w-6 h-6 flex items-center justify-center text-sm">
                  <span>{{ getTierIcon(player.queues[activeQueue].tier) }}</span>
                </div>
                <div>
                  <div class="font-extrabold text-[13px] text-text-main leading-tight">{{ player.queues[activeQueue].rank }}</div>
                  <div class="font-mono text-[11px] text-text-ter font-bold">{{ player.queues[activeQueue].lp }} LP</div>
                </div>
              </div>
              <div v-else class="text-[13px] font-bold text-text-ter italic">
                Non classé
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex gap-1" v-if="player.queues[activeQueue].tier !== 'UNRANKED'">
                <span v-for="(win, j) in player.queues[activeQueue].form" :key="j" class="w-2 h-3.5 rounded-[2px]" :class="win ? 'bg-brand-green' : 'bg-brand-red opacity-80'"></span>
              </div>
              <div v-else class="text-text-ter">-</div>
            </td>
            <td class="py-3.5">
              <div class="flex flex-col gap-1 w-full max-w-[100px]" v-if="player.queues[activeQueue].tier !== 'UNRANKED'">
                <div class="flex items-center justify-between">
                  <div class="font-extrabold text-[13px]" :class="player.queues[activeQueue].winrate >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ player.queues[activeQueue].winrate }}%</div>
                  <div class="font-mono text-[10px] font-bold text-text-ter">{{ player.queues[activeQueue].v }}V {{ player.queues[activeQueue].d }}D</div>
                </div>
                <div class="w-full bg-border-subtle rounded-full h-1 overflow-hidden">
                  <div class="h-1 rounded-full transition-all duration-1000 ease-out" :class="player.queues[activeQueue].winrate >= 50 ? 'bg-brand-green' : 'bg-brand-red'" :style="{ width: `${player.queues[activeQueue].winrate}%` }"></div>
                </div>
              </div>
              <div v-else class="text-text-ter">-</div>
            </td>
            <td class="py-3.5 text-right font-black text-[13px]" :class="getDeltaColor(player.queues[activeQueue].lpChange)">
              <span v-if="player.queues[activeQueue].tier !== 'UNRANKED'">
                {{ player.queues[activeQueue].lpChange > 0 ? '+' : '' }}{{ player.queues[activeQueue].lpChange }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2">
      <button disabled class="text-[12px] font-bold text-text-sec flex items-center gap-1.5 opacity-50 cursor-not-allowed">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-brand-gold"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Lier un compte Riot pour apparaitre au classement
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeQueue = ref<'solo'|'flex'>('solo')

// Mock players with dual queue data (Solo/Duo & Flex), including one unranked
const playersData = [
  {
    id: 1, initial: 'H', name: 'Hugo', tag: 'Hugo#EUW',
    queues: {
      solo: { tier: 'DIAMOND', rank: 'Diamond IV', lp: 42, form: [true, true, true, true, false], winrate: 56, v: 145, d: 112, lpChange: 112 },
      flex: { tier: 'EMERALD', rank: 'Emerald I', lp: 12, form: [false, true, true, false, false], winrate: 51, v: 45, d: 43, lpChange: 12 }
    }
  },
  {
    id: 2, initial: 'T', name: 'Théo', tag: 'TheoTop#EUW',
    queues: {
      solo: { tier: 'EMERALD', rank: 'Emerald II', lp: 84, form: [true, true, false, true, true], winrate: 54, v: 102, d: 89, lpChange: 34 },
      flex: { tier: 'DIAMOND', rank: 'Diamond III', lp: 15, form: [true, true, true, true, true], winrate: 62, v: 35, d: 21, lpChange: 78 }
    }
  },
  {
    id: 3, initial: 'V', name: 'Valentin', tag: 'Valou#EUW',
    queues: {
      solo: { tier: 'PLATINUM', rank: 'Platinum I', lp: 18, form: [false, false, true, false, true], winrate: 52, v: 215, d: 198, lpChange: -22 },
      flex: { tier: 'GOLD', rank: 'Gold I', lp: 98, form: [true, false, false, false, false], winrate: 49, v: 21, d: 22, lpChange: -15 }
    }
  },
  {
    id: 4, initial: 'A', name: 'Antoine', tag: 'Anto#EUW',
    queues: {
      solo: { tier: 'GOLD', rank: 'Gold III', lp: 77, form: [true, false, true, true, false], winrate: 50, v: 45, d: 45, lpChange: 8 },
      flex: { tier: 'UNRANKED', rank: '', lp: 0, form: [], winrate: 0, v: 0, d: 0, lpChange: 0 }
    }
  },
  {
    id: 5, initial: 'M', name: 'Maxime', tag: 'Max#EUW',
    queues: {
      solo: { tier: 'SILVER', rank: 'Silver I', lp: 35, form: [false, false, false, true, false], winrate: 47, v: 88, d: 99, lpChange: -47 },
      flex: { tier: 'SILVER', rank: 'Silver II', lp: 12, form: [false, false, true, true, false], winrate: 48, v: 12, d: 13, lpChange: -5 }
    }
  },
  {
    id: 6, initial: 'L', name: 'Lucas', tag: 'Luc#EUW',
    queues: {
      solo: { tier: 'UNRANKED', rank: '', lp: 0, form: [], winrate: 0, v: 0, d: 0, lpChange: 0 },
      flex: { tier: 'UNRANKED', rank: '', lp: 0, form: [], winrate: 0, v: 0, d: 0, lpChange: 0 }
    }
  }
]

const tierValue = {
  'CHALLENGER': 900,
  'GRANDMASTER': 800,
  'MASTER': 700,
  'DIAMOND': 600,
  'EMERALD': 500,
  'PLATINUM': 400,
  'GOLD': 300,
  'SILVER': 200,
  'BRONZE': 100,
  'IRON': 50,
  'UNRANKED': 0
}

const getTierColor = (tier: string, opacity: number) => {
  const colors: Record<string, string> = {
    'DIAMOND': `rgba(87, 107, 206, ${opacity})`,
    'EMERALD': `rgba(63, 214, 143, ${opacity})`,
    'PLATINUM': `rgba(50, 115, 101, ${opacity})`,
    'GOLD': `rgba(240, 194, 78, ${opacity})`,
    'SILVER': `rgba(132, 142, 163, ${opacity})`,
    'UNRANKED': `rgba(124, 133, 153, ${opacity})`
  }
  return colors[tier] || colors['UNRANKED']
}

const getTierIcon = (tier: string) => {
  const icons: Record<string, string> = {
    'DIAMOND': '💎',
    'EMERALD': '🌲',
    'PLATINUM': '💠',
    'GOLD': '🥇',
    'SILVER': '🥈',
    'UNRANKED': '➖'
  }
  return icons[tier] || icons['UNRANKED']
}

const getDeltaColor = (delta: number) => {
  if (delta > 0) return 'text-brand-green'
  if (delta < 0) return 'text-brand-red'
  return 'text-text-ter'
}

const sortedPlayers = computed(() => {
  return [...playersData].sort((a, b) => {
    const qA = a.queues[activeQueue.value]
    const qB = b.queues[activeQueue.value]
    
    // Sort unranked to the bottom
    if (qA.tier === 'UNRANKED' && qB.tier !== 'UNRANKED') return 1
    if (qB.tier === 'UNRANKED' && qA.tier !== 'UNRANKED') return -1
    
    // If both ranked, sort by tier value + lp
    const scoreA = (tierValue[qA.tier as keyof typeof tierValue] || 0) + (qA.lp / 100)
    const scoreB = (tierValue[qB.tier as keyof typeof tierValue] || 0) + (qB.lp / 100)
    
    return scoreB - scoreA
  })
})
</script>
