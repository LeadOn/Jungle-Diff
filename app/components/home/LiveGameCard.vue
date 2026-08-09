<script setup lang="ts">
defineProps<{
  playerName: string
  kda: string
  time: string
}>()
</script>

<template>
  <div class="flex items-center gap-4 bg-surface-base pl-4 pr-3 py-2.5 rounded-full border border-border-base shadow-sm animate-fade-in-up hover:border-border-accent transition-colors relative">
    <!-- Live Indicator (Red Dot) -->
    <div class="flex h-2 w-2 relative">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75" style="animation-duration: 1.5s;"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-brand-red animate-blink-live"></span>
    </div>
    
    <!-- Info -->
    <div class="flex flex-col flex-1">
      <div class="text-[13px] font-extrabold text-text-main leading-tight mb-0.5">
        {{ playerName }} est en partie
      </div>
      <div class="font-mono text-[9px] font-bold text-text-ter tracking-[0.1em] uppercase">
        SOLO/DUO · SION · 14:22
      </div>
    </div>
    
    <!-- Action/Arrow -->
    <div class="ml-1 text-text-ter pr-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </div>
  </div>
</template>
