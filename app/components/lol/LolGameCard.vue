<script setup lang="ts">
import type { Match, Participant } from '~/lib/types/lol'
import { formatQueue } from '~/lib/utils/lol'
import { useLolStore } from '~/stores/lol'
import { computed } from 'vue'

const props = defineProps<{
  match: Match
  targetPuuid: string
}>()

const store = useLolStore()

const participant = computed<Participant | undefined>(() => {
  return props.match.info.participants.find(p => p.puuid === props.targetPuuid)
})

const isWin = computed(() => participant.value?.win ?? false)
const queueName = computed(() => formatQueue(props.match.info.queueId, store.queues))

const kda = computed(() => {
  if (!participant.value) return '0/0/0'
  return `${participant.value.kills}/${participant.value.deaths}/${participant.value.assists}`
})
</script>

<template>
  <div 
    v-if="participant"
    class="rounded-lg p-4 mb-3 border-l-4 shadow-sm"
    :class="isWin ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20' : 'bg-red-50 border-red-500 dark:bg-red-900/20'"
  >
    <div class="flex justify-between items-center">
      <div>
        <div class="font-bold" :class="isWin ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'">
          {{ isWin ? 'Victory' : 'Defeat' }}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400">{{ queueName }}</div>
      </div>
      
      <div class="text-center">
        <div class="font-bold">{{ participant.championName }}</div>
        <div class="text-sm">{{ kda }}</div>
      </div>

      <NuxtLink :to="`/game/${match.metadata.matchId}/${targetPuuid}`" class="px-4 py-2 bg-white dark:bg-gray-800 rounded shadow-sm text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
        Details
      </NuxtLink>
    </div>
  </div>
</template>
