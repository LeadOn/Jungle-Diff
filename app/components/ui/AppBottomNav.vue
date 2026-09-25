<script setup lang="ts">
import { usePlayerPalette } from '~/composables/usePlayerPalette'

const palette = usePlayerPalette()
</script>

<template>
  <!-- Phones only: the header drops its navigation and search below `md`, and this bar carries them. -->
  <nav
    aria-label="Navigation"
    class="fixed bottom-3.5 left-1/2 z-[60] flex -translate-x-1/2 gap-1 rounded-full bg-ink p-[5px] shadow-float md:hidden"
  >
    <NuxtLink to="/" class="bar-link">Accueil</NuxtLink>
    <NuxtLink to="/stats" class="bar-link">Records</NuxtLink>
    <button
      type="button"
      aria-label="Chercher un joueur"
      class="flex size-12 cursor-pointer items-center justify-center rounded-full bg-brand-gold-bright text-ink"
      @click="palette.open()"
    >
      <Icon name="lucide:search" class="size-[19px]" />
    </button>
  </nav>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.bar-link {
  @apply flex h-12 items-center rounded-full px-[18px] text-[13px] font-bold text-ink-text;
}

.bar-link[aria-current='page'] {
  @apply bg-ink-text text-ink;
}
</style>
