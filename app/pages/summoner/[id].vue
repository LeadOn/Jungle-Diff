<script setup lang="ts">
import { useRoute, useAsyncData  } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'

const route = useRoute()
const gameOnApi = useGameOnLol()
const puuidOrName = route.params.id as string

// Since we are searching by name or puuid, let's assume it's name for this example
const { data: summoner, status, error, refresh } = await useAsyncData(`summoner-${puuidOrName}`, 
  () => gameOnApi.getSummonerByName(puuidOrName)
)

</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <NuxtLink to="/" class="text-gray-500 hover:text-gray-900 mb-6 inline-block">&larr; Back to Home</NuxtLink>
    
    <div v-if="status === 'pending'">
      <UiLoadingSpinner size="lg" />
    </div>
    
    <div v-else-if="status === 'error' || error">
      <UiErrorState :message="error?.message || 'Failed to load summoner'" :retry="refresh" />
    </div>

    <div v-else-if="summoner">
      <LolLolPlayerCard :summoner="summoner" />
      
      <div class="mt-8">
        <h3 class="text-xl font-bold mb-4">Recent Matches (Placeholder)</h3>
        <!-- Match list would go here -->
        <p class="text-gray-500">Match history API integration pending.</p>
      </div>
    </div>
  </div>
</template>
