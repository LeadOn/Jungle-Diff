<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error?.statusCode === 404)

const title = computed(() => (isNotFound.value ? 'Page introuvable' : 'Une erreur est survenue'))

const message = computed(() => {
  if (isNotFound.value) return "Cette page n'existe pas ou a été déplacée."
  return props.error?.statusMessage || props.error?.message || "Quelque chose s'est mal passé de notre côté."
})

useSeoMeta({
  title: computed(() => (isNotFound.value ? 'Page introuvable' : 'Erreur')),
})

const handleHome = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden">
    <div class="pointer-events-none absolute inset-0 z-0 flex justify-center overflow-hidden">
      <div class="relative h-full w-full max-w-[1200px]">
        <div class="absolute right-[10%] top-[10%] h-[600px] w-[600px] rounded-full bg-(--color-glow) blur-[100px]"></div>
      </div>
    </div>

    <div class="relative z-10 flex flex-grow flex-col">
      <header class="mx-auto flex w-full max-w-[1400px] items-center px-6 py-4 md:px-8 md:py-5">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Logo" class="h-8 w-8 object-contain drop-shadow-sm" />
          <span class="font-sans text-lg font-extrabold tracking-tight text-text-main md:text-[22px]">JungleDiff</span>
        </NuxtLink>
      </header>

      <main class="mx-auto flex w-full max-w-[1200px] flex-grow flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <p class="font-mono text-sm font-bold tracking-widest text-brand-gold">
          {{ error?.statusCode || 500 }}
        </p>
        <h1 class="font-sans text-3xl font-extrabold text-text-main md:text-4xl">
          {{ title }}
        </h1>
        <p class="text-text-sec max-w-md">
          {{ message }}
        </p>
        <button
          type="button"
          class="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-brand-gold-text transition-opacity hover:opacity-90"
          @click="handleHome"
        >
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Retour à l'accueil
        </button>
      </main>
    </div>
  </div>
</template>
