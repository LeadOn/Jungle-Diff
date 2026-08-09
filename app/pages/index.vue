<script setup lang="ts">
import { ref, onMounted  } from 'vue'
import { useRouter } from '#app'
import { useLolStore } from '~/stores/lol'

const store = useLolStore()
const router = useRouter()
const searchName = ref('')

onMounted(async () => {
  // Ensure queues are loaded
  await store.fetchQueues()
})

const onSearch = () => {
  if (searchName.value.trim()) {
    // Basic implementation: we redirect to summoner page.
    // In a real app we would probably hit the GameOn API to get the PUUID by riot id.
    router.push(`/summoner/${encodeURIComponent(searchName.value)}`)
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="text-center py-20">
      <h1 class="text-5xl font-black mb-6 tracking-tight text-brand">JungleDiff</h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-10">Track your League of Legends statistics.</p>
      
      <form class="max-w-md mx-auto flex gap-2" @submit.prevent="onSearch">
        <input 
          v-model="searchName" 
          type="text" 
          placeholder="Summoner Name"
          class="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none"
        >
        <button type="submit" class="px-6 py-3 bg-brand text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
          Search
        </button>
      </form>
    </div>
  </div>
</template>
