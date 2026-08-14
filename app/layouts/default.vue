<template>
  <div class="min-h-screen relative overflow-hidden flex flex-col">
    <!-- Subtle glow behind the page -->
    <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden flex justify-center">
      <div class="w-full max-w-[1200px] h-full relative">
         <div class="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-(--color-glow) rounded-full blur-[100px]"></div>
      </div>
    </div>

    <!-- Content Wrapper -->
    <div class="relative z-10 flex flex-col flex-grow">
      <AppHeader />

      <!-- Main Content Container -->
      <main class="flex-grow w-full max-w-[1200px] mx-auto px-6 pt-6 pb-8 md:pt-12">
        <slot />
      </main>

      <!-- Footer with Version & Credits -->
      <footer class="w-full max-w-[1400px] mx-auto px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-6 mt-4 border-t border-border-subtle/50">
        <div class="font-mono text-[10px] font-bold text-text-ter uppercase tracking-[0.15em]">
          JUNGLEDIFF &middot; V{{ config.public.appVersion }}
        </div>
        
        <div class="text-[12px] font-medium text-text-ter flex items-center gap-1">
          <span>Created with</span>
          <span class="text-brand-red">❤️</span>
          <span>in France by</span>
          <a href="https://www.valentinvirot.fr" target="_blank" class="font-bold text-text-main hover:text-brand-gold transition-colors">LeadOn</a>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/ui/AppHeader.vue'
import { useRuntimeConfig } from '#app'

const config = useRuntimeConfig()
</script>
