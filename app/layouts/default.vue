<template>
  <div class="min-h-screen relative overflow-hidden flex flex-col">
    <!-- Subtle glow behind the page -->
    <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden flex justify-center">
      <div class="w-full max-w-[1200px] h-full relative">
         <div class="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-white/40 rounded-full blur-[100px]"></div>
      </div>
    </div>

    <!-- Content Wrapper -->
    <div class="relative z-10 flex flex-col flex-grow">
      <AppHeader />
      
      <!-- Main Content Container -->
      <main class="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/ui/AppHeader.vue'
</script>
