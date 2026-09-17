<template>
  <div class="animate-fade-in-up mt-6 flex flex-col w-full">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-[18px] font-extrabold text-text-main leading-tight tracking-tight">Dernières parties</h2>
    </div>
    
    <!-- Loading State -->
    <div v-if="isPending && displayedMatches.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-50 py-10">
      <Icon name="lucide:loader-circle" class="animate-spin text-2xl text-text-sec mb-2" />
      <span class="text-sm font-bold text-text-ter">Chargement...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center py-10">
      <Icon name="lucide:triangle-alert" class="text-2xl text-brand-red mb-2" />
      <span class="text-sm font-bold text-brand-red text-center">Erreur lors du chargement<br>des parties récentes.</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="displayedMatches.length === 0" class="flex-1 flex flex-col items-center justify-center py-10">
      <Icon name="lucide:ghost" class="text-3xl text-text-ter mb-2" />
      <span class="text-sm font-bold text-text-sec">Aucune partie trouvée.</span>
    </div>

    <!-- Games List -->
    <div v-else class="flex flex-col gap-2">
      <LolGameCard 
        v-for="game in displayedMatches" 
        :key="game.matchId" 
        :game="game" 
      />
      
      <button
        v-if="hasMore"
        :disabled="loadingMore"
        class="w-full mt-2 py-3 rounded-xl text-center bg-surface-base border border-border-base text-text-main font-bold text-[13px] transition-colors hover:border-border-accent hover:text-brand-gold disabled:opacity-60 disabled:cursor-wait"
        @click="loadMore"
      >
        {{ loadingMore ? 'Chargement…' : `Charger ${pageSize} parties de plus` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watchEffect } from 'vue'
import { useAsyncData } from '#app'
import { useLolStore } from '~/stores/lol'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { isAbortError } from '~/lib/types/error'
import type { LoLGameDto } from '~/lib/types'

const store = useLolStore()
const gameOnApi = useGameOnLol()

const { status, error } = useAsyncData('recentGames', () => store.fetchLastMatches(), { getCachedData: cacheOnlyDuringHydration })
const isPending = computed(() => status.value === 'pending')

// Pagination is aborted if the component goes away before the response arrives.
const pagination = new AbortController()
onBeforeUnmount(() => pagination.abort())

const pageSize = 5
const currentPage = ref(1)
const loadingMore = ref(false)
const additionalMatches = ref<LoLGameDto[]>([])
const hasMore = ref(true)

watchEffect(() => {
  if (store.lastMatches && store.lastMatches.length < pageSize && additionalMatches.value.length === 0) {
    hasMore.value = false
  }
})

const displayedMatches = computed(() => {
  return [...(store.lastMatches || []), ...additionalMatches.value]
})

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  currentPage.value++
  
  try {
    const data = await gameOnApi.getLastMatches(currentPage.value, pageSize, pagination.signal)
    if (data && data.results) {
      additionalMatches.value.push(...data.results)
      
      if (data.results.length < pageSize || currentPage.value >= Math.ceil(data.total / (data.resultsPerPage || pageSize))) {
        hasMore.value = false
      }
    }
  } catch (e) {
    currentPage.value-- // roll back the increment so the next attempt starts from the right page
    if (!isAbortError(e)) console.error('[home] Chargement de parties supplémentaires en échec:', e)
  } finally {
    loadingMore.value = false
  }
}
</script>
