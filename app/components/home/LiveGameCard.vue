<script setup lang="ts">
defineProps<{
  playerName: string
  kda: string
  time: string
}>()
</script>

<template>
  <div class="flex items-center gap-4 bg-white/80 backdrop-blur-sm pl-4 pr-3 py-2.5 rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80">
    <!-- Live Indicator (Red Dot) -->
    <div class="flex h-2.5 w-2.5 relative">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
    </div>
    
    <!-- Info -->
    <div class="flex flex-col">
      <div class="text-[13px] font-extrabold text-gray-900 leading-tight">
        {{ playerName }} est en partie
      </div>
      <div class="text-[10px] font-bold text-gray-400 tracking-wider uppercase flex gap-2 items-center mt-0.5">
        <span>{{ kda }}</span>
        <span class="w-1 h-1 rounded-full bg-gray-300"></span>
        <span>{{ time }}</span>
      </div>
    </div>
    
    <!-- Action/Arrow -->
    <button class="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </div>
</template>
