<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useAsyncData } from '#app'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import StatCard from '~/components/home/StatCard.vue'
import LadderTable from '~/components/home/LadderTable.vue'
import RecentGames from '~/components/home/RecentGames.vue'
import SideCard from '~/components/home/SideCard.vue'
import MockBadge from '~/components/ui/MockBadge.vue'

const store = useLolStore()
const patchStore = usePatchStore()
const router = useRouter()
const searchName = ref('')
const isSearchFocused = ref(false)

await useAsyncData('homeStats', () => store.fetchHomeStats())
await useAsyncData('players', () => store.fetchPlayers())

const hasApiError = computed(() => store.homeStats === null)

onMounted(async () => {
  // Ensure queues are loaded
  await store.fetchQueues()
})

const onSearch = () => {
  if (searchName.value.trim()) {
    router.push(`/summoner/${encodeURIComponent(searchName.value)}`)
  }
}

const netLpFormatted = computed(() => {
  const lp = store.homeStats?.weeklyActivity.netLpChangeThisWeek
  if (lp === undefined || lp === null) return '0 LP'
  if (lp > 0) return `+${lp} LP`
  return `${lp} LP`
})

const netLpColor = computed(() => {
  const lp = store.homeStats?.weeklyActivity.netLpChangeThisWeek
  if (lp === undefined || lp === null || lp === 0) return ''
  return lp > 0 ? 'text-brand-green' : 'text-brand-red'
})
</script>

