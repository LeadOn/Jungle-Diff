<template>
  <div class="animate-fade-in-up mt-6 flex flex-col w-full">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-[18px] font-extrabold text-text-main leading-tight tracking-tight">Dernières parties</h2>
      <button class="text-text-sec hover:text-text-main font-bold text-[13px] transition-colors cursor-pointer">Tout l'historique</button>
    </div>
    
    <!-- Loading State -->
    <div v-if="pending" class="flex-1 flex flex-col items-center justify-center opacity-50">
      <Icon name="lucide:loader-circle" class="animate-spin text-2xl text-text-sec mb-2" />
      <span class="text-sm font-bold text-text-ter">Chargement...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !store.lastMatches" class="flex-1 flex flex-col items-center justify-center">
      <Icon name="lucide:triangle-alert" class="text-2xl text-brand-red mb-2" />
      <span class="text-sm font-bold text-brand-red text-center">Erreur lors du chargement<br>des parties récentes.</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="store.lastMatches.length === 0" class="flex-1 flex flex-col items-center justify-center">
      <Icon name="lucide:ghost" class="text-3xl text-text-ter mb-2" />
      <span class="text-sm font-bold text-text-sec">Aucune partie trouvée.</span>
    </div>

    <!-- Games List -->
    <div v-else class="flex flex-col gap-2">
      <LolGameCard 
        v-for="game in store.lastMatches" 
        :key="game.matchId" 
        :game="game" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from '#app'
import { useLolStore } from '~/stores/lol'
import { cacheOnlyDuringHydration } from '~/utils/async-data'

const store = useLolStore()
const { pending, error } = useAsyncData('recentGames', () => store.fetchLastMatches(), { getCachedData: cacheOnlyDuringHydration })
</script>
