<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRuntimeConfig } from '#app'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { applyTheme, isDarkTheme } from '~/utils/theme'

/**
 * Chrome of the admin space ("JungleDiff Admin v2"): its own header, with the "Admin" chip and a way
 * back to the site, and no crew search or mobile bar. The theme toggle is kept, like on every page.
 */
const config = useRuntimeConfig()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const isDark = ref(false)

const profileRequest = new AbortController()

onMounted(() => {
  isDark.value = isDarkTheme()
  playerStore.fetchCurrentPlayer(false, profileRequest.signal)
})

onBeforeUnmount(() => profileRequest.abort())

const avatarUrl = computed(() => {
  const player = playerStore.currentPlayer
  if (!player?.profilePictureUrl) return null
  return `${config.public.gameOnApiUrl}/player/${player.id}/pp`
})

const avatarInitial = computed(() => {
  const source = playerStore.currentPlayer?.nickname || authStore.displayName
  return source?.charAt(0).toUpperCase() || '?'
})

const profileLabel = computed(() =>
  playerStore.currentPlayer?.fullName
  || playerStore.currentPlayer?.nickname
  || authStore.displayName
  || 'Mon profil'
)

const toggleTheme = () => {
  isDark.value = !isDark.value
  applyTheme(isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <div class="relative min-h-screen overflow-x-clip">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] bg-page-wash" />

    <header class="sticky top-0 z-50 border-b border-border-base bg-header backdrop-blur-[14px]">
      <div class="mx-auto flex h-[68px] max-w-[1360px] items-center gap-3.5 px-4 md:px-8">
        <NuxtLink to="/" aria-label="JungleDiff, accueil" class="flex shrink-0 items-center gap-2.5">
          <img src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-8 object-contain">
          <span class="hidden text-[21px] font-bold tracking-[-0.03em] text-text-main md:inline">JungleDiff</span>
        </NuxtLink>
        <span class="inline-flex h-7 items-center rounded-full bg-ink px-[11px] font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-on-photo-gold">Admin</span>

        <span class="flex-1" />

        <button
          type="button"
          :aria-label="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
          :title="isDark ? 'Thème clair' : 'Thème sombre'"
          class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-base bg-surface-base text-text-sec transition-colors hover:text-text-main"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="size-[17px]" />
        </button>

        <NuxtLink
          to="/"
          aria-label="Retour au site"
          class="inline-flex h-10 shrink-0 items-center gap-[7px] rounded-full border border-border-base bg-surface-base px-4 text-[13.5px] font-bold text-text-main transition-colors duration-200 hover:border-text-main/30"
        >
          <Icon name="lucide:arrow-left" class="size-[15px]" />
          <span class="hidden md:inline">Retour au site</span>
        </NuxtLink>

        <ClientOnly>
          <NuxtLink
            to="/settings"
            title="Paramètres du compte"
            class="flex h-10 shrink-0 items-center gap-[9px] rounded-full border border-border-base bg-surface-base p-[3px] md:pr-3.5"
          >
            <span class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gold-bright text-[13px] font-bold text-ink">
              <UiAppImage v-if="avatarUrl" :src="avatarUrl" alt="" class="size-full object-cover" />
              <span v-else>{{ avatarInitial }}</span>
            </span>
            <span class="hidden max-w-[150px] truncate text-[13.5px] font-bold text-text-main md:block">{{ profileLabel }}</span>
          </NuxtLink>
          <template #fallback>
            <div class="h-10 w-10 animate-pulse rounded-full border border-border-base bg-surface-base md:w-28" />
          </template>
        </ClientOnly>
      </div>
    </header>

    <div class="relative z-[1] mx-auto max-w-[1360px] px-4 pt-5 md:px-8 md:pt-9">
      <slot />
    </div>

    <footer class="relative z-[1] mx-auto mt-[72px] max-w-[1360px] px-4 pb-9 md:px-8">
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 rounded-[22px] bg-ink px-[22px] py-[18px] text-[13px] text-ink-muted">
        <span class="font-mono text-[11px] font-medium uppercase tracking-[0.1em]">JungleDiff · Administration · v{{ config.public.appVersion }}</span>
        <span>Créé en France par <a href="https://www.valentinvirot.fr" target="_blank" rel="noopener noreferrer" class="font-bold text-on-photo-gold">LeadOn</a></span>
      </div>
    </footer>
  </div>
</template>
