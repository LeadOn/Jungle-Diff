<template>
  <div class="relative min-h-screen overflow-x-clip">
    <AppHeader />

    <main id="top" class="mx-auto max-w-[1280px] px-4 pb-12 pt-7 md:px-6 md:pb-14 md:pt-9 rail:px-8">
      <slot />
    </main>

    <!-- The bottom padding clears the floating bar on phones. -->
    <footer class="border-t border-line">
      <div class="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-4 pb-[104px] pt-[18px] text-[13px] text-ink-3 md:px-6 md:pb-7 rail:px-8">
        <span class="font-mono text-xs font-medium tabular-nums">JungleDiff v{{ config.public.appVersion }}</span>
        <span>Créé en France par <a href="https://www.valentinvirot.fr" target="_blank" rel="noopener noreferrer" class="font-semibold text-ink no-underline hover:underline">LeadOn</a></span>
        <UiButton
          href="https://www.paypal.me/ValentinVirot"
          size="sm"
          variant="secondary"
        >
          <Icon name="lucide:heart" class="size-3.5 shrink-0 text-gold-ink" />
          Soutenir le projet
        </UiButton>
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
