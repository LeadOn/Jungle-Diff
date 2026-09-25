<template>
  <div class="relative min-h-screen overflow-x-clip">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 z-0 h-[620px] bg-page-wash" />

    <AppHeader />

    <main class="relative z-[1] mx-auto max-w-[1280px] px-4 pt-[22px] md:px-8 md:pt-10">
      <slot />
    </main>

    <!-- The bottom padding clears the floating bar on phones. -->
    <footer class="relative z-[1] mx-auto mt-[88px] max-w-[1280px] px-4 pb-28 md:px-8 md:pb-9">
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 rounded-[22px] bg-ink px-[22px] py-[18px] text-[13px] text-ink-muted">
        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.1em]">JungleDiff · v{{ config.public.appVersion }}</span>
        <a
          href="https://www.paypal.me/ValentinVirot"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-[34px] items-center gap-[7px] rounded-full bg-brand-gold-bright px-3.5 font-bold text-ink transition-transform duration-[250ms] ease-spring hover:scale-[1.06]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
          Soutenir le projet
        </a>
        <span>Créé en France par <a href="https://www.valentinvirot.fr" target="_blank" rel="noopener noreferrer" class="font-bold text-brand-gold-bright">LeadOn</a></span>
      </div>
    </footer>

    <AppBottomNav />
    <LolPlayerPalette />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/ui/AppHeader.vue'
import AppBottomNav from '~/components/ui/AppBottomNav.vue'
import LolPlayerPalette from '~/components/lol/LolPlayerPalette.vue'
import { useRuntimeConfig } from '#app'

const config = useRuntimeConfig()
</script>
