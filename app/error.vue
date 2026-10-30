<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

// The error page replaces `app.vue` entirely, so the stored theme choice has to be applied here too
// or a dark-theme reader gets a light error page.
useHead({
  htmlAttrs: { lang: 'fr' },
  script: [{ src: '/theme-init.js', tagPosition: 'head' }],
})

const isNotFound = computed(() => props.error?.statusCode === 404)
const isForbidden = computed(() => props.error?.statusCode === 403)

const title = computed(() => {
  if (isNotFound.value) return 'Page introuvable'
  if (isForbidden.value) return 'Accès réservé'
  return 'Une erreur est survenue'
})

const message = computed(() => {
  if (isNotFound.value) return "Cette page n'existe pas ou a été déplacée."
  return props.error?.statusMessage || props.error?.message || "Quelque chose s'est mal passé de notre côté."
})

useSeoMeta({
  title: computed(() => {
    if (isNotFound.value) return 'Page introuvable'
    if (isForbidden.value) return 'Accès réservé'
    return 'Erreur'
  }),
})

// A 404 or a 403 is something missing (the empty-state look); anything else is a failure (the
// error-state look, loss-tinted and announced).
const isFailure = computed(() => !isNotFound.value && !isForbidden.value)

const handleHome = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <header class="border-b border-line bg-header">
      <div class="mx-auto flex h-14 w-full max-w-[1280px] items-center px-4 md:px-6 rail:px-8">
        <NuxtLink to="/" class="flex items-center gap-2 text-ink no-underline">
          <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Logo" class="size-[30px] object-contain" >
          <span class="font-wide text-[17px] font-[780] tracking-[-0.035em] md:text-[18px]">JungleDiff</span>
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-[1280px] flex-grow items-center justify-center px-4 py-16 md:px-6 md:py-24">
      <div
        :role="isFailure ? 'alert' : undefined"
        class="grid w-full max-w-[34rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-5 border bg-surface p-[22px] shadow-card"
        :class="isFailure
          ? 'border-[color-mix(in_oklch,var(--loss)_45%,var(--line))]'
          : 'border-[color-mix(in_oklch,var(--line)_70%,transparent)]'"
      >
        <img
          src="~/assets/img/JungleDiff_Logo.png"
          alt=""
          class="size-12 shrink-0 object-contain grayscale-50"
        >
        <div class="grid min-w-0 justify-items-start gap-2">
          <p class="type-mono m-0 text-ink-3">
            {{ error?.statusCode || 500 }}
          </p>
          <h1 class="type-d3 m-0 text-ink">
            {{ title }}
          </h1>
          <p class="type-body m-0 max-w-[46ch] text-ink-2 [overflow-wrap:anywhere]">
            {{ message }}
          </p>
          <UiButton variant="primary" class="mt-2" @click="handleHome">
            <Icon name="lucide:arrow-left" class="size-4" aria-hidden="true" />
            Retour à l'accueil
          </UiButton>
        </div>
      </div>
    </main>
  </div>
</template>
