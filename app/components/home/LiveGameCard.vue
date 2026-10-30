<script setup lang="ts">
defineProps<{
  playerName: string
  kda: string
  time: string
}>()
</script>

<template>
  <div class="relative flex items-center gap-4 rounded-5 border border-line bg-surface py-2.5 pr-3 pl-4 shadow-card transition-colors duration-[120ms] ease-out hover:border-line-strong">
    <!-- Live Indicator (Red Dot) -->
    <div class="flex h-2 w-2 relative">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75"/>
      <span class="relative inline-flex h-2 w-2 rounded-full bg-loss"/>
    </div>
    
    <!-- Info -->
    <div class="flex flex-col flex-1">
      <div class="mb-0.5 type-small font-semibold text-ink">
        {{ playerName }} est en partie
      </div>
      <div class="type-mono text-ink-3 uppercase">
        SOLO/DUO · SION · 14:22
      </div>
    </div>
    
    <!-- Action/Arrow -->
    <div class="ml-1 pr-1 text-ink-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </div>
  </div>
</template>
