<script setup lang="ts">
import type { Summoner } from '~/lib/types'
import { useLolStore } from '~/stores/lol'
import { computed } from 'vue'

const props = defineProps<{
  summoner: Summoner
}>()

const store = useLolStore()
const profileIconUrl = computed(() => {
  if (!store.version) return ''
  return `https://ddragon.leagueoflegends.com/cdn/${store.version}/img/profileicon/${props.summoner.profileIconId}.png`
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6 flex items-center space-x-6">
    <div class="relative">
      <img v-if="profileIconUrl" :src="profileIconUrl" :alt="summoner.name" class="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700" >
      <div class="absolute bottom-0 right-0 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white dark:border-gray-800">
        {{ summoner.summonerLevel }}
      </div>
    </div>
    <div>
      <h2 class="text-2xl font-bold">{{ summoner.name }}</h2>
      <NuxtLink :to="`/summoner/${summoner.puuid}`" class="text-primary-600 hover:underline mt-2 inline-block">
        View Profile
      </NuxtLink>
    </div>
  </div>
</template>
