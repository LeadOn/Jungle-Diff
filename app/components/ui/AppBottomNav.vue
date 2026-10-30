<script setup lang="ts">
import { usePlayerPalette } from '~/composables/usePlayerPalette'

const palette = usePlayerPalette()
</script>

<template>
  <!-- Phones only: the header drops its navigation and search below `md`, and this bar carries them. -->
  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] md:hidden">
    <nav
      aria-label="Navigation"
      class="pointer-events-auto flex gap-0.5 rounded-3 bg-night p-1 shadow-float"
    >
      <NuxtLink to="/" class="bar-link">Accueil</NuxtLink>
      <NuxtLink to="/stats" class="bar-link">Records</NuxtLink>
      <button
        type="button"
        aria-label="Chercher un joueur"
        class="inline-flex size-11 cursor-pointer items-center justify-center rounded-2 bg-gold text-on-tier"
        @click="palette.open()"
      >
        <Icon name="lucide:search" class="size-4" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.bar-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-2);
  color: var(--on-night-2);
  font-size: 0.8125rem;
  font-weight: 640;
  text-decoration: none;
}

.bar-link[aria-current='page'] {
  background: var(--night-2);
  color: var(--on-night);
}
</style>
