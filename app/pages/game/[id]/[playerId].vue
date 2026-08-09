<script setup lang="ts">
import { useRoute, useAsyncData  } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'

const route = useRoute()
const gameOnApi = useGameOnLol()
const matchId = route.params.id as string
const targetPuuid = route.params.playerId as string

const { data: match, status, error, refresh } = await useAsyncData(`match-${matchId}`, 
  () => gameOnApi.getMatch(matchId)
)
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-6">
      <button class="text-gray-500 hover:text-gray-900" @click="$router.back()">&larr; Back</button>
    </div>

    <div v-if="status === 'pending'">
      <UiLoadingSpinner size="lg" />
    </div>
    
    <div v-else-if="status === 'error' || error">
      <UiErrorState :message="error?.message || 'Failed to load match details'" :retry="refresh" />
    </div>

    <div v-else-if="match">
      <h1 class="text-3xl font-bold mb-6">Match Details: {{ match.info.gameMode }}</h1>
      <LolLolGameCard :match="match" :target-puuid="targetPuuid" />
      
      <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Team 1 -->
        <div>
          <h3 class="font-bold text-lg mb-4 text-blue-600">Blue Team</h3>
          <ul class="space-y-2">
            <li v-for="p in match.info.participants.filter(p => p.teamId === 100)" :key="p.puuid" class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <span class="font-medium" :class="{'text-primary-600': p.puuid === targetPuuid}">{{ p.summonerName }}</span>
              <span class="text-sm text-gray-500">{{ p.championName }} - {{ p.kills }}/{{ p.deaths }}/{{ p.assists }}</span>
            </li>
          </ul>
        </div>
        
        <!-- Team 2 -->
        <div>
          <h3 class="font-bold text-lg mb-4 text-red-600">Red Team</h3>
          <ul class="space-y-2">
            <li v-for="p in match.info.participants.filter(p => p.teamId === 200)" :key="p.puuid" class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <span class="font-medium" :class="{'text-primary-600': p.puuid === targetPuuid}">{{ p.summonerName }}</span>
              <span class="text-sm text-gray-500">{{ p.championName }} - {{ p.kills }}/{{ p.deaths }}/{{ p.assists }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