<template>
  <div class="w-full pt-6 pb-16">
    <!-- Hero Section -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-12 mb-16 animate-fade-in-up relative z-50" style="animation-delay: 50ms;">
      <!-- Left text & search -->
      <div class="w-full md:w-2/3 flex flex-col items-start text-left">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-accent bg-surface-high text-text-ter font-mono text-[10.5px] font-bold mb-6 tracking-[0.1em] uppercase">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
          EUW · PATCH {{ patchStore.currentPatch }}
        </div>
        
        <h1 class="text-6xl md:text-7xl lg:text-[80px] font-extrabold text-text-main leading-[1] mb-6 tracking-[-0.03em]">
          Dominez la Faille,<br />analysez vos résultats.
        </h1>
        
        <p class="text-lg text-text-sec mb-10 max-w-[500px] leading-relaxed font-medium">
          Ranks, forme, historique et records — mis à jour à chaque fin de partie. Cherche aussi n'importe quel invocateur EUW.
        </p>
        
        <div class="flex items-center gap-6 w-full flex-wrap relative z-50">
          <div class="relative w-full max-w-full md:max-w-[380px]">
            <form @submit.prevent="onSearch" 
                  class="flex items-center bg-surface-base rounded-full p-1.5 shadow-sm border transition-all duration-300"
                  :class="isSearchFocused ? 'border-brand-gold ring-4 ring-brand-gold/10' : 'border-border-base hover:border-border-accent'">
              <div class="pl-4 pr-2 text-text-ter flex items-center justify-center">
                <Icon name="lucide:search" class="text-[18px] opacity-80" style="stroke-width: 2.5px;" />
              </div>
              <input 
                v-model="searchName" 
                type="text" 
                placeholder="Riot ID (Pseudo#TAG)"
                @focus="isSearchFocused = true"
                @blur="isSearchFocused = false"
                class="flex-1 bg-transparent border-none outline-none text-text-main placeholder-text-ter px-2 font-bold text-sm w-full"
              >
              <button type="submit" class="px-6 py-2 bg-brand-gold hover:opacity-90 text-brand-gold-text rounded-full font-bold transition-opacity shadow-sm text-sm">
                Chercher
              </button>
            </form>

            <!-- Search Suggestions Overlay (Mock) -->
            <div v-if="isSearchFocused" class="absolute z-50 top-[calc(100%+8px)] left-0 w-full bg-surface-base border border-border-base rounded-2xl shadow-xl overflow-hidden py-2 animate-fade-in-up" style="animation-delay: 0ms;">
              <div class="px-4 py-2 font-mono text-[10px] text-text-ter font-bold uppercase tracking-[0.1em]">Récents</div>
              <button disabled class="w-full flex items-center justify-between px-4 py-2.5 bg-surface-base opacity-50 cursor-not-allowed text-left group">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-surface-high border border-border-subtle flex items-center justify-center text-sm">💎</div>
                  <div>
                    <div class="font-bold text-[13px] text-text-main group-hover:text-brand-gold transition-colors">Hugo</div>
                    <div class="text-[11px] text-text-ter font-medium">Diamond IV</div>
                  </div>
                </div>
                <span class="font-mono text-[9px] font-bold bg-surface-base text-text-ter px-1.5 py-0.5 rounded border border-border-subtle tracking-widest uppercase">CREW</span>
              </button>
              <button disabled class="w-full flex items-center justify-between px-4 py-2.5 bg-surface-base opacity-50 cursor-not-allowed text-left group">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-surface-high border border-border-subtle flex items-center justify-center text-sm">🌲</div>
                  <div>
                    <div class="font-bold text-[13px] text-text-main group-hover:text-brand-gold transition-colors">Théo</div>
                    <div class="text-[11px] text-text-ter font-medium">Emerald II</div>
                  </div>
                </div>
                <span class="font-mono text-[9px] font-bold bg-surface-base text-text-ter px-1.5 py-0.5 rounded border border-border-subtle tracking-widest uppercase">CREW</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Image (Logo/Hero) -->
      <div class="w-full md:w-1/3 flex flex-col items-center justify-center relative">
        <div class="relative w-64 h-64 md:w-[230px] md:h-[230px] flex items-center justify-center mb-8">
          <!-- Soft glow behind character -->
          <div class="absolute inset-0 bg-brand-gold rounded-full blur-[80px] opacity-10"></div>
          <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Hero" class="relative z-10 w-full h-full object-contain drop-shadow-2xl animate-float" />
          <div class="absolute -bottom-4 w-32 h-4 bg-black/20 dark:bg-black/40 blur-xl rounded-full"></div>
        </div>
      </div>
    </div>
    
    <!-- Error Banner -->
    <div v-if="hasApiError" class="mb-12 bg-brand-red/10 border border-brand-red/20 rounded-2xl p-6 flex items-start gap-4 animate-fade-in-up">
      <!-- Icon -->
      <div class="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center flex-shrink-0 text-brand-red">
        <Icon name="lucide:triangle-alert" class="text-[20px]" style="stroke-width: 2.5px;" />
      </div>
      <div class="flex-1">
        <h3 class="text-text-main font-bold text-lg mb-1">Erreur de connexion à l'API</h3>
        <p class="text-text-sec text-sm font-medium leading-relaxed mb-1">
          Impossible de récupérer les statistiques du crew et l'historique récent. Le serveur API semble indisponible ou rencontre des difficultés techniques.
        </p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="animate-fade-in-up relative" style="animation-delay: 100ms;">
        <StatCard 
          title="PARTIES · CETTE SEMAINE" 
          :value="(store.homeStats?.weeklyActivity.gamesThisWeek ?? 0).toString()" 
          :subtitle="((store.homeStats?.weeklyActivity.gamesThisWeek ?? 0) >= (store.homeStats?.weeklyActivity.gamesLastWeek ?? 0) ? '+' : '') + ((store.homeStats?.weeklyActivity.gamesThisWeek ?? 0) - (store.homeStats?.weeklyActivity.gamesLastWeek ?? 0)) + ' vs semaine passée'" 
        />
      </div>
      <div class="animate-fade-in-up relative" style="animation-delay: 150ms;">
        <StatCard 
          title="WINRATE DU CREW" 
          :value="(store.homeStats?.weeklyActivity.winRateThisWeek ?? 0) + ' %'" 
          :subtitle="(store.homeStats?.weeklyActivity.winsThisWeek ?? 0) + ' victoires - ' + (store.homeStats?.weeklyActivity.lossesThisWeek ?? 0) + ' défaites'" 
          :valueClass="(store.homeStats?.weeklyActivity.winRateThisWeek ?? 0) >= 50 ? 'text-brand-green' : 'text-brand-red'" 
        />
      </div>
      <div class="animate-fade-in-up relative" style="animation-delay: 200ms;">
        <StatCard 
          title="LP NETS" 
          :value="netLpFormatted" 
          subtitle="Cumul du crew cette semaine" 
          :valueClass="netLpColor" 
        />
      </div>
      <div class="animate-fade-in-up relative" style="animation-delay: 250ms;">
        <StatCard 
          title="TEMPS DE JEU" 
          :value="Math.round((store.homeStats?.weeklyActivity.totalPlaytimeMinutesThisWeek ?? 0) / 60) + ' h'" 
          :subtitle="(store.homeStats?.weeklyActivity.averageGameDurationMinutesThisWeek ?? 0) + ' min par partie'" 
        />
      </div>
    </div>

    <!-- Main Content Layout (2 columns) -->
    <div v-if="!hasApiError" class="flex flex-col lg:flex-row gap-6">
      <!-- Left Column: Ladder & Recent Games -->
      <div class="flex-1 relative animate-fade-in-up" style="animation-delay: 300ms;">
        <div class="relative mb-6">
          <LadderTable :players="store.players" />
        </div>
        <div class="relative">
          <MockBadge />
          <RecentGames />
        </div>
      </div>
      
      <!-- Right Column: Highlights -->
      <div class="w-full lg:w-[320px] flex flex-col gap-4 animate-fade-in-up" style="animation-delay: 350ms;">
        <!-- Fait de la semaine -->
        <div class="relative">
          <MockBadge />
          <SideCard title="FAIT DE LA SEMAINE">
            <div class="text-[32px] font-black text-brand-gold mb-3 mt-1 leading-none tabular-nums">+112 LP</div>
            <p class="text-[13px] text-text-sec leading-relaxed font-medium">Meilleure progression du crew depuis février : <span class="font-extrabold text-text-main">Hugo</span> enchaîne 14 parties à 71 % de victoires, dont quatre succès d'affilée.</p>
            <button disabled class="w-full mt-5 py-2.5 bg-surface-high text-text-main border border-border-subtle font-bold rounded-xl text-[13px] opacity-50 cursor-not-allowed">Voir sa fiche</button>
          </SideCard>
        </div>
        
        <!-- Records du crew -->
        <div class="relative">
          <MockBadge />
          <SideCard title="Records du crew" badge="Tous">
            <div class="flex flex-col gap-4 mt-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold text-text-main text-[13px]">Biggest Inter</div>
                  <div class="font-mono text-[9px] text-text-ter font-bold tracking-[0.1em] uppercase mt-1">Antoine · Yasuo · 14 MARS</div>
                </div>
                <div class="text-[16px] font-black text-brand-red tabular-nums">17</div>
              </div>
              <div class="w-full h-px bg-border-subtle"></div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold text-text-main text-[13px]">Crowd Control Master</div>
                  <div class="font-mono text-[9px] text-text-ter font-bold tracking-[0.1em] uppercase mt-1">Valentin · Leona · 2 FÉVR.</div>
                </div>
                <div class="text-[16px] font-black text-brand-gold tabular-nums">94s</div>
              </div>
              <div class="w-full h-px bg-border-subtle"></div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold text-text-main text-[13px]">Night Owl</div>
                  <div class="font-mono text-[9px] text-text-ter font-bold tracking-[0.1em] uppercase mt-1">Hugo · Parties après minuit</div>
                </div>
                <div class="text-[16px] font-black text-text-main tabular-nums">23</div>
              </div>
            </div>
          </SideCard>
        </div>

        <!-- Champions du crew -->
        <div class="relative">
          <MockBadge />
          <SideCard title="Champions du crew">
            <div class="flex flex-col gap-3 mt-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-surface-high overflow-hidden flex-shrink-0 border border-border-accent">
                  <img src="https://ddragon.leagueoflegends.com/cdn/14.13.1/img/champion/Leona.png" alt="Leona" class="w-full h-full object-cover">
                </div>
                <div class="flex-grow">
                  <div class="font-extrabold text-[13px] text-text-main">Leona</div>
                  <div class="w-full bg-border-subtle rounded-full h-1 mt-1.5 overflow-hidden">
                    <div class="h-1 rounded-full bg-brand-green" style="width: 58%"></div>
                  </div>
                </div>
                <div class="text-right flex flex-col justify-end h-full">
                  <div class="text-[13px] font-black text-brand-green leading-none tabular-nums">58%</div>
                  <div class="font-mono text-[9px] text-text-ter font-bold tracking-[0.1em] uppercase mt-1">54 PARTIES</div>
                </div>
              </div>
              
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-surface-high overflow-hidden flex-shrink-0 border border-border-accent">
                  <img src="https://ddragon.leagueoflegends.com/cdn/14.13.1/img/champion/LeeSin.png" alt="Lee Sin" class="w-full h-full object-cover">
                </div>
                <div class="flex-grow">
                  <div class="font-extrabold text-[13px] text-text-main">Lee Sin</div>
                  <div class="w-full bg-border-subtle rounded-full h-1 mt-1.5 overflow-hidden">
                    <div class="h-1 rounded-full bg-brand-green" style="width: 52%"></div>
                  </div>
                </div>
                <div class="text-right flex flex-col justify-end h-full">
                  <div class="text-[13px] font-black text-brand-green leading-none tabular-nums">52%</div>
                  <div class="font-mono text-[9px] text-text-ter font-bold tracking-[0.1em] uppercase mt-1">42 PARTIES</div>
                </div>
              </div>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  </div>
</template>
