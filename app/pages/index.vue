<script setup lang="ts">
import { ref, onMounted  } from 'vue'
import { useRouter } from '#app'
import { useLolStore } from '~/stores/lol'
import StatCard from '~/components/home/StatCard.vue'
import LadderTable from '~/components/home/LadderTable.vue'
import SideCard from '~/components/home/SideCard.vue'
import LiveGameCard from '~/components/home/LiveGameCard.vue'

const store = useLolStore()
const router = useRouter()
const searchName = ref('')

onMounted(async () => {
  // Ensure queues are loaded
  await store.fetchQueues()
})

const onSearch = () => {
  if (searchName.value.trim()) {
    router.push(`/summoner/${encodeURIComponent(searchName.value)}`)
  }
}
</script>

<template>
  <div class="w-full pt-6 pb-16">
    <div class="flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
      <!-- Left text & search -->
      <div class="w-full md:w-2/3 flex flex-col items-start text-left">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-[10px] font-bold mb-6 tracking-wide">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          EUW - PATCH 14.13
        </div>
        
        <h1 class="text-6xl md:text-7xl lg:text-[80px] font-extrabold tracking-tighter text-gray-900 leading-[1] mb-6">
          Tout le crew,<br />une seule page.
        </h1>
        
        <p class="text-lg text-gray-500 mb-10 max-w-[500px] leading-relaxed font-medium">
          Ranks, forme, historique et records — mis à jour à chaque fin de partie. Cherche aussi n'importe quel invocateur EUW.
        </p>
        
        <div class="flex items-center gap-6 w-full flex-wrap relative">
          <form @submit.prevent="onSearch" class="flex-1 max-w-[320px] flex items-center bg-white rounded-full p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200/80">
            <div class="pl-4 pr-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              v-model="searchName" 
              type="text" 
              placeholder="Pseudo#TAG"
              class="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-2 font-bold text-sm"
            >
            <button type="submit" class="px-6 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white rounded-full font-bold transition-colors shadow-sm text-sm">
              Chercher
            </button>
          </form>

          <div class="relative">
            <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
            <LiveGameCard 
              playerName="Hugo"
              kda="9/1/5 / 16K"
              time="14:27"
            />
          </div>
        </div>
      </div>
      
      <!-- Right Image (Logo/Hero) -->
      <div class="w-full md:w-1/3 flex justify-center md:justify-end relative">
        <div class="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
          <div class="absolute -top-4 -right-4 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
          <!-- Soft glow behind character -->
          <div class="absolute inset-0 bg-gradient-to-tr from-stone-200 to-orange-100 rounded-full blur-3xl opacity-40"></div>
          <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Hero" class="relative z-10 w-full h-full object-contain drop-shadow-2xl" />
        </div>
      </div>
    </div>
    
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="relative">
        <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
        <StatCard title="PARTIES • 7 JOURS" value="47" subtitle="+9 vs semaine passée" />
      </div>
      <div class="relative">
        <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
        <StatCard title="WINRATE DU CREW" value="53 %" subtitle="25 victoires - 22 défaites" valueClass="text-green-500" />
      </div>
      <div class="relative">
        <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
        <StatCard title="LP NETS" value="+186" subtitle="meilleure semaine du mois" valueClass="text-[#a1783c]" />
      </div>
      <div class="relative">
        <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
        <StatCard title="TEMPS DE JEU" value="21 h" subtitle="27 min par partie" />
      </div>
    </div>

    <!-- Main Content Layout (2 columns) -->
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Left Column: Ladder -->
      <div class="flex-1 relative">
        <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
        <LadderTable />
      </div>
      
      <!-- Right Column: Highlights -->
      <div class="w-full lg:w-[320px] flex flex-col gap-4">
        <!-- Fait de la semaine -->
        <div class="relative">
          <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
          <SideCard title="FAIT DE LA SEMAINE">
            <div class="text-[32px] font-black text-[var(--color-brand)] mb-3 mt-1 leading-none">+112 LP</div>
            <p class="text-[13px] text-gray-500 leading-relaxed font-medium">Meilleure progression du crew depuis 10 jours : <span class="font-extrabold text-gray-900">Hugo</span> enchaîne 14 parties à 71% de victoires, dont quatre succès d'affilée.</p>
            <button class="w-full mt-5 py-2.5 bg-[#faf9f6] text-gray-900 border border-gray-200/60 font-bold rounded-xl hover:bg-gray-100 transition-colors text-[13px]">Voir sa fiche</button>
          </SideCard>
        </div>
        
        <!-- Records du crew -->
        <div class="relative">
          <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
          <SideCard title="Records du crew" badge="Tous">
            <div class="flex flex-col gap-4 mt-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold text-gray-900 text-[13px]">Biggest Inter</div>
                  <div class="text-[9px] text-gray-400 font-bold tracking-widest uppercase mt-1">Antoine • Yasuo • 14 morts</div>
                </div>
                <div class="text-[16px] font-black text-red-500">17</div>
              </div>
              <div class="w-full h-px bg-gray-100"></div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold text-gray-900 text-[13px]">Crowd Control Master</div>
                  <div class="text-[9px] text-gray-400 font-bold tracking-widest uppercase mt-1">Valentin • Leona • 2 CC/min</div>
                </div>
                <div class="text-[16px] font-black text-[var(--color-brand)]">94s</div>
              </div>
              <div class="w-full h-px bg-gray-100"></div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold text-gray-900 text-[13px]">Night Owl</div>
                  <div class="text-[9px] text-gray-400 font-bold tracking-widest uppercase mt-1">Hugo • Parties après minuit</div>
                </div>
                <div class="text-[16px] font-black text-gray-900">23</div>
              </div>
            </div>
          </SideCard>
        </div>

        <!-- Champions du crew -->
        <div class="relative">
          <div class="absolute -top-2.5 -right-2.5 z-10 bg-purple-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shadow-sm">Mock</div>
          <SideCard title="Champions du crew">
            <div class="flex flex-col gap-3 mt-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-stone-200 overflow-hidden flex-shrink-0">
                  <img src="https://ddragon.leagueoflegends.com/cdn/14.13.1/img/champion/Leona.png" alt="Leona" class="w-full h-full object-cover">
                </div>
                <div class="flex-grow">
                  <div class="font-extrabold text-[13px] text-gray-900">Leona</div>
                  <div class="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                    <div class="h-1 rounded-full bg-green-500" style="width: 58%"></div>
                  </div>
                </div>
                <div class="text-right flex flex-col justify-end h-full">
                  <div class="text-[13px] font-black text-green-600 leading-none">58%</div>
                  <div class="text-[9px] text-gray-400 font-bold tracking-widest uppercase mt-1">54 PARTIES</div>
                </div>
              </div>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  </div>
</template>
